/* Genix shared behaviour for the division sites.
   Load after gsap, ScrollTrigger, SplitText and lenis (all optional: every
   piece degrades to a static page if its library is missing). */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Mobile menu
  const header = document.getElementById("siteHeader");
  const btn = document.getElementById("menuBtn");
  if (header && btn) {
    const extra = header.querySelector(".nav-extra");
    const set = (open) => {
      header.classList.toggle("menu-open", open);
      btn.setAttribute("aria-expanded", open);
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (extra) extra.hidden = !open;
    };
    btn.addEventListener("click", () => set(!header.classList.contains("menu-open")));
    header.querySelectorAll(".nav a").forEach((a) => a.addEventListener("click", () => set(false)));
  }

  if (!window.gsap || reduce) {
    root.classList.remove("h1-pending");
    return;
  }
  const plugins = [window.ScrollTrigger, window.SplitText].filter(Boolean);
  gsap.registerPlugin(...plugins);
  root.classList.add("js-motion");

  // Lenis: smooth mouse-wheel scrolling on desktop. Touch keeps native
  // scrolling (Lenis leaves touch alone by default). Drives ScrollTrigger.
  if (window.Lenis) {
    const lenis = new Lenis({ anchors: { offset: -parseInt(getComputedStyle(root).getPropertyValue("--header")) || -76 } });
    window.genixLenis = lenis;
    if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    // Keep GSAP's default lag smoothing: with it off, one heavy frame (e.g. a
    // blurred modal over a playing video) makes running tweens skip to the end.
  }

  document.fonts.ready.then(() => {
    // Headlines marked data-split: lines rise out of their masks
    document.querySelectorAll("[data-split]").forEach((el, i) => {
      if (!window.SplitText) return;
      SplitText.create(el, {
        type: "lines", mask: "lines", autoSplit: true,
        onSplit(self) {
          root.classList.remove("h1-pending");
          const inHero = !!el.closest("[data-hero]");
          return gsap.from(self.lines, {
            yPercent: 110, duration: 1.05, ease: "power4.out", stagger: 0.12,
            delay: inHero ? 0.25 : 0,
            scrollTrigger: inHero || !window.ScrollTrigger ? undefined : { trigger: el, start: "top 85%", once: true },
          });
        },
      });
    });
    root.classList.remove("h1-pending");

    // Quiet reveals
    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: window.ScrollTrigger ? { trigger: el, start: "top 88%", once: true } : undefined,
      });
    });
    // Cards the Home | Business toggle swaps in were display:none when their reveal was set up,
    // so it never fires for them. Fade whatever is visible in on every switch.
    document.querySelectorAll(".svc-toggle input").forEach((input) =>
      input.addEventListener("change", () => {
        const cards = gsap.utils.toArray(".svc").filter((c) => c.offsetParent !== null);
        gsap.fromTo(cards, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.08, overwrite: true });
      })
    );
    addEventListener("load", () => window.ScrollTrigger && ScrollTrigger.refresh());
  });
})();
