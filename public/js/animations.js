window.Animations = {
  dealCard(cardEl, fromEl, toEl, delay = 0) {
    return new Promise(resolve => {
      if (!fromEl || !toEl) {
        resolve();
        return;
      }
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const deltaX = fromRect.left - toRect.left;
      const deltaY = fromRect.top - toRect.top;

      cardEl.style.transition = 'none';
      cardEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      cardEl.style.opacity = '0';

      setTimeout(() => {
        cardEl.style.transition = 'transform 0.4s ease-out, opacity 0.2s';
        cardEl.style.transform = 'translate(0, 0)';
        cardEl.style.opacity = '1';
        setTimeout(resolve, 400);
      }, delay);
    });
  },

  playCard(cardEl, targetEl) {
    return new Promise(resolve => {
      if (!targetEl) {
        resolve();
        return;
      }
      cardEl.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
      cardEl.style.transform = 'scale(1.1) translateY(-20px)';
      
      setTimeout(() => {
        cardEl.style.transform = 'scale(1) translateY(0)';
        setTimeout(resolve, 400);
      }, 400);
    });
  },

  shakeElement(el) {
    if (!el) return;
    el.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' }
    ], {
      duration: 400,
      iterations: 1
    });
  },

  pulseElement(el) {
    if (!el) return;
    el.animate([
      { transform: 'scale(1)', filter: 'brightness(1)' },
      { transform: 'scale(1.05)', filter: 'brightness(1.2)' },
      { transform: 'scale(1)', filter: 'brightness(1)' }
    ], {
      duration: 500,
      iterations: 1
    });
  },

  showConfetti() {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.top = '-10px';
      confetti.style.zIndex = '9999';
      confetti.style.pointerEvents = 'none';
      document.body.appendChild(confetti);

      const animation = confetti.animate([
        { transform: `translate3d(0, 0, 0) rotate(0deg)`, opacity: 1 },
        { transform: `translate3d(${Math.random() * 200 - 100}px, 100vh, 0) rotate(${Math.random() * 720}deg)`, opacity: 0 }
      ], {
        duration: Math.random() * 2000 + 1000,
        easing: 'cubic-bezier(.37,0,.63,1)'
      });

      animation.onfinish = () => confetti.remove();
    }
  },

  fadeIn(el, duration = 300) {
    return new Promise(resolve => {
      if (!el) { resolve(); return; }
      el.style.display = '';
      el.style.opacity = '0';
      el.style.transition = `opacity ${duration}ms`;
      setTimeout(() => {
        el.style.opacity = '1';
        setTimeout(resolve, duration);
      }, 10);
    });
  },

  fadeOut(el, duration = 300) {
    return new Promise(resolve => {
      if (!el) { resolve(); return; }
      el.style.transition = `opacity ${duration}ms`;
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.display = 'none';
        resolve();
      }, duration);
    });
  },

  slideIn(el, direction = 'right') {
    if (!el) return;
    el.style.transition = 'none';
    const transformValue = direction === 'right' ? 'translateX(100%)' : (direction === 'left' ? 'translateX(-100%)' : 'translateY(100%)');
    el.style.transform = transformValue;
    
    setTimeout(() => {
      el.style.transition = 'transform 0.4s ease-out';
      el.style.transform = 'translate(0)';
    }, 10);
  }
};
