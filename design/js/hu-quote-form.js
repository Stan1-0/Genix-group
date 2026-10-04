/* Genix Home Upgrades quote form: tap-to-pick pills, two steps, photos,
   inline validation and the prototype confirmation.
   Without this script the form is one ordinary form with both steps showing
   (no photo block: uploading needs the script).
   Prototype: nothing is sent and photos never upload; tiles use local
   previews only. Real build: photos upload to Cloudinary through a signed
   grant, the form POSTs to Payload Inquiries (division: homeupgrades) and the
   team is emailed via Resend. */
(() => {
  const form = document.getElementById("hu-quote-form");
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const step1 = form.querySelector('[data-step="1"]');
  const step2 = form.querySelector('[data-step="2"]');
  const steps = $("hqSteps");
  const status = $("hqStatus");
  const callTime = $("hqCallTime");
  const photosOn = form.dataset.photos === "on";

  // ---- rules ----
  const validZip = (v) => /^\d{5}$/.test(v);
  const validPhone = (v) => v.replace(/\D/g, "").length >= 10;
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const MAX_PHOTOS = 5;
  const MAX_BYTES = 10_485_760; // 10 MB
  const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  const EXT = /\.(jpe?g|png|webp|heic|heif)$/i;
  const isHeic = (f) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);
  // some browsers report no type for HEIC: fall back to the extension
  const okType = (f) => (f.type ? TYPES.includes(f.type.toLowerCase()) : EXT.test(f.name));

  // ---- errors: an input or a pill group (fieldset) ----
  function setErr(el, msg) {
    const err = $(el.id + "Err");
    if (err) err.textContent = msg || "";
    if (msg) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
    const box = el.closest(".field, .pills, .photos");
    if (box) box.classList.toggle("invalid", !!msg);
  }
  // the element that takes focus for an error: a group's first pill
  const focusTarget = (el) => (el.matches("fieldset") ? el.querySelector("input:checked, input") : el);
  function report(bad) {
    if (!bad.length) { status.textContent = ""; return true; }
    const msg = bad.length === 1 ? "1 field needs attention." : `${bad.length} fields need attention.`;
    status.textContent = ""; // clear first so an identical repeat message is re-announced
    setTimeout(() => { status.textContent = msg; }, 50);
    focusTarget(bad[0]).focus();
    return false;
  }

  // ---- bring the form back into view when a step swap leaves it under the sticky header ----
  function bringIntoView() {
    const header = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header")) || 76;
    if (form.getBoundingClientRect().top < header) {
      if (window.genixLenis) genixLenis.scrollTo(form, { offset: -header - 16 });
      else form.scrollIntoView({ block: "start" });
    }
  }

  function goStep(n) {
    step1.hidden = n !== 1;
    step2.hidden = n !== 2;
    steps.children[1].classList.toggle("on", n === 2);
    bringIntoView();
    (n === 2 ? $("hqStep2Title") : $("hqStep1Title")).focus({ preventScroll: true });
  }

  // ---- best time to call: only once there's a phone number ----
  function syncCallTime() {
    const has = $("hqPhone").value.trim() !== "";
    if (!has) callTime.querySelectorAll("input").forEach((r) => { r.checked = false; });
    callTime.hidden = !has;
  }

  form.addEventListener("change", (e) => {
    const group = e.target.closest(".pills");
    if (group && group.id !== "hqCallTime") setErr(group, "");
  });
  form.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "hqZip") {
      const filtered = t.value.replace(/\D/g, "").slice(0, 5);
      if (filtered !== t.value) t.value = filtered;
    }
    if (t.id === "hqPhone") syncCallTime();
    if (t.id === "hqPhone" || t.id === "hqEmail") { setErr($("hqPhone"), ""); setErr($("hqEmail"), ""); }
    else if (t.closest && t.closest(".field") && $(t.id + "Err")) setErr(t, "");
  });

  // ---- checks ----
  const picked = (name) => form.querySelector(`input[name="${name}"]:checked`);
  function checkStep1() {
    const bad = [];
    for (const [id, name, msg] of [
      ["hqProject", "project", "Choose what we're building."],
      ["hqProperty", "property", "Choose home or business."],
      ["hqTiming", "timing", "Choose when you'd like to start."],
    ]) {
      const m = picked(name) ? "" : msg;
      setErr($(id), m); if (m) bad.push($(id));
    }
    const zip = $("hqZip");
    const zipMsg = validZip(zip.value) ? "" : "Enter a 5-digit ZIP code.";
    setErr(zip, zipMsg); if (zipMsg) bad.push(zip);
    return report(bad);
  }
  function checkStep2() {
    const bad = [];
    const notes = $("hqNotes");
    const notesMsg = notes.value.trim().length >= 10 ? "" : "Tell us a little about the space.";
    setErr(notes, notesMsg); if (notesMsg) bad.push(notes);
    const name = $("hqName");
    const nameMsg = name.value.trim() ? "" : "Enter your name.";
    setErr(name, nameMsg); if (nameMsg) bad.push(name);
    const phone = $("hqPhone"), email = $("hqEmail");
    const p = phone.value.trim(), m = email.value.trim();
    const neither = !p && !m ? "Add a phone number or an email so we can reply." : "";
    const phoneMsg = neither || (p && !validPhone(p) ? "Enter a phone number with area code." : "");
    const emailMsg = m && !validEmail(m) ? "Enter an email like name@company.com." : "";
    setErr(phone, phoneMsg); if (phoneMsg) bad.push(phone);
    setErr(email, emailMsg); if (emailMsg) bad.push(email);
    return report(bad);
  }

  // ---- photos: local previews only (the real build uploads each one) ----
  const photoBlock = form.querySelector("[data-photos]");
  const drop = $("hqPhotos");
  const picker = $("hqPhotoInput");
  const list = $("hqPhotoList");
  function photoErr(msg) {
    $("hqPhotosErr").textContent = msg;
    photoBlock.classList.toggle("invalid", !!msg);
    if (msg) { status.textContent = ""; setTimeout(() => { status.textContent = msg; }, 50); } // focus stays put: announce it
  }
  let photos = []; // { file, url, li }
  const ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/></svg>';

  function addFiles(files) {
    let msg = "";
    for (const file of files) {
      if (photos.length >= MAX_PHOTOS) { msg = msg || "You can add up to 5 photos."; continue; }
      if (!okType(file)) { msg = msg || "Only JPG, PNG, WebP or HEIC photos."; continue; }
      if (file.size > MAX_BYTES) { msg = msg || "Photos must be 10 MB or smaller."; continue; }
      const li = document.createElement("li");
      li.className = "tile";
      li.dataset.state = "ready";
      let url = "";
      if (isHeic(file)) {
        li.innerHTML = `<span class="tile-icon">${ICON}</span>`; // browsers can't preview HEIC
      } else {
        url = URL.createObjectURL(file);
        const img = document.createElement("img");
        img.src = url;
        img.alt = "";
        li.append(img);
      }
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "tile-remove";
      rm.innerHTML = '<span aria-hidden="true">✕</span>';
      li.append(rm);
      list.append(li);
      photos.push({ file, url, li });
    }
    labelTiles();
    photoErr(msg);
  }
  function labelTiles() {
    photos.forEach((p, i) => p.li.querySelector(".tile-remove").setAttribute("aria-label", `Remove photo ${i + 1}, ${p.file.name}`));
  }
  function removePhoto(li) {
    const i = photos.findIndex((p) => p.li === li);
    if (i < 0) return;
    const [p] = photos.splice(i, 1);
    if (p.url) URL.revokeObjectURL(p.url);
    li.remove();
    labelTiles();
    photoErr("");
    // keep focus in the list: the next tile's ✕, else the previous, else the picker
    const next = photos[i] || photos[i - 1];
    (next ? next.li.querySelector(".tile-remove") : picker).focus();
  }

  if (photoBlock) {
    photoBlock.hidden = !photosOn;
    picker.setAttribute("aria-describedby", "hqPhotosErr");
    picker.addEventListener("change", () => { addFiles([...picker.files]); picker.value = ""; });
    list.addEventListener("click", (e) => {
      const rm = e.target.closest(".tile-remove");
      if (rm) removePhoto(rm.closest(".tile"));
    });
    ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("dragover"); }));
    ["dragleave", "dragend"].forEach((t) => drop.addEventListener(t, (e) => { if (!drop.contains(e.relatedTarget)) drop.classList.remove("dragover"); }));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("dragover");
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles([...e.dataTransfer.files]);
    });
  }

  // ---- steps and sending ----
  $("hqNext").addEventListener("click", () => { if (checkStep1()) goStep(2); });
  $("hqBack").addEventListener("click", () => goStep(1));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (step2.hidden) { if (checkStep1()) goStep(2); return; } // Enter pressed in step 1
    if (!checkStep2()) return;
    if ($("hqHp").value) return; // bots fill the hidden field (the real build also checks server-side)
    step1.hidden = true;
    step2.hidden = true;
    steps.hidden = true;
    $("hqRef").textContent = "Reference GX-HUP-000123";
    $("hqSent").hidden = false;
    status.textContent = ""; // focusing #hqSent already reads the confirmation
    bringIntoView();
    $("hqSent").focus({ preventScroll: true });
  });

  // ---- start: JS mode shows one step at a time ----
  step2.hidden = true;
  syncCallTime();

  window.genixHuQuote = { validZip, okType };
})();
