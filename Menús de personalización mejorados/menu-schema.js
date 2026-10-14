/* MYLAND · Menús de personalización — schema único.
   Cada objeto editable = cards; cada card = controles. Rangos, pasos y valores
   salen del repo (33tune/mnemo-app@main). `src` = campo que escribe hoy el repo.
   Lo consumen Editor.dc.html (prototipo) y Menu System.dc.html (mapa de capacidades). */
(function () {
  const n = (v, d = 2) => String(Math.round(v * 10 ** d) / 10 ** d).replace(".", ",");
  const F = {
    px: v => `${n(v, 1)} px`, pct: v => `${Math.round(v * 100)}%`, pct100: v => `${Math.round(v)}%`, deg: v => `${Math.round(v)}°`,
    x: v => `${Number(v).toFixed(1).replace(".", ",")}x`, s: v => `${n(v, 1)} s`, lh: v => Number(v).toFixed(2).replace(".", ","),
    ms: v => `${Math.round(v * 1000)} ms`, scale: v => `+${Math.round((v - 1) * 100)}%`, mus: v => `${Math.round((v / 8) * 100)}%`,
    num: v => String(Math.round(v)), depth: v => (v < 0 ? `${v} · detrás` : v > 0 ? `+${v}` : "0"),
    radius: v => (v >= 100 ? "Círculo" : v <= 0 ? "Cuadrado" : `${Math.round(v)}%`),
  };

  const FONTS = [
    { key: "DM Sans", label: "DM Sans", family: '"DM Sans", sans-serif', category: "sans", w: [300, 400, 500, 700] },
    { key: "Space Mono", label: "Space Mono", family: '"Space Mono", monospace', category: "mono", w: [400, 700] },
    { key: "Newsreader", label: "Newsreader", family: '"Newsreader", serif', category: "serif", w: [400, 500, 600] },
    { key: "Playfair Display", label: "Playfair", family: '"Playfair Display", serif', category: "serif", w: [400, 700, 900] },
    { key: "Bebas Neue", label: "Bebas Neue", family: '"Bebas Neue", sans-serif', category: "display", w: [400] },
    { key: "Syne", label: "Syne", family: '"Syne", sans-serif', category: "display", w: [400, 600, 800] },
    { key: "Archivo", label: "Archivo", family: '"Archivo", sans-serif', category: "sans", w: [400, 600, 800] },
    { key: "Pacifico", label: "Pacifico", family: '"Pacifico", cursive', category: "script", w: [400] },
    { key: "Great Vibes", label: "Great Vibes", family: '"Great Vibes", cursive', category: "script", w: [400] },
  ];
  const MUSIC_FONTS = [{ key: "", label: "Predeterminada", family: '"DM Sans", sans-serif', category: "sans", w: [400, 700] }, ...FONTS];

  // ── control helpers ────────────────────────────────────────────────
  const sl = (k, label, icon, min, max, step, fmt, src, x) => ({ t: "slider", k, label, icon, min, max, step, fmt, src, ...x });
  const co = (k, label, src, x) => ({ t: "color", k, label, src, ...x });
  const sw = (k, label, icon, src, x) => ({ t: "switch", k, label, icon, src, ...x });
  const sg = (k, label, options, src, x) => ({ t: "seg", k, label, options, src, ...x });
  const fx = (id, label, icon, on, pv, controls, x) => ({ t: "tile", id, label, icon, on, pv, controls: controls || [], ...x });
  const tiles = (...items) => ({ t: "tiles", items: items.filter(Boolean) });
  const more = (label, controls) => ({ t: "more", label, controls });

  // ── text roles of the ProfileCard ─────────────────────────────────
  function role(id, label, icon, o) {
    const k = s => `${id}.${s}`, S = o.src;
    const cards = [
      { id: "content", title: o.contentTitle || "Contenido", icon: o.cIcon || icon, pinned: true, controls: [o.content] },
      { id: "type", title: "Tipografía", icon: "case", controls: [
        { t: "font", k: k("font"), label: "Fuente", sample: o.sample, src: S + "Font" },
        sl(k("size"), "Tamaño", "maximize", o.size[0], o.size[1], 1, F.px, S + "FontSize"),
        { t: "weight", k: k("weight"), fontKey: k("font"), label: "Peso", src: S + "FontWeight" },
        o.ls && sl(k("ls"), "Interletrado", "spacing", -1, 4, 0.1, F.px, S + "LetterSpacing"),
        o.lh && sl(k("lh"), "Interlineado", "height", o.lh[0], o.lh[1], 0.05, F.lh, S + "LineHeight"),
      ].filter(Boolean) },
      { id: "color", title: "Color", icon: "palette", controls: [
        co(k("color"), "Color", S + "Color", { inherit: "allText.color", inheritLabel: "Todos los textos", lockedBy: k("grad.on"), lockedNote: "Lo reemplaza el gradiente" }),
      ] },
      { id: "fx", title: "Efectos del texto", icon: "sparkles", controls: [
        tiles(
          fx("grad", "Gradiente", "palette", k("grad.on"), "t-grad", [
            { t: "stops", k: k("grad.stops"), label: "Colores", src: `effects.textRoles.${id}.gradient.colors` },
            sl(k("grad.angle"), "Ángulo", "rotate", 0, 360, 5, F.deg, `effects.textRoles.${id}.gradient.angle`),
          ], { state: v => `${v[k("grad.stops")].length} colores`, src: `effects.textRoles.${id}.gradient` }),
          fx("shim", "Shimmer", "sparkles", k("shim.on"), "t-shim", [
            sl(k("shim.int"), "Intensidad", "sun", 0, 1, 0.01, F.pct, `effects.textRoles.${id}.shimmer.intensity`, { when: v => !v[k("grad.on")] }),
            sl(k("shim.speed"), "Velocidad", "play", 0.3, 3, 0.1, F.x, `effects.textRoles.${id}.shimmer.speed`),
          ], { state: v => F.x(v[k("shim.speed")]), src: `effects.textRoles.${id}.shimmer` }),
          o.letters && fx("let", "Por letra", "text", k("let.on"), "t-let", [
            sl(k("let.amp"), "Amplitud", "height", 1, 12, 1, F.px, "effects.textRoles.name.letterAnimation.amplitude"),
            sl(k("let.speed"), "Velocidad", "play", 0.3, 3, 0.1, F.x, "effects.textRoles.name.letterAnimation.speed"),
            sl(k("let.stagger"), "Escalonado", "spacing", 0, 0.2, 0.01, F.ms, "effects.textRoles.name.letterAnimation.stagger"),
          ], { state: v => `${v[k("let.amp")]} px`, src: "effects.textRoles.name.letterAnimation" }),
        ),
        { t: "goto", label: "Sombra, brillo y contorno", hint: "Todos los textos", to: "allText" },
      ] },
    ];
    if (o.block) cards.push(blockCard(o.block, o.blockScope, false));
    return { id, label, icon, family: "card", cards };
  }
  function blockCard(key, scope, icon) {
    const b = s => `block.${key}.${s}`;
    return { id: "block", title: "Estilo del bloque", sub: scope, icon: "frame", toggle: b("on"), toggleSrc: `blockStyle.${key} ↔ blockStylePaused.${key}`,
      offNote: "Hereda el estilo de la tarjeta", controls: [
        co(b("bg"), "Fondo", `blockStyle.${key}.bg`, { clearable: true }),
        icon && co(b("icon"), "Ícono", `blockStyle.${key}.iconColor`, { clearable: true, inherit: "allText.color", inheritLabel: "Todos los textos" }),
        sl(b("radius"), "Radio", "corner", 0, 24, 1, F.px, `blockStyle.${key}.radius`),
      ].filter(Boolean) };
  }

  const OBJECTS = {
    photo: { id: "photo", label: "Foto", icon: "user", family: "card", cards: [
      { id: "img", title: "Imagen", icon: "image", pinned: true, controls: [{ t: "upload", k: "photo.src", kind: "avatar", label: "Subir foto", accept: "image/*", src: "photo" }] },
      { id: "shape", title: "Forma", icon: "corner", controls: [
        sl("photo.size", "Tamaño", "maximize", 48, 160, 1, F.px, "pfpSizePx (getPfpSizeBounds: depende de la card)"),
        sl("photo.radius", "Forma", "corner", 0, 100, 1, F.radius, "pfpRadius"),
      ] },
      { id: "fx", title: "Efectos de la foto", icon: "sparkles", controls: [tiles(
        fx("border", "Borde", "frame", "photo.border.on", "c-border", [
          co("photo.border.color", "Color", "effects.pfp.border.color", { clearable: true }),
          sl("photo.border.w", "Grosor", "frame", 0, 6, 0.5, F.px, "effects.pfp.border.width"),
          sl("photo.border.op", "Opacidad", "eye", 0, 1, 0.01, F.pct, "effects.pfp.border.opacity"),
        ], { state: v => F.px(v["photo.border.w"]), src: "effects.pfp.border" }),
        fx("shadow", "Sombra", "moon", "photo.shadow.on", "c-shadow", [
          co("photo.shadow.color", "Color", "effects.pfp.shadow.color", { clearable: true }),
          sl("photo.shadow.int", "Intensidad", "moon", 0.01, 1, 0.01, F.pct, "effects.pfp.shadow.intensity"),
        ], { state: v => F.pct(v["photo.shadow.int"]), src: "effects.pfp.shadow" }),
        fx("glow", "Brillo", "sun", "photo.glow.on", "c-glow", [
          co("photo.glow.color", "Color", "effects.pfp.glow.color"),
          sl("photo.glow.int", "Intensidad", "sun", 0.01, 1, 0.01, F.pct, "effects.pfp.glow.intensity"),
          sl("photo.glow.r", "Radio", "maximize", 0, 40, 1, F.px, "effects.pfp.glow.radius"),
          sw("photo.glow.pulse", "Pulso", "sparkles", "effects.pfp.glow.animation.enabled"),
          sl("photo.glow.speed", "Velocidad del pulso", "play", 0.3, 3, 0.1, F.x, "effects.pfp.glow.animation.speed", { when: v => v["photo.glow.pulse"] }),
        ], { state: v => (v["photo.glow.pulse"] ? "Con pulso" : F.pct(v["photo.glow.int"])), src: "effects.pfp.glow" }),
      )] },
    ] },
    name: role("name", "Nombre", "text", { src: "name", size: [10, 32], ls: true, lh: [0.9, 2], letters: true, block: "identity", blockScope: "Nombre, @usuario, Frase y Bio", sample: "name.text",
      content: { t: "text", k: "name.text", placeholder: "nombre", big: true, fontKey: "name.font", src: "name" } }),
    handle: role("handle", "@usuario", "at", { src: "handle", size: [7, 18], ls: true, block: "identity", blockScope: "Nombre, @usuario, Frase y Bio", sample: "handle.text",
      content: { t: "readonly", k: "handle.text", prefix: "@", note: "Se cambia desde tu cuenta" } }),
    descriptor: role("descriptor", "Frase", "quote", { src: "status", size: [7, 18], ls: true, block: "identity", blockScope: "Nombre, @usuario, Frase y Bio", sample: "descriptor.text",
      content: { t: "text", k: "descriptor.text", placeholder: "diseñador multimedia, just for fun…", max: 60, fontKey: "descriptor.font", src: "status" } }),
    location: role("location", "Ubicación", "pin", { src: "location", size: [7, 18], ls: true, block: "location", blockScope: "Ubicación", sample: "location.text",
      content: { t: "text", k: "location.text", placeholder: "la plata, buenos aires", max: 60, fontKey: "location.font", src: "location" } }),
    bio: role("bio", "Bio", "align-left", { src: "bio", size: [7, 18], lh: [1, 2.4], block: "identity", blockScope: "Nombre, @usuario, Frase y Bio", sample: "bio.text",
      content: { t: "text", k: "bio.text", placeholder: "Contá algo de vos", max: 120, area: true, fontKey: "bio.font", src: "bio" } }),
    views: role("views", "Visitas", "eye", { src: "views", size: [7, 18], ls: true, block: "views", blockScope: "Visitas", sample: "views.label", contentTitle: "Contador",
      content: sw("views.show", "Mostrar cantidad", "eye", "showViews") }),
    links: { id: "links", label: "Links", icon: "link", family: "card", cards: [
      { id: "list", title: "Links", icon: "link", pinned: true, controls: [{ t: "links", k: "links.items", max: 12, src: "contactLinks[] (plataforma detectada de la URL)" }] },
      { id: "icon", title: "Íconos", icon: "maximize", controls: [sl("links.size", "Tamaño", "maximize", 14, 32, 1, F.px, "linksIconSize")] },
      blockCard("links", "Links", true),
    ] },
    logo: { id: "logo", label: "Logo", icon: "shapes", family: "card", cards: [
      { id: "src", title: "Imagen", icon: "image", pinned: true, controls: [{ t: "upload", k: "logo.src", kind: "logo", label: "Subí tu logo", accept: "image/png,image/svg+xml,image/webp,image/*", src: "logo" }] },
      { id: "geo", title: "Tamaño y giro", icon: "maximize", needs: "logo.src", controls: [
        sl("logo.w", "Ancho", "maximize", 16, 200, 1, F.px, "logo.w"),
        sl("logo.h", "Alto", "height", 16, 200, 1, F.px, "logo.h"),
        sl("logo.rot", "Rotación", "rotate", -180, 180, 1, F.deg, "logo.rotation"),
        sl("logo.op", "Opacidad", "eye", 0, 1, 0.01, F.pct, "logo.opacity"),
      ] },
      { id: "depth", title: "Profundidad", icon: "layers", needs: "logo.src", controls: [
        sl("logo.z", "Profundidad", "layers", -5, 10, 1, F.depth, "logo.zIndex"),
        { t: "hint", text: "Arrastralo sobre la tarjeta para moverlo", icon: "move" },
      ] },
    ] },
    cardBg: { id: "cardBg", label: "Fondo", icon: "palette", family: "card", swatch: true, cards: [
      { id: "color", title: "Color", icon: "palette", controls: [
        co("cardBg.color", "Color", "effects.bg.color", { alpha: true, clearable: true }),
        sl("cardBg.op", "Opacidad", "eye", 0, 1, 0.01, F.pct, "effects.bg.opacity"),
      ] },
      { id: "img", title: "Imagen o GIF", icon: "image", controls: [{ t: "upload", k: "cardBg.img", kind: "cover", label: "Subir imagen o GIF", accept: "image/*,image/gif", src: "effects.bg.image (+ imageMode detectado)" }] },
      { id: "surface", title: "Superficie", icon: "blend", controls: [tiles(
        fx("grad", "Gradiente", "palette", "cardBg.grad.on", "c-grad", [
          co("cardBg.grad.a", "Color A", "effects.gradient.from"), co("cardBg.grad.b", "Color B", "effects.gradient.to"),
          sl("cardBg.grad.angle", "Ángulo", "rotate", 0, 360, 5, F.deg, "effects.gradient.angle"),
          sl("cardBg.grad.op", "Opacidad", "eye", 0, 1, 0.01, F.pct, "effects.gradient.opacity"),
        ], { state: v => F.deg(v["cardBg.grad.angle"]), src: "effects.gradient" }),
        fx("glass", "Vidrio", "blend", "cardBg.glass", "c-glass", [], { state: () => "Translúcido", src: "effects.bg.glass" }),
        fx("blur", "Desenfoque", "blend", "cardBg.blur.on", "c-blur", [sl("cardBg.blur", "Blur", "blend", 0, 24, 1, F.px, "effects.bg.blur")], { state: v => F.px(v["cardBg.blur"]), src: "effects.bg.blur (0 = borra)" }),
      )] },
      { id: "shape", title: "Forma y medidas", icon: "corner", controls: [
        sl("cardBg.radius", "Esquinas", "corner", 0, 60, 1, F.px, "effects.border.radius"),
        { t: "measures", fields: [["card.w", "Ancho", 220, 520], ["card.h", "Alto", 300, 760]], note: "Siempre centrada", src: "w, h (clampFreeformCardSize + centerCardPosition)" },
      ] },
    ] },
    cardFx: { id: "cardFx", label: "Efectos", icon: "sparkles", family: "card", cards: [
      { id: "light", title: "Luz", icon: "sun", controls: [tiles(
        fx("border", "Borde", "frame", "fx.border.on", "c-border", [
          co("fx.border.color", "Color", "effects.border.color", { alpha: true, clearable: true }),
          sl("fx.border.w", "Grosor", "frame", 0, 6, 0.5, F.px, "effects.border.width"),
          sl("fx.border.op", "Opacidad", "eye", 0, 1, 0.01, F.pct, "effects.border.opacity"),
          { t: "goto", label: "Esquinas", hint: "Fondo", to: "cardBg" },
        ], { state: v => F.px(v["fx.border.w"]), src: "effects.border" }),
        fx("shadow", "Sombra", "moon", "fx.shadow.on", "c-shadow", [
          sl("fx.shadow.int", "Intensidad", "moon", 0.01, 1, 0.01, F.pct, "effects.shadow.intensity"),
          co("fx.shadow.color", "Color", "effects.shadow.color"),
          more("Avanzado", [
            sl("fx.shadow.blur", "Blur", "blend", 0, 80, 1, F.px, "effects.shadow.blur"),
            { t: "offset", kx: "fx.shadow.x", ky: "fx.shadow.y", min: -40, max: 40, src: "effects.shadow.offsetX/offsetY" },
            sl("fx.shadow.op", "Opacidad", "eye", 0, 1, 0.01, F.pct, "effects.shadow.opacity"),
          ]),
        ], { state: v => F.pct(v["fx.shadow.int"]), offState: "Sombra base sutil", src: "effects.shadow (apagar = pausa)" }),
        fx("glow", "Brillo", "sun", "fx.glow.on", "c-glow", [
          sg("fx.glow.mode", "Dónde", [{ id: "outer", label: "Exterior" }, { id: "inner", label: "Interior" }, { id: "both", label: "Ambos" }], "effects.glow.outer / inner"),
          co("fx.glow.color", "Color", "effects.glow.color"),
          sl("fx.glow.int", "Intensidad", "sun", 0.01, 1, 0.01, F.pct, "effects.glow.intensity"),
          more("Avanzado", [sl("fx.glow.r", "Radio", "maximize", 0, 60, 1, F.px, "effects.glow.radius")]),
        ], { state: v => ({ outer: "Exterior", inner: "Interior", both: "Ambos" })[v["fx.glow.mode"]], src: "effects.glow" }),
        fx("pulse", "Pulso", "sparkles", "fx.pulse.on", "c-pulse", [
          sl("fx.pulse.speed", "Velocidad", "play", 0.3, 3, 0.1, F.x, "effects.glow.animation.speed"),
          { t: "warn", when: v => !v["fx.glow.on"], text: "Prendé Brillo para ver el pulso" },
        ], { state: v => F.x(v["fx.pulse.speed"]), src: "effects.glow.animation.enabled" }),
      )] },
      { id: "motion", title: "Movimiento", icon: "move", controls: [tiles(
        fx("float", "Flotar", "arrow-up", "fx.float.on", "c-float", [
          sl("fx.float.h", "Amplitud", "height", 2, 24, 1, F.px, "effects.animations.floatHeight"),
          sl("fx.float.s", "Ciclo", "rotate", 1, 8, 0.5, F.s, "effects.animations.floatSpeed"),
        ], { state: v => F.px(v["fx.float.h"]), src: "effects.animations.floating" }),
        fx("tilt", "Inclinar 3D", "move", "fx.tilt.on", "c-tilt", [sl("fx.tilt.int", "Intensidad", "move", 1, 20, 0.5, F.deg, "effects.interactions.tiltIntensity")], { state: v => F.deg(v["fx.tilt.int"]), src: "effects.interactions.tilt3d" }),
      )] },
      { id: "cursor", title: "Al pasar el cursor", icon: "pointer", controls: [tiles(
        fx("hglow", "Brillo", "sun", "fx.hover.glow", "c-hglow", [], { state: () => "Al pasar", src: "effects.interactions.hoverGlow" }),
        fx("hscale", "Escala", "maximize", "fx.hover.scale.on", "c-hscale", [sl("fx.hover.scale", "Intensidad", "maximize", 1.01, 1.15, 0.01, F.scale, "effects.interactions.hoverScale")], { state: v => F.scale(v["fx.hover.scale"]), src: "effects.interactions.hoverScale (apagar = pausa)" }),
        fx("spot", "Spotlight", "sun", "fx.spot.on", "c-spot", [
          co("fx.spot.color", "Color", "effects.interactions.spotlightColor", { alpha: true, clearable: true }),
          sl("fx.spot.size", "Radio", "maximize", 20, 100, 1, F.pct100, "effects.interactions.spotlightSize"),
        ], { state: v => F.pct100(v["fx.spot.size"]), src: "effects.interactions.spotlight" }),
      )] },
      { id: "retro", title: "Retro", icon: "disc", open: false, controls: [tiles(
        fx("scan", "Scanlines", "align-left", "fx.scan.on", "c-scan", [sl("fx.scan.int", "Intensidad", "align-left", 0, 1, 0.01, F.pct, "effects.retro.scanlines.intensity")], { state: v => F.pct(v["fx.scan.int"]), src: "effects.retro.scanlines" }),
        fx("noise", "Ruido VHS", "sparkles", "fx.noise.on", "c-noise", [sl("fx.noise.int", "Intensidad", "sparkles", 0, 1, 0.01, F.pct, "effects.retro.noise.intensity")], { state: v => F.pct(v["fx.noise.int"]), src: "effects.retro.noise" }),
        fx("flick", "Flicker", "sun", "fx.flick.on", "c-flick", [
          sl("fx.flick.int", "Intensidad", "sun", 0, 1, 0.01, F.pct, "effects.retro.flicker.intensity"),
          sl("fx.flick.speed", "Velocidad", "play", 0.3, 3, 0.1, F.x, "effects.retro.flicker.speed"),
        ], { state: v => F.pct(v["fx.flick.int"]), src: "effects.retro.flicker" }),
        fx("chroma", "Aberración", "blend", "fx.chroma.on", "c-chroma", [sl("fx.chroma.int", "Intensidad", "blend", 0, 1, 0.01, F.pct, "effects.retro.chromaticAberration.intensity")], { state: v => F.pct(v["fx.chroma.int"]), src: "effects.retro.chromaticAberration" }),
      )] },
    ] },
    allText: { id: "allText", label: "Textos", icon: "case", family: "card", cards: [
      { id: "color", title: "Color de todos los textos", icon: "palette", controls: [
        co("allText.color", "Color", "textColor", { auto: true, inheritLabel: "Automático", tip: "También tiñe íconos de Links y el borde de la foto" }),
      ] },
      { id: "align", title: "Alineación y espaciado", icon: "align-center", controls: [
        sg("allText.align", "Alineación", [{ id: "left", icon: "align-left", label: "" }, { id: "center", icon: "align-center", label: "" }, { id: "right", icon: "align-right", label: "" }], "textAlign"),
        sl("allText.monoLh", "Interlineado secundario", "height", 0.9, 2, 0.05, F.lh, "monoLineHeight (@usuario, Frase, Ubicación, Visitas)", { nullLabel: "normal", tip: "@usuario, Frase, Ubicación y Visitas" }),
      ] },
      { id: "fx", title: "Efectos de todos los textos", icon: "sparkles", controls: [tiles(
        fx("shadow", "Sombra", "moon", "allText.shadow.on", "t-shadow", [
          co("allText.shadow.color", "Color", "effects.text.shadow.color"),
          sl("allText.shadow.op", "Opacidad", "eye", 0, 1, 0.01, F.pct, "effects.text.shadow.opacity"),
          sl("allText.shadow.blur", "Blur", "blend", 0, 20, 1, F.px, "effects.text.shadow.blur"),
          { t: "offset", kx: "allText.shadow.x", ky: "allText.shadow.y", min: -20, max: 20, src: "effects.text.shadow.offsetX/offsetY" },
        ], { state: v => F.px(v["allText.shadow.blur"]), src: "effects.text.shadow" }),
        fx("glow", "Brillo", "sun", "allText.glow.on", "t-glow", [
          co("allText.glow.color", "Color", "effects.text.glow.color"),
          sl("allText.glow.int", "Intensidad", "sun", 0.01, 1, 0.01, F.pct, "effects.text.glow.intensity"),
          sl("allText.glow.r", "Radio", "maximize", 0, 40, 1, F.px, "effects.text.glow.radius"),
        ], { state: v => F.pct(v["allText.glow.int"]), src: "effects.text.glow" }),
        fx("stroke", "Contorno", "frame", "allText.stroke.on", "t-stroke", [
          co("allText.stroke.color", "Color", "effects.text.stroke.color"),
          sl("allText.stroke.w", "Grosor", "frame", 0.5, 4, 0.5, F.px, "effects.text.stroke.width"),
        ], { state: v => F.px(v["allText.stroke.w"]), src: "effects.text.stroke" }),
        fx("blur", "Desenfoque", "blend", "allText.blur.on", "t-blur", [sl("allText.blur", "Intensidad", "blend", 0, 8, 0.5, F.px, "effects.text.blur")], { state: v => F.px(v["allText.blur"]), src: "effects.text.blur (0 = borra)" }),
      )] },
    ] },

    // ── free elements ─────────────────────────────────────────────
    text: { id: "text", label: "Texto", icon: "text", family: "el", cards: [
      { id: "content", title: "Contenido", icon: "text", pinned: true, controls: [{ t: "text", k: "text.content", placeholder: "Escribí el texto", area: true, big: true, fontKey: "text.font", src: "content", tip: "Doble click en la sala para editarlo ahí" }] },
      { id: "type", title: "Tipografía", icon: "case", controls: [
        { t: "font", k: "text.font", label: "Fuente", sample: "text.content", src: "font" },
        sl("text.size", "Tamaño", "maximize", 10, 300, 1, F.px, "size"),
        sl("text.ls", "Interletrado", "spacing", -10, 60, 0.5, F.px, "letterSpacing"),
        sg("text.upper", "Mayúsculas", [{ id: false, label: "Aa" }, { id: true, label: "AA" }], "uppercase"),
      ] },
      { id: "color", title: "Color", icon: "palette", controls: [
        co("text.color", "Color", "color"),
        sl("text.op", "Opacidad", "eye", 0.05, 1, 0.01, F.pct, "opacity"),
      ] },
      { id: "measures", title: "Medidas", icon: "move", open: false, controls: [{ t: "measures", fields: [["text.x", "X", 0, 2000], ["text.y", "Y", -400, 2000], ["text.rot", "Rotación", -180, 180]], src: "x, y, rotation (setElementGeometry)" }] },
    ] },
    image: { id: "image", label: "Imagen", icon: "image", family: "el", cards: [
      { id: "src", title: "Imagen", icon: "image", pinned: true, controls: [{ t: "upload", k: "image.src", kind: "cover", label: "Reemplazar", accept: "image/*", noRemove: true, src: "src (onReplace)" }] },
      { id: "shape", title: "Esquinas", icon: "corner", controls: [{ t: "corners", k: "image.radius", src: "borderRadius 0 / 8 / 20 / 999" }] },
      { id: "link", title: "Link", icon: "link", controls: [{ t: "text", k: "image.link", placeholder: "https://", mono: true, src: "linkUrl", tip: "Con un link, se puede tocar en tu perfil" }] },
      { id: "measures", title: "Medidas", icon: "move", open: false, controls: [{ t: "measures", fields: [["image.x", "X", 0, 2000], ["image.y", "Y", -400, 2000], ["image.w", "Ancho", 24, 1200], ["image.h", "Alto", 24, 1200], ["image.rot", "Rotación", -180, 180]], src: "x, y, w, h, rotation" }] },
    ] },
    music: { id: "music", label: "Music", icon: "music", family: "el",
      cards: [
      { id: "content", title: "Canción", icon: "disc", pinned: true, controls: [
        { t: "upload", k: "music.audio", kind: "audio", label: "Subir MP3", accept: "audio/mpeg,.mp3", src: "audioUrl" },
        { t: "text", k: "music.title", label: "Título", placeholder: "Título", src: "title" },
        { t: "text", k: "music.artist", label: "Artista", placeholder: "Artista", src: "artist" },
        sl("music.vol", "Volumen inicial", "volume", 0, 1, 0.01, F.pct, "volume"),
      ] },
      { id: "bg", title: "Fondo", icon: "palette", controls: [
        co("music.bg.color", "Color", "effects.bg.color", { alpha: true, clearable: true }),
        sl("music.bg.op", "Opacidad", "eye", 0, 1, 0.01, F.pct, "effects.bg.opacity"),
        tiles(
          fx("grad", "Gradiente", "palette", "music.grad.on", "c-grad", [
            co("music.grad.a", "Color A", "effects.gradient.from"), co("music.grad.b", "Color B", "effects.gradient.to"),
            sl("music.grad.angle", "Ángulo", "rotate", 0, 360, 5, F.deg, "effects.gradient.angle"),
            sl("music.grad.op", "Opacidad", "eye", 0, 1, 0.01, F.pct, "effects.gradient.opacity"),
          ], { state: v => F.deg(v["music.grad.angle"]), src: "effects.gradient" }),
          fx("glass", "Vidrio", "blend", "music.glass", "c-glass", [], { state: () => "Translúcido", src: "effects.bg.glass" }),
          fx("blur", "Desenfoque", "blend", "music.blur.on", "c-blur", [sl("music.blur", "Blur", "blend", 0, 24, 1, F.px, "effects.bg.blur")], { state: v => F.px(v["music.blur"]), src: "effects.bg.blur" }),
        ),
        { t: "upload", k: "music.bg.img", kind: "cover", label: "Imagen de fondo", accept: "image/*", compact: true, src: "bgImage + effects.bg.image" },
      ] },
      { id: "text", title: "Texto", icon: "case", controls: [
        { t: "font", k: "music.font", label: "Fuente", fonts: "music", sample: "music.title", src: "font (vacío = Predeterminada)" },
        co("music.text.color", "Color", "textColor"),
        sl("music.text.size", "Tamaño", "maximize", 7, 18, 1, F.mus, "textSize (8 = 100%)", { warnWhen: v => v["music.text.size"] > 8, warn: "Agrandá el bloque si no entra" }),
      ] },
      { id: "light", title: "Luz", icon: "sun", controls: [tiles(
        fx("glow", "Glow", "sun", "music.glow.on", "c-glow", [
          sg("music.glow.mode", "Dónde", [{ id: "outer", label: "Exterior" }, { id: "inner", label: "Interior" }, { id: "both", label: "Ambos" }], "effects.glow.outer / inner"),
          co("music.glow.color", "Color", "effects.glow.color"),
          sl("music.glow.int", "Intensidad", "sun", 0.01, 1, 0.01, F.pct, "effects.glow.intensity"),
        ], { state: v => ({ outer: "Exterior", inner: "Interior", both: "Ambos" })[v["music.glow.mode"]], src: "effects.glow" }),
        fx("shadow", "Sombra", "moon", "music.shadow.on", "c-shadow", [
          co("music.shadow.color", "Color", "effects.shadow.color"),
          sl("music.shadow.int", "Intensidad", "moon", 0.01, 1, 0.01, F.pct, "effects.shadow.intensity"),
        ], { state: v => F.pct(v["music.shadow.int"]), offState: "Sombra base sutil", src: "effects.shadow" }),
        fx("border", "Borde", "frame", "music.border.on", "c-border", [
          co("music.border.color", "Color", "effects.border.color", { alpha: true, clearable: true }),
          sl("music.border.w", "Grosor", "frame", 0, 6, 0.5, F.px, "effects.border.width"),
          sl("music.border.r", "Radio", "corner", 0, 60, 1, F.px, "effects.border.radius"),
        ], { state: v => F.px(v["music.border.w"]), src: "effects.border" }),
      )] },
      { id: "motion", title: "Movimiento y cursor", icon: "move", controls: [tiles(
        fx("float", "Flotar", "arrow-up", "music.float.on", "c-float", [
          sl("music.float.h", "Altura", "height", 2, 24, 1, F.px, "effects.animations.floatHeight"),
          sl("music.float.s", "Ciclo", "rotate", 1, 8, 0.5, F.s, "effects.animations.floatSpeed"),
        ], { state: v => F.px(v["music.float.h"]), src: "effects.animations.floating" }),
        fx("tilt", "Inclinar 3D", "move", "music.tilt.on", "c-tilt", [sl("music.tilt.int", "Intensidad", "move", 1, 15, 0.5, F.deg, "effects.interactions.tiltIntensity")], { state: v => F.deg(v["music.tilt.int"]), src: "effects.interactions.tilt3d" }),
        fx("spot", "Spotlight", "sun", "music.spot.on", "c-spot", [
          co("music.spot.color", "Color", "effects.interactions.spotlightColor", { alpha: true, clearable: true }),
          sl("music.spot.size", "Radio", "maximize", 20, 100, 1, F.pct100, "effects.interactions.spotlightSize"),
        ], { state: v => F.pct100(v["music.spot.size"]), src: "effects.interactions.spotlight" }),
        fx("hglow", "Glow al pasar", "pointer", "music.hover.glow", "c-hglow", [], { state: () => "Al pasar", src: "effects.interactions.hoverGlow" }),
      )] },
      { id: "measures", title: "Medidas", icon: "move", open: false, controls: [{ t: "measures", fields: [["music.x", "X", 0, 2000], ["music.y", "Y", -400, 2000], ["music.w", "Ancho", 200, 600], ["music.h", "Alto", 56, 400], ["music.rot", "Rotación", -180, 180]], src: "x, y, w, h, rotation" }] },
    ] },
    room: { id: "room", label: "Tu sala", icon: "gear", family: "room", cards: [
      { id: "bg", title: "Fondo", icon: "palette", controls: [
        co("room.bg", "Color", "set_bg"),
        { t: "upload", k: "room.wall", kind: "cover", label: "Subir wallpaper", accept: "image/*", src: "set_wallpaper", tip: "Se muestra encima del color" },
        sl("room.blur", "Desenfoque", "blend", 0, 40, 1, F.px, "set_wallpaper_blur"),
        sl("room.bright", "Brillo", "sun", 0, 200, 1, F.pct100, "set_wallpaper_brightness"),
        sl("room.vig", "Viñetado", "frame", 0, 100, 1, F.num, "set_wallpaper_vignette"),
        { t: "action", label: "Restablecer fondo", icon: "reset", act: "resetRoom", when: v => v["room.wall"] || v["room.bg"] !== "#0a0a0c" || v["room.blur"] || v["room.bright"] !== 100 || v["room.vig"], src: "5 ops: wallpaper '', bg #0a0a0c, blur 0, brillo 100, viñetado 0" },
      ] },
      { id: "ambient", title: "Ambiente", icon: "music", controls: [
        { t: "upload", k: "room.music", kind: "audio", label: "Música de la sala", accept: ".mp3", src: "set_space_music" },
        { t: "upload", k: "room.font", kind: "font", label: "Fuente global", accept: ".woff2,.woff,.ttf,.otf", src: "set_space_font" },
        { t: "upload", k: "room.cursor", kind: "cursor", label: "Cursor", accept: "image/png", src: "set_space_cursor" },
      ] },
      { id: "canvas", title: "Lienzo", icon: "frame", controls: [
        sw("room.grid", "Mostrar cuadrícula", "frame", "preferencia local", { tip: "Solo se ve mientras editás" }),
        sw("room.snap", "Ajustar a la cuadrícula", "move", "preferencia local", { tip: "Mantené Mayús al arrastrar para moverlo libre" }),
        { t: "warn", when: v => v["room.snap"] && !v["room.grid"], text: "La cuadrícula está oculta" },
      ] },
      { id: "look", title: "Apariencia del editor", icon: "sun", controls: [
        sg("room.theme", "Tema", [{ id: "light", icon: "sun", label: "Claro" }, { id: "dark", icon: "moon", label: "Oscuro" }, { id: "og", label: "OG" }], "useEditorTheme (solo el editor)"),
      ] },
    ] },
  };

  const CARD_PARTS = ["photo", "name", "handle", "descriptor", "location", "bio", "views", "links", "logo", "|", "cardBg", "cardFx", "allText"];

  const roleD = (id, font, size, weight, extra) => Object.assign({
    [`${id}.font`]: font, [`${id}.size`]: size, [`${id}.weight`]: weight, [`${id}.ls`]: 0, [`${id}.color`]: null,
    [`${id}.grad.on`]: false, [`${id}.grad.stops`]: ["#ffffff", "#8a8a96"], [`${id}.grad.angle`]: 90,
    [`${id}.shim.on`]: false, [`${id}.shim.int`]: 0.45, [`${id}.shim.speed`]: 1,
  }, extra);
  const blockD = k => ({ [`block.${k}.on`]: false, [`block.${k}.bg`]: null, [`block.${k}.icon`]: null, [`block.${k}.radius`]: 8 });

  // Repo defaults (what "modificado" compares against).
  const D = Object.assign({},
    { "name.text": "", "handle.text": "mara", "descriptor.text": "", "location.text": "", "bio.text": "", "views.show": false, "views.label": "1.284 visitas", "views.count": 1284 },
    roleD("name", "DM Sans", 15, 400, { "name.lh": 1.15, "name.let.on": false, "name.let.amp": 4, "name.let.speed": 1, "name.let.stagger": 0.05 }),
    roleD("handle", "Space Mono", 11, 400), roleD("descriptor", "Space Mono", 11, 400), roleD("location", "Space Mono", 10, 400),
    roleD("bio", "Space Mono", 11, 400, { "bio.lh": 1.5 }), roleD("views", "Space Mono", 10, 400),
    blockD("identity"), blockD("location"), blockD("views"), blockD("links"),
    { "photo.src": null, "photo.size": 88, "photo.radius": 100,
      "photo.border.on": true, "photo.border.color": null, "photo.border.w": 2, "photo.border.op": 1,
      "photo.shadow.on": false, "photo.shadow.color": null, "photo.shadow.int": 0.5,
      "photo.glow.on": false, "photo.glow.color": "#FFFFFF", "photo.glow.int": 0.5, "photo.glow.r": 12, "photo.glow.pulse": false, "photo.glow.speed": 1 },
    { "links.items": [], "links.size": 20 },
    { "logo.src": null, "logo.w": 48, "logo.h": 48, "logo.rot": 0, "logo.op": 1, "logo.z": 0 },
    { "cardBg.color": "rgba(255,255,255,0.055)", "cardBg.op": 1, "cardBg.img": null,
      "cardBg.grad.on": false, "cardBg.grad.a": "#0f0f0f", "cardBg.grad.b": "#1a1a2e", "cardBg.grad.angle": 135, "cardBg.grad.op": 0.6,
      "cardBg.glass": false, "cardBg.blur.on": false, "cardBg.blur": 0, "cardBg.radius": 14, "card.w": 320, "card.h": 470 },
    { "fx.border.on": true, "fx.border.color": "rgba(255,255,255,0.08)", "fx.border.w": 1, "fx.border.op": 1,
      "fx.shadow.on": false, "fx.shadow.int": 0.5, "fx.shadow.color": "#000000", "fx.shadow.blur": 20, "fx.shadow.x": 0, "fx.shadow.y": 4, "fx.shadow.op": 0.5,
      "fx.glow.on": false, "fx.glow.mode": "outer", "fx.glow.color": "#a855f7", "fx.glow.int": 0.5, "fx.glow.r": 15,
      "fx.pulse.on": false, "fx.pulse.speed": 1, "fx.float.on": false, "fx.float.h": 8, "fx.float.s": 3, "fx.tilt.on": false, "fx.tilt.int": 10,
      "fx.hover.glow": false, "fx.hover.scale.on": false, "fx.hover.scale": 1.05, "fx.spot.on": false, "fx.spot.color": "rgba(255,255,255,0.12)", "fx.spot.size": 65,
      "fx.scan.on": false, "fx.scan.int": 0.5, "fx.noise.on": false, "fx.noise.int": 0.5, "fx.flick.on": false, "fx.flick.int": 0.5, "fx.flick.speed": 1, "fx.chroma.on": false, "fx.chroma.int": 0.4 },
    { "allText.color": null, "allText.align": "left", "allText.monoLh": null,
      "allText.shadow.on": false, "allText.shadow.color": "#000000", "allText.shadow.op": 0.5, "allText.shadow.blur": 4, "allText.shadow.x": 0, "allText.shadow.y": 2,
      "allText.glow.on": false, "allText.glow.color": "#FFFFFF", "allText.glow.int": 0.5, "allText.glow.r": 8,
      "allText.stroke.on": false, "allText.stroke.color": "#000000", "allText.stroke.w": 1, "allText.blur.on": false, "allText.blur": 0 },
    { "text.content": "text", "text.font": "DM Sans", "text.size": 48, "text.ls": 0, "text.upper": false, "text.color": "#ffffff", "text.op": 1, "text.x": 0, "text.y": 0, "text.rot": 0, "text.locked": false, "text.layer": 1 },
    { "image.src": null, "image.radius": 8, "image.link": "", "image.x": 0, "image.y": 0, "image.w": 160, "image.h": 160, "image.rot": 0, "image.locked": false, "image.layer": 1 },
    { "music.audio": null, "music.title": "", "music.artist": "", "music.vol": 1, "music.x": 0, "music.y": 0, "music.w": 240, "music.h": 76, "music.rot": 0, "music.locked": false, "music.layer": 1,
      "music.bg.color": "rgba(255,255,255,0.055)", "music.bg.op": 1, "music.bg.img": null, "music.grad.on": false, "music.grad.a": "#0f0f0f", "music.grad.b": "#1a1a2e", "music.grad.angle": 135, "music.grad.op": 0.6,
      "music.glass": false, "music.blur.on": false, "music.blur": 0, "music.font": "", "music.text.color": "#ffffff", "music.text.size": 8,
      "music.glow.on": true, "music.glow.mode": "outer", "music.glow.color": "#a855f7", "music.glow.int": 0.5, "music.shadow.on": false, "music.shadow.color": "#000000", "music.shadow.int": 0.5,
      "music.border.on": true, "music.border.color": "rgba(255,255,255,0.08)", "music.border.w": 1, "music.border.r": 10,
      "music.float.on": false, "music.float.h": 8, "music.float.s": 3, "music.tilt.on": false, "music.tilt.int": 5, "music.spot.on": false, "music.spot.color": "rgba(255,255,255,0.12)", "music.spot.size": 65, "music.hover.glow": false },
    { "room.bg": "#0a0a0c", "room.wall": null, "room.blur": 0, "room.bright": 100, "room.vig": 0, "room.music": null, "room.font": null, "room.cursor": null, "room.grid": false, "room.snap": false, "room.theme": "dark" },
  );

  // A realistic, already-customised sala (sample session).
  const SAMPLE = {
    "name.text": "Mara Ibáñez", "descriptor.text": "diseñadora · dj de madrugada", "location.text": "La Plata, Buenos Aires",
    "bio.text": "Hago fanzines, mezclo vinilos y junto plantas raras.", "views.show": true,
    "name.font": "Syne", "name.size": 28, "name.weight": 800, "name.ls": -0.6, "name.lh": 1.05,
    "name.grad.on": true, "name.grad.stops": ["#FF4F94", "#7C5CFF"], "name.grad.angle": 100,
    "handle.color": "#8E5E86", "descriptor.size": 12, "bio.font": "Newsreader", "bio.size": 15, "bio.lh": 1.4, "views.weight": 700,
    "photo.src": "assets/ld-card-user.png", "photo.size": 104, "photo.border.w": 3, "photo.border.color": "#FFFFFF",
    "photo.glow.on": true, "photo.glow.color": "#FF4F94", "photo.glow.int": 0.55, "photo.glow.r": 22, "photo.glow.pulse": true,
    "links.items": [{ id: "l1", url: "instagram.com/mara.ib" }, { id: "l2", url: "soundcloud.com/maradj" }, { id: "l3", url: "mara.land" }],
    "logo.src": "assets/logo.png", "logo.w": 40, "logo.h": 32, "logo.rot": -8,
    "cardBg.color": "#FFF7FB", "cardBg.op": 0.92, "cardBg.glass": true, "cardBg.radius": 30,
    "fx.border.color": "#FFFFFF", "fx.border.w": 1.5, "fx.border.op": 0.9, "fx.shadow.on": true, "fx.shadow.int": 0.45, "fx.shadow.color": "#5B1A40", "fx.shadow.blur": 48, "fx.shadow.y": 18, "fx.shadow.op": 0.35,
    "fx.float.on": true, "fx.float.h": 6, "fx.float.s": 4.5, "fx.spot.on": true,
    "allText.color": "#2A1630", "allText.align": "center",
    "text.content": "hola, pasá", "text.font": "Pacifico", "text.size": 44, "text.color": "#FFFFFF", "text.rot": -6, "text.x": 212, "text.y": 168,
    "image.src": "assets/ld-card-user.png", "image.radius": 20, "image.x": 1048, "image.y": 140, "image.w": 150, "image.h": 150, "image.rot": 5, "image.layer": 0,
    "music.audio": "madrugada.mp3", "music.title": "Madrugada", "music.artist": "mara b2b sol", "music.vol": 0.7, "music.x": 196, "music.y": 520,
    "music.bg.color": "#1C0F24", "music.bg.op": 0.9, "music.glow.color": "#FF4F94", "music.glow.int": 0.35, "music.border.r": 22,
    "room.bg": "#3A1E3F", "room.vig": 28, "room.grid": false,
  };

  // Layer names (layerOrder.ts LAYER_NAMES) — 0 back.
  const LAYER_NAMES = ["Fondo", "Medio", "Frente"];
  const PLATFORMS = [["instagram", "Instagram"], ["soundcloud", "SoundCloud"], ["spotify", "Spotify"], ["youtube", "YouTube"], ["tiktok", "TikTok"], ["github", "GitHub"], ["twitch", "Twitch"], ["x.com", "X"], ["twitter", "X"]];
  const detectPlatform = url => { const u = (url || "").toLowerCase(); const p = PLATFORMS.find(([k]) => u.includes(k)); return p ? p[1] : "Web"; };

  window.MYLAND_MENU = { F, FONTS, MUSIC_FONTS, OBJECTS, CARD_PARTS, D, SAMPLE, LAYER_NAMES, detectPlatform };
})();
