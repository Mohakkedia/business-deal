/**
 * CHALOO - Elegant Steady (Non-Moving, No Cards) Luxury Background Engine
 * Includes White & Light Luxury Themes with Elegant Geometric Crest Accents:
 * 1. Pure Minimalist Pearl (Clean White Glass & Gold Geometric Crest)
 * 2. Marble & Ivory Elegance (Warm Ivory, Champagne & Gold Emblem)
 * 3. Nordic Ice Minimal (Crisp Ice White & Slate Art-Deco Lines)
 * 4. Obsidian Gold Luxury (Deep Dark Charcoal & Liquid Gold Crest)
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
    render();
  });

  // Helper: Draw Steady Luxury Geometric Crest (No Cards, No Motion)
  function drawLuxuryCrest(centerX, centerY, strokeColor, glowColor) {
    ctx.save();
    ctx.translate(centerX, centerY);

    // Outer Soft Glow
    const glow = ctx.createRadialGradient(0, 0, 50, 0, 0, 320);
    glow.addColorStop(0, glowColor);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 320, 0, Math.PI * 2);
    ctx.fill();

    // Concentric Geometric Fine Lines
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.2;

    [120, 180, 240, 300].forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      // 8-Pointed Star Facets
      if (idx % 2 === 0) {
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    });

    // Elegant Corner Art-Deco Accent Lines
    const cornerOffset = 220;
    [-cornerOffset, cornerOffset].forEach(cx => {
      [-cornerOffset, cornerOffset].forEach(cy => {
        ctx.beginPath();
        ctx.arc(cx, cy, 35, 0, Math.PI * 2);
        ctx.stroke();
      });
    });

    ctx.restore();
  }

  // Theme 1: Pure Minimalist Pearl (Clean White Glass & Gold Crest)
  function renderTheme1() {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.5, '#f4f6fb');
    bgGrad.addColorStop(1, '#e9ecf5');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    drawLuxuryCrest(width * 0.5, height * 0.42, 'rgba(217, 180, 110, 0.25)', 'rgba(255, 215, 0, 0.12)');
  }

  // Theme 2: Marble & Ivory Elegance (Warm Ivory & Champagne Crest)
  function renderTheme2() {
    const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 80, width * 0.5, height * 0.5, width * 0.85);
    bgGrad.addColorStop(0, '#faf8f5');
    bgGrad.addColorStop(0.5, '#f2ece4');
    bgGrad.addColorStop(1, '#e5dcd3');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    drawLuxuryCrest(width * 0.5, height * 0.42, 'rgba(195, 145, 80, 0.28)', 'rgba(217, 180, 130, 0.2)');
  }

  // Theme 3: Nordic Ice Minimal (Crisp Ice White & Slate Accent Crest)
  function renderTheme3() {
    const bgGrad = ctx.createLinearGradient(width * 0.2, 0, width * 0.8, height);
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(0.5, '#e2e8f0');
    bgGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    drawLuxuryCrest(width * 0.5, height * 0.42, 'rgba(51, 65, 85, 0.2)', 'rgba(51, 65, 85, 0.08)');
  }

  // Theme 4: Obsidian Gold Luxury (Deep Dark Charcoal & Gold Crest)
  function renderTheme4() {
    const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 100, width * 0.5, height * 0.5, width * 0.85);
    bgGrad.addColorStop(0, '#121420');
    bgGrad.addColorStop(0.6, '#090a12');
    bgGrad.addColorStop(1, '#030408');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    drawLuxuryCrest(width * 0.5, height * 0.42, 'rgba(255, 215, 0, 0.25)', 'rgba(255, 215, 0, 0.15)');
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    if (activeMode <= 3) {
      document.body.classList.add('light-bg-theme');
      document.body.classList.remove('dark-bg-theme');
    } else {
      document.body.classList.add('dark-bg-theme');
      document.body.classList.remove('light-bg-theme');
    }

    if (activeMode === 1) renderTheme1();
    else if (activeMode === 2) renderTheme2();
    else if (activeMode === 3) renderTheme3();
    else if (activeMode === 4) renderTheme4();
  }

  // Initial render
  render();

  return {
    setMode: function (modeNum) {
      activeMode = parseInt(modeNum, 10);
      render();
    },
    getMode: function () {
      return activeMode;
    }
  };
})();
