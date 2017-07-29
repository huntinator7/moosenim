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

        if (msg.indexOf("lag") > -1) {
            sendMessage("I love Rick Astley!", 'notch');
        } else if (msg.indexOf("*autistic screeching*") > -1) {
            sendMessage(msg, un);
            sendMessage(un +" is a feckin normie <strong>REEEEEEEEEEEEEEEEEEEEEEEEEEEEEE</strong>", "AutoMod");
        } else if (msg.indexOf("!pepe") == 0) {
            sendMessage("<img style=\"height:10vh\" src='https://tinyurl.com/yd62jfua' alt=\"Mighty Moosen\">", un)
        } else if (msg.indexOf("nigger") > -1) {
            var newmsg = msg.replace("nigger", "Basketball American");
            sendMessage(newmsg, un + ', casual racist');
        } else if (msg.indexOf("<script") > -1) {
            sendMessage("nice try.", "AutoMod");
        }
        else {
            sendMessage(msg, un);
        }

        io.emit(getMessage(1));

    });

    socket.on('login message', function (un) {
        console.log('un: ' + un + ' logged in');
        showLastMessages(10, socket.id);
        updateOnline(un, true);
        socket.broadcast.emit('login message', un);
    });

    socket.on('local message', function (un, num) {
        console.log(un + ' accessing db');
        showLastMessages(num, socket.id);
    });

    socket.on('disconnect', function (un) {
        console.log('user disconnected');
        updateOnline(un, false);
        if (un != 'ping timeout' && un != 'transport close')
        socket.broadcast.emit('logoff message', un);
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

var online = [];

function updateOnline(un, add) {
    console.log('updateOnline| un:' + un + ' add:' + add);
    if (add) {
        online.push(un);
        console.log('adding ' + un);
    } else {
        var pos = online.indexOf(un);
        console.log('removing ' + un + ', pos of un = ' + pos);
        if (pos > -1) {
            online.splice(pos, 1);
            console.log('removed ' + un);
        }
    }
    console.log('updateOnline');
    for (var i = 0; i < users.length; i++) {
        $('#online').append('<li class="collection-item">' + users[i] + '</li>');
    }
    io.emit('update online', online);
}


function sendMessage(message, username) {
    try {

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
        }
    }
    catch (Exception) {
        con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?, CURTIME())", ["error", username], function (error, results) {
            if (error) throw error;

        });
    }
}
function getMessage() {
    con.query("SELECT * FROM ( SELECT * FROM messages ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", function (error, rows, results) {
        console.log("emitting message");
        if (error) throw error;
        if (rows[0].id == 1000) {
            io.emit('chat message', rows[0].username, "congratulations! you just sent the 1000th moosen im chat message!", rows[0].timestamp, rows[0].id);
        }
        else
        io.emit('chat message', rows[0].username, rows[0].message, rows[0].timestamp, rows[0].id);
    });
}
function showLastMessages(num, id) {
    con.query("SELECT * FROM ( SELECT * FROM messages ORDER BY id DESC LIMIT ?) sub ORDER BY  id ASC", [num], function (error, rows, results) {
        console.log("getting messages...");
        if (error) throw error;
        for (var i = 0; i < num; i++) {
            io.to(id).emit('chat message', rows[i].username, rows[i].message, rows[i].timestamp, rows[i].id);
        }
    });
}
