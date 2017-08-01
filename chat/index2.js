var express = require('express');
var app = express();
var http = require('http').Server(express);
var io = require('socket.io')(http);
var mysql = require('mysql');
var siofu = require("socketio-file-upload");

var chat = require('./chat.js');
var login = require('./login.js');
var index = require('./index.js');
var socktest = require('./socktest.js');

//both index.js and things.js should be in same directory
app.use('/chat', chat);
app.use('/login', login);
// app.use('/index', index);
app.use('/socktest', socktest);

http.listen(80);
