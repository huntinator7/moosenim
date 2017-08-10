var express = require('express');
var app = express();
var http = require('http').Server(express);
var io = require('socket.io').listen(app.listen(80));
var mysql = require('mysql');
var siofu = require("socketio-file-upload");

var chat = require('./chat.js');
var login = require('./login.js');


var username;
var picture;
//both index.js and things.js should be in same directory
app.use('/chat', chat);
app.use('/', login);
// app.use('/index', index);

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "raspberry",
    database: "moosenim"
});


io.sockets.on('connection', function (socket) {
    socket.emit('login', function (displayName, photoURL) { });
    console.log('A user connected - index2.js');
    showLastMessages(10, 1);
    // login process and recording. 
    socket.on('login message', function (displayName, email, photoURL, uid) {
        con.query("SELECT * FROM users WHERE uid = ?", [uid], function (error, rows, results) {
            if (rows[0]==null) {
                //show user as online and it add to DB
                con.query("INSERT INTO users (name, uid, profpic, isonline, totalmessages, email) VALUES ( ?, ?, ?, 1,1,?)", [displayName, uid, photoURL, email], function (error, results) {
                   if (error) console.log(error);
                });
            }
            username = displayName;
            picture = photoURL;
            //addOnline(un,email,photo,uid)
            var ison = false;
            for (var i = 0; i < online.length; i++) {
                if (online[i].name = displayName) ison = true;
                
            }
            
            //add user to list of online users if they aren't on already. '
           if(!ison) addOnline(displayName, email, photoURL, uid);
        });


        console.log(displayName + " email: " + email);
    });
    socket.on('ping', function (name) {
        console.log('pong');
    });
    socket.on('chat message', function (msg, un) {

        console.log('un: ' + username + ' | message: ' + msg);
      //  un = username;
        if (msg.indexOf("lag") > -1) {
            sendMessage("I love Rick Astley!", 'notch');
        } else if (msg.indexOf("*autistic screeching*") > -1) {
            sendMessage(msg, un);
            io.emit(getMessage(1));
            sendMessage(un +" is a feckin normie <strong>REEEEEEEEEEEEEEEEEEEEEEEEEEEEEE</strong>", "AutoMod");
        } else if (msg.indexOf("!pepe") == 0) {
            sendMessage("<img style=\"height:10vh\" src='https://tinyurl.com/yd62jfua' alt=\"Mighty Moosen\">", un)
        } else if (msg.indexOf("nigger") > -1) {
            var newmsg = msg.replace("nigger", "Basketball American");
            sendMessage(newmsg, un + ', casual racist');
        } else if (msg.indexOf("<script") > -1) {
            sendMessage("Stop right there, criminal scum! You violated my mother!", "AutoMod");
        } else if (/^http\S*\.(jpg|gif|png|svg)$/.test(msg)) {
            sendMessage('<img class="materialboxed responsive-img initialized" src="' + msg + '" alt="' + msg + '">', un);
        } else if (/http\S*youtube\S*/.test(msg)) {
            var ind = msg.search(/watch\?v=\S*/);
            var res = msg.substring(ind+8, ind+19);
            var newmsg = '<div class="video-container"><iframe width="100%" src="//www.youtube.com/embed/' + res + '?rel=0" frameborder="0" allowfullscreen></iframe></div>';
            sendMessage(newmsg, un);
        } else if (/http\S*youtu\.be\S*/.test(msg)) {
            var ind = msg.search(/youtu\.be\//);
            var res = msg.substring(ind+9, ind+20);
            var newmsg = '<div class="video-container"><iframe width="100%" src="//www.youtube.com/embed/' + res + '?rel=0" frameborder="0" allowfullscreen></iframe></div>';
            sendMessage(newmsg, un);
        } else if (/\S*twitch\.tv\S*/.test(msg)) {
            console.log('Is Twitch message');
            if (/\S*clips\S*/.test(msg)) { // Twitch clips
                console.log('Is Twitch clip');
                var ind = msg.search(/\.tv\//);
                var res = msg.substring(ind+4);
                console.log(newmsg);
                var newmsg = '<iframe style="width:64vw; height:36vw" src="https://clips.twitch.tv/embed?clip=' + res + '" scrolling="no" frameborder="0" autoplay=true muted=true allowfullscreen=true></iframe>';
                sendMessage(newmsg, un);
            } else if (/\S*videos\S*/.test(msg)) { // Twitch VODs
                console.log('Is Twitch VOD');
                var ind = msg.search(/videos\//);
                var res = msg.substring(ind+7);
                var newmsg = '<div id="' + res + '"></div><script type="text/javascript"> var player = new Twitch.Player("' + res + '", { width: 100%, video: "' + res + '",});player.setVolume(0.5);</script>'
                console.log(newmsg);
                sendMessage(newmsg, un);
            } else { // Twitch channel/stream
                console.log('Is Twitch channel/stream');
                var ind = msg.search(/\.tv\//);
                var res = msg.substring(ind+4);
                var newmsg = '<div id="' + res + '"></div><script type="text/javascript"> var player = new Twitch.Player("' + res + '", { width:100% channel:"' + res + '"}); player.setVolume(0.5); </script>'
                console.log(newmsg);
                sendMessage(newmsg, un);
            }
        } else {
            sendMessage(msg, un);
        }

        io.emit(getMessage(1));
    });
});



//connects to mysql database
con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

var online = [];

function addOnline(un,email,photo,uid) {
    var user = {
        name:un,
        id: uid,
        photo: photo,
        email:email
    };
    online.push(user);
    console.log('Adding ' + un + ', id ' + uid);
    updateOnline();
}

function removeOnline(uid) {
    console.log('Removing by id ' + uid);
    var newonline = online.filter(function( obj ) {
        return obj.id !== uid;
    });
    online = newonline;
    updateOnline();
}

function updateOnline(un, add) {
    console.log('updateOnline');
    var names = [];
    for (var i = 0; i < online.length; i++) {
        names.push(online[i].name);
        console.log('online: ' + online[i].name);
    }
    io.emit('update online', names);
}

function sendMessage(message, username) {
    try {
        con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?, CURTIME())", [message, username], function (error, results) {
            if (error) throw error;
        });
    }
    catch (Exception) {
        con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?, CURTIME())", ["error", username], function (error, results) {
            if (error) throw error;
        });
    }
}

function getMessage() {
    //will need to add chatroom_id at some point. 
    con.query("SELECT * FROM ( SELECT * FROM messages ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", function (error, rows, results) {
        console.log("emitting message from "+username);
        if (error) throw error;
        var pic
        con.query("SELECT * FROM users WHERE users.name = ?", [username], function (error, row) {
            pic = row[0].profpic 
        });
        io.emit('chat message', rows[0].username, rows[0].message, rows[0].timestamp, rows[0].id,picture );
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
//chatrooms are gonna be fun. tl;Dr we need to have a sidebar that displays all chatrooms the user has access to. 
//also have a "create" button for them to create one. as soon as one of these chatrooms is clicked, pull last (x) messages 
//and reload page to show only that user's chatroom.
function createChatroom (n,i) {


    // get availible chatrooms from user SELECT room_id FROM room_users WHERE user_id = ? [user.uid]
        var name = n;
        var id = i;
        var chatroom = {
            name: name,
            id: id
        };
    
    
}


console.log('listening on *:80');
