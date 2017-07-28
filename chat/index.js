var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');


app.get('/', function (req, res) {
    res.sendFile(__dirname + '/indexchat.html');
});

io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('chat message', function (msg, un) {

        console.log('un: ' + un + ' | message: ' + msg);
        switch (msg) {
            case "lag":
                sendMessage("I love Rick Astley!", 'notch');
                break;
            case "*autistic screeching*":
                sendMessage(un +"is a feckin normie <strong>REEEEEEEEEEEEEEEEEEEEEEEEEEEEEE</strong>", un);
                break;
            case "!pepe":
                sendMessage("<img style=\"height:10vh\" src='https://tinyurl.com/yd62jfua' alt=\"Mighty Moosen\">",un)
                break;
            case "nigger":
                sendMessage("Whoa there! please a PC term such as 'Basketball American'.", un+", racist")
                break;
            default:
                var term="<script>";
                if (msg.includes(term)){
                    sendMessage("nice try.", un);
                }
                else sendMessage(msg, un);
        }
       
        io.emit(getMessage(1));

    });

    socket.on('login message', function (un) {
        console.log('un: ' + un + ' logged in');
        showLastMessages(10, socket.id);
        io.emit('login message', un);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});
//open port on 3000
http.listen(3000, function () {
    console.log('listening on *:3000');
});

//connection variable
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "raspberry",
    database: "moosenim"
});

//connects to mysql database
con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");

});

function sendMessage(message, username) {
  //  try {

        if (message.length > 254) {
            var l = message.length - 254;
            var m = message.substring(0, 254);
            con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?, CURTIME())", [m, username], function (error, results) {
                if (error) throw error;
            });
            m = message.substring(l - message.length);
            con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?, CURTIME())", [m, username], function (error, results) {
                if (error) throw error;
            });
        }
        else {


            con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?, CURTIME())", [message, username], function (error, results) {
                if (error) throw error;

            });
     //   }
    }
   // catch (Exception) {
     //   con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?, CURTIME())", ["error", username], function (error, results) {
         //   if (error) throw error;

     //   });
  //  }
}
function getMessage() {
    con.query("SELECT * FROM ( SELECT * FROM messages ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", function (error, rows, results) {
        console.log("getting messages...");
        if (error) throw error;
        io.emit('chat message', rows[0].username, rows[0].message, rows[0].timestamp);
    });
}
function showLastMessages(num, id) {
    con.query("SELECT * FROM ( SELECT * FROM messages ORDER BY id DESC LIMIT ?) sub ORDER BY  id ASC", [num], function (error, rows, results) {
        console.log("getting messages...");
        if (error) throw error;
        for (var i = 0; i < num; i++) {
            io.to(id).emit('chat message', rows[i].username, rows[i].message, rows[i].timestamp);
        }
    });
}
