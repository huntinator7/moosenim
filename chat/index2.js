var express = require('express');
var app = express();

var chat = require('./chat.js');
var login = require('./login.js');
var index = require('./index.js');

//both index.js and things.js should be in same directory
app.use('/chat', chat);
app.use('/login', login);
app.use('/index', index);

app.listen(80);
