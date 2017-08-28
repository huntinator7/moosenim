var express = require('express');
var app = express();
var http = require('http').Server(express);
var io = require('socket.io').listen(app.listen(80));
var mysql = require('mysql');
var SocketIOFile = require('socket.io-file');
// var siofu = require("socketio-file-upload");
var Discord = require("discord.js");
var client = new Discord.Client();
var moment = require('moment');

var chat = require('./chat.js');
var login = require('./login.js');
var config = require('./config');

//Discord login with token from dev page
client.login(config.token);

//Login message for Discord
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

//Any time a Discord message is sent, bot checks to see if in moosen-im channel and if not sent by bot. If so, it adds the message to the DB and emits it
client.on('message', msg => {
    if (msg.channel.id == 329020807487553537 && !(msg.author.bot)) {
        if (msg.attachments) {
            console.log(msg.attachments.first().url);
        }
        sendMessage(msg.content, msg.author.username, 1, 1);
        getMessageDiscord(msg.author.username, msg.content, msg.author.avatarURL);
        console.log(msg.author.username + ': ' + msg.content);
    }
});

//Associating .js files with URLs
app.use('/chat/main', chat);
app.use('/', login);
app.use("/images", express.static(__dirname + '/images'));
app.use("/uploads", express.static(__dirname + '/uploads'));

//Main socket.io listener
io.sockets.on('connection', function (socket) {

    //Login process and recording
    socket.on('login message', function (displayName, email, photoURL, uid) {
        console.log("uid: " + uid + " displayName: " + displayName + " socket.id: " + socket.id);
        con.query("SELECT * FROM users WHERE uid = ?", [uid], function (error, rows, results) {
            if (rows[0] == null) {
                //If no user, add to DB
                con.query("INSERT INTO users (name, uid, profpic, isonline, totalmessages, email) VALUES ( ?, ?, ?, 1,1,?)", [displayName, uid, photoURL, email], function (error, results) {
                    if (error) console.log(error);
                });
            }
            addOnline(displayName, email, photoURL, uid, socket.id, 1);//, getrooms(uid, socket.id));
        });
        io.emit('login', displayName, email, photoURL, uid);
    });

    //Test emit
    socket.on('ping', function (name) {
        console.log('pong');
        console.log(Object.keys(io.sockets.sockets));
    });

    //Workaround for different login page
    socket.on('associate', function (uid) {
        console.log('Associating ' + uid + ' with ' + socket.id);
        var match;
        //Replace the last entry in online[] with the current socket being checked. Prevents overwrite of multiple devices for single user.
        for (var i = 0; i < online.length; i++) {
            if (online[i].uid == uid) {
                match = i;
            }
        }
        if (match) {
            io.to(socket.id).emit('roomlist', getChatrooms(socket.id,uid));
            console.log('Replacing ' + online[match].sid + ' with ' + socket.id + ', match = ' + match);
            online[match].sid = socket.id;
            //Show the last 10 messages to the user
            showLastMessages(10, socket.id, 1);
        } else {
            io.to(socket.id).emit('retreat');
        }
    });

    //Generic message emit
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
            // } else if (msg.indexOf("!myrooms") > -1) {
            //     sendMessage("your rooms: " + getrooms(uid).toString() + " curroom" + curroom, un, uid, curroom);
            } else if (msg.indexOf("!pepe") == 0) {
                sendMessage("<img style=\"height:10vh\" src='https://tinyurl.com/yd62jfua' alt=\"Mighty Moosen\">", un)
            } else if (msg.indexOf("nigger") > -1) {
                var newmsg = msg.replace("nigger", "Basketball American");
                sendMessage(newmsg, un + ', casual racist', uid, curroom);
            } else if (msg.indexOf("<script") > -1) {
                sendMessage("Stop right there, criminal scum! You violated my mother!", "AutoMod", uid, curroom);
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
    // socket.on('getrooms', function (uid) {
    //     console.log("uid for chatrooms is " + uid);
    //     socket.emit('roomlist', getrooms(uid, socket.id));
    // });

    // socket.on('getroomnames', function (name) {
    //     console.log("getroom names: " + name);
    // });

    //file upload
    // var uploader = new siofu();
    // uploader.dir = __dirname + '/uploads';
    // uploader.listen(socket);

    // uploader.on("start", function(event){
    //     console.log('Starting upload to ' + event.file.name + ' of type ' + event.file.type + ' to ' + uploader.dir);
    // });
    // uploader.on("saved", function(event){
    //     console.log(event.file.name + ' successfully saved.');
    //     var user = { name:"AutoMod" };
    //     user = online.filter(function( obj ) {
    //         return obj.sid === socket.id;
    //     })[0];
    //     var msg = '<img class="materialboxed" style="height:20vh" src="http://moosen.im/chat/uploads/' + event.file.name + '" alt="Mighty Moosen">';
    //     sendMessage(msg, user.name, uid, curroom);
    //     io.emit(getMessage(curroom));
    // });

    //file upload
    var uploader = new SocketIOFile(socket, {
        uploadDir: 'uploads',						// simple directory 
        maxFileSize: 33554432, 						// 32 MB. default is undefined(no limit) 
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
        // var user = { name:"AutoMod" };
        // user = online.filter(function( obj ) {
        //     return obj.sid === socket.id;
        // })[0];
        // var msg = '<img class="materialboxed" style="height:20vh" src="http://moosen.im/chat/uploads/' + event.file.name + '" alt="Mighty Moosen">';
        // sendMessage(msg, user.name, uid, curroom);
        // io.emit(getMessage(curroom));
    });
    uploader.on('error', (err) => {
        console.log('Error!', err);
    });
    uploader.on('abort', (fileInfo) => {
        console.log('Aborted: ', fileInfo);
    });

});

var connect = {
    host: "localhost",
    user: "root",
    password: "raspberry",
    database: "moosenim"
};

//connects to mysql database
// con.connect(function (err) {
//     if (err) throw err;
//     console.log("Connected!");
// });

var con;

function handleDisconnect() {
  con = mysql.createConnection(connect);            // Recreate the connection, since the old one cannot be reused.

  con.connect(function(err) {             // The server is either down
    if(err) {                             // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    } else {                              // to avoid a hot loop, and to allow our node script to
        console.log("Connected!");        // process asynchronous requests in the meantime.
    }                                     // If you're also serving http, display a 503 error.
  });

  con.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();

var online = [];
function addOnline(un, email, photo, uid, sock, room, allrooms) {
    var user = {
        name: un,
        uid: uid,
        photo: photo,
        email: email,
        sid: sock,
        curroom: room//,
        //allrooms: allrooms
    };
    online.push(user);
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
                client.channels.get('329020807487553537').send(rows[0].username + ': ' + decodeURI(rows[0].message));
            }
        });
    });
}

function getMessageDiscord(un, msg, pic) {
    io.emit('chat message', un, msg, moment().format('h:mm:ss a'), 0, pic);
}

//should be called when a user clicks on a different chatroom
function updatechat(roomid) {
    //TODO: set a user variable "current Room" to the value specified. 
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

// function getrooms(uid, sid) {
//     con.query("SELECT room_id FROM room_users WHERE user_id = ?", [uid], function (error, row) {
//         try {
//             row.forEach(function (e) {
//                 // list.push(e);
//                 io.to(sid).emit('getroomnames', e.room_id);
//                 console.log("room id:" + e.room_id);
//                 con.query("SELECT name FROM rooms WHERE serialid = ?", [e.room_id], function (error, rows) {
//                     //  io.emit('getroomnames', rows[0].serialid);
//                 });
//             });
//             return row.room_id;
//         }
//         catch (exception) {
//             console.log("getrooms isn't working.");
//             return null;
//         }
//         finally {
//             return row.room_id;
//         }
//     });
// }

function getChatrooms(sid,uid) {
    con.query("SELECT * FROM room_users WHERE user_id = ?", [uid], function (error, row) {
        io.to(sid).emit('roomlist', row);
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
