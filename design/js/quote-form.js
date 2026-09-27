/* Genix Logistics quote form: two tabs (business / move), two steps,
   inline validation and the prototype confirmation.
   Without this script the form is one ordinary form with both steps showing.
   Prototype: nothing is sent. Real build: POST to Payload Inquiries
   (division: logistics) and email the team via Resend. */
(() => {
  const form = document.getElementById("quote-form");
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const step1 = form.querySelector('[data-step="1"]');
  const step2 = form.querySelector('[data-step="2"]');
  const load = $("qLoad");
  const status = $("qStatus");
  const placeholder = load.querySelector('option[value=""]');
  const groups = [...load.querySelectorAll("optgroup")].map((g) => ({ kind: g.dataset.kind, options: [...g.children] }));

  // ---- rules ----
  const validZip = (v) => /^\d{5}$/.test(v);
  // San Diego County ZIPs start 919-921 (placeholder until the owner's own list)
  const isServedZip = (v) => { const p = +v.slice(0, 3); return p >= 919 && p <= 921; };
  const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const validPhone = (v) => v.replace(/\D/g, "").length >= 10;
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // ---- errors ----
  function setErr(input, msg) {
    $(input.id + "Err").textContent = msg || "";
    if (msg) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    input.closest(".field").classList.toggle("invalid", !!msg);
  }
  function report(bad) {
    if (!bad.length) { status.textContent = ""; return true; }
    const msg = bad.length === 1 ? "1 field needs attention." : `${bad.length} fields need attention.`;
    status.textContent = ""; // clear first so an identical repeat message is re-announced
    setTimeout(() => { status.textContent = msg; }, 50);
    bad[0].focus();
    return false;
  }

  // ---- bring the form back into view when a step swap leaves it under the sticky header ----
  function bringIntoView() {
    const header = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header")) || 76;
    if (form.getBoundingClientRect().top < header) {
      if (window.genixLenis) genixLenis.scrollTo(form, { offset: -header });
      else form.scrollIntoView({ block: "start" });
    }
  }

  // ---- tabs: swap the "what's moving" options, keep everything else ----
  const kindOf = () => form.querySelector('input[name="kind"]:checked').value;
  function showOptions(kind) {
    const group = groups.find((g) => g.kind === kind);
    load.replaceChildren(placeholder, ...group.options);
    load.value = "";
    $("qPalletsField").hidden = true;
    setErr(load, "");
  }
  function goStep(n) {
    step1.hidden = n !== 1;
    step2.hidden = n !== 2;
    bringIntoView();
    (n === 2 ? $("qStep2Title") : $("qStep1Title")).focus({ preventScroll: true });
  }
  function applyKind(kind) {
    showOptions(kind);
    if (!step2.hidden) goStep(1); // the load choice was reset: back to step 1
  }
  function selectKind(kind) {
    const radio = form.querySelector(`input[name="kind"][value="${kind}"]`);
    if (!radio || radio.checked) return;
    radio.checked = true;
    applyKind(kind);
  }

  form.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "kind") applyKind(t.value);
    if (t === load) { $("qPalletsField").hidden = load.value !== "pallets"; setErr(load, ""); }
    if (t.id === "qFlex") {
      const date = $("qDate");
      date.disabled = t.checked;
      if (t.checked) { date.value = ""; setErr(date, ""); }
    }
  });
  form.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "qFrom" || t.id === "qTo") {
      const filtered = t.value.replace(/\D/g, "").slice(0, 5);
      if (filtered !== t.value) t.value = filtered;
      setErr(t, "");
      const zips = [$("qFrom").value, $("qTo").value];
      $("qArea").hidden = !zips.every(validZip) || zips.every(isServedZip);
    } else if (t.closest && t.closest(".field") && $(t.id + "Err")) {
      setErr(t, "");
    }
  });

  // ---- checks ----
  function checkStep1() {
    const bad = [];
    for (const zip of [$("qFrom"), $("qTo")]) {
      const msg = validZip(zip.value) ? "" : "Enter a 5-digit ZIP code.";
      setErr(zip, msg); if (msg) bad.push(zip);
    }
    const date = $("qDate");
    if (!$("qFlex").checked) {
      const msg = !date.value ? "Pick a date, or tick Flexible." : date.value < todayISO() ? "Pick a date from today on." : "";
      setErr(date, msg); if (msg) bad.push(date);
    }
    const loadMsg = load.value ? "" : "Choose what's moving.";
    setErr(load, loadMsg); if (loadMsg) bad.push(load);
    if (load.value === "pallets") {
      const pallets = $("qPallets"), n = +pallets.value;
      const msg = Number.isInteger(n) && n >= 1 && n <= 26 ? "" : "Enter 1 to 26 pallets.";
      setErr(pallets, msg); if (msg) bad.push(pallets);
    }
    return report(bad);
  }
  function checkStep2() {
    const bad = [];
    const name = $("qName");
    const nameMsg = name.value.trim() ? "" : "Enter your name.";
    setErr(name, nameMsg); if (nameMsg) bad.push(name);
    const phone = $("qPhone"), email = $("qEmail");
    const p = phone.value.trim(), m = email.value.trim();
    const neither = !p && !m ? "Add a phone number or an email so we can reply." : "";
    const phoneMsg = neither || (p && !validPhone(p) ? "Enter a phone number with area code." : "");
    const emailMsg = m && !validEmail(m) ? "Enter an email like name@company.com." : "";
    setErr(phone, phoneMsg); if (phoneMsg) bad.push(phone);
    setErr(email, emailMsg); if (emailMsg) bad.push(email);
    return report(bad);
  }

  // ---- steps and sending ----
  $("qNext").addEventListener("click", () => { if (checkStep1()) goStep(2); });
  $("qBack").addEventListener("click", () => goStep(1));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (step2.hidden) { if (checkStep1()) goStep(2); return; } // Enter pressed in step 1
    if (!checkStep2()) return;
    if ($("qHp").value) return; // bots fill the hidden field (the real build also checks server-side)
    form.querySelector(".kind").hidden = true;
    step1.hidden = true;
    step2.hidden = true;
    $("qRef").textContent = "Request received";
    $("qSent").hidden = false;
    status.textContent = ""; // focusing #qSent already reads the confirmation
    bringIntoView();
    $("qSent").focus({ preventScroll: true });
  });

  // ---- links elsewhere on the page ----
  document.querySelectorAll("a[data-kind]").forEach((a) => a.addEventListener("click", () => selectKind(a.dataset.kind)));
  document.querySelectorAll("[data-start-quote]").forEach((a) =>
    a.addEventListener("click", (e) => {
      // The browser's own fragment jump would otherwise reset focus, since
      // #quote-form (a <form>) is not itself focusable; we own the scroll via Lenis's
      // anchors handling and the focus ourselves, so stop the native jump here.
      e.preventDefault();
      // Lenis is skipped under prefers-reduced-motion (see shared/genix.js), so there's
      // no smooth-scroll to bring the form into view: do it ourselves in that case.
      if (!window.genixLenis) form.scrollIntoView({ block: "start" });
      if (!$("qFrom").closest("[hidden]")) $("qFrom").focus({ preventScroll: true });
    }));

  // ---- start: JS mode shows one step at a time ----
  form.noValidate = true; // JS mode uses the custom inline validation; no-JS keeps the native one
  step2.hidden = true;
  $("qDate").min = todayISO();
  showOptions(kindOf());

  window.genixQuote = { selectKind, validZip, isServedZip };
})();
