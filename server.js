const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const RoomManager = require('./server/roomManager');
const initializeSocketHandlers = require('./server/socketHandlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const roomManager = new RoomManager();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/room/:code', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initializeSocketHandlers(io, roomManager);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
