/* "Watch the build": a 3D feature wall that assembles as you scroll.
   Used by the Home Upgrades home page. Loaded on demand (dynamic import)
   when the section nears the viewport, so Three.js never delays the hero.
   Needs: an import map for "three", plus gsap + ScrollTrigger on window.

   Markup contract (inside `section`): .stage (sticky), .step3d captions
   (5), .progress3d i bars (5), .scroll-hint. */
import * as THREE from "three";

export function mountBuild(section) {
  const root = document.documentElement;
  const stage = section.querySelector(".stage");

  // Only render while the section is on screen (saves battery elsewhere on the page).
  // The top margin ignores the strip hidden under the sticky header.
  // Starts false: the observer reports at once, and an off-screen mount then never pays for a first render (shader compile).
  let onScreen = false, dirty = true; // dirty: something changed that the numbers below don't capture
  const headerH = parseFloat(getComputedStyle(root).getPropertyValue("--header")) || 76;
  new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { rootMargin: `-${headerH}px 0px 0px 0px` }).observe(section);

  const mobile = innerWidth < 760;

  // ---------- renderer / scene / camera ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.prepend(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#ece8e1");
  scene.fog = new THREE.Fog("#ece8e1", 12, 26);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);

  // ---------- materials ----------
  const mat = (color, rough = 0.85, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const wallMat = mat("#e7e2d9", 0.95);
  const floorMat = mat("#cfc6b8", 0.9);
  const slatMat = mat("#6e3f22", 0.6);
  // Backing behind the slats: dark wood when off; when the LEDs come on it
  // glows warm, so light shows through every gap between the slats.
  const backGlowTex = (() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(128, 120, 10, 128, 128, 190);
    grd.addColorStop(0, "#ffffff"); grd.addColorStop(0.55, "#d9d9d9"); grd.addColorStop(1, "#5a5a5a");
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); return t;
  })();
  const backingMat = new THREE.MeshStandardMaterial({ color: "#2b1a10", roughness: 0.9, emissive: "#ff8a2e", emissiveMap: backGlowTex, emissiveIntensity: 0 });
  const consoleMat = mat("#efebe4", 0.45);

  // Marble, drawn in code: warm white with grey and gold veins
  const marbleTex = (() => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 640;
    const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 1024, 640);
    grd.addColorStop(0, "#f4f1ec"); grd.addColorStop(1, "#e9e4dc");
    g.fillStyle = grd; g.fillRect(0, 0, 1024, 640);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const vein = (color, width, alpha) => {
      g.strokeStyle = color; g.globalAlpha = alpha; g.lineWidth = width; g.lineCap = "round"; g.lineJoin = "round";
      let x = rnd() * 1024, y = -20; const dx = (rnd() - 0.2) * 2.2;
      g.beginPath(); g.moveTo(x, y);
      while (y < 680) { x += dx * 18 + (rnd() - 0.5) * 34; y += 14 + rnd() * 26; g.lineTo(x, y);
        if (rnd() < 0.08) { const bx = x, by = y; g.moveTo(bx, by); g.lineTo(bx + (rnd() - 0.5) * 120, by + rnd() * 90); g.moveTo(x, y); } }
      g.stroke(); g.globalAlpha = 1;
    };
    for (let i = 0; i < 10; i++) vein("#8c8680", 1 + rnd() * 2.2, 0.35 + rnd() * 0.3);
    for (let i = 0; i < 5; i++) vein("#b88a2e", 1.5 + rnd() * 3, 0.55 + rnd() * 0.35);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const marbleMat = new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.25, metalness: 0 });

  // LED halo: a glowing rectangular ring, drawn once. `inset` = where the ring sits.
  const ringTex = (w, h, inset, blur, line) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.shadowColor = "rgba(255, 146, 52, 1)"; g.shadowBlur = blur; g.strokeStyle = "rgba(255, 170, 80, 0.95)"; g.lineWidth = line;
    g.strokeRect(inset, inset, w - 2 * inset, h - 2 * inset); g.strokeRect(inset, inset, w - 2 * inset, h - 2 * inset);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const glowMat = new THREE.MeshBasicMaterial({ map: ringTex(512, 360, 56, 46, 16), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  // Wall wash: soft light spilling onto the wall all round the slat panel.
  // Shadow-only fill (the rect itself is drawn off-canvas) so it fades to zero
  // well before the plane's edge: no hard box, no saturated white stroke.
  const washTex = (() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 512;
    const g = c.getContext("2d"), off = 4096;
    g.shadowColor = "rgba(255, 150, 60, 0.85)"; g.shadowBlur = 64; g.shadowOffsetX = off;
    g.fillStyle = "#000"; g.fillRect(114 - off, 128, 284, 256);   // panel = middle 55% x 50% of the plane
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const washMat = new THREE.MeshBasicMaterial({ map: washTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });

  // TV screen: off = matte black; on = a warm parchment screen showing the
  // real Genix Home Upgrades logo (the SVG, drawn in once it has loaded)
  const screenTex = (() => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 576;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(512, 260, 40, 512, 288, 620);
    grd.addColorStop(0, "#fdfdf7"); grd.addColorStop(1, "#e9dfca");
    g.fillStyle = grd; g.fillRect(0, 0, 1024, 576);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const logo = new Image();
    logo.onload = () => {
      const h = 380, w = h * (logo.naturalWidth / logo.naturalHeight || 976 / 722);
      g.drawImage(logo, (1024 - w) / 2, (576 - h) / 2, w, h);
      t.needsUpdate = true; dirty = true;
    };
    logo.src = new URL("../assets/genix-home-upgrades-logo.svg", import.meta.url).href;
    return t;
  })();
  const screenMat = new THREE.MeshStandardMaterial({ color: "#0b0b0c", roughness: 0.6, metalness: 0, /* matte: no mirror hotspot from the LED */ emissive: "#ffffff", emissiveMap: screenTex, emissiveIntensity: 0 });

  // ---------- room ----------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), wallMat); wall.position.set(0, 3.5, 0); scene.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 7); scene.add(floor);

  // ---------- the build pieces ----------
  const W = 6.4, H = 3.5, CY = 1.95;           // feature area size / centre height
  backingMat.transparent = true;
  const backing = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.04), backingMat);
  backing.position.set(0, CY, 0.02); scene.add(backing);
  // halo on the wall around the whole slat panel (plane is bigger than the panel so the glow can fade out)
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.8, H * 2), washMat);
  wash.position.set(0, CY, 0.004); scene.add(wash);

  // Step 1 detail: a dashed gold outline of where the feature goes, like layout marks
  const layout = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(W, H)),
    new THREE.LineDashedMaterial({ color: "#b8862f", dashSize: 0.14, gapSize: 0.09, transparent: true, opacity: 0.9 })
  );
  layout.position.set(0, CY, 0.01); layout.computeLineDistances(); scene.add(layout);

  const SLATS = mobile ? 22 : 30, gap = W / SLATS;
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(gap * 0.55, H, 0.09), slatMat, SLATS);
  scene.add(slats);
  const dummy = new THREE.Object3D();

  const marble = new THREE.Mesh(new THREE.BoxGeometry(3.9, 2.35, 0.06), [mat("#e6e1d9", 0.5), mat("#e6e1d9", 0.5), mat("#e6e1d9", 0.5), mat("#e6e1d9", 0.5), marbleMat, mat("#e6e1d9", 0.5)]);
  scene.add(marble);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 3.3), glowMat); glow.position.set(0, 2.05, 0.1); scene.add(glow);

  const tv = new THREE.Group();
  const tvBody = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.34, 0.05), mat("#111", 0.4, 0.3));
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.27, 1.26), screenMat); tvScreen.position.z = 0.027;
  tv.add(tvBody, tvScreen); scene.add(tv);

  const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(5, 0.42, 0.5), consoleMat); scene.add(consoleBox);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight("#fff6ea", "#8d7f6e", 1.15));
  const key = new THREE.DirectionalLight("#fff1dc", 1.5); key.position.set(-4, 6, 8); scene.add(key);
  const led = new THREE.PointLight("#ff9a3c", 0, 7, 1.6); led.position.set(0, 2.05, 0.6); scene.add(led);

  // ---------- the build, as numbers a timeline can scrub ----------
  const b = { slats: 0, marble: 0, tv: 0, console: 0, light: 0, cam: 0 };
  window.__build = { mode: "3d", state: b };
  // Total = 1. The build completes at 0.86; the last stretch holds the
  // finished, lit room so people can take it in and reach the CTA.
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } })
    .to({}, { duration: 0.06 })                           // hold on the bare wall
    .to(b, { slats: 1, duration: 0.24 })                  // 0.06–0.30
    .to(b, { marble: 1, duration: 0.18 })                 // 0.30–0.48
    .to(b, { tv: 1, duration: 0.14 })                     // 0.48–0.62
    .to(b, { console: 1, duration: 0.11 })                // 0.62–0.73
    .to(b, { light: 1, duration: 0.13 })                  // 0.73–0.86
    .to(b, { cam: 1, duration: 0.24 }, 0.62)              // camera pushes in 0.62–0.86
    .to({}, { duration: 0.14 });                          // hold the finished room
  const easeOut = gsap.parseEase("power3.out");
  const easeIO = gsap.parseEase("power2.inOut");

  // Steps + progress bars follow the same scroll
  const steps = [...section.querySelectorAll(".step3d")];
  const bars = [...section.querySelectorAll(".progress3d i")];
  const hint = section.querySelector(".scroll-hint");
  const edges = [0, 0.06, 0.3, 0.48, 0.62, 0.86]; // where each step's caption takes over
  let raw = 0;
  ScrollTrigger.create({
    trigger: section, start: "top top+=" + (parseInt(getComputedStyle(root).getPropertyValue("--header")) || 76), end: "bottom bottom", scrub: 0.6,
    onUpdate: (st) => {
      raw = st.progress; tl.progress(raw);
      const idx = Math.min(4, edges.findIndex((e, i) => raw >= e && raw < (edges[i + 1] ?? 1.01)));
      steps.forEach((s, i) => s.classList.toggle("on", i === idx));
      bars.forEach((bar, i) => bar.style.setProperty("--f", Math.max(0, Math.min(1, (raw - edges[i]) / (edges[i + 1] - edges[i])))));
      hint.style.opacity = raw > 0.03 ? 0 : 1;
    },
  });
  steps[0].classList.add("on");

  // Subtle pointer parallax
  const look = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => { look.x = (e.clientX / innerWidth - 0.5) * 2; look.y = (e.clientY / innerHeight - 0.5) * 2; });

  // ---------- per-frame: read the numbers, place things ----------
  const fitDist = () => { // distance at which the feature wall (plus margin) fits the width
    const vfov = THREE.MathUtils.degToRad(camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const usable = camera.view && camera.view.enabled && camera.view.offsetX !== 0 ? 0.7 : 1; // desktop: the wall lives in the right ~70%
    return Math.max((W + 1.2) / 2 / Math.tan(hfov / 2) / usable, (H + 1.4) / 2 / Math.tan(vfov / 2));
  };
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // Desktop: slide the rendered image right (same perspective) so the
    // step text on the left never covers the wall. Phones: centred.
    // Desktop: image shifted right. Phones: shifted up, so the wall sits above the caption card.
    if (w >= 760) camera.setViewOffset(w, h, -w * 0.17, 0, w, h); else camera.setViewOffset(w, h, 0, h * 0.16, w, h);
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize); resize();
  // Compile every shader up front, off the critical path (parallel where the GPU
  // supports it), so the first on-screen frame never stalls a click or a scroll.
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  idle(() => renderer.compileAsync(scene, camera).catch(() => {}));

  const lerp = THREE.MathUtils.lerp;
  const smooth = { x: 0, y: 0 };
  let lastKey = "";
  renderer.setAnimationLoop(() => {
    if (!onScreen) return; // nothing to draw while the section is off screen
    // Render on demand: skip the frame when scroll, pointer and size are all unchanged
    const key = `${b.slats},${b.marble},${b.tv},${b.console},${b.light},${b.cam},${look.x},${look.y},${stage.clientWidth}x${stage.clientHeight}`;
    const settling = Math.abs(look.x - smooth.x) + Math.abs(look.y - smooth.y) > 0.002;
    if (key === lastKey && !settling && !dirty) return;
    lastKey = key; dirty = false;
    // slats rise from the floor, left to right
    for (let i = 0; i < SLATS; i++) {
      const t = easeOut(Math.max(0, Math.min(1, b.slats * 1.6 - (i / SLATS) * 0.6)));
      dummy.position.set(-W / 2 + gap * (i + 0.5), lerp(CY - H - 0.2, CY, t), 0.07);
      dummy.scale.set(1, Math.max(0.001, t), 1); dummy.updateMatrix(); slats.setMatrixAt(i, dummy.matrix);
    }
    slats.instanceMatrix.needsUpdate = true;
    backing.visible = b.slats > 0.5; backingMat.opacity = Math.max(0, Math.min(1, (b.slats - 0.5) / 0.5)); // fades in behind the slats
    layout.material.opacity = 0.9 * (1 - Math.min(1, b.slats * 2.5));             // pencil layout fades as slats go up

    const m = easeOut(b.marble);   // marble slides up and in
    marble.position.set(0, lerp(-1.4, 2.05, m), lerp(0.9, 0.14, m)); marble.visible = b.marble > 0.001;
    const t = easeOut(b.tv);       // TV floats in towards the wall
    tv.position.set(0, 2.05, lerp(2.2, 0.21, t)); tv.visible = b.tv > 0.001;
    tv.traverse((o) => o.material && (o.material.transparent = t < 1, o.material.opacity = t));
    const c = easeOut(b.console);  // console slides in from the right
    consoleBox.position.set(lerp(9, 0, c), 0.6, 0.3); consoleBox.visible = b.console > 0.001;

    glowMat.opacity = b.light; led.intensity = b.light * 12; screenMat.emissiveIntensity = b.light * 0.95;
    backingMat.emissiveIntensity = b.light * 1.8;   // light through the gaps between the slats
    washMat.opacity = b.light * 0.9;                // warm wash on the wall around the panel
    scene.background.set("#ece8e1").lerp(new THREE.Color("#d9d2c6"), b.light * 0.5);

    // camera: wide at the start, pushing in at the end, drifting with the pointer
    smooth.x += (look.x - smooth.x) * 0.05; smooth.y += (look.y - smooth.y) * 0.05;
    const d = fitDist(), k = easeIO(b.cam);
    camera.position.set(lerp(0.9, 0, k) + smooth.x * 0.35, lerp(2.3, 2.0, k) - smooth.y * 0.18, lerp(d * 1.3, d * 1.04, k)); // push-in stops before cropping the slats
    camera.lookAt(0, 1.95, 0);
    // fog scales with camera distance: phones stand further back to fit the wall's width
    scene.fog.near = camera.position.z * 1.25; scene.fog.far = camera.position.z * 2.9;
    renderer.render(scene, camera);
  });
}
