var fs = require('fs');
var http = require('http');
var https = require('https');
var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var siofu = require("socketio-file-upload");
var moment = require('moment');
var Discord = require("discord.js");
var cors = require('cors');
var messages = require('./routes/messages');
var app = express();
var app2 = express();

//http redirect
app2.all('*', ensureSecure); // at top of routing calls

function ensureSecure(req, res, next) {
    res.redirect('https://www.moosen.im'); // express 4.x
}

var options = {
    key: fs.readFileSync('./certs/domain.key'),
    cert: fs.readFileSync('./certs/www.moosen.im.crt')
}
var httpServer = http.createServer(app2).listen(80, function () {
    console.log('http redirect server up and running at port 80');
});
var server = https.createServer(options, app).listen(443, function () {
    console.log('server up and running at port 443');
});

var io = require('socket.io')(server);

var chat = require('./chat.js');
var login = require('./login.js');
var config = require('./config');

//Associating .js files with URLs
app.use(cors());
app.use(bodyParser.json());
app.use('/', chat);
app.use('/messages', messages);
app.use('/login', login);
app.use('/certs', express.static(__dirname + '/certs'));
app.use('/.well-known/pki-validation/', express.static(__dirname + '/.well-known/pki-validation/'));
app.use("/images", express.static(__dirname + '/images'));
app.use("/uploads", express.static(__dirname + '/uploads'));
app.use("/sounds", express.static(__dirname + '/sounds'));
app.use("/siofu", express.static(__dirname + '/node_modules/socketio-file-upload'));

//Discord login with token from dev page
var client = new Discord.Client();
client.login(config.token);

//Login message for Discord
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

//Any time a Discord message is sent, bot checks to see if in moosen-im channel and if not sent by bot. If so, it adds the message to the DB and emits it
client.on('message', msg => {
    // client.user.setAvatar('./images/discord.png');
    if (msg.channel.id == config.discord.moosen && !(msg.author.bot)) {
        console.log('msg.channel.id == config.discord.moosen');
        var newmsg = msg.content;
        if (/<@(&?277296480245514240|!?207214113191886849|!?89758327621296128|!?185934787679092736|!?147143598301773824|!?81913971979849728)>/g.test(newmsg)) {
            console.log('here');
            newmsg = /<@&?277296480245514240>/g[Symbol.replace](newmsg, '@Moosen');
            newmsg = /<@!?207214113191886849>/g[Symbol.replace](newmsg, '@Noah');
            newmsg = /<@!?89758327621296128>/g[Symbol.replace](newmsg, '@Hunter');
            newmsg = /<@!?185934787679092736>/g[Symbol.replace](newmsg, '@Nick');
            newmsg = /<@!?147143598301773824>/g[Symbol.replace](newmsg, '@Kyle');
            newmsg = /<@!?81913971979849728>/g[Symbol.replace](newmsg, '@Lane');
        }
        sendMessage(newmsg, msg.author.username, 1, 1);
        getMessageDiscord(msg.author.username, newmsg, msg.author.avatarURL);
        if (msg.attachments.array().length) {
            try {
                console.log(msg.attachments.first().url);
                var message = '<img class="materialboxed responsive-img" style="height:20vh" src="' + msg.attachments.first().url + '" alt="Error - Image not found">';
                sendMessage(message, msg.author.username, config.discord.uid, config.discord.sendChannel);
                getMessageDiscord(msg.author.username, message, msg.author.avatarURL);
            } catch (e) {
                console.log('Message attachment has no url');
            }
        }
        console.log(msg.author.username + ': ' + msg.content);
        console.log('Newmsg: ' + newmsg);
    }
});

//Main socket.io listener
io.sockets.on('connection', function (socket) {
    var uploader = new siofu();
    uploader.dir = __dirname + '/uploads';
    uploader.listen(socket);
    socket.join(1);


    uploader.on("start", function (event) {
        console.log('Starting upload to ' + event.file.name + ' of type ' + event.file.meta.filetype + ' to ' + uploader.dir);
    });

    uploader.on("saved", function (event) {
        var un = 'Error - Username Not Found';
        var uid;
        var curroom = 1;
        console.log('upload     socket.id: ' + socket.id);
        for (var i = 0; i < online.length; i++) {
            console.log(i + ': ' + online[i].sid);
            if (online[i].sid == socket.id) {
                console.log("New message from " + online[i].name);
                un = online[i].name;
                uid = online[i].uid;
                curroom = online[i].curroom;
            }
        }
        console.log(event.file.name + ' successfully saved.');
        console.log(event.file.meta.filetype);
        var msg;
        if(/video/g.test(event.file.meta.filetype)){
            msg = '<div class="video-container"><iframe style="width:64vw; height:36vw" src="https://moosen.im/uploads/'+ event.file.name + '" frameborder="0" allowfullscreen></iframe></div>';
        } else if (/image/g.test(event.file.meta.filetype)) {
            msg = '<img class="materialboxed responsive-img" style="height:20vh" src="https://moosen.im/uploads/' + event.file.name + '" alt="Mighty Moosen">';
        } else {
            msg = '<a href="/uploads/' + event.file.name + '" download="' + event.file.name + '">' + event.file.name + '</a>'
        }
        sendMessage(msg, un, uid, curroom);
        io.emit(getMessage(curroom, true));
        client.channels.get(config.discord.moosen).send({ files: [('./uploads/' + event.file.name)] });
    });

    //Login process and recording
    socket.on('login message', function (displayName, email, photoURL, uid) {
        console.log("uid: " + uid + " displayName: " + displayName + " socket.id: " + socket.id);
        con.query("SELECT * FROM users WHERE uid = ?", [uid], function (error, rows, results) {
            if (rows[0] == null) {
                //If no user, add to DB
                con.query("INSERT INTO users (name, uid, profpic, isonline, totalmessages, email) VALUES ( ?, ?, ?, 1,1,?)", [displayName, uid, photoURL, email], function (error, results) {
                    if (error) console.log(error);
                });
            } else {
               
            }
            
            addOnline(displayName, email, photoURL, uid, socket.id, 1);
        });
        con.query("UPDATE users SET profpic = ? WHERE uid = ?", [photoURL, uid]);
        con.query("UPDATE users SET name = ? WHERE uid = ?", [displayName, uid]);
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
        socket.join(roomid);
        showLastMessages(10, socket.id, roomid)
        var room = io.sockets.adapter.rooms[roomid];
        console.log("room user amount: " + room.length);
        setCurroom(roomid,socket.id);

    });

    //for adduser function. Email is entered by the user, rid is caled from chat.html, isAdmin should just default to 0 for now. 
    socket.on('adduser', function (email, rid, isAdmin) {
        addToRoom(email, rid, 0);
    });
    socket.on('addroom', function (name) {
        console.log("new room name is " + name);
        createChatroom(name, "104635400788300812127");
    });

    socket.on('searchusers', function (email) {
        //maybe make this variable do something...
        var id = searchUsers(email);
    });

    socket.on('retPre', function (previous, roomid) {
        showPreviousMessages(10, previous, socket.id, roomid)
    });

    //Generic message emit
    socket.on('chat message', function (msg, curroom) {
        var un = 'Error - Username Not Found';
        var uid;
        var isEmbed = false;
        var send = true;
        console.log('chat message       socket.id: ' + socket.id);
        for (var i = 0; i < online.length; i++) {
            console.log(i + ': ' + online[i].sid);
            if (online[i].sid == socket.id) {
                console.log("New message from " + online[i].name);
                un = online[i].name;
                uid = online[i].uid;
                online[i].curroom = curroom;
            }
        }
        if (un == 'Error - Username Not Found') {
            io.to(socket.id).emit('retreat');
            console.log('Retreating ' + socket.id);
        } else {
            console.log('message: ' + msg);
            // var commands = config.commands;
            // commands.forEach(function (element) {
            //     console.log(element);
            // });
            // var commandsEmbed = config.commandsEmbedImage;
            // commandsEmbed.forEach(function (element) {
            //     console.log(element);
            // });
            var matches = config.regex.matches;
            console.log('regex: ' + matches);
            matches.forEach(function (element) {
                console.log(element[1]);
            });
            if (send) {
                sendMessage(msg, un, uid, curroom);
                io.to(curroom).emit(getMessage(curroom, isEmbed));
                if (isEmbed) sendToDiscord(un, msg);
            }
        }
    });
});

var connect = config.db;
var con;

function getMotd(roomid) {
    con.query('SELECT * FROM rooms WHERE serialid = ?', [roomid], function (error, row) {
        console.log("motd is" + row[0].motd + " roomid = " + roomid);
        // io.emit('motd update', row[0].motd);
        return row[0].motd;
    });
}

function handleDisconnect() {
    con = mysql.createConnection(connect);

    con.connect(function (err) {
        if (err) {
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000);
        } else {
            console.log("Connected!");
        }
    });

    con.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();
        } else {
            throw err;
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
   // console.log(`In sendMessage, chatid: ${chatid}\nmsg: ${message}`);
    var msg = encodeURI(message);
    try {
        con.query("INSERT INTO messages (message, username, timestamp, chatroom_id, uid) VALUES ( ?, ?, TIME_FORMAT(CURTIME(), '%h:%i:%s %p'), ?, ?)", [msg, username, chatid, uid], function (error, results) {
            if (error) throw error;
        });
    } catch (Exception) {
        con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?, TIME_FORMAT(CURTIME(), '%h:%i:%s %p'))", ["error", username], function (error, results) {
            if (error) throw error;
        });
    }
}

function getMessage(chatid, isEmbed) {
    con.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", [chatid], function (error, rows, results) {
        console.log("Emitting message");
        if (error) throw error;
        con.query("SELECT * FROM users WHERE users.name = ?", [rows[0].username], function (error, row) {
            if (row.length < 1) {
                io.to(chatid).emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, "https://www.moosen.im/images/favicon.png", rows[0].chatroom_id);
            } else {
                io.to(chatid).emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, row[0].profpic, rows[0].chatroom_id);
            }
            if (chatid == config.discord.sendChannel && !isEmbed) {
                //send to Discord
                sendToDiscord(rows[0].username, decodeURI(rows[0].message));
            }
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendToDiscord(un, msg) {
    if (/@((m|M)oosen|(n|N)oah|(l|L)ane|(h|H)unter|(n|N)ick|(k|K)yle)(?!\S)/g.test(msg)) {
        console.log('sendToDiscord str detected');
        msg = /@(m|M)oosen/g[Symbol.replace](msg, '<@&277296480245514240>');
        msg = /@(n|N)oah/g[Symbol.replace](msg, '<@!207214113191886849>');
        msg = /@(h|H)unter/g[Symbol.replace](msg, '<@!89758327621296128>');
        msg = /@(n|N)ick/g[Symbol.replace](msg, '<@!185934787679092736>');
        msg = /@(k|K)yle/g[Symbol.replace](msg, '<@!147143598301773824>');
        msg = /@(l|L)ane/g[Symbol.replace](msg, '<@!81913971979849728>');
    }
    await sleep(100);
    client.channels.get(config.discord.moosen).send(un + ': ' + msg);
}

function getMessageDiscord(un, msg, pic) {
    con.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", [config.discord.sendChannel], function (error, rows, results) {
        io.emit('chat message', un, decodeURI(rows[0].message), moment().format('h:mm:ss a'), rows[0].id, pic, config.discord.sendChannel);
    });
}

//should be called when a user clicks on a different chatroom
function updatechat(roomid) {
    //TODO: set a user variable "current Room" to the value specified. 
    //reload page
    showLastMessages(10, 0, roomid);
}

//these function will keep track of the last room the user was in, and return them to that room when they relog. 
function setCurroom(roomid,uid) {

}
function getCurroom(uid) {


//return roomid
}
function showLastMessages(num, sid, roomid) {
    con.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? ORDER BY id DESC LIMIT ?) sub ORDER BY  id ASC", [roomid, num], function (error, rows, results) {
        var m = getMotd(roomid);
        console.log(m);
        io.to(sid).emit('motd update', m, roomid);
        if (error) throw error;
        try {
            rows.forEach(function (element) {
                con.query("SELECT * FROM users WHERE users.name = ?", [element.username], function (error, row) {
                    if (row[0]) {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, row[0].profpic, element.chatroom_id);
                    } else {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, "https://www.moosen.im/images/favicon.png", element.chatroom_id);
                    }
                });
            });
        } catch (e) {
            console.log("last message isn't working.");
        }
    });
}

function showPreviousMessages(num, previous, sid, roomid) {
    con.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? AND id < ? ORDER BY id DESC LIMIT ?) sub ORDER BY id ASC", [roomid, previous, num], function (error, rows, results) {
        console.log(`Getting previous ${num} messages from ${previous} in room ${roomid}...`);
        if (error) throw error;
        try {
            rows.forEach(function (element) {
                con.query("SELECT * FROM users WHERE users.name = ?", [element.username], function (error, row) {
                    if (row[0]) {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, row[0].profpic, element.chatroom_id);
                    } else {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, "https://www.moosen.im/images/favicon.png", element.chatroom_id);
                    }
                    console.log(element.id);
                });
            });
        } catch (e) {
            console.log("Previous message isn't working.");
        }
    });
}

function getChatrooms(sid, uid) {
    con.query("SELECT * FROM rooms WHERE serialid IN (SELECT room_id FROM room_users WHERE user_id = ?)", [uid], function (error, row) {
        io.to(sid).emit('roomlist', row);
    });
}

function createChatroom(n, uid) {
    var roomid;
    var name = n;
    // get availible chatrooms from user SELECT room_id FROM room_users WHERE user_id = ? [user.uid]
    con.query("INSERT INTO rooms (name) VALUES(?)", [name], function (error) { });
    con.query("SELECT * FROM ( SELECT * FROM rooms ORDER BY serialid DESC LIMIT 1) sub ORDER BY  serialid ASC", function (error, row, results) {
        con.query("INSERT INTO room_users VALUES(?,?,1)", [row[0].serialid, uid]);
    });
}

function searchUsers(email) {
    con.query("SELECT * FROM users WHERE email = ?", [email], function (error, rows) {
        return rows[0].uid;
    });
}

function addToRoom(email, roomid, isAdmin) {
    con.query("SELECT * FROM users WHERE email = ?", [email], function (error, rows, result) {
        try {
            rows.forEach(function (element) {
                con.query("INSERT INTO room_users VALUES(?,?,?)", [roomid, element.uid, isAdmin]);
                console.log("user " + element.uid + " was added to room " + roomid)
            });
        } catch (e) {
            console.log(e);
            console.log("user not found");
        }
    });
}