"use client";
/**
 * Client entry points of the landing (/) and the auth page (/login). The
 * design files read window / location while they construct, so they render
 * on the client only; these wrappers hand them the app's services.
 */
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { checkHandle, siteAuth } from "./siteAuth";
import "./site.css";
import { BetaBanner } from "@/components/beta/BetaBits";

const LandingPage = dynamic(() => import("./LandingPage"), { ssr: false });
const AuthPage = dynamic(() => import("./AuthPage"), { ssr: false });

// The design's display faces (Archivo with its width axis, Unbounded, Funnel
// Display, Bricolage Grotesque — the landing's and the auth page's "Tipografía").
const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,700..900&family=Unbounded:wght@500;700;800;900&family=Funnel+Display:wght@500;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&display=swap";

/** The page background and smooth anchor scrolling, only while a site page is up. */
function usePageChrome(bg: string) {
  useEffect(() => {
    const html = document.documentElement, body = document.body;
    const prev = { scroll: html.style.scrollBehavior, bg: body.style.background, ox: body.style.overflowX };
    html.style.scrollBehavior = "smooth";
    body.style.background = bg;
    body.style.overflowX = "hidden";
    return () => { html.style.scrollBehavior = prev.scroll; body.style.background = prev.bg; body.style.overflowX = prev.ox; };
  }, [bg]);
}

function Fonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
    </>
  );
}

export function LandingClient() {
  const router = useRouter();
  usePageChrome("#0E0C12");
  return (
    <>
      <Fonts />
      <LandingPage checkHandle={checkHandle} navigate={(url: string) => router.push(url)} />
      <BetaBanner />
    </>
  );
}

export function AuthClient({ initialError }: { initialError?: string }) {
  const router = useRouter();
  usePageChrome("#0E0C12");
  return (
    <>
      <Fonts />
      <AuthPage checkHandle={checkHandle} auth={siteAuth} initialError={initialError}
        navigate={(url: string) => { router.push(url); router.refresh(); }} />
      <BetaBanner top={12} />
    </>
  );
}
