/* ---------------------------------------------
   Mobile nav toggle
--------------------------------------------- */
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');

navToggle.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

siteNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    siteNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

/* ---------------------------------------------
   3D mel-spectrogram surface
   A quiet, research-accurate visual: a plane of
   vertices displaced like a real spectrogram,
   rendered as a wireframe, rotating gently.
--------------------------------------------- */
(function initSpectrogram() {
  const canvas = document.getElementById('spectrogram');
  if (!canvas || typeof THREE === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 6.2, 8.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Build a plane whose vertex heights emulate spectral energy over time.
  const cols = 48;
  const rows = 32;
  const width = 9;
  const depth = 6.2;
  const geometry = new THREE.PlaneGeometry(width, depth, cols, rows);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position;

  // Layered pseudo-random "bands" so it reads as spectral energy, not generic noise.
  function bandEnergy(x, t, seed) {
    const f1 = Math.sin(x * 1.7 + seed * 3.1 + t * 0.6);
    const f2 = Math.sin(x * 4.1 - seed * 5.2 + t * 0.9) * 0.5;
    const f3 = Math.sin(x * 9.3 + seed * 1.3 + t * 1.4) * 0.22;
    return (f1 + f2 + f3) / 1.72;
  }

  function updateHeights(t) {
    for (let iy = 0; iy <= rows; iy++) {
      const v = iy / rows; // 0..1 across "time" axis
      for (let ix = 0; ix <= cols; ix++) {
        const u = ix / cols; // 0..1 across "frequency" axis
        const idx = iy * (cols + 1) + ix;

        const freqFalloff = Math.exp(-u * 2.1); // energy concentrated in lower bands
        const energy = bandEnergy(u * 6.0, t + v * 4.0, v * 6.0);
        let h = energy * freqFalloff * 1.25;

        // occasional transient "hits" across the time axis
        const transient = Math.max(0, Math.sin(v * 18.0 + t * 0.4)) ** 10;
        h += transient * freqFalloff * 0.5;

        posAttr.setY(idx, h);
      }
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  updateHeights(0);

  const material = new THREE.MeshBasicMaterial({
    color: 0xc9a877,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Faint base plane for depth
  const baseGeo = new THREE.PlaneGeometry(width * 1.15, depth * 1.3);
  baseGeo.rotateX(-Math.PI / 2);
  const baseMat = new THREE.MeshBasicMaterial({ color: 0x2e3a59, transparent: true, opacity: 0.12 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -0.02;
  scene.add(base);

  function resize() {
    const size = canvas.clientWidth;
    if (!size) return;
    const height = canvas.clientHeight || size * 0.92;
    renderer.setSize(size, height, false);
    camera.aspect = size / height;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  let clock = 0;
  let lastFrame = 0;

  function animate(timestamp) {
    requestAnimationFrame(animate);

    // Throttle to ~30fps for a calm, ambient feel
    if (timestamp - lastFrame < 33) return;
    lastFrame = timestamp;

    if (!prefersReducedMotion) {
      clock += 0.012;
      updateHeights(clock);
      mesh.rotation.y = Math.sin(clock * 0.15) * 0.25 - 0.15;
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
