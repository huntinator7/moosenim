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
    socket.on('login message', function (named) {
        console.log(name + " " + email);
    });
    socket.on('ping', function (named) {
        console.log('pong');
    });
    socket.on('chat message', function (msg, un) {
        console.log('chat message from ' + socket.id);
    });
});

console.log('listening on *:80');
