window.CardRenderer = {
  PROPERTY_SETS: {
    brown: { count: 2, rents: [1, 2], displayColor: '#8B4513', label: 'Brown', properties: ['Brown Property 1', 'Brown Property 2'] },
    lightBlue: { count: 3, rents: [1, 2, 3], displayColor: '#87CEEB', label: 'Light Blue', properties: ['Light Blue Property 1', 'Light Blue Property 2', 'Light Blue Property 3'] },
    pink: { count: 3, rents: [1, 2, 4], displayColor: '#FF69B4', label: 'Pink', properties: ['Pink Property 1', 'Pink Property 2', 'Pink Property 3'] },
    orange: { count: 3, rents: [1, 3, 5], displayColor: '#FF8C00', label: 'Orange', properties: ['Orange Property 1', 'Orange Property 2', 'Orange Property 3'] },
    red: { count: 3, rents: [2, 3, 6], displayColor: '#FF0000', label: 'Red', properties: ['Red Property 1', 'Red Property 2', 'Red Property 3'] },
    yellow: { count: 3, rents: [2, 4, 6], displayColor: '#FFD700', label: 'Yellow', properties: ['Yellow Property 1', 'Yellow Property 2', 'Yellow Property 3'] },
    green: { count: 3, rents: [2, 4, 7], displayColor: '#228B22', label: 'Green', properties: ['Green Property 1', 'Green Property 2', 'Green Property 3'] },
    darkBlue: { count: 2, rents: [3, 8], displayColor: '#00008B', label: 'Dark Blue', properties: ['Dark Blue Property 1', 'Dark Blue Property 2'] },
    railroad: { count: 4, rents: [1, 2, 3, 4], displayColor: '#D946EF', label: 'Railroad', properties: ['Railroad 1', 'Railroad 2', 'Railroad 3', 'Railroad 4'] },
    utility: { count: 2, rents: [1, 2], displayColor: '#16A085', label: 'Utility', properties: ['Utility 1', 'Utility 2'] },
    unassigned: { count: 1, rents: [0], displayColor: '#9333ea', label: 'Unassigned Wild', properties: ['Rainbow Wild'] }
  },

  getCardImagePath(card) {
    if (card.type === 'property' || card.type === 'wild') {
      const color = card.color || (card.colors && card.colors[0]) || card.currentColor;
      if (color) {
        if (color === 'brown') return 'images/pyramids.png';
        if (color === 'lightBlue') return 'images/rio.png';
        if (color === 'pink') return 'images/tokyo.png';
        if (color === 'orange') return 'images/barcelona.png';
        if (color === 'red') return 'images/paris.png';
        if (color === 'yellow') return 'images/sydney.png';
        if (color === 'green') return 'images/london.png';
        if (color === 'darkBlue') return 'images/new_york.png';
        if (color === 'railroad') return 'images/railroad.png';
        if (color === 'utility') return 'images/utility.png';
      }
      return 'images/action.png';
    }
    if (card.type === 'money') return 'images/utility.png';
    if (card.type === 'action' || card.type === 'rent') {
      return 'images/action.png';
    }
    return null;
  },

  createCard(card, options = {}) {
    const el = document.createElement('div');
    el.className = 'card';
    if (options.selectable) {
      el.classList.add('playable');
    }
    if (options.mini) {
      el.classList.add('card-mini');
    }
    el.dataset.cardId = card.id;
    
    if (options.back) {
      el.classList.add('card-back');
      if (options.mini) {
        el.classList.add('card-mini');
      }
      el.innerHTML = '<div class="card-deal-logo-circle"><span class="deal-circle-text">CHALOO</span></div>';
      if (options.onClick) {
        el.addEventListener('click', () => options.onClick(card));
      }
      return el;
    }

    el.classList.add(`card-${card.type}`);
    const colorClass = this.getCardColorClass(card);
    if (colorClass) {
      el.classList.add(colorClass);
      if (colorClass === 'card-rainbow') {
        el.classList.add('rainbow');
      }
    }

    let typeLabel = card.type.toUpperCase();
    let headerStyle = '';
    let bodyContent = '';

    if (card.type === 'property' || card.type === 'wild') {
      el.classList.add('card-property-clean');
      let headerBg = '';
      let rentsList = [];

      if (card.type === 'property') {
        const setInfo = this.PROPERTY_SETS[card.color];
        headerBg = setInfo ? setInfo.displayColor : '#888';
        rentsList = setInfo ? setInfo.rents : [];
        el.style.borderColor = headerBg;
      } else if (card.type === 'wild') {
        if (card.colors && card.colors.length === 2) {
          const c1 = this.PROPERTY_SETS[card.colors[0]];
          const c2 = this.PROPERTY_SETS[card.colors[1]];
          const bg1 = c1 ? c1.displayColor : '#8B4513';
          const bg2 = c2 ? c2.displayColor : '#87CEEB';
          headerBg = `linear-gradient(90deg, ${bg1} 50%, ${bg2} 50%)`;
          el.style.borderColor = bg1;

          const activeColor = card.currentColor;
          if (activeColor && this.PROPERTY_SETS[activeColor]) {
            rentsList = this.PROPERTY_SETS[activeColor].rents;
          } else {
            rentsList = c1 ? c1.rents : [];
          }
        } else {
          headerBg = `linear-gradient(90deg, #ef4444, #eab308, #22c55e, #00bcd4, #ec4899)`;
          el.style.borderColor = '#eab308';
          const activeColor = card.currentColor;
          if (activeColor && this.PROPERTY_SETS[activeColor]) {
            rentsList = this.PROPERTY_SETS[activeColor].rents;
          }
        }
      }

      let rentRowsHtml = '';
      rentsList.forEach((rentVal, idx) => {
        const isFull = idx === rentsList.length - 1;
        const labelText = isFull ? `FULL SET...${rentVal}M` : `${rentVal}M`;
        rentRowsHtml += `
          <div class="rent-row">
            <span class="rent-set-icon">${idx + 1}</span>
            <span class="rent-dots">................................</span>
            <span class="rent-val ${isFull ? 'full-set' : ''}">${labelText}</span>
          </div>
        `;
      });

      const activeBadgeHtml = (card.type === 'wild' && card.currentColor && this.PROPERTY_SETS[card.currentColor])
        ? `<div class="active-wild-pill" style="background:${this.PROPERTY_SETS[card.currentColor].displayColor}">ACTIVE: ${this.PROPERTY_SETS[card.currentColor].label.toUpperCase()}</div>`
        : '';

      el.innerHTML = `
        <div class="card-value-circle">${card.value}M</div>
        <div class="card-header-plain" style="background: ${headerBg};"></div>
        <div class="card-body-clean">
          ${activeBadgeHtml}
          <div class="rent-title-clean">RENT</div>
          <div class="rent-rows-clean">
            ${rentRowsHtml}
          </div>
        </div>
      `;

      if (options.onClick) {
        el.addEventListener('click', (e) => options.onClick(card, e));
      }

      return el;
    }

    typeLabel = card.type.toUpperCase();
    headerStyle = '';
    bodyContent = '';

    if (card.type === 'action') {
      typeLabel = `ACTION CARD`;
      headerStyle = `background: #ffffff; color: #000000; font-weight: 900;`;
      bodyContent = `<div class="action-desc">${this.getActionDescription(card.actionType)}</div>`;
    } else if (card.type === 'money') {
      typeLabel = `MONEY CARD`;
      headerStyle = `background: linear-gradient(90deg, #d97706, #eab308); color: #000000; font-weight: 900;`;
      bodyContent = `<div class="money-large">${card.value}M</div>`;
    } else if (card.type === 'rent') {
      el.classList.add('card-rent-clean');
      const colors = card.rentColors || card.colors || [];
      let bgGradient = '';
      let descText = '';

      if (colors.length > 2) {
        bgGradient = 'conic-gradient(#ef4444, #eab308, #22c55e, #00bcd4, #ec4899, #ef4444)';
        descText = 'Charge rent to a targeted player for any property set.';
      } else if (colors.length === 2) {
        const c1 = this.PROPERTY_SETS[colors[0]] ? this.PROPERTY_SETS[colors[0]].displayColor : '#22c55e';
        const c2 = this.PROPERTY_SETS[colors[1]] ? this.PROPERTY_SETS[colors[1]].displayColor : '#0284c7';
        bgGradient = `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;
        descText = 'All players pay you rent for properties you own in one of these colors.';
      } else {
        bgGradient = 'linear-gradient(135deg, #0284c7, #06b6d4)';
        descText = 'Charge rent to players.';
      }

      el.innerHTML = `
        <div class="card-value-circle">${card.value || 1}M</div>
        <div class="rent-action-header-text">ACTION CARD</div>
        <div class="rent-emblem-outer">
          <div class="rent-emblem-ring" style="background: ${bgGradient};">
            <div class="rent-emblem-inner">
              <span class="rent-emblem-text">RENT</span>
            </div>
          </div>
        </div>
        <div class="rent-desc-text">${descText}</div>
      `;

      if (options.onClick) {
        el.addEventListener('click', (e) => options.onClick(card, e));
      }
      return el;
    }

    const dealLogoHtml = `<div class="card-deal-logo-circle"><span class="deal-circle-text">CHALOO</span></div>`;
    const titleHtml = `<div class="card-title">${card.name}</div>`;

    el.innerHTML = `
      <div class="card-value">${card.value}M</div>
      <div class="card-header" style="${headerStyle}">${typeLabel}</div>
      ${dealLogoHtml}
      ${titleHtml}
      <div class="card-body">${bodyContent}</div>
    `;

    if (options.onClick) {
      el.addEventListener('click', (e) => options.onClick(card, e));
    }

    return el;
  },

  createCardBack(options = {}) {
    const el = document.createElement('div');
    el.className = 'card card-back';
    if (options.mini) {
      el.classList.add('card-mini');
    }
    el.innerHTML = '<div class="card-deal-logo-circle"><span class="deal-circle-text">CHALOO</span></div>';
    return el;
  },

  getActionDescription(actionType) {
    const descriptions = {
      'dealBreaker': 'Steal a complete set of properties from any player.',
      'slyDeal': 'Steal a property from any player (cannot be part of a full set).',
      'forcedDeal': 'Swap any property with another player (cannot be part of a full set).',
      'debtCollector': 'Demand 5M from one player.',
      'birthday': 'All players give you 2M as a "gift".',
      'passGo': 'Draw 2 extra cards.',
      'house': 'Add to any complete property set to increase rent by 3M.',
      'hotel': 'Add to a complete property set (that has a house) to increase rent by 4M.',
      'doubleRent': 'Play with a rent card to double the rent charged.',
      'justSayNo': 'Cancel any action played against you.'
    };
    return descriptions[actionType] || 'Action card.';
  },

  getCardColorClass(card) {
    if (card.currentColor) {
      return `card-${card.currentColor}`;
    }
    if (card.color) {
      return `card-${card.color}`;
    }
    if (card.colors && card.colors.length > 0) {
      if (card.colors.length > 2) return 'card-rainbow';
      return `card-${card.colors[0]}-${card.colors[1]}`;
    }
    if (card.type === 'wild' && !card.colors) {
      return 'card-rainbow';
    }
    return null;
  }
};
