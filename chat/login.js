var express = require('express');
var router = express.Router();
var http = require('http').Server(express);
var io = require('socket.io')(http);
var mysql = require('mysql');

router.get('/', function(req, res){
   res.sendFile(__dirname + '/login.html');
});
router.post('/', function(req, res){
   res.send('POST route on login.');
});

io.on('connection', function (socket) {
    socket.on('login message', function (named) {
        console.log(name + " " + email);
    });
});
//export this router to use in our index.js
module.exports = router;
