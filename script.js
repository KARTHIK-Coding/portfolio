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
   3D neural network — fixed page backdrop
   A layered feed-forward network rendered in
   Three.js: nodes as points, edges as thin lines,
   and signal pulses travelling along edges to
   suggest forward propagation. Pinned to the
   viewport so it stays visible behind every
   section as the page scrolls.
--------------------------------------------- */
(function initNeuralBackdrop() {
  const canvas = document.getElementById('neuralBg');
  if (!canvas || typeof THREE === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(0, 0.4, 15);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const group = new THREE.Group();
  scene.add(group);

  // ---- Layer layout ----
  const layerSizes = [6, 10, 12, 10, 6];
  const layerSpacing = 4.6;
  const totalWidth = (layerSizes.length - 1) * layerSpacing;
  const layers = layerSizes.map((count, li) => {
    const x = -totalWidth / 2 + li * layerSpacing;
    const positions = [];
    for (let n = 0; n < count; n++) {
      const t = count === 1 ? 0.5 : n / (count - 1);
      const y = (t - 0.5) * 7.2;
      const z = Math.sin(n * 12.9 + li * 3.7) * 1.6;
      positions.push(new THREE.Vector3(x, y, z));
    }
    return positions;
  });

  // ---- Nodes ----
  const nodeGeo = new THREE.SphereGeometry(0.075, 12, 12);
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xf3f1ea, transparent: true, opacity: 0.7 });
  layers.forEach(positions => {
    const inst = new THREE.InstancedMesh(nodeGeo, nodeMat, positions.length);
    const dummy = new THREE.Object3D();
    positions.forEach((p, i) => {
      dummy.position.copy(p);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    group.add(inst);
  });

  // ---- Edges ----
  const edgeVertices = [];
  const edgeList = [];
  for (let li = 0; li < layers.length - 1; li++) {
    layers[li].forEach(a => {
      layers[li + 1].forEach(b => {
        edgeVertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
        edgeList.push({ a, b });
      });
    });
  }
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgeVertices, 3));
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x525a6e, transparent: true, opacity: 0.16 });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));

  // ---- Travelling signal pulses ----
  const pulseGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const pulseMatBase = new THREE.MeshBasicMaterial({ color: 0xcc9a63, transparent: true, opacity: 0.95 });
  const pulses = [];
  const PULSE_COUNT = 40;
  for (let i = 0; i < PULSE_COUNT; i++) {
    const mesh = new THREE.Mesh(pulseGeo, pulseMatBase.clone());
    const edge = edgeList[Math.floor(Math.random() * edgeList.length)];
    mesh.userData = { edge, t: Math.random(), speed: 0.2 + Math.random() * 0.3 };
    group.add(mesh);
    pulses.push(mesh);
  }

  function updatePulses(dt) {
    pulses.forEach(mesh => {
      const d = mesh.userData;
      d.t += dt * d.speed;
      if (d.t >= 1) {
        d.t = 0;
        d.edge = edgeList[Math.floor(Math.random() * edgeList.length)];
      }
      mesh.position.lerpVectors(d.edge.a, d.edge.b, d.t);
      const fade = Math.sin(Math.min(d.t, 1) * Math.PI);
      mesh.material.opacity = 0.2 + fade * 0.7;
    });
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    // Pull the camera back on narrow / tall viewports so the whole
    // network stays framed instead of overflowing.
    const aspect = w / h;
    camera.position.z = aspect < 0.9 ? 22 : aspect < 1.4 ? 17 : 15;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let last = 0;
  function animate(ts) {
    requestAnimationFrame(animate);
    if (ts - last < 33) return; // ~30fps, calm and ambient
    const dt = last ? (ts - last) / 1000 : 0.033;
    last = ts;

    if (!prefersReducedMotion) {
      group.rotation.y += 0.045 * dt;
      group.rotation.x = Math.sin(ts * 0.00012) * 0.1;
      updatePulses(dt);
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
})();
