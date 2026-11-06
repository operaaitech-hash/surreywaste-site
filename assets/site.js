(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // menu
  const burger = $(".burger"), nav = $("#nav");
  burger?.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", open);
    nav.classList.toggle("open", open);
  });

  // reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));
  // safety net: anything already on screen, or missed by the observer, shows after a moment
  setTimeout(() => $$(".reveal:not(.in)").forEach((el) => { if (el.getBoundingClientRect().top < innerHeight * 1.2) el.classList.add("in"); }), 400);
  setTimeout(() => $$(".reveal:not(.in)").forEach((el) => el.classList.add("in")), 6000);

  // scroll-driven pieces
  const scene = $("[data-scene]");
  const layers = scene ? $$("[data-speed]", scene) : [];
  const floaters = $$("[data-speed]").filter((el) => !scene || !scene.contains(el));
  const van = $("[data-drive]"), dash = $("[data-dash]");
  const marquee = $("[data-marquee]");
  const route = $("[data-route]");
  const routeFill = $("[data-route-fill]"), routeVan = $("[data-route-van]");
  const zones = route ? $$(".zone", route) : [];

  let ticking = false;
  function frame() {
    ticking = false;
    const y = scrollY, vh = innerHeight, vw = innerWidth;
    if (scene) {
      const h = scene.offsetHeight;
      if (y < h + 100) {
        layers.forEach((el) => { el.style.transform = `translate3d(0, ${y * +el.dataset.speed}px, 0)`; });
        if (van) {
          const p = clamp(y / (h * 0.8), 0, 1);
          const x = vw * (0.04 + p * 0.92) - (p * van.clientWidth);
          van.style.transform = `translate3d(${x}px, 0, 0)`;
          van.style.setProperty("--spin", `${x * 1.4}deg`);
          if (dash) dash.style.transform = `translate3d(${-(x * 1.6) % 96}px, 0, 0)`;
        }
      }
    }
    floaters.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const off = (r.top + r.height / 2 - vh / 2) * +el.dataset.speed;
      el.style.translate = `0 ${off}px`;
    });
    if (marquee) {
      const r = marquee.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) marquee.style.transform = `translate3d(${-((y * 0.45) % (marquee.scrollWidth / 2))}px, 0, 0)`;
    }
    if (route) {
      const r = route.getBoundingClientRect();
      const p = clamp(-r.top / (route.offsetHeight - vh), 0, 1);
      const step = Math.min(2, Math.floor(p * 3));
      if (route.dataset.step !== String(step)) {
        route.dataset.step = step;
        zones.forEach((z, i) => z.classList.toggle("is-on", i === step));
      }
      if (routeFill) routeFill.style.width = `${p * 100}%`;
      if (routeVan) {
        const track = routeVan.parentElement.clientWidth - routeVan.clientWidth;
        routeVan.style.transform = `translate3d(${p * track}px, 0, 0)`;
        routeVan.style.setProperty("--spin", `${p * 1440}deg`);
      }
    }
  }
  if (!reduce) {
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    addEventListener("resize", frame);
    if (van) {
      van.style.transform = "translate3d(-110%, 0, 0)";
      van.getBoundingClientRect();
      van.style.transition = "transform 1.6s cubic-bezier(.2, .8, .2, 1)";
      setTimeout(() => { van.style.transition = ""; }, 1700);
    }
    requestAnimationFrame(frame);
  } else if (route) {
    route.dataset.step = 0;
  }

  // banner tilt
  const tilt = $("[data-tilt]");
  if (tilt && !reduce && matchMedia("(pointer: fine)").matches) {
    tilt.addEventListener("pointermove", (e) => {
      const r = tilt.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `rotateY(${dx * 6}deg) rotateX(${-dy * 6}deg)`;
    });
    tilt.addEventListener("pointerleave", () => { tilt.style.transform = ""; });
  }

  // load estimator
  const MATS = {
    mixed: "general rubbish", rubble: "rubble and hardcore", timber: "garden waste and timber",
    board: "DIY waste and plasterboard", office: "furniture and fittings", metal: "scrap metal",
  };
  const SIZES = ["A quarter cage", "Half a cage", "Three-quarters of a cage", "A full cage"];
  const LIKE = [
    "Roughly a small refit, or a week of offcuts from one trade.",
    "Roughly a kitchen or bathroom strip-out.",
    "Roughly a shop unit or an office floor cleared.",
    "A full clear-out. Big sites may need more than one run.",
  ];
  const loader = $("[data-loader]");
  if (loader) {
    const load = $("[data-load]", loader), fill = $("[data-fill]", loader), out = $("[data-out]", loader);
    const warn = $("[data-warn]", loader), quote = $("[data-quote]", loader), priceEl = $("[data-price]", loader);
    const LVL_ID = ["", "quarter", "half", "three", "full"];
    let mat = "mixed";
    const seed = { mixed: 1, rubble: 2.3, timber: .6, board: 1.7, office: 2.9, metal: 3.6 };
    function heap(level) {
      const h = [0, 40, 78, 116, 150][level];
      const top = 212 - h, s = seed[mat];
      let d = `M48 216 L48 ${top + 10}`;
      for (let x = 48; x <= 384; x += 24) {
        const bump = Math.sin(x / 31 + s) * 7 + Math.cos(x / 13 + s * 2) * 4 - (level === 4 ? Math.sin((x - 48) / 336 * Math.PI) * 14 : 0);
        d += ` Q${x - 12} ${top + bump - 6} ${x} ${top + bump}`;
      }
      return d + " L384 216 Z";
    }
    function render() {
      const lvl = +fill.value;
      load.setAttribute("d", heap(lvl));
      load.setAttribute("fill", `url(#m-${mat})`);
      out.textContent = `${SIZES[lvl - 1]} of ${MATS[mat]}. ${LIKE[lvl - 1]}`;
      fill.setAttribute("aria-valuetext", SIZES[lvl - 1]);
      fill.style.setProperty("--pct", `${(lvl - 1) / 3 * 100}%`);
      warn.hidden = !((mat === "rubble" || mat === "metal") && lvl >= 3);
      const id = LVL_ID[lvl], pr = (window.SW.prices || {})[id];
      if (priceEl) {
        priceEl.innerHTML = mat === "metal"
          ? "<span>Scrap metal: larger loads collected at no charge, and valuable metal is paid for by bank transfer.</span>"
          : pr ? (loader.dataset.kind
              ? `<span><b>£${pr[loader.dataset.kind]}</b>fixed price</span><span>Loading and disposal included</span>`
              : `<span><b>£${pr.household}</b>private</span><span><b>£${pr.commercial}</b>commercial</span><span>Loading and disposal included</span>`) : "";
      }
      quote.href = `/book/?material=${mat}&load=${id}`;
    }
    $$("[data-mat]", loader).forEach((b) => b.addEventListener("click", () => {
      mat = b.dataset.mat;
      $$("[data-mat]", loader).forEach((o) => o.setAttribute("aria-checked", o === b));
      render();
    }));
    fill.addEventListener("input", render);
    render();
  }

  // job tracker plays when seen
  const track = $("[data-track]");
  if (track) {
    const items = $$("li", track);
    const play = () => {
      let i = 0;
      const tick = () => {
        items.forEach((li, j) => { li.classList.toggle("done", j < i); li.classList.toggle("now", j === i); });
        i++;
        if (i <= items.length) setTimeout(tick, reduce ? 0 : 900);
      };
      tick();
    };
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { play(); o.disconnect(); } }, { threshold: .5 }).observe(track);
  }

  // scale readout
  const scale = $("[data-scale]");
  if (scale) {
    const kg = $("[data-kg]", scale);
    new IntersectionObserver((es, o) => {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      scale.classList.add("on");
      const target = 23.6, t0 = performance.now();
      const step = (t) => {
        const p = reduce ? 1 : clamp((t - t0 - 450) / 1100, 0, 1);
        const wobble = p < 1 ? Math.sin(p * 18) * (1 - p) * 1.2 : 0;
        kg.textContent = Math.max(0, target * (1 - Math.pow(1 - p, 3)) + wobble).toFixed(1);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: .5 }).observe(scale);
  }

  // home quote widget
  const qw = $("[data-quote-widget]");
  if (qw) {
    const P = window.SW.prices || {};
    const upd = () => {
      const kind = qw.elements.type.value === "commercial" ? "commercial" : "household";
      $$("[data-qp]", qw).forEach((el) => { const pr = P[el.dataset.qp]; if (pr) el.textContent = `£${pr[kind]}`; });
      const pr = P[qw.elements.load.value];
      if (pr) {
        $("[data-q-price]", qw).textContent = `£${pr[kind]}`;
        $("[data-q-note]", qw).textContent = `${pr.name}, ${kind === "commercial" ? "commercial" : "private"}. Loading and disposal included.`;
      }
    };
    qw.addEventListener("change", upd);
    upd();
  }

  // prices tabs
  const tabs = $("[data-ptabs]");
  if (tabs) {
    const btns = $$("[role=tab]", tabs);
    const pick = (b, focus) => {
      btns.forEach((x) => {
        const on = x === b;
        x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) b.focus();
      $$(".ppanel:not([hidden]) .reveal").forEach((el) => el.classList.add("in"));
      history.replaceState(null, "", b.id === "tab-commercial" ? "#commercial" : "#private");
    };
    btns.forEach((b, i) => {
      b.addEventListener("click", () => pick(b));
      b.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") pick(btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length], true);
      });
    });
    if (location.hash === "#commercial") pick(btns[1]);
  }

  // booking flow: load -> details -> time slot (Calendly when configured)
  const form = $("[data-book]");
  if (form) {
    document.body.classList.add("is-booking");
    const P = window.SW.prices || {};
    const q = new URLSearchParams(location.search);
    const steps = $$("[data-step]", form);
    const dots = $$("[data-bk-steps] span");
    const kind = () => (form.elements.type.value === "Commercial" ? "commercial" : "household");
    const sel = () => form.querySelector('input[name="size"]:checked');
    const isMetal = () => form.elements.what.value === "Scrap metal";

    // prefill from links (?type=commercial&load=half&material=metal)
    if (/^(commercial|garage)$/.test(q.get("type") || "")) form.querySelector('input[name="type"][value="Commercial"]').checked = true;
    if (q.get("material") === "metal") form.querySelector('input[name="what"][value="Scrap metal"]').checked = true;
    const pre = q.get("load") && form.querySelector(`input[name="size"][data-id="${q.get("load")}"]`);
    if (pre) pre.checked = true;

    const summaryText = () => {
      const s = sel(), pr = s && P[s.dataset.id];
      if (isMetal()) return { big: "Scrap metal", small: "Collection booked; valuable metal paid by bank transfer" };
      if (!pr) return { big: "Price on arrival", small: "We'll size the load with you before we start" };
      return { big: `£${pr[kind()]}`, small: `${pr.name}, ${kind() === "commercial" ? "commercial" : "private"}. Loading and disposal included` };
    };
    const refresh = () => {
      $$("[data-p]", form).forEach((el) => { const pr = P[el.dataset.p]; if (pr) el.textContent = `£${pr[kind()]}`; });
      const t = summaryText();
      const html = `<div><small>Your price</small><b>${t.big}</b></div><small style="text-align:right;max-width:60%">${t.small}</small>`;
      $$("[data-summary],[data-summary2]", form).forEach((el) => { el.innerHTML = html; });
      form.elements.price_shown.value = `${t.big} (${t.small})`;
      $("[data-company]", form).hidden = kind() !== "commercial";
    };
    form.addEventListener("change", refresh);
    refresh();

    let cur = 1;
    const show = (n) => {
      cur = n;
      steps.forEach((el) => { el.hidden = el.dataset.step !== String(n); });
      dots.forEach((d, i) => { d.className = i + 1 < n || n === "done" ? "done" : i + 1 === n ? "on" : ""; });
      if (n === 3) openSlot();
      form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    };
    const valid = (n) => {
      for (const el of $$(`[data-step="${n}"] [required]`, form)) {
        if (!el.closest("[hidden]") && !el.reportValidity()) return false;
      }
      return true;
    };
    $$("[data-next]", form).forEach((b) => b.addEventListener("click", () => { if (valid(cur)) show(cur + 1); }));
    $$("[data-back]", form).forEach((b) => b.addEventListener("click", () => show(cur - 1)));

    const lines = () => {
      const out = [];
      for (const [k, v] of new FormData(form).entries()) {
        if (typeof v === "string" && v.trim()) out.push(`${form.querySelector(`[name="${k}"]`)?.dataset.label || k}: ${v}`);
      }
      return out.join("\n");
    };
    const done = (msg) => {
      $("[data-wa]", form).href = `https://wa.me/${window.SW.whatsapp}?text=${encodeURIComponent("Hi Surrey Waste, here are photos for my booking.\n\n" + lines())}`;
      if (msg) $("[data-done-msg]", form).textContent = msg;
      show("done");
    };
    const post = async () => {
      if (!window.SW.endpoint) return false;
      try { return (await fetch(window.SW.endpoint, { method: "POST", body: new FormData(form) })).ok; } catch (_) { return false; }
    };

    // step 3: Calendly inline embed with everything prefilled, or the built-in day + window picker
    let calLoaded = false;
    function openSlot() {
      const url = window.SW.calendly;
      $("[data-cal]", form).hidden = !url;
      $("[data-cal-back]", form).hidden = !url;
      $("[data-nocal]", form).hidden = !!url;
      if (!url) {
        const day = form.elements.day;
        const t = new Date(); t.setDate(t.getDate() + (t.getHours() >= 15 ? 1 : 0));
        day.min = t.toISOString().slice(0, 10);
        if (!day.value) day.value = day.min;
        return;
      }
      const f = form.elements, s = sel();
      const params = new URLSearchParams({
        name: f.name.value, email: f.email.value,
        a1: f.phone.value,
        a2: `${f.address.value}, ${f.postcode.value}`,
        a3: `${f.type.value}. ${f.what.value}. ${s ? s.value : ""}. ${f.price_shown.value}`,
        a4: [f.company.value && `Company: ${f.company.value}`, f.location.value, f.notes.value].filter(Boolean).join(". "),
        hide_gdpr_banner: "1", primary_color: "2fa83a",
      });
      const holder = $("[data-cal-embed]", form);
      holder.innerHTML = `<div class="calendly-inline-widget" data-url="${url}${url.includes("?") ? "&" : "?"}${params}" style="min-width:300px;height:720px"></div>`;
      if (!calLoaded) {
        calLoaded = true;
        const sc = document.createElement("script"); sc.src = "https://assets.calendly.com/assets/external/widget.js"; sc.async = true;
        document.head.append(sc);
      } else if (window.Calendly) {
        window.Calendly.initInlineWidgets();
      }
    }
    window.addEventListener("message", async (e) => {
      if (e.origin === "https://calendly.com" && e.data && e.data.event === "calendly.event_scheduled") {
        await post();
        done("You're booked in. Your confirmation is on its way by email, and our driver will call when they're on the way.");
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!valid(3)) return;
      const ok = await post();
      if (!ok) {
        location.href = `mailto:${window.SW.email}?subject=${encodeURIComponent(`Booking: ${form.elements.day.value} ${form.elements.window.value}, ${form.elements.postcode.value}`)}&body=${encodeURIComponent(lines())}`;
        done("Your email app should open with the booking filled in. Press send and we'll confirm your slot the same working day.");
      } else {
        done();
      }
    });
  }
})();
