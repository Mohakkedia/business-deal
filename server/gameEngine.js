const { createDeck, shuffleDeck, PROPERTY_SETS, getSetRequirement, getRentForSet } = require('./cardDefinitions');

class GameEngine {
  constructor(players) {
    this.phase = 'DRAW'; // 'DRAW' | 'PLAY' | 'ACTION_RESPONSE' | 'PAYMENT' | 'DISCARD' | 'GAME_OVER'
    this.deck = shuffleDeck(createDeck());
    this.discardPile = [];
    this.playersMap = new Map();
    this.playerOrder = [];
    
    players.forEach(p => {
      this.playersMap.set(p.id, {
        id: p.id,
        name: p.name,
        hand: [],
        bank: [],
        properties: {}, // color -> array of cards
        connected: true
      });
      this.playerOrder.push(p.id);
    });

    this.currentTurnIndex = 0;
    this.cardsPlayedThisTurn = 0;
    this.pendingAction = null;
    this.pendingPayment = null;
    this.winner = null;
    this.actionLog = [];
    this.turnDuration = 20;
    this.turnStartTime = Date.now();
  }

  resetTurnTimer() {
    this.turnStartTime = Date.now();
  }

  getTurnTimeRemaining() {
    if (!this.turnStartTime) return 20;
    const elapsed = Math.floor((Date.now() - this.turnStartTime) / 1000);
    return Math.max(0, this.turnDuration - elapsed);
  }

  forceTimeoutTurn() {
    const currentPlayerId = this.getCurrentPlayerId();
    const pState = this.playersMap.get(currentPlayerId);
    if (!pState) return;

    this.logAction(`⏳ Time's up! ${pState.name}'s turn ended automatically (20s limit).`);

    if (this.phase === 'DRAW') {
      const drawCount = pState.hand.length === 0 ? 5 : 2;
      this._drawToHand(pState, drawCount);
    }

    if (pState.hand.length > 7) {
      const discardCount = pState.hand.length - 7;
      const discarded = pState.hand.splice(7, discardCount);
      discarded.forEach(c => this.discardPile.push(c));
    }

    this.advanceTurn();
  }

  logAction(msg) {
    this.actionLog.push(msg);
    if (this.actionLog.length > 50) this.actionLog.shift();
  }

  autoStartTurn() {
    const currentPlayerId = this.getCurrentPlayerId();
    const pState = this.playersMap.get(currentPlayerId);
    if (!pState) return;

    const drawCount = pState.hand.length === 0 ? 5 : 2;
    this._drawToHand(pState, drawCount);
    this.cardsPlayedThisTurn = 0;
    this.phase = 'PLAY';
    this.resetTurnTimer();
    this.logAction(`It is now ${pState.name}'s turn (Auto-drew ${drawCount} cards).`);
  }

  startGame() {
    this.playerOrder.forEach(playerId => {
      const pState = this.playersMap.get(playerId);
      pState.hand = this.deck.splice(0, 5);
    });
    this.currentTurnIndex = 0;
    this.logAction(`Game started! ${this.playersMap.get(this.getCurrentPlayerId()).name}'s turn first.`);
    this.autoStartTurn();
  }

  getCurrentPlayerId() {
    return this.playerOrder[this.currentTurnIndex];
  }

  drawCards(playerId) {
    if (playerId !== this.getCurrentPlayerId()) {
      throw new Error("Not your turn");
    }
    if (this.phase === 'PLAY') return;
    this.autoStartTurn();
  }

  _drawToHand(pState, count) {
    for (let i = 0; i < count; i++) {
      if (this.deck.length === 0) {
        if (this.discardPile.length === 0) break; // no cards left at all
        this.deck = shuffleDeck([...this.discardPile]);
        this.discardPile = [];
      }
      pState.hand.push(this.deck.pop());
    }
  }

  _removeCardFromHand(pState, cardId) {
    const idx = pState.hand.findIndex(c => c.id === cardId);
    if (idx === -1) throw new Error("Card not found in hand");
    return pState.hand.splice(idx, 1)[0];
  }

  _incrementPlayCount(playerId) {
    this.cardsPlayedThisTurn++;
    if (this.cardsPlayedThisTurn >= 3 && this.phase === 'PLAY') {
      // Auto transition to end turn if 3 cards played, user can still move wilds or manually end
    }
  }

  playCardAsProperty(playerId, cardId, asColor) {
    if (playerId !== this.getCurrentPlayerId() || this.phase !== 'PLAY') throw new Error("Not your turn or invalid phase");
    if (this.cardsPlayedThisTurn >= 3) throw new Error("Played max cards");

    const pState = this.playersMap.get(playerId);
    const card = pState.hand.find(c => c.id === cardId);
    if (!card) throw new Error("Card not in hand");

    if (card.type !== 'property' && card.type !== 'wild') throw new Error("Not a property card");

    let colorToUse = asColor;
    if (card.type === 'wild' && (asColor === 'unassigned' || !asColor)) {
      colorToUse = 'unassigned';
    } else {
      colorToUse = asColor || card.color || (card.colors && card.colors[0]);
    }

    if (!colorToUse) throw new Error("Color not specified");
    if (card.type === 'wild' && colorToUse !== 'unassigned' && card.colors && card.colors.length > 0 && !card.colors.includes(colorToUse)) {
      throw new Error("Invalid color for this wild card");
    }

    this._removeCardFromHand(pState, cardId);
    if (!pState.properties[colorToUse]) pState.properties[colorToUse] = [];
    
    // Assign chosen color dynamically for wild
    if (card.type === 'wild') card.currentColor = colorToUse;
    pState.properties[colorToUse].push(card);

    this.logAction(`${pState.name} placed ${card.name} as ${colorToUse === 'unassigned' ? 'Unassigned Standalone Wild' : colorToUse}`);
    this._incrementPlayCount(playerId);
    this.checkWinCondition(playerId);
  }

  moveWildCard(playerId, cardId, targetColor) {
    if (playerId !== this.getCurrentPlayerId() || this.phase !== 'PLAY') {
      throw new Error("Not your turn or invalid phase to move wild card");
    }

    const pState = this.playersMap.get(playerId);
    let wildCard = null;
    let oldColor = null;

    for (const color in pState.properties) {
      const idx = pState.properties[color].findIndex(c => c.id === cardId);
      if (idx !== -1) {
        wildCard = pState.properties[color].splice(idx, 1)[0];
        oldColor = color;
        break;
      }
    }

    if (!wildCard) {
      throw new Error("Wild card not found in your properties");
    }

    if (wildCard.type !== 'wild') {
      pState.properties[oldColor].push(wildCard);
      throw new Error("Selected card is not a wild card");
    }

    const allowedColors = wildCard.colors ? [...wildCard.colors, 'unassigned'] : [...Object.keys(PROPERTY_SETS), 'unassigned'];
    if (!allowedColors.includes(targetColor)) {
      pState.properties[oldColor].push(wildCard);
      throw new Error(`Target color ${targetColor} is not valid for this wild card`);
    }

    wildCard.currentColor = targetColor;
    if (!pState.properties[targetColor]) {
      pState.properties[targetColor] = [];
    }
    pState.properties[targetColor].push(wildCard);

    this.logAction(`${pState.name} moved ${wildCard.name} to ${targetColor === 'unassigned' ? 'Unassigned Standalone' : targetColor}`);
    this.checkWinCondition(playerId);
  }

  playCardAsBank(playerId, cardId) {
    if (playerId !== this.getCurrentPlayerId() || this.phase !== 'PLAY') throw new Error("Not your turn/phase");
    if (this.cardsPlayedThisTurn >= 3) throw new Error("Played max cards");

    const pState = this.playersMap.get(playerId);
    const card = pState.hand.find(c => c.id === cardId);
    if (!card) throw new Error("Card not in hand");

    if (card.type === 'property' || card.type === 'wild') {
      throw new Error("Property cards cannot be deposited into the bank!");
    }

    this._removeCardFromHand(pState, cardId);
    pState.bank.push(card);

    this.logAction(`${pState.name} banked ${card.name} for ${card.value}M`);
    this._incrementPlayCount(playerId);
  }

  playCardAsAction(playerId, cardId, targetId, options = {}) {
    if (playerId !== this.getCurrentPlayerId() || this.phase !== 'PLAY') throw new Error("Not your turn/phase");
    if (this.cardsPlayedThisTurn >= 3) throw new Error("Played max cards");

    const pState = this.playersMap.get(playerId);
    const card = pState.hand.find(c => c.id === cardId);
    if (!card) throw new Error("Card not in hand");

    if (card.type !== 'action' && card.type !== 'rent') throw new Error("Not an action/rent card");
    if (card.actionType === 'justSayNo') throw new Error("Cannot play Just Say No on your turn like this");

    this._removeCardFromHand(pState, cardId);
    this.discardPile.push(card);
    let cardsPlayed = 1;

    let targetName = targetId ? this.playersMap.get(targetId).name : 'everyone';

    if (card.type === 'action') {
      if (card.actionType === 'passGo') {
        this.logAction(`${pState.name} played Pass Go`);
        this._drawToHand(pState, 2);
      } else if (card.actionType === 'house') {
        const color = options.color;
        if (!color || !pState.properties[color] || pState.properties[color].length < getSetRequirement(color)) throw new Error("Must play house on complete set");
        pState.properties[color].push(card);
        this.logAction(`${pState.name} placed a House on ${color}`);
        this.discardPile.pop(); // Take it back from discard
      } else if (card.actionType === 'hotel') {
        const color = options.color;
        if (!color || !pState.properties[color] || !pState.properties[color].some(c => c.actionType === 'house')) throw new Error("Must play hotel on complete set with house");
        pState.properties[color].push(card);
        this.logAction(`${pState.name} placed a Hotel on ${color}`);
        this.discardPile.pop(); // Take it back from discard
      } else if (card.actionType === 'birthday') {
        this.logAction(`${pState.name} played It's My Birthday. Everyone pays 2M.`);
        this._setupPayment(playerId, null, 2, 'birthday');
      } else if (card.actionType === 'debtCollector') {
        if (!targetId) throw new Error("Target required");
        this.logAction(`${pState.name} played Debt Collector on ${targetName}`);
        this._setupActionResponse(playerId, targetId, card, { amount: 5 });
      } else if (card.actionType === 'slyDeal' || card.actionType === 'forcedDeal' || card.actionType === 'dealBreaker') {
        if (!targetId) throw new Error("Target required");
        this.logAction(`${pState.name} played ${card.name} targeting ${targetName}`);
        this._setupActionResponse(playerId, targetId, card, options);
      }
    } else if (card.type === 'rent') {
      const rentColor = options.rentColor;
      if (!rentColor || !card.rentColors.includes(rentColor)) throw new Error("Invalid rent color");
      if (!pState.properties[rentColor] || pState.properties[rentColor].length === 0) throw new Error("You don't own any properties of that color");
      
      let rentAmount = this.calculateRent(playerId, rentColor);
      if (options.withDoubleRentCardId) {
        const dRCard = this._removeCardFromHand(pState, options.withDoubleRentCardId);
        this.discardPile.push(dRCard);
        rentAmount *= 2;
        cardsPlayed = 2;
        if (this.cardsPlayedThisTurn + 2 > 3) throw new Error("Not enough plays left for double rent");
      }

      this.logAction(`${pState.name} played Rent for ${rentColor}. Amount: ${rentAmount}M.`);
      
      if (card.rentColors.length === Object.keys(PROPERTY_SETS).length) {
        // Any color rent is targeted at one player
        if (!targetId) throw new Error("Any color rent requires target player");
        this._setupActionResponse(playerId, targetId, card, { amount: rentAmount, reason: 'rent' });
      } else {
        // Targeted at all players
        this._setupPayment(playerId, null, rentAmount, 'rent'); // no action response for all, just payment directly? Actually rules allow Just Say No to rent. So we need to handle multi-player action response, but for simplicity, rent to all just goes straight to payment, except they can play just say no during payment phase. Let's make it go to action response for everyone? To simplify, we will put it into a 'PAYMENT' phase for all, and they can 'Just Say No' during payment? No, Just Say No must be before payment. 
        // Let's implement multi-target by setting pendingPayment which manages who owes what, but allows a Just Say No.
        this._setupPayment(playerId, null, rentAmount, 'rent', card); 
      }
    }

    this.cardsPlayedThisTurn += cardsPlayed;
    if (this.phase === 'PLAY') {
      // check win
      this.checkWinCondition(playerId);
    }
  }

  _setupActionResponse(fromId, toId, card, options) {
    this.phase = 'ACTION_RESPONSE';
    this.pendingAction = {
      type: card.actionType || 'rent',
      fromId,
      toId,
      card,
      options,
      responses: []
    };
  }

  _setupPayment(fromId, toId, amount, reason, card = null) {
    this.phase = 'PAYMENT';
    this.pendingPayment = {
      fromId,
      toId, // if null, all opponents owe
      amount,
      reason,
      card,
      owedBy: toId ? [toId] : this.playerOrder.filter(id => id !== fromId)
    };
  }

  respondToAction(playerId, accept, counterCardId = null) {
    if (this.phase !== 'ACTION_RESPONSE') throw new Error("Not in action response phase");
    
    // Simple implementation: 
    // If Just Say No is played, it flips the target back to the attacker.
    if (counterCardId) {
      const pState = this.playersMap.get(playerId);
      const jsnCard = pState.hand.find(c => c.id === counterCardId && c.actionType === 'justSayNo');
      if (!jsnCard) throw new Error("Invalid Just Say No card");
      this._removeCardFromHand(pState, counterCardId);
      this.discardPile.push(jsnCard);

      this.logAction(`${pState.name} played Just Say No!`);
      
      // Swap the from/to
      const oldFrom = this.pendingAction.fromId;
      this.pendingAction.fromId = this.pendingAction.toId;
      this.pendingAction.toId = oldFrom;
      return; // wait for response from the other person
    }

    if (accept) {
      this.resolveAction();
    }
  }

  resolveAction() {
    const action = this.pendingAction;
    this.pendingAction = null;

    if (action.type === 'debtCollector' || action.type === 'rent') {
      this._setupPayment(action.fromId, action.toId, action.options.amount, action.type);
    } else {
      const pFrom = this.playersMap.get(action.fromId);
      const pTo = this.playersMap.get(action.toId);

      if (action.type === 'slyDeal') {
        const { targetColor, targetCardId } = action.options;
        const targetSet = pTo.properties[targetColor] || [];
        const cardIndex = targetSet.findIndex(c => c.id === targetCardId);
        if (cardIndex !== -1 && targetSet.length < getSetRequirement(targetColor)) {
          const stolenCard = targetSet.splice(cardIndex, 1)[0];
          if (!pFrom.properties[targetColor]) pFrom.properties[targetColor] = [];
          pFrom.properties[targetColor].push(stolenCard);
          this.logAction(`${pFrom.name} stole ${stolenCard.name} from ${pTo.name}`);
        }
      } else if (action.type === 'forcedDeal') {
        const { targetColor, targetCardId, myColor, myCardId } = action.options;
        const targetSet = pTo.properties[targetColor] || [];
        const mySet = pFrom.properties[myColor] || [];
        const tIdx = targetSet.findIndex(c => c.id === targetCardId);
        const mIdx = mySet.findIndex(c => c.id === myCardId);
        if (tIdx !== -1 && mIdx !== -1 && targetSet.length < getSetRequirement(targetColor) && mySet.length < getSetRequirement(myColor)) {
          const stolenCard = targetSet.splice(tIdx, 1)[0];
          const givenCard = mySet.splice(mIdx, 1)[0];
          if (!pFrom.properties[targetColor]) pFrom.properties[targetColor] = [];
          if (!pTo.properties[myColor]) pTo.properties[myColor] = [];
          pFrom.properties[targetColor].push(stolenCard);
          pTo.properties[myColor].push(givenCard);
          this.logAction(`${pFrom.name} forced a deal, swapping ${givenCard.name} for ${stolenCard.name}`);
        }
      } else if (action.type === 'dealBreaker') {
        const { targetColor } = action.options;
        const targetSet = pTo.properties[targetColor] || [];
        if (targetSet.length >= getSetRequirement(targetColor)) {
          pFrom.properties[targetColor] = (pFrom.properties[targetColor] || []).concat(targetSet);
          pTo.properties[targetColor] = [];
          this.logAction(`${pFrom.name} stole a complete ${targetColor} set from ${pTo.name}`);
        }
      }
      this.phase = 'PLAY';
      this.checkWinCondition(action.fromId);
    }
  }

  selectPayment(playerId, cardIds) {
    if (this.phase !== 'PAYMENT') throw new Error("Not in payment phase");
    if (!this.pendingPayment.owedBy.includes(playerId)) throw new Error("You do not owe payment");

    const pState = this.playersMap.get(playerId);
    let totalValue = 0;
    const cardsToTransfer = [];

    // Verify and collect cards
    cardIds.forEach(cId => {
      let found = false;
      const bankIdx = pState.bank.findIndex(c => c.id === cId);
      if (bankIdx !== -1) {
        cardsToTransfer.push(pState.bank.splice(bankIdx, 1)[0]);
        found = true;
      } else {
        // search properties
        for (const color in pState.properties) {
          const pIdx = pState.properties[color].findIndex(c => c.id === cId);
          if (pIdx !== -1) {
            cardsToTransfer.push(pState.properties[color].splice(pIdx, 1)[0]);
            found = true;
            break;
          }
        }
      }
      if (!found) throw new Error("Payment card not found on board");
    });

    totalValue = cardsToTransfer.reduce((sum, c) => sum + (c.value || 0), 0);
    
    // Check if player has more value but paid less
    let playerTotalAssets = pState.bank.reduce((s,c) => s+(c.value||0), 0);
    for (const color in pState.properties) {
      playerTotalAssets += pState.properties[color].reduce((s,c) => s+(c.value||0), 0);
    }

    if (totalValue < this.pendingPayment.amount && playerTotalAssets > 0) {
      // Revert, they must pay more if they can
      // Simplified: Just throw error for now. A real implementation would clone state.
      throw new Error("Must pay full amount if able");
    }

    // Transfer cards to recipient bank
    const recipient = this.playersMap.get(this.pendingPayment.fromId);
    cardsToTransfer.forEach(c => recipient.bank.push(c));
    this.logAction(`${pState.name} paid ${totalValue}M to ${recipient.name}`);

    // Remove from owedBy
    this.pendingPayment.owedBy = this.pendingPayment.owedBy.filter(id => id !== playerId);

    if (this.pendingPayment.owedBy.length === 0) {
      this.pendingPayment = null;
      this.phase = 'PLAY';
    }
  }

  endTurn(playerId) {
    if (playerId !== this.getCurrentPlayerId() || this.phase !== 'PLAY') throw new Error("Not your turn/phase");
    
    const pState = this.playersMap.get(playerId);
    if (pState.hand.length > 7) {
      this.phase = 'DISCARD';
      this.logAction(`${pState.name} must discard ${pState.hand.length - 7} cards`);
    } else {
      this.advanceTurn();
    }
  }

  discardCards(playerId, cardIds) {
    if (playerId !== this.getCurrentPlayerId() || this.phase !== 'DISCARD') throw new Error("Invalid state for discard");
    const pState = this.playersMap.get(playerId);
    const neededDiscards = pState.hand.length - 7;
    if (cardIds.length !== neededDiscards) throw new Error(`Must discard exactly ${neededDiscards} cards`);

    cardIds.forEach(cardId => {
      const card = this._removeCardFromHand(pState, cardId);
      this.discardPile.push(card);
    });
    this.logAction(`${pState.name} discarded ${neededDiscards} cards`);
    this.advanceTurn();
  }

  advanceTurn() {
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.playerOrder.length;
    this.autoStartTurn();
  }

  calculateRent(playerId, color) {
    const pState = this.playersMap.get(playerId);
    const set = pState.properties[color] || [];
    let count = 0;
    let hasHouse = false;
    let hasHotel = false;
    set.forEach(c => {
      if (c.type === 'property' || c.type === 'wild') count++;
      else if (c.actionType === 'house') hasHouse = true;
      else if (c.actionType === 'hotel') hasHotel = true;
    });
    return getRentForSet(color, count, hasHouse, hasHotel);
  }

  getCompleteSets(playerId) {
    const pState = this.playersMap.get(playerId);
    const sets = [];
    for (const color in pState.properties) {
      let count = 0;
      pState.properties[color].forEach(c => {
        if (c.type === 'property' || c.type === 'wild') count++;
      });
      if (count >= getSetRequirement(color) && getSetRequirement(color) > 0) {
        sets.push(color);
      }
    }
    return sets;
  }

  checkWinCondition(playerId) {
    const completeSets = this.getCompleteSets(playerId);
    if (completeSets.length >= 3) {
      this.winner = playerId;
      this.phase = 'GAME_OVER';
      this.logAction(`${this.playersMap.get(playerId).name} WON THE GAME!`);
    }
  }

  getStateForPlayer(playerId) {
    const youState = this.playersMap.get(playerId);
    
    const opponents = [];
    this.playerOrder.forEach(id => {
      if (id !== playerId) {
        const p = this.playersMap.get(id);
        opponents.push({
          id: p.id,
          name: p.name,
          handCount: p.hand.length,
          bank: p.bank,
          properties: p.properties,
          completeSets: this.getCompleteSets(p.id)
        });
      }
    });

    const youState = this.playersMap.get(playerId);
    const currentP = this.playersMap.get(this.getCurrentPlayerId());

    return {
      phase: this.phase,
      currentTurnPlayerId: this.getCurrentPlayerId(),
      currentTurnPlayerName: currentP ? currentP.name : 'Unknown',
      cardsPlayedThisTurn: this.cardsPlayedThisTurn,
      maxCardsPerTurn: 3,
      turnTimeRemaining: this.getTurnTimeRemaining(),
      you: youState ? {
        id: youState.id,
        name: youState.name,
        hand: youState.hand,
        bank: youState.bank,
        properties: youState.properties,
        completeSets: this.getCompleteSets(youState.id)
      } : null,
      opponents,
      drawPileCount: this.deck.length,
      discardPileTop: this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null,
      actionLog: this.actionLog,
      pendingAction: this.pendingAction ? {
        type: this.pendingAction.type,
        fromPlayerName: this.playersMap.get(this.pendingAction.fromId)?.name || 'Someone',
        toPlayerId: this.pendingAction.toId,
        card: this.pendingAction.card,
        options: this.pendingAction.options
      } : null,
      pendingPayment: this.pendingPayment ? {
        amount: this.pendingPayment.amount,
        toPlayerName: this.playersMap.get(this.pendingPayment.fromId)?.name || 'Someone',
        owedBy: this.pendingPayment.owedBy
      } : null,
      discardCount: this.phase === 'DISCARD' && this.getCurrentPlayerId() === playerId ? youState?.hand.length - 7 : null,
      winner: this.winner
    };
  }
}

module.exports = GameEngine;
