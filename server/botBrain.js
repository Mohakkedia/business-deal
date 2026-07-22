const { getSetRequirement } = require('./cardDefinitions');

function getBotAction(game, botId) {
  const pState = game.playersMap.get(botId);
  if (!pState) return null;

  // 1. Draw Phase
  if (game.phase === 'DRAW' && game.getCurrentPlayerId() === botId) {
    return { type: 'draw' };
  }

  // 2. Discard Phase
  if (game.phase === 'DISCARD' && game.getCurrentPlayerId() === botId) {
    const discardCount = pState.hand.length - 7;
    if (discardCount > 0) {
      // Discard first discardCount cards in hand
      const cardIds = pState.hand.slice(0, discardCount).map(c => c.id);
      return { type: 'discard', cardIds };
    }
  }

  // 3. Payment Phase
  if (game.phase === 'PAYMENT' && game.pendingPayment && game.pendingPayment.owedBy.includes(botId)) {
    // Select cards to pay the debt
    const amount = game.pendingPayment.amount;
    const selectedIds = [];
    let currentSum = 0;

    // Use bank first
    for (const card of pState.bank) {
      if (currentSum >= amount) break;
      selectedIds.push(card.id);
      currentSum += card.value || 0;
    }

    // Use properties if bank is not enough (excluding complete sets first)
    if (currentSum < amount) {
      for (const color in pState.properties) {
        const cards = pState.properties[color];
        const isComplete = cards.length >= getSetRequirement(color);
        if (!isComplete) {
          for (const card of cards) {
            if (currentSum >= amount) break;
            selectedIds.push(card.id);
            currentSum += card.value || 0;
          }
        }
      }
    }

    // Use complete properties if still not enough
    if (currentSum < amount) {
      for (const color in pState.properties) {
        const cards = pState.properties[color];
        const isComplete = cards.length >= getSetRequirement(color);
        if (isComplete) {
          for (const card of cards) {
            if (currentSum >= amount) break;
            selectedIds.push(card.id);
            currentSum += card.value || 0;
          }
        }
      }
    }

    return { type: 'pay', cardIds: selectedIds };
  }

  // 4. Action Response Phase
  if (game.phase === 'ACTION_RESPONSE' && game.pendingAction && game.pendingAction.toId === botId) {
    // Check for Just Say No
    const jsnCard = pState.hand.find(c => c.actionType === 'justSayNo');
    if (jsnCard) {
      // 70% chance to play Just Say No
      if (Math.random() < 0.7) {
        return { type: 'respond', accept: false, counterCardId: jsnCard.id };
      }
    }
    return { type: 'respond', accept: true };
  }

  // 5. Play Phase
  if (game.phase === 'PLAY' && game.getCurrentPlayerId() === botId) {
    // If already played 3 cards, must end turn
    if (game.cardsPlayedThisTurn >= 3) {
      return { type: 'endTurn' };
    }

    // Look for property cards
    const propertyCard = pState.hand.find(c => c.type === 'property' || c.type === 'wild');
    if (propertyCard) {
      let chosenColor = null;
      if (propertyCard.type === 'property') {
        chosenColor = propertyCard.color;
      } else if (propertyCard.type === 'wild') {
        chosenColor = propertyCard.colors ? propertyCard.colors[0] : 'brown';
      }
      return { type: 'playProperty', cardId: propertyCard.id, color: chosenColor };
    }

    // Look for money cards
    const moneyCard = pState.hand.find(c => c.type === 'money');
    if (moneyCard) {
      return { type: 'playBank', cardId: moneyCard.id };
    }

    // Look for simple action cards
    const passGoCard = pState.hand.find(c => c.actionType === 'passGo');
    if (passGoCard) {
      return { type: 'playAction', cardId: passGoCard.id };
    }

    const birthdayCard = pState.hand.find(c => c.actionType === 'birthday');
    if (birthdayCard) {
      return { type: 'playAction', cardId: birthdayCard.id };
    }

    const rentCard = pState.hand.find(c => c.type === 'rent');
    if (rentCard) {
      const colors = rentCard.rentColors || [];
      const ownedColors = Object.keys(pState.properties).filter(c => pState.properties[c] && pState.properties[c].length > 0);
      const match = colors.find(c => ownedColors.includes(c));
      if (match) {
        return { type: 'playAction', cardId: rentCard.id, options: { rentColor: match } };
      }
      // If we don't own matching properties, play as bank money
      return { type: 'playBank', cardId: rentCard.id };
    }

    // Play action cards as bank money if we can't do anything else
    const actionCard = pState.hand.find(c => c.type === 'action');
    if (actionCard) {
      return { type: 'playBank', cardId: actionCard.id };
    }

    // Nothing left to play, end turn
    return { type: 'endTurn' };
  }

  return null;
}

module.exports = { getBotAction };
