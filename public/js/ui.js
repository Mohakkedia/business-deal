window.UI = {
  currentState: null,
  selectedCardId: null,
  selectedPaymentCards: new Set(),
  selectedDiscardCards: new Set(),

  showScreen(screenId) {
    const screens = ['title-screen', 'lobby-screen', 'game-screen', 'rules-screen'];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === screenId) {
          el.classList.remove('hidden');
          el.style.display = 'flex';
        } else {
          el.classList.add('hidden');
          el.style.display = 'none';
        }
      }
    });
  },

  onRoomCreated({ roomCode }) {
    this.showScreen('lobby-screen');
    const codeDisplay = document.getElementById('room-code-display');
    if (codeDisplay) codeDisplay.textContent = roomCode;
    const shareLink = document.getElementById('shareable-link');
    if (shareLink) shareLink.textContent = `${window.location.origin}/?room=${roomCode}`;
  },

  onRoomUpdated(room) {
    const { players, hostId, code } = room;
    
    // Switch to lobby screen if not already there
    const lobbyScreen = document.getElementById('lobby-screen');
    if (lobbyScreen && lobbyScreen.classList.contains('hidden')) {
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen && gameScreen.classList.contains('hidden')) {
        this.showScreen('lobby-screen');
      }
    }

    if (code) {
      const codeDisplay = document.getElementById('room-code-display');
      if (codeDisplay) codeDisplay.textContent = code;
      const shareLink = document.getElementById('shareable-link');
      if (shareLink) shareLink.textContent = `${window.location.origin}/?room=${code}`;
    }

    const list = document.getElementById('player-list');
    list.innerHTML = '';
    players.forEach(p => {
      const li = document.createElement('li');
      let nameText = p.isBot ? `🤖 ${p.name}` : p.name;
      li.textContent = `${nameText} ${p.id === hostId ? '(Host)' : ''} ${p.connected ? '' : '(Disconnected)'}`;
      list.appendChild(li);
    });
    
    const countSpan = document.getElementById('player-count');
    if (countSpan) countSpan.textContent = players.length;

    const addBotBtn = document.getElementById('btn-add-bot');
    if (addBotBtn) {
      if (this.getMyPlayerId() === hostId && players.length < 4) {
        addBotBtn.style.display = 'inline-flex';
      } else {
        addBotBtn.style.display = 'none';
      }
    }

    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) {
      if (this.getMyPlayerId() === hostId) {
        startBtn.disabled = false;
      } else {
        startBtn.disabled = true;
      }
    }
  },

  onGameStarted() {
    this.showScreen('game-screen');
    this.hideAllModals();
  },

  onGameState(state) {
    if (!state) return;
    this.currentState = state;
    if (state.phase && state.phase !== 'LOBBY' && state.phase !== 'WAITING') {
      const gameScreen = document.getElementById('game-screen');
      if (gameScreen && gameScreen.classList.contains('hidden')) {
        this.showScreen('game-screen');
      }
    }
    
    try {
      const you = state.you || {};
      this.renderHand(you.hand || []);
      this.renderBank(you.bank || []);
      this.renderProperties(you.properties || {}, you.completeSets || []);
      this.renderOpponents(state.opponents || []);
      this.renderCenterArea(state);
      this.renderActionLog(state.actionLog || []);
      this.updateControls(state);
    } catch (err) {
      console.error("Error rendering game state:", err);
    }

    if (state.pendingAction && state.pendingAction.toPlayerId === this.getMyPlayerId()) {
      this.showActionResponseModal(state.pendingAction);
    } else if (state.pendingPayment && state.phase === 'PAYMENT' && state.pendingPayment.owedBy && state.pendingPayment.owedBy.includes(this.getMyPlayerId())) {
      this.showPaymentModal(state.pendingPayment.amount, state.pendingPayment.toPlayerName);
    } else if (state.discardCount && state.phase === 'DISCARD') {
      this.showDiscardModal(state.discardCount);
    } else {
      // Hide modal if not in pending phase
      const modalPayment = document.getElementById('modal-payment');
      if (modalPayment && !modalPayment.classList.contains('hidden') && state.phase !== 'PAYMENT') {
        modalPayment.classList.add('hidden');
      }
      const modalDiscard = document.getElementById('modal-discard');
      if (modalDiscard && !modalDiscard.classList.contains('hidden') && state.phase !== 'DISCARD') {
        modalDiscard.classList.add('hidden');
      }
      const modalActionResponse = document.getElementById('modal-action-response');
      if (modalActionResponse && !modalActionResponse.classList.contains('hidden') && state.phase !== 'ACTION_RESPONSE') {
        modalActionResponse.classList.add('hidden');
      }
    }
  },

  updateTurnTimer(timeRemaining) {
    const badge = document.getElementById('turn-timer-badge');
    if (badge) {
      badge.textContent = `⏳ ${timeRemaining}s`;
      if (timeRemaining <= 5) {
        badge.classList.add('urgent');
      } else {
        badge.classList.remove('urgent');
      }
    }
  },

  renderHand(hand) {
    const container = document.getElementById('player-hand');
    container.innerHTML = '';
    const isPlayPhase = this.currentState.phase === 'PLAY' && this.isMyTurn();
    const canPlay = isPlayPhase && this.currentState.cardsPlayedThisTurn < this.currentState.maxCardsPerTurn;

    hand.forEach((card, index) => {
      const cardEl = window.CardRenderer.createCard(card, {
        selectable: canPlay,
        onClick: (c) => this.handleHandCardClick(c)
      });
      
      cardEl.style.transform = 'none';
      cardEl.style.zIndex = index;
      
      cardEl.addEventListener('mouseenter', () => {
        if (canPlay) {
          cardEl.style.transform = 'translateY(-20px) scale(1.08)';
          cardEl.style.zIndex = 50;
        }
      });
      cardEl.addEventListener('mouseleave', () => {
        cardEl.style.transform = 'none';
        cardEl.style.zIndex = index;
      });

      container.appendChild(cardEl);
    });
  },

  renderBank(bank) {
    const totalEl = document.querySelector('#player-bank .bank-total span');
    const stack = document.querySelector('#player-bank .bank-stack');
    
    let total = 0;
    if (stack) {
      stack.innerHTML = '';
      bank.forEach((card, idx) => {
        total += card.value;
        const cardEl = window.CardRenderer.createCard(card, { mini: true });
        cardEl.style.position = 'absolute';
        cardEl.style.top = `${idx * 15}px`;
        stack.appendChild(cardEl);
      });
    }
    
    if (totalEl) {
      totalEl.textContent = total;
    }
  },

  renderProperties(properties, completeSets) {
    const container = document.getElementById('player-properties');
    container.innerHTML = '';
    
    Object.keys(properties).forEach(color => {
      const cardsInSet = properties[color] || [];
      if (cardsInSet.length === 0) return;

      const setDef = window.CardRenderer.PROPERTY_SETS[color];
      if (!setDef) return;

      // Filter out houses and hotels from the properties list to count city cards
      const cityCards = cardsInSet.filter(c => c.type === 'property' || c.type === 'wild');
      const hasHouse = cardsInSet.some(c => c.actionType === 'house');
      const hasHotel = cardsInSet.some(c => c.actionType === 'hotel');

      const colDiv = document.createElement('div');
      colDiv.className = 'property-column';
      
      const isComplete = completeSets.includes(color);
      if (isComplete) {
        colDiv.classList.add('complete-set');
      }

      // 1. Create set header
      const headerDiv = document.createElement('div');
      headerDiv.className = 'property-set-header';
      headerDiv.style.backgroundColor = setDef.displayColor;
      
      // Icons for house/hotel
      let iconsHtml = '';
      if (hasHouse) iconsHtml += '🏠';
      if (hasHotel) iconsHtml += '🏨';
      
      // Render header with Flip Wild button if wild cards are present
      const wildCardsInSet = cardsInSet.filter(c => c.type === 'wild');
      headerDiv.innerHTML = `
        <span class="set-name">${setDef.label}</span>
        <div class="set-meta">
          <span>Set Progress</span>
          <span>${cityCards.length}/${setDef.count}</span>
        </div>
        <div class="set-icons">${iconsHtml}${isComplete ? ' ✓' : ''}</div>
      `;

      if (wildCardsInSet.length > 0 && this.isMyTurn() && this.currentState.phase === 'PLAY') {
        const flipBtn = document.createElement('button');
        flipBtn.className = 'btn-flip-wild';
        flipBtn.style.fontSize = '0.65rem';
        flipBtn.style.padding = '2px 8px';
        flipBtn.style.marginTop = '4px';
        flipBtn.style.borderRadius = '10px';
        flipBtn.style.background = 'linear-gradient(90deg, #ec4899, #8b5cf6)';
        flipBtn.style.color = '#fff';
        flipBtn.style.border = 'none';
        flipBtn.style.cursor = 'pointer';
        flipBtn.style.fontWeight = 'bold';
        flipBtn.innerHTML = '🔄 Flip Wild';
        flipBtn.onclick = (e) => {
          e.stopPropagation();
          const wildCard = wildCardsInSet[0];
          const allowedColors = wildCard.colors || Object.keys(window.CardRenderer.PROPERTY_SETS);
          this.showColorSelectModal(allowedColors, (targetColor) => {
            window.Network.moveWildCard(wildCard.id, targetColor);
          });
        };
        headerDiv.appendChild(flipBtn);
      }
      colDiv.appendChild(headerDiv);

      // 2. Create list of badges for your properties
      const listDiv = document.createElement('div');
      listDiv.className = 'property-badges-list';

      // Resolve slots and cards
      const requiredCities = setDef.properties;
      const ownedCities = cityCards.filter(c => c.type === 'property').map(c => c.name);
      
      cardsInSet.forEach(card => {
        const badge = document.createElement('div');
        badge.className = 'property-badge owned';
        badge.style.cursor = 'pointer';
        
        if (card.type === 'wild') {
          badge.style.borderColor = 'var(--color-gold)';
          badge.style.background = 'rgba(255, 215, 0, 0.15)';
          const canFlip = this.isMyTurn() && this.currentState.phase === 'PLAY';
          badge.innerHTML = `<span>🌈 ${card.name}</span> ${canFlip ? '<span class="flip-icon" style="color:var(--color-neon-pink);font-weight:bold;">🔄</span>' : '<span>✓</span>'}`;
          badge.addEventListener('click', (e) => {
            e.stopPropagation();
            if (canFlip) {
              const allowedColors = card.colors || Object.keys(window.CardRenderer.PROPERTY_SETS);
              this.showColorSelectModal(allowedColors, (targetColor) => {
                window.Network.moveWildCard(card.id, targetColor);
              });
            } else {
              this.showCardDetailModal(card);
            }
          });
        } else {
          badge.innerHTML = `<span>${card.name}</span> <span>✓</span>`;
          badge.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showCardDetailModal(card);
          });
        }
        listDiv.appendChild(badge);
      });

      // Show missing slots for incomplete sets
      requiredCities.forEach(propName => {
        if (!ownedCities.includes(propName) && !cardsInSet.some(c => c.type === 'wild')) {
          const missingBadge = document.createElement('div');
          missingBadge.className = 'property-badge missing';
          missingBadge.innerHTML = `<span>${propName}</span> <span>○</span>`;
          listDiv.appendChild(missingBadge);
        }
      });

      // Also render house/hotel badges if present
      cardsInSet.filter(c => c.actionType === 'house' || c.actionType === 'hotel').forEach(buildingCard => {
        const bBadge = document.createElement('div');
        bBadge.className = 'property-badge owned';
        bBadge.style.background = 'rgba(255, 215, 0, 0.15)';
        bBadge.style.borderColor = 'gold';
        bBadge.style.cursor = 'pointer';
        bBadge.title = 'Click to inspect building';
        bBadge.innerHTML = `<span>${buildingCard.actionType === 'house' ? '🏠 House' : '🏨 Hotel'}</span> <span>+${buildingCard.actionType === 'house' ? '3' : '4'}M</span>`;
        bBadge.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showCardDetailModal(buildingCard);
        });
        listDiv.appendChild(bBadge);
      });

      colDiv.appendChild(listDiv);
      container.appendChild(colDiv);
    });
  },

  renderOpponents(opponents) {
    const container = document.getElementById('opponents-area');
    container.innerHTML = '';
    
    opponents.forEach(opp => {
      const div = document.createElement('div');
      div.className = 'opponent-panel';
      if (this.currentState.currentTurnPlayerId === opp.id) {
        div.classList.add('active-turn');
      }
      
      const header = document.createElement('h3');
      header.className = 'opponent-name';
      header.textContent = opp.name;
      div.appendChild(header);

      const bankTotal = opp.bank ? opp.bank.reduce((acc, c) => acc + (c.value || 0), 0) : 0;
      const badges = document.createElement('div');
      badges.className = 'opponent-stats';
      badges.style.fontSize = '0.75rem';
      badges.style.color = 'rgba(255,255,255,0.7)';
      badges.innerHTML = `<span class="opponent-hand-count">Hand: ${opp.handCount}</span> | <span style="color:var(--color-gold);">Bank: $${bankTotal}M</span>`;
      div.appendChild(badges);

      // Detailed property sets display for opponents
      const propsContainer = document.createElement('div');
      propsContainer.className = 'opponent-properties-container';
      
      const propertyColors = Object.keys(opp.properties || {});
      let hasAnyProperties = false;

      propertyColors.forEach(color => {
        const cards = opp.properties[color] || [];
        if (cards.length === 0) return;
        hasAnyProperties = true;
        
        const setDef = window.CardRenderer.PROPERTY_SETS[color];
        if (!setDef) return;
        
        const isComplete = opp.completeSets && opp.completeSets.includes(color);

        const setCol = document.createElement('div');
        setCol.className = 'opponent-set-column';
        if (isComplete) {
          setCol.classList.add('complete-set');
        }

        const cardsStack = document.createElement('div');
        cardsStack.className = 'opponent-cards-stack';
        cardsStack.style.display = 'flex';
        cardsStack.style.flexDirection = 'column';
        cardsStack.style.alignItems = 'center';

        cards.forEach((card, idx) => {
          const miniCard = window.CardRenderer.createCard(card, { mini: true });
          miniCard.style.cursor = 'pointer';
          if (idx > 0) {
            miniCard.style.marginTop = '-38px'; // Stack overlap matching screenshot!
          }
          miniCard.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showCardDetailModal(card);
          });
          cardsStack.appendChild(miniCard);
        });

        setCol.appendChild(cardsStack);
        propsContainer.appendChild(setCol);
      });

      if (!hasAnyProperties) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.fontSize = '0.7rem';
        emptyMsg.style.color = 'rgba(255,255,255,0.3)';
        emptyMsg.style.fontStyle = 'italic';
        emptyMsg.style.marginTop = '4px';
        emptyMsg.textContent = 'No properties built yet';
        propsContainer.appendChild(emptyMsg);
      }

      div.appendChild(propsContainer);
      container.appendChild(div);
    });
  },

  showCardDetailModal(card) {
    const modal = document.getElementById('modal-card-detail');
    if (!modal) return;
    const container = modal.querySelector('.enlarged-card-container');
    if (container) {
      container.innerHTML = '';
      const fullCard = window.CardRenderer.createCard(card);
      fullCard.style.transform = 'scale(1.2)';
      fullCard.style.margin = '15px auto';
      container.appendChild(fullCard);
    }
    modal.classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
  },

  renderCenterArea(state) {
    const drawPile = document.getElementById('draw-pile');
    drawPile.innerHTML = '';
    if (state.drawPileCount > 0) {
      const back = window.CardRenderer.createCardBack();
      const badge = document.createElement('div');
      badge.textContent = state.drawPileCount;
      badge.className = 'badge';
      badge.style.position = 'absolute';
      badge.style.top = '-10px';
      badge.style.right = '-10px';
      badge.style.background = 'red';
      badge.style.color = 'white';
      badge.style.padding = '5px';
      badge.style.borderRadius = '50%';
      back.appendChild(badge);
      drawPile.appendChild(back);
    }

    const discardPile = document.getElementById('discard-pile');
    discardPile.innerHTML = '';
    if (state.discardPileTop) {
      discardPile.appendChild(window.CardRenderer.createCard(state.discardPileTop));
    }

    const turnInd = document.getElementById('turn-indicator');
    if (turnInd) {
      const timeRemaining = state.turnTimeRemaining !== undefined ? state.turnTimeRemaining : 20;
      const label = this.isMyTurn() ? 'YOUR TURN' : `${state.currentTurnPlayerName}'s Turn`;
      const urgentClass = timeRemaining <= 5 ? 'urgent' : '';
      turnInd.innerHTML = `<span>${label}</span> <span id="turn-timer-badge" class="turn-timer-badge ${urgentClass}">⏳ ${timeRemaining}s</span>`;
    }

    const cp = document.getElementById('cards-played-counter');
    if (cp) {
      cp.textContent = `Played: ${state.cardsPlayedThisTurn} / ${state.maxCardsPerTurn}`;
    }
  },

  renderActionLog(log) {
    const container = document.getElementById('action-log');
    if (!container) return;
    container.innerHTML = '';
    log.slice(-10).forEach(msg => {
      const div = document.createElement('div');
      div.textContent = msg;
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  },

  updateControls(state) {
    const btnDraw = document.getElementById('btn-draw-cards');
    const btnEnd = document.getElementById('btn-end-turn');
    
    if (btnDraw) {
      btnDraw.style.display = (state.phase === 'DRAW' && this.isMyTurn()) ? 'inline-block' : 'none';
    }
    
    if (btnEnd) {
      btnEnd.style.display = (state.phase === 'PLAY' && this.isMyTurn()) ? 'inline-block' : 'none';
    }
  },

  handleHandCardClick(card) {
    if (this.currentState.phase !== 'PLAY' || !this.isMyTurn()) return;
    if (this.currentState.cardsPlayedThisTurn >= this.currentState.maxCardsPerTurn) {
      this.showNotification('Max cards played this turn', 'warning');
      return;
    }

    this.selectedCardId = card.id;

    if (card.type === 'money') {
      window.Network.playCardAsBank(card.id);
    } else if (card.type === 'property') {
      if (card.colors && card.colors.length > 1) {
        this.showColorSelectModal(card.colors, (color) => {
          window.Network.playCardAsProperty(card.id, color);
        });
      } else {
        window.Network.playCardAsProperty(card.id);
      }
    } else if (card.type === 'wild') {
      const allowedColors = card.colors || Object.keys(window.CardRenderer.PROPERTY_SETS);
      this.showColorSelectModal(allowedColors, (color) => {
        window.Network.playCardAsProperty(card.id, color);
      });
    } else if (card.type === 'action' || card.type === 'rent') {
      this.showCardActionModal(card);
    }
  },

  showCardActionModal(card) {
    const modal = document.getElementById('modal-card-action');
    if (!modal) return;
    
    const btnProp = document.getElementById('btn-play-as-property');
    const btnBank = document.getElementById('btn-play-as-bank');
    const btnAction = document.getElementById('btn-play-as-action');
    
    const preview = modal.querySelector('.modal-card-preview');
    if (preview) {
      preview.innerHTML = '';
      preview.appendChild(window.CardRenderer.createCard(card));
    }

    btnProp.classList.add('hidden');
    btnBank.classList.add('hidden');
    btnAction.classList.add('hidden');

    if (card.type === 'action' || card.type === 'rent') {
      btnAction.classList.remove('hidden');
      btnBank.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
  },

  handlePlayAsProperty() {
    const cardId = this.selectedCardId;
    this.hideAllModals();
    if (!cardId) return;
    
    const card = this.currentState.you.hand.find(c => c.id === cardId);
    if (!card) return;

    if (card.type === 'wild') {
      const allowedColors = card.colors || Object.keys(window.CardRenderer.PROPERTY_SETS);
      this.showColorSelectModal(allowedColors, (color) => {
        window.Network.playCardAsProperty(card.id, color);
        this.selectedCardId = null;
      });
    } else {
      window.Network.playCardAsProperty(card.id);
      this.selectedCardId = null;
    }
  },

  handlePlayAsBank() {
    const cardId = this.selectedCardId;
    this.hideAllModals();
    if (cardId) {
      window.Network.playCardAsBank(cardId);
      this.selectedCardId = null;
    }
  },

  handlePlayAsAction() {
    const cardId = this.selectedCardId;
    this.hideAllModals();
    if (!cardId) return;
    
    const card = this.currentState.you.hand.find(c => c.id === cardId);
    if (!card) return;

    if (card.actionType === 'house') {
      const eligibleColors = this.currentState.you.completeSets.filter(c => c !== 'railroad' && c !== 'utility');
      if (eligibleColors.length === 0) {
        alert("You must own a complete property set (excluding Railroads and Utilities) to play a House!");
        this.selectedCardId = null;
        return;
      }
      this.showColorSelectModal(eligibleColors, (color) => {
        window.Network.playCardAsAction(card.id, null, null, null, { color });
        this.selectedCardId = null;
      });
    } else if (card.actionType === 'hotel') {
      const eligibleColors = this.currentState.you.completeSets.filter(color => {
        const set = this.currentState.you.properties[color] || [];
        return set.some(c => c.actionType === 'house');
      });
      if (eligibleColors.length === 0) {
        alert("You must have a House built on a complete set to play a Hotel!");
        this.selectedCardId = null;
        return;
      }
      this.showColorSelectModal(eligibleColors, (color) => {
        window.Network.playCardAsAction(card.id, null, null, null, { color });
        this.selectedCardId = null;
      });
    } else if (card.actionType === 'dealBreaker') {
      this.showTargetSelectModal((targetId) => {
        const opp = this.currentState.opponents.find(o => o.id === targetId);
        if (!opp || opp.completeSets.length === 0) {
          alert(`${opp ? opp.name : 'Target'} has no complete sets to steal!`);
          this.selectedCardId = null;
          return;
        }
        this.showColorSelectModal(opp.completeSets, (color) => {
          window.Network.playCardAsAction(card.id, targetId, null, null, { targetColor: color });
          this.selectedCardId = null;
        });
      });
    } else if (card.actionType === 'slyDeal') {
      this.showTargetSelectModal((targetId) => {
        const opp = this.currentState.opponents.find(o => o.id === targetId);
        if (!opp) return;
        const stealableCards = [];
        Object.keys(opp.properties).forEach(color => {
          if (!opp.completeSets.includes(color)) {
            opp.properties[color].forEach(c => {
              if (c.type === 'property' || c.type === 'wild') stealableCards.push(c);
            });
          }
        });
        if (stealableCards.length === 0) {
          alert(`${opp.name} has no individual properties (not in complete sets) to steal!`);
          this.selectedCardId = null;
          return;
        }
        this.showPropertySelectModal(stealableCards, "Select Property to Steal", (targetCard) => {
          window.Network.playCardAsAction(card.id, targetId, null, null, { 
            targetColor: targetCard.color || targetCard.currentColor, 
            targetCardId: targetCard.id 
          });
          this.selectedCardId = null;
        });
      });
    } else if (card.actionType === 'forcedDeal') {
      this.showTargetSelectModal((targetId) => {
        const opp = this.currentState.opponents.find(o => o.id === targetId);
        if (!opp) return;
        
        const oppCards = [];
        Object.keys(opp.properties).forEach(color => {
          if (!opp.completeSets.includes(color)) {
            opp.properties[color].forEach(c => {
              if (c.type === 'property' || c.type === 'wild') oppCards.push(c);
            });
          }
        });
        
        const myCards = [];
        Object.keys(this.currentState.you.properties).forEach(color => {
          if (!this.currentState.you.completeSets.includes(color)) {
            this.currentState.you.properties[color].forEach(c => {
              if (c.type === 'property' || c.type === 'wild') myCards.push(c);
            });
          }
        });

        if (oppCards.length === 0) {
          alert(`${opp.name} has no individual properties to swap!`);
          this.selectedCardId = null;
          return;
        }
        if (myCards.length === 0) {
          alert("You have no individual properties to swap!");
          this.selectedCardId = null;
          return;
        }

        this.showPropertySelectModal(oppCards, "Select Card to Steal", (targetCard) => {
          this.showPropertySelectModal(myCards, "Select Your Card to Give", (myCard) => {
            window.Network.playCardAsAction(card.id, targetId, null, null, { 
              targetColor: targetCard.color || targetCard.currentColor, 
              targetCardId: targetCard.id,
              myColor: myCard.color || myCard.currentColor,
              myCardId: myCard.id
            });
            this.selectedCardId = null;
          });
        });
      });
    } else if (card.actionType === 'debtCollector') {
      this.showTargetSelectModal((targetId) => {
        window.Network.playCardAsAction(card.id, targetId);
        this.selectedCardId = null;
      });
    } else if (card.type === 'rent') {
      let colors = card.colors || card.rentColors || Object.keys(window.CardRenderer.PROPERTY_SETS);
      this.showColorSelectModal(colors, (color) => {
        if (colors.length === Object.keys(window.CardRenderer.PROPERTY_SETS).length) { // Any color rent
          this.showTargetSelectModal((targetId) => {
            window.Network.playCardAsAction(card.id, targetId, color);
            this.selectedCardId = null;
          });
        } else {
           window.Network.playCardAsAction(card.id, null, color);
           this.selectedCardId = null;
        }
      });
    } else {
      window.Network.playCardAsAction(card.id);
      this.selectedCardId = null;
    }
  },

  showPropertySelectModal(cards, title, callback) {
    const modal = document.getElementById('modal-target-select');
    if (!modal) return;
    
    modal.querySelector('h3').textContent = title;
    
    const list = modal.querySelector('.target-list') || document.createElement('div');
    if (!list.classList.contains('target-list')) {
      list.className = 'target-list';
      modal.appendChild(list);
    }
    list.innerHTML = '';
    
    cards.forEach(card => {
      const btn = document.createElement('button');
      const colorLabel = window.CardRenderer.PROPERTY_SETS[card.color || card.currentColor]?.label || card.color || 'Wild';
      btn.textContent = `${card.name} (${colorLabel})`;
      btn.onclick = () => {
        this.hideAllModals();
        modal.querySelector('h3').textContent = "SELECT TARGET PLAYER";
        callback(card);
      };
      list.appendChild(btn);
    });

    modal.classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
  },

  showTargetSelectModal(callback) {
    const modal = document.getElementById('modal-target-select');
    if (!modal) return;
    
    modal.querySelector('h3').textContent = "SELECT TARGET PLAYER";
    
    const list = modal.querySelector('.target-list') || document.createElement('div');
    if (!list.classList.contains('target-list')) {
      list.className = 'target-list';
      modal.appendChild(list);
    }
    list.innerHTML = '';
    
    this.currentState.opponents.forEach(opp => {
      const btn = document.createElement('button');
      btn.textContent = opp.name;
      btn.onclick = () => {
        this.hideAllModals();
        callback(opp.id);
      };
      list.appendChild(btn);
    });

    modal.classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
  },

  showColorSelectModal(colors, callback) {
    const modal = document.getElementById('modal-color-select');
    if (!modal) return;
    
    const list = modal.querySelector('.color-list') || document.createElement('div');
    if (!list.classList.contains('color-list')) {
      list.className = 'color-list';
      modal.appendChild(list);
    }
    list.innerHTML = '';
    
    // Standalone Unassigned option (Only for 10-color Rainbow wild cards)
    if (colors.length > 2) {
      const unassignedBtn = document.createElement('button');
      unassignedBtn.textContent = "🌈 Keep Unassigned (Standalone)";
      unassignedBtn.style.background = "linear-gradient(90deg, #ef4444, #eab308, #22c55e, #00bcd4, #ec4899)";
      unassignedBtn.style.color = "#ffffff";
      unassignedBtn.style.fontWeight = "800";
      unassignedBtn.style.margin = "6px 0 10px 0";
      unassignedBtn.style.padding = "8px 12px";
      unassignedBtn.style.width = "100%";
      unassignedBtn.style.borderRadius = "8px";
      unassignedBtn.style.cursor = "pointer";
      unassignedBtn.onclick = () => {
        this.hideAllModals();
        callback('unassigned');
      };
      list.appendChild(unassignedBtn);
    }

    colors.filter(c => c !== 'unassigned').forEach(color => {
      const btn = document.createElement('button');
      btn.textContent = window.CardRenderer.PROPERTY_SETS[color]?.label || color;
      btn.style.backgroundColor = window.CardRenderer.PROPERTY_SETS[color]?.displayColor || '#ccc';
      btn.style.color = '#fff';
      btn.style.margin = '5px';
      btn.style.cursor = "pointer";
      btn.onclick = () => {
        this.hideAllModals();
        callback(color);
      };
      list.appendChild(btn);
    });

    modal.classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
  },

  showPaymentModal(amount, toPlayerName) {
    const modal = document.getElementById('modal-payment');
    if (!modal) return;
    
    const targetAmountSpan = modal.querySelector('.target-amount');
    if (targetAmountSpan) targetAmountSpan.textContent = `$${amount}M`;
    const debtAmountSpan = modal.querySelector('.debt-amount');
    if (debtAmountSpan) debtAmountSpan.textContent = `$${amount}M`;
    
    const desc = modal.querySelector('p');
    if (desc) {
      desc.textContent = `You owe $${amount}M to ${toPlayerName}. Select cards from your Bank and Properties to pay.`;
    }
    
    this.selectedPaymentCards.clear();
    
    const container = modal.querySelector('.payment-selection-area') || modal.querySelector('.payment-cards');
    if (container) {
      container.innerHTML = '';
      container.style.display = 'flex';
      container.style.flexWrap = 'wrap';
      container.style.gap = '10px';
      container.style.maxHeight = '220px';
      container.style.overflowY = 'auto';
      container.style.justifyContent = 'center';
      container.style.padding = '10px';
      
      const availableCards = [...this.currentState.you.bank];
      Object.values(this.currentState.you.properties).forEach(arr => availableCards.push(...arr));
      
      if (availableCards.length === 0) {
        const noCardMsg = document.createElement('div');
        noCardMsg.style.color = 'var(--color-danger)';
        noCardMsg.style.fontWeight = 'bold';
        noCardMsg.style.textAlign = 'center';
        noCardMsg.textContent = 'You have no Bank money or Property cards available to pay!';
        container.appendChild(noCardMsg);
      }

      const updatePayBtn = () => {
        let selectedSum = 0;
        availableCards.forEach(card => {
          if (this.selectedPaymentCards.has(card.id)) {
            selectedSum += card.value || 0;
          }
        });
        const selectedAmountSpan = modal.querySelector('.selected-amount');
        if (selectedAmountSpan) selectedAmountSpan.textContent = `$${selectedSum}M`;
        const confirmBtn = document.getElementById('btn-confirm-payment');
        if (confirmBtn) {
          const totalAvailableValue = availableCards.reduce((sum, c) => sum + (c.value || 0), 0);
          const targetValue = Math.min(amount, totalAvailableValue);
          confirmBtn.disabled = (selectedSum < targetValue && totalAvailableValue > 0);
        }
      };

      availableCards.forEach(card => {
        const cardEl = window.CardRenderer.createCard(card, { 
          mini: true, 
          selectable: true,
          onClick: (c, e) => {
            const el = e.currentTarget || cardEl;
            if (this.selectedPaymentCards.has(c.id)) {
              this.selectedPaymentCards.delete(c.id);
              el.classList.remove('selected');
            } else {
              this.selectedPaymentCards.add(c.id);
              el.classList.add('selected');
            }
            updatePayBtn();
          }
        });
        container.appendChild(cardEl);
      });
      
      updatePayBtn();
    }
    
    modal.classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
  },

  handleConfirmPayment() {
    window.Network.selectPayment(Array.from(this.selectedPaymentCards));
    this.hideAllModals();
  },

  showDiscardModal(count) {
    const modal = document.getElementById('modal-discard');
    if (!modal) return;
    
    const countSpan = modal.querySelector('.discard-count');
    if (countSpan) countSpan.textContent = count;

    const desc = modal.querySelector('p');
    if (desc) {
      desc.textContent = `You have too many cards! Discard ${count} cards.`;
    }
    
    this.selectedDiscardCards.clear();
    
    const container = modal.querySelector('#discard-selection-area') || modal.querySelector('.discard-cards');
    if (container) {
      container.innerHTML = '';
      container.style.display = 'flex';
      container.style.flexWrap = 'wrap';
      container.style.gap = '10px';
      container.style.maxHeight = '220px';
      container.style.overflowY = 'auto';
      container.style.justifyContent = 'center';
      container.style.padding = '10px';
      
      const updateDiscardBtn = () => {
        const confirmBtn = document.getElementById('btn-confirm-discard');
        if (confirmBtn) {
          confirmBtn.disabled = (this.selectedDiscardCards.size !== count);
        }
      };

      this.currentState.you.hand.forEach(card => {
        const cardEl = window.CardRenderer.createCard(card, { 
          mini: true, 
          selectable: true,
          onClick: (c, e) => {
            const el = e.currentTarget || cardEl;
            if (this.selectedDiscardCards.has(c.id)) {
              this.selectedDiscardCards.delete(c.id);
              el.classList.remove('selected');
            } else {
              if (this.selectedDiscardCards.size < count) {
                this.selectedDiscardCards.add(c.id);
                el.classList.add('selected');
              }
            }
            updateDiscardBtn();
          }
        });
        container.appendChild(cardEl);
      });
      
      updateDiscardBtn();
    }
    
    modal.classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
  },

  handleConfirmDiscard() {
    window.Network.discardCards(Array.from(this.selectedDiscardCards));
    this.hideAllModals();
  },

  showActionResponseModal(action) {
    const modal = document.getElementById('modal-action-response');
    if (!modal) return;
    
    const msg = modal.querySelector('.action-message') || modal.querySelector('.action-msg');
    if (msg) {
      msg.textContent = `${action.fromPlayerName} played ${action.type.toUpperCase()} against you!`;
    }
    
    const hasJustSayNo = this.currentState.you.hand.some(c => c.actionType === 'justSayNo');
    const counterBtn = document.getElementById('btn-counter-action');
    if (counterBtn) {
      counterBtn.disabled = !hasJustSayNo;
    }

    modal.classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
  },

  handleCounter() {
    const jsnCard = this.currentState.you.hand.find(c => c.actionType === 'justSayNo');
    if (jsnCard) {
      window.Network.respondToAction(false, jsnCard.id);
      this.hideAllModals();
    }
  },

  showGameOverModal(winnerName, isYou) {
    const modal = document.getElementById('modal-game-over');
    if (!modal) return;
    
    const msg = modal.querySelector('.winner-announcement') || modal.querySelector('.game-over-msg');
    if (msg) {
      msg.textContent = isYou ? '🎉 YOU WON THE GAME! 🎉' : `🏆 ${winnerName} WON THE GAME!`;
    }
    
    modal.classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
    
    if (isYou && window.Animations) {
      window.Animations.showConfetti();
    }
  },

  hideAllModals() {
    document.querySelectorAll('.modal, .modal-overlay').forEach(el => el.classList.add('hidden'));
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
  },

  showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    notif.textContent = message;
    
    container.appendChild(notif);
    
    setTimeout(() => {
      notif.remove();
    }, 4000);
  },

  onGameOver({ winnerName, winnerId }) {
    this.showGameOverModal(winnerName, winnerId === this.getMyPlayerId());
  },

  isMyTurn() {
    const myId = this.getMyPlayerId();
    if (!myId || !this.currentState) return false;
    return this.currentState.currentTurnPlayerId === myId;
  },

  getMyPlayerId() {
    return window.Network.playerId;
  },

  onChatMessage(data) {
    const list = document.getElementById('chat-messages');
    if (!list) return;

    const div = document.createElement('div');
    div.className = 'chat-msg';

    const isYou = data.senderId === this.getMyPlayerId();
    const senderSpan = isYou ? '<span class="sender-you">You:</span>' : `<span class="sender-other">${data.senderName}:</span>`;
    
    div.innerHTML = `${senderSpan} ${data.text}`;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;

    const chatBox = document.getElementById('game-chat-box');
    if (chatBox && chatBox.classList.contains('collapsed') && !isYou) {
      const badge = document.getElementById('chat-unread-badge');
      if (badge) {
        let count = parseInt(badge.textContent || '0', 10) + 1;
        badge.textContent = count;
        badge.classList.remove('hidden');
      }
    }
  }
};
