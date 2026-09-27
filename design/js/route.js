/* "How a job runs": the truck drives the road as the section scrolls past.
   Scrubbed ScrollTrigger with no pin, so the section keeps its natural
   height. Stops light up as the truck reaches them; a DELIVERED stamp lands
   at the end. No GSAP or reduced motion: the CSS default (--p: 1) is the
   finished road. */
(() => {
  const road = document.querySelector("[data-road]");
  if (!road || !window.gsap || !window.ScrollTrigger) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.registerPlugin(ScrollTrigger);
  const stops = [...road.querySelectorAll("[data-stop]")];
  const last = stops.length - 1;
  const mark = (p) => {
    stops.forEach((s, i) => s.classList.toggle("is-passed", p >= i / last - 0.001));
    road.classList.toggle("is-done", p >= 0.999);
  };
  road.classList.add("is-live");
  gsap.fromTo(road, { "--p": 0 }, {
    "--p": 1,
    ease: "none",
    scrollTrigger: { trigger: road, start: "top 75%", end: "bottom 45%", scrub: 0.5 },
    onUpdate() { mark(this.progress()); },
  });
  mark(0);
})();
