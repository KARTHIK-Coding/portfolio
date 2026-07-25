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
   3D neural network visualization
   A layered feed-forward network rendered in
   Three.js: nodes as points, edges as thin lines,
   and a handful of signal pulses travelling along
   edges to suggest forward propagation. Used at
   two scales — a full study in the hero, and a
   faint ambient version behind the contact section.
--------------------------------------------- */
function createNeuralNetwork(canvas, opts = {}) {
  if (!canvas || typeof THREE === 'undefined') return;

  const {
    layerSizes = [5, 8, 8, 5],
    nodeColor = 0xf2efe8,
    edgeColor = 0x5a6274,
    pulseColor = 0xc9915a,
    edgeOpacity = 0.22,
    pulseCount = 22,
    autoRotateSpeed = 0.05,
    cameraZ = 9.5,
  } = opts;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.6, cameraZ);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const group = new THREE.Group();
  scene.add(group);

  // ---- Build node positions, layer by layer ----
  const layerSpacing = 4.4;
  const totalWidth = (layerSizes.length - 1) * layerSpacing;
  const layers = layerSizes.map((count, li) => {
    const x = -totalWidth / 2 + li * layerSpacing;
    const positions = [];
    for (let n = 0; n < count; n++) {
      const t = count === 1 ? 0.5 : n / (count - 1);
      const y = (t - 0.5) * 3.6;
      const z = (Math.sin(n * 12.9 + li * 3.7) * 0.5) * 1.1; // gentle depth jitter
      positions.push(new THREE.Vector3(x, y, z));
    }
    return positions;
  });

  // ---- Node meshes (instanced sphere per layer) ----
  const nodeGeo = new THREE.SphereGeometry(0.07, 12, 12);
  const nodeMat = new THREE.MeshBasicMaterial({ color: nodeColor, transparent: true, opacity: 0.9 });
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

  // ---- Edges (line segments between adjacent layers) ----
  const edgeVertices = [];
  const edgeList = []; // { a: Vector3, b: Vector3 }
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
  const edgeMat = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: edgeOpacity });
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  group.add(edges);

  // ---- Signal pulses travelling along random edges ----
  const pulseGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const pulseMat = new THREE.MeshBasicMaterial({ color: pulseColor, transparent: true, opacity: 0.95 });
  const pulses = [];
  for (let i = 0; i < pulseCount; i++) {
    const mesh = new THREE.Mesh(pulseGeo, pulseMat.clone());
    const edge = edgeList[Math.floor(Math.random() * edgeList.length)];
    mesh.userData = { edge, t: Math.random(), speed: 0.25 + Math.random() * 0.35 };
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
      // fade in/out near the ends for a softer traversal
      const fade = Math.sin(Math.min(d.t, 1) * Math.PI);
      mesh.material.opacity = 0.25 + fade * 0.7;
    });
  }

  function resize() {
    const w = canvas.clientWidth;
    if (!w) return;
    const h = canvas.clientHeight || w * 0.92;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let last = 0;
  function animate(ts) {
    requestAnimationFrame(animate);
    if (ts - last < 33) return; // ~30fps, calm and ambient
    const dt = last ? (ts - last) / 1000 : 0.033;
    last = ts;

    if (!prefersReducedMotion) {
      group.rotation.y += autoRotateSpeed * dt;
      group.rotation.x = Math.sin(ts * 0.00015) * 0.12;
      updatePulses(dt);
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

createNeuralNetwork(document.getElementById('neuralHero'), {
  layerSizes: [5, 8, 8, 5],
  pulseCount: 22,
  autoRotateSpeed: 0.06,
  cameraZ: 9.5,
});

createNeuralNetwork(document.getElementById('neuralContact'), {
  layerSizes: [4, 6, 6, 4],
  nodeColor: 0xf2efe8,
  edgeColor: 0x8992a3,
  pulseColor: 0xc9915a,
  edgeOpacity: 0.15,
  pulseCount: 14,
  autoRotateSpeed: 0.035,
  cameraZ: 11,
});
