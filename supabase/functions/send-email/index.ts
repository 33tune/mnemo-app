// Supabase Auth "Send Email" hook (2026-11-26): every auth email (sign-up code,
// password reset, email change, magic link) goes out from here instead of the
// SMTP settings. Resend first; if Resend refuses (its free plan stops at 100 a
// day, or any other error) the same email goes out through Brevo.
//
// Secrets (Edge Functions › Secrets): SEND_EMAIL_HOOK_SECRET (from Auth › Hooks),
// RESEND_API_KEY, BREVO_API_KEY. Without BREVO_API_KEY there is no fallback.
// Deployed with verify_jwt off: the hook signature is checked here instead.
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const SITE = "https://www.myland.lol";
const FROM_NAME = "myLand";
const FROM_EMAIL = "hola@myland.lol";

type Payload = {
  user: { email: string; user_metadata?: Record<string, unknown> };
  email_data: { token: string; token_hash: string; redirect_to?: string; email_action_type: string; site_url?: string; token_new?: string; token_hash_new?: string };
};

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function shell(inner: string) {
  return `<div style="margin:0;padding:32px 16px;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#141118">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;padding:36px 32px">
    <div style="font-size:26px;font-weight:800;letter-spacing:-1px">myLand</div>${inner}
    <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#8a8590">myLand está en beta: estamos mejorándolo todos los días. Si no pediste este mail, ignoralo.</p>
  </div>
</div>`;
}
const codeBox = (code: string) => `<div style="font-size:36px;font-weight:800;letter-spacing:10px;padding:14px 0;text-align:center;background:#f4f1ec;border-radius:16px">${esc(code)}</div>`;
const button = (href: string, label: string) => `<a href="${href}" style="display:inline-block;margin-top:16px;padding:14px 22px;border-radius:999px;background:#141118;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px">${label}</a>`;
const p = (t: string) => `<p style="margin:16px 0 0;font-size:16px;line-height:1.55;color:#3b3740">${t}</p>`;
const link = (hash: string, type: string, next?: string) =>
  `${SITE}/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=${type}${next ? `&next=${encodeURIComponent(next)}` : ""}`;

/** The email for each auth action: subject, html, text. */
function build(d: Payload["email_data"], user: Payload["user"]) {
  const handle = typeof user.user_metadata?.handle === "string" ? String(user.user_metadata.handle) : "";
  switch (d.email_action_type) {
    case "signup": {
      const url = link(d.token_hash, "email");
      return {
        subject: `Tu código de myLand: ${d.token}`,
        html: shell(`<h1 style="margin:28px 0 0;font-size:24px;line-height:1.2">¡Bienvenido a myLand!</h1>
          ${handle ? p(`Tu nombre ya es tuyo: <b>myland.lol/${esc(handle)}</b>`) : ""}
          <p style="margin:20px 0 6px;font-size:15px;color:#3b3740">Tu código para entrar:</p>${codeBox(d.token)}
          ${p("O tocá el botón para confirmar desde cualquier dispositivo:")}${button(url, "Confirmar y armar mi tarjeta")}
          ${p("Armá tu tarjeta y tu sala (en la compu tenés todo), y después pegá el link en tu bio de Instagram, TikTok o donde quieras.")}`),
        text: `¡Bienvenido a myLand!${handle ? ` Tu nombre ya es tuyo: myland.lol/${handle}` : ""}\n\nTu código: ${d.token}\n\nO confirmá acá: ${url}`,
      };
    }
    case "recovery": {
      const url = link(d.token_hash, "recovery", "/reset-password");
      return {
        subject: "Cambiá tu contraseña de myLand",
        html: shell(`<h1 style="margin:28px 0 0;font-size:24px">Nueva contraseña</h1>${p("Tocá el botón para elegir una contraseña nueva.")}${button(url, "Cambiar contraseña")}
          ${p(`O usá este código: <b>${esc(d.token)}</b>`)}`),
        text: `Cambiá tu contraseña de myLand: ${url}\nCódigo: ${d.token}`,
      };
    }
    case "email_change": {
      const url = link(d.token_hash_new || d.token_hash, "email_change");
      return {
        subject: "Confirmá tu nuevo email en myLand",
        html: shell(`<h1 style="margin:28px 0 0;font-size:24px">Confirmá tu email</h1>${p("Tocá el botón para usar este email en tu cuenta de myLand.")}${button(url, "Confirmar email")}`),
        text: `Confirmá tu nuevo email en myLand: ${url}`,
      };
    }
    case "magiclink": {
      const url = link(d.token_hash, "magiclink");
      return {
        subject: `Tu código de myLand: ${d.token}`,
        html: shell(`<h1 style="margin:28px 0 0;font-size:24px">Entrá a myLand</h1><p style="margin:20px 0 6px;font-size:15px;color:#3b3740">Tu código:</p>${codeBox(d.token)}${button(url, "Entrar")}`),
        text: `Tu código de myLand: ${d.token}\nO entrá acá: ${url}`,
      };
    }
    case "invite": {
      const url = link(d.token_hash, "invite");
      return { subject: "Te invitaron a myLand", html: shell(`<h1 style="margin:28px 0 0;font-size:24px">Te invitaron a myLand</h1>${button(url, "Aceptar invitación")}`), text: `Te invitaron a myLand: ${url}` };
    }
    default: // reauthentication and anything new: just the code
      return { subject: `Tu código de myLand: ${d.token}`, html: shell(`<h1 style="margin:28px 0 0;font-size:24px">Tu código</h1><div style="margin-top:16px">${codeBox(d.token)}</div>`), text: `Tu código de myLand: ${d.token}` };
  }
}

async function viaResend(to: string, m: { subject: string; html: string; text: string }) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, why: "no RESEND_API_KEY" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to], subject: m.subject, html: m.html, text: m.text }),
  });
  return { ok: r.ok, why: r.ok ? "" : `resend ${r.status} ${(await r.text()).slice(0, 200)}` };
}
async function viaBrevo(to: string, m: { subject: string; html: string; text: string }) {
  const key = Deno.env.get("BREVO_API_KEY");
  if (!key) return { ok: false, why: "no BREVO_API_KEY" };
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "Content-Type": "application/json", accept: "application/json", "api-key": key },
    body: JSON.stringify({ sender: { name: FROM_NAME, email: FROM_EMAIL }, to: [{ email: to }], subject: m.subject, htmlContent: m.html, textContent: m.text }),
  });
  return { ok: r.ok, why: r.ok ? "" : `brevo ${r.status} ${(await r.text()).slice(0, 200)}` };
}

Deno.serve(async (req) => {
  const raw = await req.text();
  let payload: Payload;
  try {
    const secret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "").replace(/^v1,whsec_/, "");
    payload = new Webhook(secret).verify(raw, Object.fromEntries(req.headers)) as Payload;
  } catch {
    return new Response(JSON.stringify({ error: { http_code: 401, message: "bad signature" } }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const m = build(payload.email_data, payload.user);
  const first = await viaResend(payload.user.email, m);
  if (first.ok) return Response.json({});
  console.warn("resend failed, trying brevo:", first.why);
  const second = await viaBrevo(payload.user.email, m);
  if (second.ok) return Response.json({});
  console.error("both providers failed:", first.why, "|", second.why);
  return new Response(JSON.stringify({ error: { http_code: 500, message: "No se pudo enviar el mail. Probá en un rato." } }), { status: 500, headers: { "Content-Type": "application/json" } });
});
