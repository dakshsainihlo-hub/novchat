const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 10e6
});

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
const messageReactions = {};

function getRoomUsers(room) {
  return rooms[room] ? Object.values(rooms[room]) : [];
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;

  socket.on('join_room', ({ room, username }) => {
    currentRoom = room;
    currentUser = username;
    socket.join(room);
    if (!rooms[room]) rooms[room] = {};
    rooms[room][socket.id] = { username, id: socket.id };
    io.to(room).emit('room_users', getRoomUsers(room));
    socket.to(room).emit('user_joined', { username, time: Date.now() });
    socket.emit('joined', { room, users: getRoomUsers(room) });
  });

  socket.on('send_message', ({ message, room, type, imageData, imageName }) => {
    if (!room || !currentUser) return;
    const msgId = Math.random().toString(36).substr(2, 9) + Date.now();
    io.to(room).emit('receive_message', {
      id: msgId,
      username: currentUser,
      message,
      type: type || 'text',
      imageData: imageData || null,
      imageName: imageName || null,
      time: Date.now(),
      socketId: socket.id
    });
  });

  socket.on('react_message', ({ room, msgId, emoji }) => {
    if (!room || !currentUser) return;
    if (!messageReactions[msgId]) messageReactions[msgId] = {};
    if (!messageReactions[msgId][emoji]) messageReactions[msgId][emoji] = new Set();
    const set = messageReactions[msgId][emoji];
    if (set.has(currentUser)) { set.delete(currentUser); } else { set.add(currentUser); }
    if (set.size === 0) delete messageReactions[msgId][emoji];
    const serialized = {};
    for (const [e, s] of Object.entries(messageReactions[msgId])) { serialized[e] = [...s]; }
    io.to(room).emit('update_reactions', { msgId, reactions: serialized });
  });

  socket.on('typing', ({ room }) => { socket.to(room).emit('user_typing', { username: currentUser }); });
  socket.on('stop_typing', ({ room }) => { socket.to(room).emit('user_stop_typing', { username: currentUser }); });

  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      delete rooms[currentRoom][socket.id];
      if (Object.keys(rooms[currentRoom]).length === 0) {
        delete rooms[currentRoom];
      } else {
        io.to(currentRoom).emit('room_users', getRoomUsers(currentRoom));
        io.to(currentRoom).emit('user_left', { username: currentUser, time: Date.now() });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
