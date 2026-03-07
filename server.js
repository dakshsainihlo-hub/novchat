const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

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

  socket.on('send_message', ({ message, room }) => {
    if (!room || !currentUser) return;
    io.to(room).emit('receive_message', {
      id: Math.random().toString(36).substr(2, 9),
      username: currentUser,
      message,
      time: Date.now(),
      socketId: socket.id
    });
  });

  socket.on('typing', ({ room }) => {
    socket.to(room).emit('user_typing', { username: currentUser });
  });

  socket.on('stop_typing', ({ room }) => {
    socket.to(room).emit('user_stop_typing', { username: currentUser });
  });

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
