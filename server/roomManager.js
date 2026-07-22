class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocketId, playerName) {
    const roomCode = this.generateRoomCode();
    const room = {
      code: roomCode,
      hostId: hostSocketId,
      players: [{ id: hostSocketId, name: playerName, ready: false, connected: true }],
      gameStarted: false,
      maxPlayers: 4,
      game: null
    };
    this.rooms.set(roomCode, room);
    return { roomCode, room };
  }

  joinRoom(roomCode, socketId, playerName) {
    const codeUpper = (roomCode || '').toUpperCase();
    let room = this.rooms.get(codeUpper);
    if (!room) {
      room = {
        code: codeUpper || this.generateRoomCode(),
        hostId: socketId,
        players: [{ id: socketId, name: playerName || 'Player', ready: false, connected: true }],
        gameStarted: false,
        maxPlayers: 4,
        game: null
      };
      this.rooms.set(room.code, room);
      return room;
    }
    if (room.players.some(p => p.id === socketId)) {
      return room;
    }
    if (room.players.length < room.maxPlayers) {
      room.players.push({ id: socketId, name: playerName || 'Player', ready: false, connected: true });
    }
    return room;
  }

  addBot(roomCode) {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      throw new Error('Room not found');
    }
    if (room.gameStarted) {
      throw new Error('Game already started');
    }
    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }
    const botId = 'bot_' + Math.random().toString(36).substring(2, 11);
    const botNames = ['ByteBoss', 'CardShredder', 'CyberDealer', 'AutoTrader', 'RoboSlick'];
    const currentBotNames = room.players.filter(p => p.isBot).map(p => p.name);
    let name = '';
    for (let candidate of botNames) {
      if (!currentBotNames.includes(candidate)) {
        name = candidate;
        break;
      }
    }
    if (!name) name = `Bot ${room.players.length + 1}`;
    
    const bot = { id: botId, name, ready: true, connected: true, isBot: true };
    room.players.push(bot);
    return room;
  }

  leaveRoom(socketId) {
    for (const [code, room] of this.rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socketId);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        let wasHost = false;
        if (room.hostId === socketId) {
          wasHost = true;
          if (room.players.length > 0) {
            room.hostId = room.players[0].id;
          } else {
            this.rooms.delete(code);
          }
        }
        if (room.players.length === 0) {
            this.rooms.delete(code);
        }
        return { room, wasHost };
      }
    }
    return { room: null, wasHost: false };
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode.toUpperCase());
  }

  getRoomBySocketId(socketId) {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.id === socketId)) {
        return room;
      }
    }
    return null;
  }
}

module.exports = RoomManager;
