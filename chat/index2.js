var express = require('express');
var app = express();
var http = require('http').Server(express);
var io = require('socket.io').listen(app.listen(80));
var mysql = require('mysql');
var siofu = require("socketio-file-upload");
var Discord = require("discord.js");
var client = new Discord.Client();
var moment = require('moment');
moment().format('h:mm:ss a');

var chat = require('./chat.js');
var login = require('./login.js');

client.login('MzQ5NjY0NDk0MjkwNzMxMDIw.DH9aSA.BsCBfINN4YTwtFzTqHJBQsARDGs');

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('message', msg => {
    if (msg.channel.id == 329020807487553537 && !(msg.author.bot)) {
        sendMessage(msg.content, msg.author.username, 1, 2);
        getMessageDiscord(msg.author.username, msg.content, msg.author.avatarURL);
    }
    console.log(msg.author.username + ': ' + msg.content);
    // TODO: Emit message as Discord user
});

//both index.js and things.js should be in same directory
app.use('/chat/main', chat);
app.use('/', login);
app.use("/images", express.static(__dirname + '/images'));
app.use("/uploads", express.static(__dirname + '/uploads'));
// app.use('/index', index);

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "raspberry",
    database: "moosenim"
});


io.sockets.on('connection', function (socket) {

    // console.log('A user connected - index2.js');
    showLastMessages(11, socket.id, 1);

    // login process and recording.
    socket.on('login message', function (displayName, email, photoURL, uid) {
        console.log("uid: " + uid + " displayName: " + displayName + " socket.id: " + socket.id);
        con.query("SELECT * FROM users WHERE uid = ?", [uid], function (error, rows, results) {
            // console.log(rows[0]);
            if (rows[0] == null) {
                //show user as online and it add to DB
                con.query("INSERT INTO users (name, uid, profpic, isonline, totalmessages, email) VALUES ( ?, ?, ?, 1,1,?)", [displayName, uid, photoURL, email], function (error, results) {
                    if (error) console.log(error);
                });
            }//addOnline(un,email,photo,uid)
            addOnline(displayName, email, photoURL, uid, socket.id, 1, getrooms(uid));
        });

        io.emit('login', displayName, email, photoURL, uid);

    });
    socket.on('ping', function (name) {
        console.log('pong');
    });
    socket.on('associate', function (uid) {
        console.log('Associating ' + uid + ' with ' + socket.id);
        var match;
        socket.emit('roomlist', getrooms(uid));
        for (var i = 0; i < online.length; i++) {
           console.log(online[i].allrooms);
            if (online[i].uid == uid) {
                match = i;
                //console.log('associate      match = ' + i);
            }
        }
        if (match) {
            socket.emit('roomlist', getrooms(uid));
            console.log('Replacing ' + online[match].sid + ' with ' + socket.id + ', match = ' + match);
            online[match].sid = socket.id;
        } else {
            io.to(socket.id).emit('retreat');
        }
    });
    socket.on('chat message', function (msg) {
        var un = 'Error - Username Not Found';
        var uid;
        var curroom;
        console.log('chat message       socket.id: ' + socket.id);
        for (var i = 0; i < online.length; i++) {
            console.log(i + ': ' + online[i].sid);
            if (online[i].sid == socket.id) {
                console.log("New message from " + online[i].name + ", pictureUrl: " + online[i].photo);
                un = online[i].name;
                uid = online[i].uid;
                curroom = online[i].curroom;
                if (uid == "114575845000636952047") curroom = 2;
            }
        }
        console.log('chat message       End result of un: ' + un);
        if (un == 'Error - Username Not Found') {
            io.to(socket.id).emit('retreat');
            console.log('Retreating ' + socket.id);
        } else {

            console.log('chat message       un: ' + un + ' | message: ' + msg);
            if (msg.indexOf("lag") > -1) {
                sendMessage("I love Rick Astley!", 'notch');
            } else if (msg.indexOf("*autistic screeching*") > -1) {
                sendMessage(msg, un, uid, curroom);
                io.emit(getMessage(curroom));
                sendMessage(un + " is a feckin normie <strong>REEEEEEEEEEEEEEEEEEEEEEEEEEEEEE</strong>", "AutoMod", uid, curroom);
            } else if (msg.indexOf("!myrooms") > -1) sendMessage("your rooms: " + getrooms(uid).toString() + " curroom" + curroom, un, ,uid,curroom);
            else if (msg.indexOf("!pepe") == 0) {
                sendMessage("<img style=\"height:10vh\" src='https://tinyurl.com/yd62jfua' alt=\"Mighty Moosen\">", un)
            } else if (msg.indexOf("nigger") > -1) {
                var newmsg = msg.replace("nigger", "Basketball American");
                sendMessage(newmsg, un + ', casual racist', uid, 2);
            } else if (msg.indexOf("<script") > -1) {
                sendMessage("Stop right there, criminal scum! You violated my mother!", "AutoMod",uid,curroom);
            } else if (/^http\S*\.(jpg|gif|png|svg)$/.test(msg)) {
                sendMessage('<img class="materialboxed responsive-img initialized" src="' + msg + '" alt="' + msg + '">', un, uid, curroom);
            } else if (/http\S*youtube\S*/.test(msg)) {
                var ind = msg.search(/watch\?v=\S*/);
                var res = msg.substring(ind + 8, ind + 19);
                var newmsg = '<div class="video-container"><iframe width="100%" src="//www.youtube.com/embed/' + res + '?rel=0" frameborder="0" allowfullscreen></iframe></div>';
                sendMessage(newmsg, un, uid, curroom);
            } else if (/http\S*youtu\.be\S*/.test(msg)) {
                var ind = msg.search(/youtu\.be\//);
                var res = msg.substring(ind + 9, ind + 20);
                var newmsg = '<div class="video-container"><iframe width="100%" src="//www.youtube.com/embed/' + res + '?rel=0" frameborder="0" allowfullscreen></iframe></div>';
                sendMessage(newmsg, un, curroom);
            } else if (/\S*twitch\.tv\S*/.test(msg)) {
                console.log('Is Twitch message');
                if (/\S*clips\S*/.test(msg)) { // Twitch clips
                    console.log('Is Twitch clip');
                    var ind = msg.search(/\.tv\//);
                    var res = msg.substring(ind + 4);
                    console.log(newmsg);
                    var newmsg = '<iframe style="width:64vw; height:36vw" src="https://clips.twitch.tv/embed?clip=' + res + '" scrolling="no" frameborder="0" autoplay=true muted=true allowfullscreen=true></iframe>';
                    sendMessage(newmsg, un, uid, curroom);
                } else if (/\S*videos\S*/.test(msg)) { // Twitch VODs
                    console.log('Is Twitch VOD');
                    var ind = msg.search(/videos\//);
                    var res = msg.substring(ind + 7);
                    var newmsg = '<div id="' + res + '"></div><script type="text/javascript"> var player = new Twitch.Player("' + res + '", { width: 100%, video: "' + res + '",});player.setVolume(0.5);</script>'
                    console.log(newmsg);
                    sendMessage(newmsg, un, uid, curroom);
                } else { // Twitch channel/stream
                    console.log('Is Twitch channel/stream');
                    var ind = msg.search(/\.tv\//);
                    var res = msg.substring(ind + 4);
                    var newmsg = '<div id="' + res + '"></div><script type="text/javascript"> var player = new Twitch.Player("' + res + '", { width:100% channel:"' + res + '"}); player.setVolume(0.5); </script>'
                    console.log(newmsg);
                    sendMessage(newmsg, un, uid, curroom);
                }
            } else {
                sendMessage(msg, un, uid, curroom);
            }

            io.emit(getMessage(curroom));
        }
    });

    //getrooms is called when the user logs in, and then returns a roomlist array back to the client. 
    socket.on('getrooms', function (uid) {
        console.log("uid for chatrooms is " + uid);

        socket.emit('roomlist', getrooms(uid));

    });
});



//connects to mysql database
con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

var online = [];

function addOnline(un, email, photo, uid, sock, room, allrooms) {
    var user = {
        name: un,
        uid: uid,
        photo: photo,
        email: email,
        sid: sock,
        curroom: room,
        allrooms: allrooms
    };
    online.push(user);
    //    console.log('addOnline          Adding ' + un + ', id ' + uid + ', sid ' + sock);
    //console.log(online);
    // updateOnline();
}

// function removeOnline(uid) {
//     console.log('Removing by id ' + uid);
//     var newonline = online.filter(function( obj ) {
//         return obj.id !== uid;
//     });
//     online = newonline;
//     updateOnline();
// }
//
// function updateOnline(un, add) {
//     console.log('updateOnline');
//     var names = [];
//     for (var i = 0; i < online.length; i++) {
//         names.push(online[i].name);
//         console.log('online: ' + online[i].name);
//     }
//     io.emit('update online', names);
// }

function sendMessage(message, username, uid, chatid) {
    try {

        con.query("INSERT INTO messages (message, username, timestamp,chatroom_id,uid) VALUES ( ?, ?, TIME_FORMAT(CURTIME(), '%h:%i:%s %p'),?,?)", [message, username, chatid, uid], function (error, results) {
            if (error) throw error;
        });
    }
    catch (Exception) {
        con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?,TIME_FORMAT(CURTIME(), '%h:%i:%s %p'))", ["error", username], function (error, results) {
            if (error) throw error;
        });
    }
}

function getMessage(chatid) {
    //will need to add chatroom_id at some point
    con.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", [chatid], function (error, rows, results) {
        console.log("Emitting message");

        if (error) throw error;
        con.query("SELECT * FROM users WHERE users.name = ?", [rows[0].username], function (error, row) {
            if (row.length < 1) {
                io.emit('chat message', rows[0].username, rows[0].message, rows[0].timestamp, rows[0].id, "http://www.moosen.im/images/favicon.png");
                //send to Discord
                client.channels.get('329020807487553537').sendMessage(rows[0].username + ': ' + decodeURI(rows[0].message));
            } else {
                io.emit('chat message', rows[0].username, rows[0].message, rows[0].timestamp, rows[0].id, row[0].profpic);
                //send to Discord
                client.user.setAvatar(row[0].profpic);
                client.channels.get('329020807487553537').sendMessage(rows[0].username + ': ' + decodeURI(rows[0].message));
            }
        });
    });
}

function getMessageDiscord(un, msg, pic) {
    io.emit('chat message', un, msg, moment(), 0, pic);
}

//should be called when a user clicks on a different chatroom
function updatechat(roomid) {
    // TODO set a user variable "current Room" to the value specified. 
    //reload page
    showLastMessages(10, 0, roomid);



}


function showLastMessages(num, sid, roomid) {
    con.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? ORDER BY id DESC LIMIT ?) sub ORDER BY  id ASC", [roomid, num], function (error, rows, results) {
        console.log("Getting messages...");
        if (error) throw error;

        try {
            rows.forEach(function (element) {
                con.query("SELECT * FROM users WHERE users.name = ?", [element.username], function (error, row) {
                    if (row[0]) {
                        io.to(sid).emit('chat message', element.username, element.message, element.timestamp, element.id, row[0].profpic);
                    } else {
                        io.to(sid).emit('chat message', element.username, element.message, element.timestamp, element.id, "http://www.moosen.im/images/favicon.png");
                    }
                });
            });
        }
        catch (e) {
            console.log("last message isn't working.");
        }

    });
}
//chatrooms are gonna be fun. tl;Dr we need to have a sidebar that displays all chatrooms the user has access to.
//also have a "create" button for them to create one. as soon as one of these chatrooms is clicked, pull last (x) messages
//and reload page to show only that user's chatroom.



function getrooms(uid) {

    var list = Array();


    con.query("SELECT room_id FROM room_users WHERE user_id = ?", [uid], function (error, result) {

        list = result;
        try {
            result.forEach(function (e) {
               // list.push(e);
                con.query("SELECT name FROM rooms WHERE serialid = ?", [e], function (error, rows) {
                   
                  //  console.log("list =  " + rows);
                });
            });
            return result;
        }
        catch(exception){
            console.log("getrooms isn't working.");
            return null;
        }
        finally {
            return result;
        }


    });

    
}


function createChatroom(n, uid) {

    var roomid;
    var name = n;

    // get availible chatrooms from user SELECT room_id FROM room_users WHERE user_id = ? [user.uid]
    con.query("INSERT INTO rooms (name) VALUES(?)", [name], function (error) { });
    con.query("SELECT serialid FROM ( SELECT serialid FROM rooms ORDER BY serialid DESC LIMIT 1) sub ORDER BY  serialid ASC", function (error, rows, results) {
        roomid = row[0].serialid;
        console.log("last room id is" + roomid);
    });
    con.query("INSERT INTO room_users VALUES(?,?,1)", [roomid, uid]);


    //pretty sure we don't actually need this.
    var chatroom = {
        name: name,
        adminid: uid
    };


}


console.log('listening on *:80');
