var express = require('express');
var app = express();
var http = require('http').Server(express);
var io = require('socket.io').listen(app.listen(80));
var mysql = require('mysql');
var SocketIOFile = require('socket.io-file');

//api test
//var path = require('path');
var cors = require('cors');
var messages = require('./routes/messages');
var bodyParser = require('body-parser'); 

//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');

app.use(cors());
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({

  //  extended: false

//})); 


//end api test requirements

// var siofu = require("socketio-file-upload");
var Discord = require("discord.js");
var client = new Discord.Client();
var moment = require('moment');

var chat = require('./chat.js');
var login = require('./login.js');
var config = require('./config');

//Associating .js files with URLs
app.use('/', chat);
app.use('/messages', messages);
app.use('/login', login);
app.use("/images", express.static(__dirname + '/images'));
app.use("/uploads", express.static(__dirname + '/uploads'));
app.use("/sounds", express.static(__dirname + '/sounds'));
app.use("/node_modules", express.static(__dirname + '/node_modules'));

//Discord login with token from dev page
client.login(config.token);

//Login message for Discord
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

//Any time a Discord message is sent, bot checks to see if in moosen-im channel and if not sent by bot. If so, it adds the message to the DB and emits it
client.on('message', msg => {
    // client.user.setAvatar('./images/discord.png');
    if (msg.channel.id == 329020807487553537 && !(msg.author.bot)) {
        msg.channel.members.forEach(function (element){
            try {
                console.log(`Username: ${element.displayName}`);
                console.log(`ID: ${element.user.id}`);
                if (element.user.id == 349664494290731020){

                }
            } catch (e) {
                console.log('User didn\'t work');
            }
        });
        sendMessage(msg.content, msg.author.username, 1, 1);
        getMessageDiscord(msg.author.username, msg.content, msg.author.avatarURL);
        if (msg.attachments.array().length) {
            try {
                console.log(msg.attachments.first().url);
                var message = '<img class="materialboxed responsive-img" src="' + msg.attachments.first().url + '" alt="Error - Image not found">';
                sendMessage(message, msg.author.username, 1, config.discordChannel);
                getMessageDiscord(msg.author.username, message, msg.author.avatarURL);
            } catch (e) {
                console.log('Message attachment has no url');
            }
        }
        console.log(msg.author.username + ': ' + msg.content);
    }
});
//329020807487553537 - moosen-im
//319938734135050240 - dev-test

//Main socket.io listener
io.sockets.on('connection', function (socket) {

    // console.log('Sockets: ' + Object.keys(io.sockets.sockets));
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
            io.to(socket.id).emit('roomlist', getChatrooms(socket.id, uid));
            console.log('Replacing ' + online[match].sid + ' with ' + socket.id + ', match = ' + match);
            online[match].sid = socket.id;
            //Show the last 10 messages to the user
            showLastMessages(10, socket.id, 1);
        } else {
            io.to(socket.id).emit('retreat');
        }
    });
    socket.on('changerooms', function (roomid) {
        showLastMessages(11, socket.id, roomid)
    });
    //Generic message emit
    socket.on('chat message', function (msg, curroom) {
        var un = 'Error - Username Not Found';
        var uid;
        console.log('chat message       socket.id: ' + socket.id);
        for (var i = 0; i < online.length; i++) {
            console.log(i + ': ' + online[i].sid);
            if (online[i].sid == socket.id) {
                console.log("New message from " + online[i].name);
                un = online[i].name;
                uid = online[i].uid;
                // curroom = online[i].curroom;
            }
        }
        if (un == 'Error - Username Not Found') {
            io.to(socket.id).emit('retreat');
            console.log('Retreating ' + socket.id);
        } else {
            console.log('message: ' + msg);
            if (msg.indexOf("lag") > -1) {
                sendMessage("I love Rick Astley!", 'notch', uid, curroom);
            } else if (msg.indexOf("*autistic screeching*") > -1) {
                sendMessage(msg, un, uid, curroom);
                io.emit(getMessage(curroom));
                sendMessage(un + " is a feckin normie <strong>REEEEEEEEEEEEEEEEEEEEEEEEEEEEEE</strong>", "AutoMod", uid, curroom);
                // } else if (msg.indexOf("!myrooms") > -1) {
                //     sendMessage("your rooms: " + getrooms(uid).toString() + " curroom" + curroom, un, uid, curroom);
            } else if (msg.indexOf("!pepe") == 0) {
                sendMessage("<img style=\"height:10vh\" src='https://tinyurl.com/yd62jfua' alt=\"Mighty Moosen\">", un, uid, curroom)
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
                sendMessage(newmsg, un, uid,curroom);
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
            }
            else if (msg.indexOf("!motd") > -1) {
                var newmsg = msg.substring(5, msg.length);
                io.emit('motd update', newmsg);
                con.query('UPDATE rooms SET motd = ? WHERE serialid = ?', [newmsg, curroom], function (error) { if (error) throw error; });
                
            }
                else {
                console.log('In chat message, curroom: ' + curroom);
                sendMessage(msg, un, uid, curroom);
            }
            io.emit(getMessage(curroom));
        }
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

function getMotd(roomid) {
    con.query('SELECT * FROM rooms WHERE serialid = ?', [roomid], function (error, row) {
        console.log("motd is" + row[0].motd + " roomid = " + roomid);
        io.emit('motd update', row[0].motd);
        return row[0].motd;
    });
}

function handleDisconnect() {
    con = mysql.createConnection(connect);            // Recreate the connection, since the old one cannot be reused.

    con.connect(function (err) {             // The server is either down
        if (err) {                             // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        } else {                              // to avoid a hot loop, and to allow our node script to
            console.log("Connected!");        // process asynchronous requests in the meantime.
        }                                     // If you're also serving http, display a 503 error.
    });

    con.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
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

function sendMessage(message, username, uid, chatid) {
    console.log(`In sendMessage, chatid: ${chatid}\nmsg: ${message}`);
    var msg = encodeURI(message);
    try {
        con.query("INSERT INTO messages (message, username, timestamp, chatroom_id, uid) VALUES ( ?, ?, TIME_FORMAT(CURTIME(), '%h:%i:%s %p'), ?, ?)", [msg, username, chatid, uid], function (error, results) {
            if (error) throw error;
        });
    }
    catch (Exception) {
        con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?, TIME_FORMAT(CURTIME(), '%h:%i:%s %p'))", ["error", username], function (error, results) {
            if (error) throw error;
        });
    }
}

function getMessage(chatid) {
    con.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", [chatid], function (error, rows, results) {
        console.log("Emitting message");
        if (error) throw error;
        con.query("SELECT * FROM users WHERE users.name = ?", [rows[0].username], function (error, row) {
            if (row.length < 1) {
                io.emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, "http://www.moosen.im/images/favicon.png", rows[0].chatroom_id);
            } else {
                io.emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, row[0].profpic, rows[0].chatroom_id);
            }
			if (chatid == 1) {
				//send to Discord
                client.channels.get('329020807487553537').send(rows[0].username + ': ' + decodeURI(rows[0].message));
			}
        });
    });
}

function getMessageDiscord(un, msg, pic) {
    //io.emit('chat message', un, decodeURI(msg), moment().format('h:mm:ss a'), 0, pic, 1);
    con.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", [config.discordChannel], function (error, rows, results) {
        io.emit('chat message', un, decodeURI(rows[0].message), moment().format('h:mm:ss a'), rows[0].id, pic, config.discordChannel);
    });
}

//should be called when a user clicks on a different chatroom
function updatechat(roomid) {
    //TODO: set a user variable "current Room" to the value specified. 
    //reload page
    showLastMessages(10, 0, roomid);
}

function showLastMessages(num, sid, roomid) {
    con.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? ORDER BY id DESC LIMIT ?) sub ORDER BY  id ASC", [roomid, num], function (error, rows, results) {
        var m = getMotd(roomid);
        console.log(m);
        io.emit('motd update', m);
        // console.log("Getting messages...");
        if (error) throw error;
        try {
            rows.forEach(function (element) {
                con.query("SELECT * FROM users WHERE users.name = ?", [element.username], function (error, row) {
                    if (row[0]) {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, row[0].profpic, element.chatroom_id);
                       
                        
                    } else {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, "http://www.moosen.im/images/favicon.png", element.chatroom_id);
                    }
                });
            });
        }
        catch (e) {
            console.log("last message isn't working.");
        }
    });
}

function getChatrooms(sid, uid) {
    con.query("SELECT * FROM rooms WHERE serialid  IN  (SELECT room_id FROM room_users WHERE user_id = ?)", [uid], function (error, row) {
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