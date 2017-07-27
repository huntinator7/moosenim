var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');


app.get('/', function(req, res){
  res.sendFile(__dirname + '/indexchat.html');
});

io.on('connection', function(socket){
    console.log('a user connected');
   
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
    io.emit('chat message', msg);
    sendMessage(msg);
    });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "raspberry",
    database: "moosenim"
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
   
    
});

function sendMessage(message) {
    con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, 'username', 'time')", [message], function (error, results) {
        if (error) throw error;
    });
}
function getMessage() {
    con.query("SELECT message FROM ( SELECT * FROM messages ORDER BY id DESC LIMIT 10) sub ORDER BY  id ASC", function (error, result) {
        io.emit('last message', result);
    });
}

