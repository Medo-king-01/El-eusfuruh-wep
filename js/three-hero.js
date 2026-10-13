// three-hero.js — Phase A pilot: Three.js particles + GSAP animations
// Desktop ≥768px, no reduced-motion only

import { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, Points, PointsMaterial, BufferAttribute, Color } from '../assets/vendor/three.min.js';

let renderer, scene, camera, particles, animationId;
let isPaused = false;

function initParticles() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    canvas.style.display = 'none';
    return;
  }

  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  scene = new Scene();
  camera = new PerspectiveCamera(75, w / h, 0.1, 100);
  camera.position.z = 4;

  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue('--color-primary').trim() || '#B01F24';
  const textColor = style.getPropertyValue('--color-text').trim() || '#1A1A1A';

  const count = w < 1024 ? 800 : 1500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const c1 = new Color(primary);
  const c2 = new Color('#FF6B6B');
  const c3 = new Color(textColor);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1 + Math.random() * 2.5;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.5;
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const t = Math.random();
    let c;
    if (t < 0.4) c = c1.clone();
    else if (t < 0.7) c = c2.clone();
    else c = c3.clone().lerp(c1, 0.3);

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));

  const material = new PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });

  particles = new Points(geometry, material);
  scene.add(particles);

  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / w - 0.5) * 0.5;
    mouseY = (e.clientY / h - 0.5) * 0.5;
  });

  document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
    if (!isPaused) animate(mouseX, mouseY);
  });

  window.addEventListener('resize', () => {
    const nw = canvas.clientWidth || window.innerWidth;
    const nh = canvas.clientHeight || window.innerHeight;
    renderer.setSize(nw, nh, false);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
  });

  animate(mouseX, mouseY);
}

function animate(mouseX, mouseY) {
  if (isPaused) return;
  animationId = requestAnimationFrame(() => animate(mouseX, mouseY));

  const time = Date.now() * 0.001;
  particles.rotation.y = time * 0.08;
  particles.rotation.x = Math.sin(time * 0.15) * 0.15;

  const pos = particles.geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    pos.array[i * 3 + 1] += Math.sin(time * 2 + i * 0.5) * 0.001;
  }
  pos.needsUpdate = true;

  camera.position.x += (mouseX - camera.position.x) * 0.02;
  camera.position.y += (-mouseY - camera.position.y) * 0.02;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

// Load GSAP via script tags (not ES modules)
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function initGSAP() {
  const g = window.gsap;
  const ST = window.ScrollTrigger;
  if (!g || !ST) return;

  g.registerPlugin(ST);

  // A. Hero title fade-in + slide-up
  const heroBadge = document.querySelector('.hero-badge');
  const heroTitle = document.querySelector('.hero-title');
  const heroDesc = document.querySelector('.hero-desc');
  const heroActions = document.querySelector('.hero-actions');
  const heroTrust = document.querySelector('.hero-trust');

  const tl = g.timeline({ defaults: { ease: 'power3.out' } });
  if (heroBadge) tl.from(heroBadge, { y: -20, opacity: 0, duration: 0.5 }, 0.1);
  if (heroTitle) tl.from(heroTitle, { y: 40, opacity: 0, duration: 0.8 }, 0.2);
  if (heroDesc) tl.from(heroDesc, { y: 30, opacity: 0, duration: 0.6 }, 0.5);
  if (heroActions) tl.from(heroActions, { y: 20, opacity: 0, duration: 0.5 }, 0.7);
  if (heroTrust) tl.from(heroTrust, { y: 20, opacity: 0, duration: 0.5 }, 0.85);

  // B. Stats count-up
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.getAttribute('data-count') || '0');
    if (!target) return;
    ST.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        g.to(el, { duration: 1.5, innerText: target, snap: { innerText: 1 }, ease: 'power2.out' });
      }
    });
  });

  // C. Cards fade-in on scroll
  document.querySelectorAll('.platform-card, .opportunity-card, .career-card, .track-card, .channel-card').forEach((card, i) => {
    g.from(card, {
      scrollTrigger: { trigger: card, start: 'top 85%', once: true },
      y: 30, opacity: 0, duration: 0.5, delay: (i % 6) * 0.05, ease: 'power2.out'
    });
  });

  // D. Section headers fade-in
  document.querySelectorAll('main section h2').forEach(h => {
    g.from(h, {
      scrollTrigger: { trigger: h, start: 'top 90%', once: true },
      y: 20, opacity: 0, duration: 0.4, ease: 'power2.out'
    });
  });
}

export function init() {
  initParticles();

  // Load GSAP + ScrollTrigger
  loadScript('assets/vendor/gsap.min.js')
    .then(() => loadScript('assets/vendor/ScrollTrigger.min.js'))
    .then(initGSAP)
    .catch(() => {});
}

export function dispose() {
  if (animationId) cancelAnimationFrame(animationId);
  if (particles) {
    particles.geometry.dispose();
    particles.material.dispose();
  }
  if (renderer) renderer.dispose();
}
