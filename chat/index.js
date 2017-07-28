var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');
var SocketIOFile = require('socket.io-file');

app.get('/', (req, res, next) => {
    return res.sendFile(__dirname + '/client/index.html');
});

app.get('/app.js', (req, res, next) => {
    return res.sendFile(__dirname + '/client/app.js');
});

app.get('/socket.io.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-client/dist/socket.io.js');
});

app.get('/socket.io-file-client.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
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
            sendMessage(un +" is a feckin normie <strong>REEEEEEEEEEEEEEEEEEEEEEEEEEEEEE</strong>", un);
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

    var uploader = new SocketIOFile(socket, {
        uploadDir: 'testimages',							// simple directory
        chunkSize: 10240,							// default is 10240(1KB)
        transmissionDelay: 0,						// delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay)
        overwrite: true 							// overwrite file if exists, default is true.
    });
    uploader.on('start', (fileInfo) => {
        console.log('Start uploading');
        console.log(fileInfo);
    });
    uploader.on('stream', (fileInfo) => {
        console.log(`${fileInfo.wrote} / ${fileInfo.size} byte(s)`);
    });
    uploader.on('complete', (fileInfo) => {
        console.log('Upload Complete.');
        console.log(fileInfo);
    });
    uploader.on('error', (err) => {
        console.log('Error!', err);
    });
    uploader.on('abort', (fileInfo) => {
        console.log('Aborted: ', fileInfo);
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
