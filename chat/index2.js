var express = require('express');
var app = express();

var things = require('./things.js');
var login = require('./login.js');

//both index.js and things.js should be in same directory
app.use('/things', things);
app.use('/login', login);

app.listen(80);
