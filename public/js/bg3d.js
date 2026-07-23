/**
 * CHALOO - Interactive 3D Background Engine
 * Option 1: Floating Cyber 3D Cards & Ambient Glowing Orbs with Mouse Parallax
 */

(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'bg-3d-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '1';

  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Mouse interaction
  let mouseX = 0;
  let mouseY = 0;
  let targetRotX = 0;
  let targetRotY = 0;
  let currentRotX = 0;
  let currentRotY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / width - 0.5) * 2;
    mouseY = (e.clientY / height - 0.5) * 2;
    targetRotY = mouseX * 0.45; // tilt Y
    targetRotX = -mouseY * 0.45; // tilt X
  });

  // Ambient Orbs
  const orbs = [
    { x: width * 0.2, y: height * 0.3, radius: 280, color: 'rgba(0, 243, 255, 0.15)', vx: 0.25, vy: 0.2 },
    { x: width * 0.8, y: height * 0.7, radius: 320, color: 'rgba(255, 215, 0, 0.12)', vx: -0.2, vy: -0.15 },
    { x: width * 0.5, y: height * 0.5, radius: 350, color: 'rgba(236, 72, 153, 0.1)', vx: 0.15, vy: -0.25 }
  ];

  // 3D Cards Definition
  const cardTypes = [
    { label: 'CHALOO', val: '10M', color: '#ffd700', type: 'gold' },
    { label: 'RENT', val: 'RENT', color: '#00f3ff', type: 'cyan' },
    { label: 'ACTION', val: 'SLY', color: '#ec4899', type: 'pink' },
    { label: 'PROPERTY', val: 'SET', color: '#22c55e', type: 'green' }
  ];

  const cardsCount = 16;
  const cards = [];

  for (let i = 0; i < cardsCount; i++) {
    const cardType = cardTypes[i % cardTypes.length];
    cards.push({
      x: (Math.random() - 0.5) * width * 1.4,
      y: (Math.random() - 0.5) * height * 1.4,
      z: Math.random() * 800 - 200, // Depth
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      rotSpeedX: (Math.random() - 0.5) * 0.008,
      rotSpeedY: (Math.random() - 0.5) * 0.008,
      rotSpeedZ: (Math.random() - 0.5) * 0.005,
      vz: (Math.random() - 0.5) * 0.3,
      w: 80,
      h: 120,
      typeInfo: cardType
    });
  }

  // 3D Matrix Projection Helpers
  function project(x, y, z, rotX, rotY) {
    const fov = 600;
    // Apply camera rotation
    let cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    let x1 = x * cosY - z * sinY;
    let z1 = z * cosY + x * sinY;

    let cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    let y1 = y * cosX - z1 * sinX;
    let z2 = z1 * cosX + y * sinX;

    const scale = fov / (fov + z2 + 400);
    return {
      px: x1 * scale + width / 2,
      py: y1 * scale + height / 2,
      scale: scale,
      z: z2
    };
  }

  function drawRoundedRect(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function render() {
    // Smooth camera rotation damping
    currentRotX += (targetRotX - currentRotX) * 0.05;
    currentRotY += (targetRotY - currentRotY) * 0.05;

    ctx.clearRect(0, 0, width, height);

    // 1. Render Floating Ambient Orbs
    orbs.forEach((orb) => {
      orb.x += orb.vx;
      orb.y += orb.vy;

      if (orb.x < -100 || orb.x > width + 100) orb.vx *= -1;
      if (orb.y < -100 || orb.y > height + 100) orb.vy *= -1;

      const gradient = ctx.createRadialGradient(
        orb.x + currentRotY * 50,
        orb.y - currentRotX * 50,
        0,
        orb.x,
        orb.y,
        orb.radius
      );
      gradient.addColorStop(0, orb.color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Sort 3D Cards by Z Depth for proper depth layering
    cards.forEach((card) => {
      card.rotX += card.rotSpeedX;
      card.rotY += card.rotSpeedY;
      card.rotZ += card.rotSpeedZ;
      card.z += card.vz;

      if (card.z > 600) card.z = -300;
      if (card.z < -300) card.z = 600;

      card.proj = project(card.x, card.y, card.z, currentRotX, currentRotY);
    });

    cards.sort((a, b) => b.proj.z - a.proj.z);

    // 3. Render 3D Cards
    cards.forEach((card) => {
      const p = card.proj;
      if (p.scale <= 0) return;

      ctx.save();
      ctx.translate(p.px, p.py);
      ctx.scale(p.scale, p.scale);
      ctx.rotate(card.rotZ);

      // Card Dimensions
      const cw = card.w;
      const ch = card.h;

      // Glow & Shadow
      ctx.shadowColor = card.typeInfo.color;
      ctx.shadowBlur = 15 * p.scale;

      // Card Body Glass Fill
      const bgGrad = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2);
      bgGrad.addColorStop(0, 'rgba(15, 20, 45, 0.85)');
      bgGrad.addColorStop(1, 'rgba(5, 8, 20, 0.95)');

      ctx.fillStyle = bgGrad;
      ctx.strokeStyle = card.typeInfo.color;
      ctx.lineWidth = 2.5;

      drawRoundedRect(ctx, -cw / 2, -ch / 2, cw, ch, 10);
      ctx.fill();
      ctx.stroke();

      // Card Outer Ring Emblem
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, -15, 18, 0, Math.PI * 2);
      ctx.strokeStyle = card.typeInfo.color;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Emblem Text
      ctx.fillStyle = card.typeInfo.color;
      ctx.font = '900 8px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(card.typeInfo.label, 0, -15);

      // Card Value Banner
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '800 11px Outfit, sans-serif';
      ctx.fillText(card.typeInfo.val, 0, 25);

      ctx.restore();
    });

    requestAnimationFrame(render);
  }

  render();
})();
