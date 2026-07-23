/**
 * CHALOO - Interactive 3D Background Engine
 * Includes 4 Selectable 3D Visual Themes:
 * 1. Floating Cyber 3D Cards & Glowing Orbs
 * 2. 3D Wave Grid & Floating Particles
 * 3. Golden Liquid Silk & Bokeh Dust
 * 4. Hypnotic 3D Depth Tunnel
 */

window.BG3DEngine = (function () {
  let activeMode = 1;

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
    targetRotY = mouseX * 0.45;
    targetRotX = -mouseY * 0.45;
  });

  // Mode 1 Data
  const orbs = [
    { x: width * 0.2, y: height * 0.3, radius: 280, color: 'rgba(0, 243, 255, 0.15)', vx: 0.25, vy: 0.2 },
    { x: width * 0.8, y: height * 0.7, radius: 320, color: 'rgba(255, 215, 0, 0.12)', vx: -0.2, vy: -0.15 },
    { x: width * 0.5, y: height * 0.5, radius: 350, color: 'rgba(236, 72, 153, 0.1)', vx: 0.15, vy: -0.25 }
  ];

  const cardTypes = [
    { label: 'CHALOO', val: '10M', color: '#ffd700' },
    { label: 'RENT', val: 'RENT', color: '#00f3ff' },
    { label: 'ACTION', val: 'SLY', color: '#ec4899' },
    { label: 'PROPERTY', val: 'SET', color: '#22c55e' }
  ];

  const cards = [];
  for (let i = 0; i < 16; i++) {
    cards.push({
      x: (Math.random() - 0.5) * width * 1.4,
      y: (Math.random() - 0.5) * height * 1.4,
      z: Math.random() * 800 - 200,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      rotSpeedX: (Math.random() - 0.5) * 0.008,
      rotSpeedY: (Math.random() - 0.5) * 0.008,
      rotSpeedZ: (Math.random() - 0.5) * 0.005,
      vz: (Math.random() - 0.5) * 0.3,
      w: 80,
      h: 120,
      typeInfo: cardTypes[i % cardTypes.length]
    });
  }

  // Mode 2 Particles
  const gridParticles = [];
  for (let i = 0; i < 45; i++) {
    gridParticles.push({
      x: Math.random() * width,
      y: height + Math.random() * 200,
      vy: -(0.4 + Math.random() * 0.8),
      size: 4 + Math.random() * 8,
      shape: ['♦', '♠', '♥', '♣', '★'][Math.floor(Math.random() * 5)],
      color: ['#00f3ff', '#ffd700', '#ec4899', '#38bdf8'][Math.floor(Math.random() * 4)],
      alpha: 0.3 + Math.random() * 0.5
    });
  }

  // Mode 3 Bokeh Particles
  const bokehs = [];
  for (let i = 0; i < 50; i++) {
    bokehs.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 3 + Math.random() * 14,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.3 - Math.random() * 0.5,
      alpha: 0.2 + Math.random() * 0.5,
      hue: 45 + Math.random() * 15
    });
  }

  // Mode 4 Tunnel Rings
  let tunnelTime = 0;
  const tunnelRings = [];
  for (let i = 0; i < 20; i++) {
    tunnelRings.push({
      z: i * 40,
      shape: i % 2 === 0 ? 'rect' : 'diamond'
    });
  }

  function project(x, y, z, rotX, rotY) {
    const fov = 600;
    let cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    let x1 = x * cosY - z * sinY;
    let z1 = z * cosY + x * sinY;

    let cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    let y1 = y * cosX - z1 * sinX;
    let z2 = z1 * cosX + y * sinX;

    const scale = fov / (fov + z2 + 400);
    return { px: x1 * scale + width / 2, py: y1 * scale + height / 2, scale, z: z2 };
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

  // RENDER MODE 1: Floating 3D Cards & Orbs
  function renderMode1() {
    orbs.forEach((orb) => {
      orb.x += orb.vx;
      orb.y += orb.vy;
      if (orb.x < -100 || orb.x > width + 100) orb.vx *= -1;
      if (orb.y < -100 || orb.y > height + 100) orb.vy *= -1;

      const gradient = ctx.createRadialGradient(
        orb.x + currentRotY * 50, orb.y - currentRotX * 50, 0,
        orb.x, orb.y, orb.radius
      );
      gradient.addColorStop(0, orb.color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
    });

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

    cards.forEach((card) => {
      const p = card.proj;
      if (p.scale <= 0) return;
      ctx.save();
      ctx.translate(p.px, p.py);
      ctx.scale(p.scale, p.scale);
      ctx.rotate(card.rotZ);

      const cw = card.w, ch = card.h;
      ctx.shadowColor = card.typeInfo.color;
      ctx.shadowBlur = 15 * p.scale;

      const bgGrad = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2);
      bgGrad.addColorStop(0, 'rgba(15, 20, 45, 0.85)');
      bgGrad.addColorStop(1, 'rgba(5, 8, 20, 0.95)');

      ctx.fillStyle = bgGrad;
      ctx.strokeStyle = card.typeInfo.color;
      ctx.lineWidth = 2.5;

      drawRoundedRect(ctx, -cw / 2, -ch / 2, cw, ch, 10);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, -15, 18, 0, Math.PI * 2);
      ctx.strokeStyle = card.typeInfo.color;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = card.typeInfo.color;
      ctx.font = '900 8px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(card.typeInfo.label, 0, -15);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '800 11px Outfit, sans-serif';
      ctx.fillText(card.typeInfo.val, 0, 25);
      ctx.restore();
    });
  }

  // RENDER MODE 2: 3D Grid Wave & Floating Particles
  function renderMode2() {
    tunnelTime += 0.02;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
    ctx.lineWidth = 1;

    // Draw 3D Grid Wave Floor
    const gridCols = 24;
    const gridRows = 16;
    const cellW = width / gridCols;
    const horizonY = height * 0.45;

    for (let r = 0; r < gridRows; r++) {
      const z = r * 30 + (tunnelTime * 20) % 30;
      const scale = 500 / (500 + z);
      const y = horizonY + (height - horizonY) * (r / gridRows);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let c = 0; c <= gridCols; c++) {
      const x = c * cellW;
      ctx.beginPath();
      ctx.moveTo(width / 2 + (x - width / 2) * 0.1, horizonY);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Floating Particles
    gridParticles.forEach((p) => {
      p.y += p.vy;
      if (p.y < -30) {
        p.y = height + 40;
        p.x = Math.random() * width;
      }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.font = `${p.size + 8}px Outfit, sans-serif`;
      ctx.fillText(p.shape, p.x + currentRotY * 30, p.y + currentRotX * 30);
    });
    ctx.globalAlpha = 1.0;
  }

  // RENDER MODE 3: Golden Liquid Silk & Bokeh Dust
  function renderMode3() {
    tunnelTime += 0.015;

    // Golden Ribbon Waves
    for (let wIdx = 0; wIdx < 3; wIdx++) {
      ctx.beginPath();
      const waveGrad = ctx.createLinearGradient(0, 0, width, height);
      waveGrad.addColorStop(0, 'rgba(255, 215, 0, 0.25)');
      waveGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.15)');
      waveGrad.addColorStop(1, 'rgba(120, 53, 15, 0.05)');

      ctx.fillStyle = waveGrad;
      ctx.moveTo(0, height);

      for (let x = 0; x <= width; x += 30) {
        const y = height * 0.5 + Math.sin(x * 0.003 + tunnelTime + wIdx) * 90 + Math.cos(x * 0.002 - tunnelTime) * 60;
        ctx.lineTo(x, y + wIdx * 45);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    }

    // Golden Bokeh Dust
    bokehs.forEach((b) => {
      b.x += b.vx + currentRotY * 0.5;
      b.y += b.vy + currentRotX * 0.5;
      if (b.y < -20) {
        b.y = height + 20;
        b.x = Math.random() * width;
      }

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${b.hue}, 90%, 60%, ${b.alpha})`;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  // RENDER MODE 4: Hypnotic 3D Depth Tunnel
  function renderMode4() {
    tunnelTime += 0.8;
    const centerX = width / 2 + currentRotY * 80;
    const centerY = height / 2 + currentRotX * 80;

    for (let i = 0; i < 18; i++) {
      const z = ((i * 45 + tunnelTime) % 700) + 1;
      const scale = 700 / z;
      const w = 320 * scale;
      const h = 480 * scale;

      const alpha = Math.min(1.0, (700 - z) / 400);
      ctx.strokeStyle = i % 2 === 0 ? `rgba(0, 243, 255, ${alpha * 0.6})` : `rgba(255, 215, 0, ${alpha * 0.6})`;
      ctx.lineWidth = Math.max(1, 4 * scale);

      ctx.strokeRect(centerX - w / 2, centerY - h / 2, w, h);
    }
  }

  function render() {
    currentRotX += (targetRotX - currentRotX) * 0.05;
    currentRotY += (targetRotY - currentRotY) * 0.05;

    ctx.clearRect(0, 0, width, height);

    if (activeMode === 1) renderMode1();
    else if (activeMode === 2) renderMode2();
    else if (activeMode === 3) renderMode3();
    else if (activeMode === 4) renderMode4();

    requestAnimationFrame(render);
  }

  render();

  return {
    setMode: function (modeNum) {
      activeMode = parseInt(modeNum, 10);
      console.log("SWITCHED 3D BG MODE TO:", activeMode);
    },
    getMode: function () {
      return activeMode;
    }
  };
})();
