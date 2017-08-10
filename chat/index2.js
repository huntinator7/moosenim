var express = require('express');
var app = express();
var http = require('http').Server(express);
var io = require('socket.io').listen(app.listen(80));
var mysql = require('mysql');
var siofu = require("socketio-file-upload");

var chat = require('./chat.js');
var login = require('./login.js');

//both index.js and things.js should be in same directory
app.use('/chat', chat);
app.use('/', login);
// app.use('/index', index);

io.sockets.on('connection', function (socket) {
    console.log('A user connected - index2.js');
    socket.on('echo', function (data) {
        io.sockets.emit('message', data);
        console.log('here');
    });
});

console.log('listening on *:80');
