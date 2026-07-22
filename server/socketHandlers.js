const GameEngine = require('./gameEngine');
const { getBotAction } = require('./botBrain');

function initializeSocketHandlers(io, roomManager) {
  const broadcastGameState = (room) => {
    if (!room.game) return;
    room.players.forEach(p => {
      if (!p.isBot) {
        io.to(p.id).emit('game-state', room.game.getStateForPlayer(p.id));
      }
    });
    
    if (room.game.winner) {
      const winnerState = room.game.playersMap.get(room.game.winner);
      const winnerName = winnerState ? winnerState.name : 'Winner';
      io.to(room.code).emit('game-over', { winnerName, winnerId: room.game.winner });
    } else {
      checkAndRunBotTurn(room);
    }
  };

  // 20-Second Turn Timer Interval Ticker
  setInterval(() => {
    roomManager.rooms.forEach(room => {
      if (room.gameStarted && room.game && !room.game.winner) {
        const remaining = room.game.getTurnTimeRemaining();
        io.to(room.code).emit('turn-timer-tick', { timeRemaining: remaining });

        if (remaining <= 0) {
          console.log(`Turn 20s timeout in room ${room.code} for player ${room.game.getCurrentPlayerId()}`);
          try {
            room.game.forceTimeoutTurn();
            broadcastGameState(room);
          } catch (err) {
            console.error('Error auto-timing out turn:', err);
          }
        }
      }
    });
  }, 1000);

  function checkAndRunBotTurn(room) {
    if (!room.game || room.game.winner) return;

    let activeBotId = null;

    if (room.game.phase === 'PAYMENT') {
      activeBotId = room.game.pendingPayment.owedBy.find(id => id.startsWith('bot_'));
    } else if (room.game.phase === 'ACTION_RESPONSE') {
      if (room.game.pendingAction.toId.startsWith('bot_')) {
        activeBotId = room.game.pendingAction.toId;
      }
    } else {
      const currentTurnId = room.game.getCurrentPlayerId();
      if (currentTurnId && currentTurnId.startsWith('bot_')) {
        activeBotId = currentTurnId;
      }
    }

    if (!activeBotId) return;

    const action = getBotAction(room.game, activeBotId);
    if (!action) return;

    setTimeout(() => {
      try {
        if (action.type === 'draw') {
          room.game.drawCards(activeBotId);
        } else if (action.type === 'playProperty') {
          room.game.playCardAsProperty(activeBotId, action.cardId, action.color);
        } else if (action.type === 'playBank') {
          room.game.playCardAsBank(activeBotId, action.cardId);
        } else if (action.type === 'playAction') {
          // Find a valid target if needed
          let targetId = action.targetId;
          if (!targetId && room.game.playersMap.size > 1) {
            // Pick a non-bot player, or the first other player
            const others = Array.from(room.game.playersMap.keys()).filter(id => id !== activeBotId);
            targetId = others.find(id => !id.startsWith('bot_')) || others[0];
          }
          room.game.playCardAsAction(activeBotId, action.cardId, targetId, action.options);
        } else if (action.type === 'endTurn') {
          room.game.endTurn(activeBotId);
        } else if (action.type === 'pay') {
          room.game.selectPayment(activeBotId, action.cardIds);
        } else if (action.type === 'discard') {
          room.game.discardCards(activeBotId, action.cardIds);
        } else if (action.type === 'respond') {
          room.game.respondToAction(activeBotId, action.accept, action.counterCardId);
        }

        broadcastGameState(room);
      } catch (err) {
        console.error(`Bot execution failed for player ${activeBotId}:`, err.message);
        // Fallback to avoid hanging turn
        if (room.game.getCurrentPlayerId() === activeBotId && room.game.phase === 'PLAY') {
          try {
            room.game.endTurn(activeBotId);
            broadcastGameState(room);
          } catch (e) {}
        }
      }
    }, 1200);
  }

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    const emitError = (message) => {
      console.error(`Socket Error for ${socket.id}: ${message}`);
      socket.emit('error', { message });
    };

    socket.on('create-room', ({ playerName }) => {
      console.log(`Received create-room from ${socket.id} (${playerName})`);
      try {
        const { roomCode, room } = roomManager.createRoom(socket.id, playerName);
        socket.join(roomCode);
        socket.emit('room-created', { roomCode });
        io.to(roomCode).emit('room-updated', room);
        console.log(`Room ${roomCode} created for ${playerName}`);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('join-room', ({ roomCode, playerName }) => {
      console.log(`Received join-room ${roomCode} from ${socket.id} (${playerName})`);
      try {
        const room = roomManager.joinRoom(roomCode, socket.id, playerName);
        socket.join(room.code);
        io.to(room.code).emit('room-updated', room);
        if (room.game) {
          broadcastGameState(room);
        }
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('add-bot', () => {
      console.log(`Received add-bot from ${socket.id}`);
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room) throw new Error("Not in a room");
        if (room.hostId !== socket.id) throw new Error("Only host can add bots");
        roomManager.addBot(room.code);
        io.to(room.code).emit('room-updated', room);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('start-game', () => {
      console.log(`Received start-game from ${socket.id}`);
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room) throw new Error("Not in a room");
        if (room.hostId !== socket.id) throw new Error("Only host can start game");
        if (room.players.length < 2) {
          roomManager.addBot(room.code);
        }
        
        room.gameStarted = true;
        room.game = new GameEngine(room.players);
        room.game.startGame();
        
        io.to(room.code).emit('game-started');
        broadcastGameState(room);
        console.log(`Game started in room ${room.code}`);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('draw-cards', () => {
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room || !room.game) throw new Error("Game not found");
        room.game.drawCards(socket.id);
        broadcastGameState(room);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('play-card-as-property', ({ cardId, asColor }) => {
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room || !room.game) throw new Error("Game not found");
        room.game.playCardAsProperty(socket.id, cardId, asColor);
        broadcastGameState(room);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('move-wild-card', ({ cardId, targetColor }) => {
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room || !room.game) throw new Error("Game not found");
        room.game.moveWildCard(socket.id, cardId, targetColor);
        broadcastGameState(room);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('play-card-as-bank', ({ cardId }) => {
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room || !room.game) throw new Error("Game not found");
        room.game.playCardAsBank(socket.id, cardId);
        broadcastGameState(room);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('play-card-as-action', ({ cardId, targetPlayerId, rentColor, withDoubleRentCardId, targetColor, targetCardId, myColor, myCardId }) => {
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room || !room.game) throw new Error("Game not found");
        room.game.playCardAsAction(socket.id, cardId, targetPlayerId, { 
          rentColor, 
          withDoubleRentCardId,
          targetColor,
          targetCardId,
          myColor,
          myCardId,
          color: targetColor // for house/hotel
        });
        broadcastGameState(room);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('end-turn', () => {
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room || !room.game) throw new Error("Game not found");
        room.game.endTurn(socket.id);
        broadcastGameState(room);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('respond-to-action', ({ accept, counterCardId }) => {
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room || !room.game) throw new Error("Game not found");
        room.game.respondToAction(socket.id, accept, counterCardId);
        broadcastGameState(room);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('select-payment', ({ cardIds }) => {
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room || !room.game) throw new Error("Game not found");
        room.game.selectPayment(socket.id, cardIds);
        broadcastGameState(room);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('discard-cards', ({ cardIds }) => {
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room || !room.game) throw new Error("Game not found");
        room.game.discardCards(socket.id, cardIds);
        broadcastGameState(room);
      } catch (err) {
        emitError(err.message);
      }
    });

    socket.on('send-chat-message', ({ text }) => {
      try {
        if (!text || typeof text !== 'string' || !text.trim()) return;
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        const senderName = player ? player.name : 'Player';

        io.to(room.code).emit('chat-message', {
          senderId: socket.id,
          senderName: senderName,
          text: text.trim().substring(0, 150)
        });
      } catch (err) {
        console.error('Error sending chat message:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      const { room, wasHost } = roomManager.leaveRoom(socket.id);
      if (room) {
        if (room.players.length === 0) {
          // Room destroyed
        } else {
          io.to(room.code).emit('room-updated', room);
          if (wasHost) {
            io.to(room.code).emit('host-changed', room.hostId);
          }
          if (room.game) {
            const pState = room.game.playersMap.get(socket.id);
            if (pState) pState.connected = false;
            broadcastGameState(room);
          }
        }
      }
    });
  });
}

module.exports = initializeSocketHandlers;
