const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors:{origin:'*'}, maxHttpBufferSize:10e6 });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};           // room -> { users, password, isPrivate }
const reactions = {};       // msgId -> { emoji: Set<username> }
const seenBy = {};          // msgId -> Set<socketId>

function getUsers(room){ return rooms[room] ? Object.values(rooms[room].users) : [] }

io.on('connection', (socket) => {
  let currentRoom=null, currentUser=null;

  socket.on('join_room', ({ room, username, avatar, password, isPrivate }) => {
    if(rooms[room] && rooms[room].isPrivate){
      if(rooms[room].password !== password){ socket.emit('wrong_password'); return; }
    }
    currentRoom=room; currentUser=username;
    socket.join(room);
    if(!rooms[room]) rooms[room]={ users:{}, password:password||null, isPrivate:isPrivate||false };
    rooms[room].users[socket.id]={ username, id:socket.id, avatar:avatar||'😊' };
    io.to(room).emit('room_users', getUsers(room));
    socket.to(room).emit('user_joined', { username, time:Date.now() });
    socket.emit('joined', { room, users:getUsers(room) });
  });

  socket.on('send_message', ({ message, room, type, imageData, imageName, replyTo }) => {
    if(!room||!currentUser) return;
    const msgId = Math.random().toString(36).substr(2,9)+Date.now();
    seenBy[msgId] = new Set([socket.id]);
    const avatar = rooms[room]?.users[socket.id]?.avatar || '😊';
    io.to(room).emit('receive_message', { id:msgId, username:currentUser, message, type:type||'text', imageData:imageData||null, imageName:imageName||null, time:Date.now(), socketId:socket.id, replyTo:replyTo||null, avatar });
  });

  socket.on('mark_seen', ({ room, msgId }) => {
    if(!seenBy[msgId]) seenBy[msgId]=new Set();
    seenBy[msgId].add(socket.id);
    const count = seenBy[msgId].size - 1; // exclude sender
    if(count>0) io.to(room).emit('message_seen', { msgId, count });
  });

  socket.on('edit_message', ({ room, msgId, newMessage }) => {
    io.to(room).emit('message_edited', { msgId, newMessage });
  });

  socket.on('delete_message', ({ room, msgId }) => {
    io.to(room).emit('message_deleted', { msgId });
  });

  socket.on('react_message', ({ room, msgId, emoji }) => {
    if(!currentUser) return;
    if(!reactions[msgId]) reactions[msgId]={};
    if(!reactions[msgId][emoji]) reactions[msgId][emoji]=new Set();
    const set=reactions[msgId][emoji];
    if(set.has(currentUser)) set.delete(currentUser); else set.add(currentUser);
    if(set.size===0) delete reactions[msgId][emoji];
    const serialized={};
    for(const [e,s] of Object.entries(reactions[msgId])) serialized[e]=[...s];
    io.to(room).emit('update_reactions', { msgId, reactions:serialized });
  });

  socket.on('typing', ({ room }) => { socket.to(room).emit('user_typing', { username:currentUser }) });
  socket.on('stop_typing', ({ room }) => { socket.to(room).emit('user_stop_typing', { username:currentUser }) });

  socket.on('disconnect', () => {
    if(currentRoom && rooms[currentRoom]){
      delete rooms[currentRoom].users[socket.id];
      if(Object.keys(rooms[currentRoom].users).length===0){ delete rooms[currentRoom] }
      else { io.to(currentRoom).emit('room_users', getUsers(currentRoom)); io.to(currentRoom).emit('user_left', { username:currentUser, time:Date.now() }) }
    }
  });
});

const PORT = process.env.PORT||3000;
server.listen(PORT, ()=>console.log(`Server on port ${PORT}`));
