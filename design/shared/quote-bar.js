/* Pinned "Get a quote" bar for phones (the bar's CSS lives in genix.css).
   Markup:
     <div class="quote-bar" id="quoteBar" data-after="SELECTOR" data-hide-over="SELECTORS" hidden>…</div>
   The bar slides in once [data-after] has scrolled above the viewport, and
   stays away while any [data-hide-over] element is on screen (things that
   already offer the action, or need the bottom of the screen). */
(() => {
  const bar = document.getElementById("quoteBar");
  if (!bar) return;
  const wide = matchMedia("(min-width: 961px)");
  const after = bar.dataset.after ? document.querySelector(bar.dataset.after) : null;
  const watch = [after, ...(bar.dataset.hideOver ? document.querySelectorAll(bar.dataset.hideOver) : [])].filter(Boolean);
  const seen = new Map();
  bar.hidden = false;
  bar.classList.add("off");
  bar.inert = true;
  const update = () => {
    const passed = after ? after.getBoundingClientRect().bottom < 0 : true;
    const off = wide.matches || !passed || watch.some((el) => seen.get(el));
    bar.classList.toggle("off", off);
    bar.inert = off; // off-screen links stay out of the tab order
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => seen.set(e.target, e.isIntersecting));
    update();
  });
  watch.forEach((el) => io.observe(el));
  wide.addEventListener("change", update);
})();
