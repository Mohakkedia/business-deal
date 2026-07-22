window.Network = {
  socket: null,
  playerId: null,
  roomCode: null,

  init() {
    // Assuming socket.io is included via script tag
    if (typeof io !== 'undefined') {
      this.socket = io({
        transports: ['websocket', 'polling']
      });
      this.setupListeners();
    } else {
      console.error('Socket.io not found.');
    }
  },

  setupListeners() {
    this.socket.on('connect', () => {
      this.playerId = this.socket.id;
      if (this.roomCode) {
        // Handle reconnect scenario
        const name = localStorage.getItem('playerName');
        if (name) {
          this.joinRoom(this.roomCode, name);
        }
      }
    });

    this.socket.on('disconnect', () => {
      if (window.UI) {
        window.UI.showNotification('Disconnected from server. Reconnecting...', 'warning');
      }
    });

    this.socket.on('room-created', (data) => {
      this.roomCode = data.roomCode;
      if (window.UI) window.UI.onRoomCreated(data);
    });

    this.socket.on('room-updated', (data) => {
      this.roomCode = data.code || this.roomCode;
      if (window.UI) window.UI.onRoomUpdated(data);
    });

    this.socket.on('game-started', () => {
      if (window.UI) window.UI.onGameStarted();
    });

    this.socket.on('game-state', (data) => {
      if (window.UI) window.UI.onGameState(data.gameState || data);
    });

    this.socket.on('turn-timer-tick', (data) => {
      if (window.UI) window.UI.updateTurnTimer(data.timeRemaining);
    });

    this.socket.on('game-over', (data) => {
      if (window.UI) window.UI.onGameOver(data);
    });

    this.socket.on('error', (data) => {
      if (window.UI) window.UI.showNotification(data.message, 'danger');
    });

    this.socket.on('notification', (data) => {
      if (window.UI) window.UI.showNotification(data.message, data.type);
    });

    this.socket.on('player-disconnected', (data) => {
      if (window.UI) window.UI.showNotification(`${data.playerName} disconnected`, 'warning');
    });

    this.socket.on('player-reconnected', (data) => {
      if (window.UI) window.UI.showNotification(`${data.playerName} reconnected`, 'success');
    });

    this.socket.on('chat-message', (data) => {
      if (window.UI) window.UI.onChatMessage(data);
    });
  },

  createRoom(playerName) {
    this.socket.emit('create-room', { playerName });
  },

  joinRoom(roomCode, playerName) {
    this.socket.emit('join-room', { roomCode, playerName });
  },

  startGame() {
    this.socket.emit('start-game', {});
  },

  drawCards() {
    this.socket.emit('draw-cards', {});
  },

  playCardAsProperty(cardId, asColor) {
    this.socket.emit('play-card-as-property', { cardId, asColor });
  },

  moveWildCard(cardId, targetColor) {
    this.socket.emit('move-wild-card', { cardId, targetColor });
  },

  playCardAsBank(cardId) {
    this.socket.emit('play-card-as-bank', { cardId });
  },

  playCardAsAction(cardId, targetPlayerId, rentColor, withDoubleRentCardId, options = {}) {
    this.socket.emit('play-card-as-action', { 
      cardId, 
      targetPlayerId, 
      rentColor, 
      withDoubleRentCardId,
      targetColor: options.targetColor,
      targetCardId: options.targetCardId,
      myColor: options.myColor,
      myCardId: options.myCardId,
      color: options.color
    });
  },

  endTurn() {
    this.socket.emit('end-turn', {});
  },

  respondToAction(accept, counterCardId) {
    this.socket.emit('respond-to-action', { accept, counterCardId });
  },

  selectPayment(cardIds) {
    this.socket.emit('select-payment', { cardIds });
  },

  discardCards(cardIds) {
    this.socket.emit('discard-cards', { cardIds });
  },

  sendChatMessage(text) {
    this.socket.emit('send-chat-message', { text });
  }
};
