/* Clearby section: parallax, reveals, the phone app you can tap through, the tracking set piece, the scale, the forms. No frameworks. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const CB = window.CB || { prices: {} };

  // menu
  const burger = $(".cb-burger"), nav = $("#cbNav");
  burger?.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", open);
    nav.classList.toggle("open", open);
  });

  // reveal on scroll, with a safety net
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));
  setTimeout(() => $$(".reveal:not(.in)").forEach((el) => { if (el.getBoundingClientRect().top < innerHeight * 1.2) el.classList.add("in"); }), 400);
  setTimeout(() => $$(".reveal:not(.in)").forEach((el) => el.classList.add("in")), 6000);

  // parallax: each [data-parallax] drifts by its distance from the viewport centre times its speed
  const items = $$("[data-parallax]").map((el) => ({ el, speed: parseFloat(el.dataset.parallax) || 0 }));
  const track = $("[data-track]");
  const tl = track ? $$(".cb-timeline li", track) : [];
  const trackVan = track ? $("[data-track-van]", track) : null;
  const trackPath = track ? $("[data-track-path]", track) : null;
  const trackDraw = track ? $("[data-track-draw]", track) : null;
  const trackEta = track ? $("[data-track-eta]", track) : null;
  const trackState = track ? $("[data-track-state]", track) : null;
  let pathLen = 0;
  if (trackPath) { pathLen = trackPath.getTotalLength(); if (trackDraw) { trackDraw.style.strokeDasharray = pathLen; trackDraw.style.strokeDashoffset = pathLen; } }
  const etas = ["Booked", "12 min", "6 min", "Here", "Done"];
  const states = ["Van assigned", "On the way", "Nearly there", "Loading", "All done"];
  let ticking = false;
  function frame() {
    ticking = false;
    const vh = innerHeight;
    items.forEach(({ el, speed }) => {
      const r = el.getBoundingClientRect();
      const c = r.top + r.height / 2 - vh / 2;
      if (c > vh * 1.5 || c < -vh * 1.5) return;
      el.style.transform = `translate3d(0, ${(c * speed).toFixed(1)}px, 0)`;
    });
    if (track) {
      const r = track.getBoundingClientRect();
      const pinned = track.offsetHeight > vh * 1.5;
      const p = pinned ? clamp(-r.top / (track.offsetHeight - vh), 0, 1) : clamp((vh - r.top) / (r.height + vh * 0.2), 0, 1);
      const step = Math.min(tl.length - 1, Math.floor(p * tl.length));
      tl.forEach((li, i) => li.classList.toggle("on", i <= step));
      if (trackPath && trackVan) {
        const pt = trackPath.getPointAtLength(pathLen * clamp(p * 1.15, 0, 1));
        const ahead = trackPath.getPointAtLength(Math.min(pathLen, pathLen * clamp(p * 1.15, 0, 1) + 2));
        const ang = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
        trackVan.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
        if (trackDraw) trackDraw.style.strokeDashoffset = pathLen - pathLen * clamp(p * 1.15, 0, 1);
      }
      if (trackEta) trackEta.textContent = etas[Math.min(etas.length - 1, step)];
      if (trackState) trackState.textContent = states[Math.min(states.length - 1, step)];
    }
  }
  if (!reduce) {
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    addEventListener("resize", frame);
    requestAnimationFrame(frame);
  } else { tl.forEach((li) => li.classList.add("on")); }

  // hero route draws itself
  const route = $("[data-route-draw]");
  if (route && !reduce) {
    const len = route.getTotalLength();
    route.style.strokeDasharray = len; route.style.strokeDashoffset = len;
    route.style.transition = "stroke-dashoffset 2.6s cubic-bezier(.22,.61,.36,1) .3s";
    requestAnimationFrame(() => requestAnimationFrame(() => { route.style.strokeDashoffset = 0; }));
  }

  // phone tilt follows the pointer on desktop
  const phone = $("[data-tilt]");
  if (phone && !reduce && matchMedia("(hover: hover)").matches) {
    const zone = phone.closest(".cb-hero") || phone.parentElement;
    zone.addEventListener("pointermove", (e) => {
      if (phone.querySelector(".is-live")) { phone.style.transform = ""; return; } // a tilted live app is hard to tap
      const r = phone.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      phone.style.transform = `perspective(1400px) rotateY(${(dx * 7).toFixed(2)}deg) rotateX(${(-dy * 7).toFixed(2)}deg)`;
    });
    zone.addEventListener("pointerleave", () => { phone.style.transform = ""; });
  }

  // the scale: weighs when it scrolls into view
  const scale = $("[data-scale]");
  if (scale) {
    const num = $("[data-scale-num]", scale);
    const target = parseFloat(scale.dataset.scale) || 48.2;
    const sio = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      sio.disconnect();
      scale.classList.add("on");
      if (reduce) { num.textContent = target.toFixed(1); return; }
      const t0 = performance.now();
      (function tick(t) {
        const p = clamp((t - t0 - 500) / 1700, 0, 1);
        const e = 1 - Math.pow(1 - p, 3);
        num.textContent = Math.max(0, target * e + (p < 1 ? (Math.random() - 0.5) * (1 - p) * 2 : 0)).toFixed(1);
        if (p < 1) requestAnimationFrame(tick); else num.textContent = target.toFixed(1);
      })(t0);
    }, { threshold: 0.5 });
    sio.observe(scale);
  }

  // counters
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target; cio.unobserve(el);
      const target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || "", prefix = el.dataset.prefix || "";
      const dec = (el.dataset.count.split(".")[1] || "").length;
      if (reduce) { el.textContent = prefix + target.toFixed(dec) + suffix; return; }
      const t0 = performance.now();
      (function tick(t) {
        const p = clamp((t - t0) / 1500, 0, 1);
        el.textContent = prefix + (target * (1 - Math.pow(1 - p, 3))).toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.5 });
  $$("[data-count]").forEach((el) => cio.observe(el));

  // ---- the phone app you can tap through
  const app = $("[data-app]");
  if (app) {
    const P = CB.prices || {};
    const loads = Object.keys(P).map((id) => ({ id, ...P[id] }));
    const state = { kind: "rubbish", load: null, day: "Tomorrow", win: "10:00 to 12:00", metals: new Set(["Copper"]), kg: 40, timer: null };
    const screens = $$(".scr", app);
    const hint = $(".scr__hint", app);
    const show = (name) => {
      screens.forEach((s) => s.classList.toggle("on", s.dataset.scr === name));
      hint?.classList.toggle("hide", name !== "home");
      if (name !== "track") stopTrack();
      if (name === "track") startTrack();
    };
    const price = () => state.load ? state.load.household : 0;
    const bandFor = () => {
      // Indicative only. The app prices on the day from the scales. These are rounded reference bands so the flow makes sense.
      const perKg = { Copper: [7.2, 8.6], Brass: [4.0, 4.8], Lead: [1.3, 1.6], Aluminium: [0.6, 0.9], Cable: [2.4, 3.6], "Stainless": [0.8, 1.2] };
      let lo = 0, hi = 0;
      const n = state.metals.size || 1;
      state.metals.forEach((m) => { const b = perKg[m] || [0.3, 0.6]; lo += b[0] / n; hi += b[1] / n; });
      return [Math.round(lo * state.kg), Math.round(hi * state.kg)];
    };
    const render = () => {
      $$("[data-out]", app).forEach((el) => {
        const k = el.dataset.out;
        if (k === "load") el.textContent = state.load ? state.load.name : "Pick a size";
        if (k === "price") el.textContent = state.load ? `£${price()}` : "";
        if (k === "slot") el.textContent = `${state.day}, ${state.win}`;
        if (k === "kg") el.textContent = `${state.kg} kg`;
        if (k === "band") { const [a, b] = bandFor(); el.textContent = `£${a} to £${b}`; }
        if (k === "metals") el.textContent = [...state.metals].join(", ") || "Pick a metal";
        if (k === "kindTitle") el.textContent = state.kind === "scrap" ? "Weigh & Pay" : state.kind === "mixed" ? "Rubbish and scrap" : "Rubbish removal";
      });
      $$("[data-load]", app).forEach((b) => b.classList.toggle("sel", state.load && b.dataset.load === state.load.id));
      $$("[data-day]", app).forEach((b) => b.classList.toggle("sel", b.dataset.day === state.day));
      $$("[data-win]", app).forEach((b) => b.classList.toggle("sel", b.dataset.win === state.win));
      $$("[data-metal]", app).forEach((b) => b.classList.toggle("sel", state.metals.has(b.dataset.metal)));
      const next = $("[data-go='slot']", app); if (next) next.disabled = !state.load;
      const wpNext = $("[data-go='wpslot']", app); if (wpNext) wpNext.disabled = !state.metals.size;
    };
    // build the load list from the real price ladder
    const list = $("[data-loads]", app);
    if (list) list.innerHTML = loads.map((l) => `<button type="button" data-load="${l.id}"><span>${l.name}<small>${l.yards} cu yd &middot; ${l.fits.split(",")[0].replace(/\.$/, "")}</small></span><em>£${l.household}</em></button>`).join("");
    app.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.kind) { state.kind = b.dataset.kind; show(state.kind === "scrap" ? "wp" : "size"); }
      else if (b.dataset.load) { state.load = loads.find((l) => l.id === b.dataset.load); }
      else if (b.dataset.day) state.day = b.dataset.day;
      else if (b.dataset.win) state.win = b.dataset.win;
      else if (b.dataset.metal) { state.metals.has(b.dataset.metal) ? state.metals.delete(b.dataset.metal) : state.metals.add(b.dataset.metal); }
      else if (b.dataset.kg) state.kg = clamp(state.kg + +b.dataset.kg, 5, 500);
      else if (b.dataset.go) show(b.dataset.go);
      render();
    });
    // tracking: the van drives to the pin, the status fills, then the receipt
    const tScr = $("[data-scr='track']", app);
    const tPath = tScr && $("[data-path]", tScr), tVan = tScr && $("[data-van]", tScr);
    const tBars = tScr ? $$(".scr__status i", tScr) : [];
    const tEta = tScr && $("[data-teta]", tScr), tMsg = tScr && $("[data-tmsg]", tScr);
    const tState = tScr && $("[data-tstate]", tScr), tLine = tScr && $("[data-tline]", tScr);
    const doneScr = $("[data-scr='done']", app);
    let raf = null;
    function startTrack() {
      if (!tPath || !tVan) return;
      const len = tPath.getTotalLength(); const t0 = performance.now(); const dur = reduce ? 10 : 7000;
      const msgs = state.kind === "scrap"
        ? ["Dan has your job", "Dan is on the way", "Dan is nearly with you", "Dan is weighing your metal"]
        : ["Dan has your job", "Dan is on the way", "Dan is nearly with you", "Dan is loading the van"];
      const states = ["Confirmed", "On the way", "On the way", "Loading"];
      const lines = state.kind === "scrap"
        ? ["Your slot is booked. Dan calls 30 minutes before.", "The van is heading to you now.", "The van is heading to you now.", "Weighed in front of you, paid by bank transfer."]
        : ["Your slot is booked. Dan calls 30 minutes before.", "The van is heading to you now.", "The van is heading to you now.", "The driver is loading. Nothing for you to do."];
      (function tick(t) {
        const p = clamp((t - t0) / dur, 0, 1);
        const pt = tPath.getPointAtLength(len * p), ah = tPath.getPointAtLength(Math.min(len, len * p + 1));
        const ang = Math.atan2(ah.y - pt.y, ah.x - pt.x) * 180 / Math.PI;
        tVan.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
        const step = Math.min(3, Math.floor(p * 4));
        tBars.forEach((bar, i) => bar.classList.toggle("on", i <= step));
        if (tEta) tEta.textContent = p >= 1 ? "With you" : step === 0 ? state.day : `${Math.max(1, Math.round(9 * (1 - p)))} min away`;
        if (tMsg) tMsg.textContent = msgs[step];
        if (tState) tState.textContent = states[step];
        if (tLine) tLine.textContent = lines[step];
        if (p < 1) raf = requestAnimationFrame(tick);
        else { raf = null; setTimeout(() => { if (tScr.classList.contains("on")) finish(); }, 1600); }
      })(t0);
    }
    function stopTrack() { if (raf) cancelAnimationFrame(raf); raf = null; }
    function finish() {
      if (!doneScr) return;
      const scrap = state.kind === "scrap";
      const [a, b] = bandFor(); const paid = Math.round((a + b) / 2);
      $("[data-done-title]", doneScr).textContent = scrap ? "Paid by bank transfer" : "All cleared";
      $("[data-done-sub]", doneScr).textContent = scrap ? `Weighed ${state.kg.toFixed(1)} kg on the van. The purchase statement is in your jobs.` : "Your receipt and waste transfer note are in your jobs.";
      $("[data-done-rows]", doneScr).innerHTML = scrap
        ? `<div><span>${[...state.metals].join(", ")}</span><b>${state.kg.toFixed(1)} kg</b></div><div><span>Paid to your account</span><b>£${paid}</b></div><div><span>Reference</span><b>CB-${Math.floor(1000 + Math.random() * 9000)}</b></div>`
        : `<div><span>${state.load ? state.load.name : "Load"}</span><b>£${price()}</b></div><div><span>${state.day}, ${state.win}</span><b>Done</b></div><div><span>Paid by card</span><b>£${price()}</b></div>`;
      show("done");
    }
    render(); show("home");

    // the real app: probe /app/preview/ first (9 s), then load it over the tap-through and fade it in.
    // If it does not answer, the tap-through stays and the switch never appears.
    const frame = $(".cb-screen__app", app);
    const modes = $("[data-app-mode]");
    if (frame && frame.dataset.src && window.fetch) {
      const setMode = (mode) => {
        const live = mode === "live";
        app.classList.toggle("is-live", live);
        if (live) frame.removeAttribute("tabindex"); else frame.setAttribute("tabindex", "-1");
        $$("[data-mode]", modes).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
      };
      // the app lays out for a 375px wide phone; scale it to whatever width the frame is
      const fit = () => frame.style.setProperty("--s", String(app.clientWidth / 375));
      fit();
      if (window.ResizeObserver) new ResizeObserver(fit).observe(app); else addEventListener("resize", fit);
      modes?.addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); });
      let started = false;
      const loadLive = () => {
        if (started) return; started = true;
        const ctrl = window.AbortController ? new AbortController() : null;
        const timer = setTimeout(() => ctrl?.abort(), 9000);
        fetch(frame.dataset.src.split("?")[0], { cache: "no-store", signal: ctrl?.signal })
          .then((res) => {
            clearTimeout(timer);
            if (!res.ok) return;
            frame.addEventListener("load", () => setTimeout(() => { if (modes) modes.hidden = false; setMode("live"); }, 700), { once: true });
            frame.src = frame.dataset.src;
          })
          .catch(() => clearTimeout(timer));
      };
      const lio = new IntersectionObserver((entries) => { if (entries.some((en) => en.isIntersecting)) { loadLive(); lio.disconnect(); } }, { rootMargin: "400px" });
      lio.observe(app);
    }
  }

  // inside the app: two tabs (arrow keys, #inside-customers / #inside-drivers), each a walkthrough where
  // the sticky phone shows the screen for whichever feature block is crossing the reading line
  const walk = $("[data-walk]");
  if (walk) {
    const tabs = $$("[role='tab']", walk);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));
    const setStep = (panel, i) => {
      $$(".cb-walk__screen img", panel).forEach((img, n) => img.classList.toggle("on", n === i));
      $$(".cb-walk__step", panel).forEach((li, n) => li.classList.toggle("on", n === i));
    };
    const select = (i, { focus = false, hash = true } = {}) => {
      tabs.forEach((t, n) => {
        const on = n === i;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        panels[n].hidden = !on;
      });
      if (focus) tabs[i].focus();
      if (hash && history.replaceState) history.replaceState(null, "", "#" + tabs[i].dataset.hash);
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(i));
      t.addEventListener("keydown", (e) => {
        const last = tabs.length - 1;
        const to = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
        if (to < 0) return;
        e.preventDefault();
        select(to, { focus: true });
      });
    });
    // the button at the end of each list switches side and goes back to the tabs
    $$("[data-walk-go]", walk).forEach((b) => b.addEventListener("click", () => {
      const i = tabs.findIndex((t) => t.getAttribute("aria-controls") === "walk-" + b.dataset.walkGo);
      select(i);
      $(".cb-tabs", walk).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      tabs[i].focus({ preventScroll: true });
    }));
    const fromHash = () => {
      const i = tabs.findIndex((t) => "#" + t.dataset.hash === location.hash);
      if (i < 0) return;
      select(i, { hash: false });
      const jump = () => walk.scrollIntoView({ block: "start" });
      jump();
      // images and fonts above the section can still shift it, so land again once the page has loaded
      if (document.readyState !== "complete") addEventListener("load", jump, { once: true });
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    // the reading line sits mid-screen on desktop, and just under the sticky phone on narrow screens
    const narrow = matchMedia("(max-width: 1000px)");
    let wio = null;
    const watch = () => {
      wio?.disconnect();
      wio = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const li = en.target;
          setStep(li.closest(".cb-walk"), +li.dataset.step);
        });
      }, { rootMargin: narrow.matches ? "-64% 0px -30% 0px" : "-48% 0px -48% 0px" });
      $$(".cb-walk__step", walk).forEach((li) => wio.observe(li));
    };
    watch();
    narrow.addEventListener?.("change", watch);
  }

  // forms: POST to the inbound endpoint when it is set; until then open the visitor's mail app with everything filled in
  $$("[data-cbform]").forEach((wrap) => {
    const form = $("form", wrap);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const subject = wrap.dataset.cbform === "driver" ? "Clearby: drive with us" : "Clearby early access";
      const lines = Object.entries(data).filter(([k]) => k !== "_hp").map(([k, v]) => `${k}: ${v}`).join("\n");
      if (CB.endpoint) {
        try {
          const res = await fetch(CB.endpoint, { method: "POST", body: new FormData(form) });
          if (res.ok) { wrap.classList.add("sent"); return; }
        } catch (_) { /* fall through to mail */ }
      }
      location.href = `mailto:${CB.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines + "\n\nSent from surreywaste.com/app/")}`;
      wrap.classList.add("sent");
    });
  });
})();
