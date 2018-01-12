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
var util = require('util');
var messages = require('./routes/messages');
var app = express();
var app2 = express();

// http redirect
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

process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function (text) {
    var room = 1;
    var msg = util.inspect(text.trim());
    console.log('received data:', msg);
    sendMessage(msg.substr(1, msg.length - 2), '<span style="color:red">Admin</span>', 1, room);
    io.to(room).emit(getMessage(room, false, 'https://i.imgur.com/CgVX6vv.png'));
});

var io = require('socket.io')(server);

var chat = require('./chat.js');
var login = require('./login.js');
var voice = require('./voice.js');
var vr = require('./vr.js');
var voicetest = require('./voicetest.js');
var config = require('./config');

// object definitions 
var user = require('./user.js');

//Associating .js files with URLs
app.use(cors());
app.use(bodyParser.json());
app.use('/', chat);
app.use('/messages', messages);
app.use('/login', login);
app.use('/voicechat', voice);
app.use('/voicetest', voicetest);
app.use('/vr', vr);
app.use('/headliner_font_woff', express.static(__dirname + '/fonts/headliner/headliner.woff'));
app.use('/headliner_font_woff2', express.static(__dirname + '/fonts/headliner/headliner.woff2'));
app.use('/headliner_font_tff', express.static(__dirname + '/fonts/headliner/headliner.ttf'));
app.use('/productsans_font_woff', express.static(__dirname + '/fonts/productsans/productsans.woff'));
app.use('/productsans_font_woff2', express.static(__dirname + '/fonts/productsans/productsans.woff2'));
app.use('/productsans_font_tff', express.static(__dirname + '/fonts/productsans/productsans.ttf'));
app.use('/monofonto_font_woff', express.static(__dirname + '/fonts/monofonto/monofonto.woff'));
app.use('/monofonto_font_woff2', express.static(__dirname + '/fonts/monofonto/monofonto.woff2'));
app.use('/monofonto_font_tff', express.static(__dirname + '/fonts/monofonto/monofonto.ttf'));
app.use('/certs', express.static(__dirname + '/certs'));
app.use('/.well-known/pki-validation/', express.static(__dirname + '/.well-known/pki-validation/'));
app.use("/images", express.static(__dirname + '/images'));
app.use("/uploads", express.static(__dirname + '/uploads'));
app.use("/fonts", express.static(__dirname + '/fonts'));
app.use("/sounds", express.static(__dirname + '/sounds'));
app.use("/js", express.static(__dirname + '/js'));
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
    console.log(msg.channel.id);
    // client.user.setAvatar('./images/discord.png');
    if (msg.channel.id == config.discord.moosen && !(msg.author.bot)) {
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
        sendMessage(newmsg, msg.author.username, 1, config.discord.sendChannel);
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

var channels = {};
var sockets = {};

//Main socket.io listener
io.sockets.on('connection', function (socket) {

    socket.channels = {};
    sockets[socket.id] = socket;

    console.log("["+ socket.id + "] connection accepted");
    socket.on('disconnect', function () {
        for (var channel in socket.channels) {
            part(channel);
        }
        console.log("["+ socket.id + "] disconnected");
        delete sockets[socket.id];
    });


    socket.on('join', function (conf) {
        console.log("["+ socket.id + "] join ", conf);
        var channel = conf.channel;
        var userdata = conf.userdata;

        if (channel in socket.channels) {
            console.log("["+ socket.id + "] ERROR: already joined ", channel);
            return;
        }

        if (!(channel in channels)) {
            channels[channel] = {};
        }

        for (id in channels[channel]) {
            channels[channel][id].emit('addPeer', {'peer_id': socket.id, 'should_create_offer': false});
            socket.emit('addPeer', {'peer_id': id, 'should_create_offer': true});
        }

        channels[channel][socket.id] = socket;
        socket.channels[channel] = channel;
    });

    function part(channel) {
        console.log("["+ socket.id + "] part ");

        if (!(channel in socket.channels)) {
            console.log("["+ socket.id + "] ERROR: not in ", channel);
            return;
        }

        delete socket.channels[channel];
        delete channels[channel][socket.id];

        for (id in channels[channel]) {
            channels[channel][id].emit('removePeer', {'peer_id': socket.id});
            socket.emit('removePeer', {'peer_id': id});
        }
    }
    socket.on('part', part);
    //vr State Code
    class player {
        constructor(uid, x, y, color) {
            this.uid = uid;
            this.x = x;
            this.y = y;
            this.color = color;
        }
         setPos(x, y) {
            this.x = x;
            this.y = y;
    }
    }
    var players = [];
    socket.on('vrconnection', function (uid, x, y) {
        players += new player(uid, x, y, 'red');

        console.log(uid);
       
        socket.emit('vrUpdatePos',players);
    });
    socket.on('vrSyncPos', (uid, x, y) => {
        players.forEach(i =>{
            if (i.uid == uid) {
                i.setPos(x, y);
                
            }

        });


    });

    socket.on('relayICECandidate', function(conf) {
        var peer_id = conf.peer_id;
        var ice_candidate = conf.ice_candidate;
        console.log("["+ socket.id + "] relaying ICE candidate to [" + peer_id + "] ", ice_candidate);

        if (peer_id in sockets) {
            sockets[peer_id].emit('iceCandidate', {'peer_id': socket.id, 'ice_candidate': ice_candidate});
        }
    });

    socket.on('relaySessionDescription', function(conf) {
        var peer_id = conf.peer_id;
        var session_description = conf.session_description;
        console.log("["+ socket.id + "] relaying session description to [" + peer_id + "] ", session_description);

        if (peer_id in sockets) {
            sockets[peer_id].emit('sessionDescription', {'peer_id': socket.id, 'session_description': session_description});
        }
    });


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
        console.log("room: " + event.file.meta.room);
        curroom = event.file.meta.room;
        console.log('upload     socket.id: ' + socket.id);
        for (var i = 0; i < online.length; i++) { 

            console.log(i + ': ' + online[i].sid);
            if (online[i].sid == socket.id) {
                console.log("New message from " + online[i].name);
                un = online[i].name;
                uid = online[i].uid;
            }
        }
        console.log(event.file.name + ' successfully saved.');
        console.log(event.file.meta.filetype);
        var msg;
        if (/video/g.test(event.file.meta.filetype)) {
            msg = '<div class="video-container"><iframe style="width:64vw; height:36vw" src="https://moosen.im/uploads/' + event.file.name + '" frameborder="0" allowfullscreen></iframe></div>';
        } else if (/image/g.test(event.file.meta.filetype)) {
            msg = '<img class="materialboxed responsive-img" style="height:20vh" src="https://moosen.im/uploads/' + event.file.name + '" alt="Mighty Moosen">';
        } else {
            msg = '<a href="/uploads/' + event.file.name + '" download="' + event.file.name + '">' + event.file.name + '</a>'
        }
        sendMessage(msg, un, uid, curroom);
        var pic;
        io.emit(getMessage(curroom, true, pic));
        if (curroom == config.discord.sendChannel) {
            client.channels.get(config.discord.moosen).send({ files: [('./uploads/' + event.file.name)] });
        }
    });

    //Login process and recording
    socket.on('login message', function (displayName, email, photoURL, uid) {
        //console.log("uid: " + uid + " displayName: " + displayName + " socket.id: " + socket.id);
        var lastRoom;
       
        con.query("SELECT * FROM users WHERE uid = ?", [uid], function (error, rows, results) {
            if (rows[0] == null) {
                //If no user, add to DB
                con.query("INSERT INTO users (name, uid, profpic, isonline, totalmessages, email) VALUES ( ?, ?, ?, 1,1,?)", [displayName, uid, photoURL, email], function (error, results) {
                    lastRoom = 1;
                    //add to general and report bug chatrooms
                    addToRoom(email, 1, 0);
                    addToRoom(email, 16, 0);
                    if (error) console.log(error);

                });
            } else {
                lastRoom = rows[0].curroom;
            }
            //redundancy for testing only. 
            lastRoom = rows[0].curroom;
          //  var User = new user(displayName, email, photoURL, uid);
           
            addOnline(displayName, email, photoURL, uid, socket.id, lastRoom);
            io.to(lastRoom).emit('changerooms', lastRoom, uid);
        });

        con.query("UPDATE users SET profpic = ? WHERE uid = ?", [photoURL, uid]);
        con.query("UPDATE users SET name = ? WHERE uid = ?", [displayName, uid]);
        console.log("login message should trigger");
      
        io.to(lastRoom).emit('login', displayName, email, photoURL, uid, lastRoom);
    });

    //Test emit
    socket.on('ping', function (name) {
        console.log('pong');
        console.log(Object.keys(io.sockets.sockets));
    });

    //Emit for when on mobile and needing the logs
    socket.on('log', function (message) {
        console.log(socket.id + ': ' + message);
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
            var lastRoom;
            con.query("SELECT * FROM users WHERE uid = ?", [uid], function (error, rows, results) {
                lastRoom = rows[0].curroom;
                showLastMessages(10, socket.id, rows[0].curroom);
            });
            console.log('Replacing ' + online[match].sid + ' with ' + socket.id + ', match = ' + match);
            online[match].sid = socket.id;
            //Show the last 10 messages to the user
            
        } else {
            io.to(socket.id).emit('retreat');
        }
    });

    socket.on('changerooms', function (roomid, uid) {
        console.log("changed rooms" + roomid + " " + uid);
        con.query("UPDATE users SET curroom = ? WHERE uid = ?", [roomid,uid]);
        socket.join(roomid);
        showLastMessages(10, socket.id, roomid)
        var room = io.sockets.adapter.rooms[roomid];
        console.log("room user amount: " + room.length);
        

    });

    //for adduser function. Email is entered by the user, rid is caled from chat.html, isAdmin should just default to 0 for now. 
    socket.on('adduser', function (email, rid, isAdmin) {
        addToRoom(email, rid, 0);
    });


    socket.on('searchusers', function (email) {
        //maybe make this variable do something...
        var id = searchUsers(email);
    });

    // socket.on('disconnect', function () {
    //     console.log(socket.id + ' disconnected');
    //     io.to(socket.id).emit('disconnect');
    // });

    socket.on('retPre', function (previous, roomid) {
        showPreviousMessages(10, previous, socket.id, roomid)
    });

    //Generic message emit
    socket.on('chat message', function (msg, curroom) {
        var ogMsg = msg;
        var un = 'Error - Username Not Found';
        var uid;
        var pic;
        var isEmbed = false;
        var send = true;
        console.log('chat message       socket.id: ' + socket.id);
        for (var i = 0; i < online.length; i++) {
            console.log(i + ': ' + online[i].sid);
            if (online[i].sid == socket.id) {
                console.log("New message from " + online[i].name);
                un = online[i].name;
                uid = online[i].uid;
            }
        }
        if (un == 'Error - Username Not Found') {
            io.to(socket.id).emit('retreat');
            console.log('Retreating ' + socket.id);
        } else {
            console.log('message: ' + msg);
            if (msg.substr(0, 1) == "!") {
                console.log('Is a command');
                var command = /\S*/i.exec(msg.substr(1));
                config.regex.commands.forEach(function (element) {
                    if (command[0] == element.command) {
                        console.log('element.action: ' + element.action);
                        switch (element.action) {
                            case "replace":
                                msg = element.message;
                                break;
                            case "replaceEmbed":
                                msg = element.message;
                                isEmbed = true;
                                break;
                            case "function":
                                send = false;
                                var message = /(\S*)\s((\S*\s?)*)/i.exec(msg.substr(1));
                                var newmsg;
                                if (message) newmsg = message[2];
                                var params = [socket, un, uid, curroom, newmsg];
                                var fn = userRegexParse[command[0]];
                                if (typeof fn === "function") {
                                    console.log('Is function');
                                    fn.apply(null, params);
                                }
                                break;
                            default:
                                break;
                        }
                    }
                });
            } else {
                config.regex.matches.forEach(function (element) {
                    var re = new RegExp(element.regex, 'ig');
                    if (re.test(msg)) {
                        switch (element.action) {
                            case "replace":
                                msg = msg.replace(re, element.message);
                                break;
                            case "replaceWhole":
                                msg = element.message;
                                break;
                            case "replaceEmbed":
                                msg = msg.replace(re, element.message);
                                isEmbed = true;
                                break;
                            case "respond":
                                sendMessage(msg, un, uid, curroom);
                                io.to(curroom).emit(getMessage(curroom, isEmbed));
                                msg = element.message;
                                un = 'Automod';
                                if (element.un) un = element.un;
                                if (element.pic) pic = element.pic;
                                uid = '1';
                                break;
                            default:
                                break;
                        }
                    }
                });
            }
            if (send) {
                sendMessage(msg, un, uid, curroom);
                io.to(curroom).emit(getMessage(curroom, isEmbed, pic));
                console.log(`config.discord.sendChannel = ${config.discord.sendChannel}`);
                if (isEmbed && curroom == config.discord.sendChannel) {
                    sendToDiscord(un, ogMsg);
                }
            }
        }
    });
});

var userRegexParse = {};
userRegexParse.motd = function (socket, un, uid, curroom, msg) {
    console.log('In motd');
    con.query('UPDATE rooms SET motd = ? WHERE serialid = ?', [msg, curroom], function (error) { if (error) throw error; });
    getMotd(curroom);
}
userRegexParse.createroom = function (socket, un, uid, curroom, msg) {
    console.log('In createroom');
    createChatroom(msg, uid);
}
userRegexParse.refreshconfig = function (socket, un, uid, curroom, msg) {
    delete require.cache[require.resolve('./config')];
    config = require('./config');
    console.log('In refreshconfig');
}
userRegexParse.configchange = function (socket, un, uid, curroom, msg) {
    config.test = msg;
    console.log('In configchange');
}

var connect = config.db;
var con;

function getMotd(roomid) {
    con.query('SELECT * FROM rooms WHERE serialid = ?', [roomid], function (error, row) {
        if (error) console.log(error);
        io.to(roomid).emit('motd update', row[0].motd, roomid);
    });
}

function singleGetMotd(roomid, sid) {
    con.query('SELECT * FROM rooms WHERE serialid = ?', [roomid], function (error, row) {
        if (error) console.log(error);
        io.to(sid).emit('motd update', row[0].motd, roomid);
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
    var nameString = "room" + chatid;
    // console.log(`In sendMessage, chatid: ${chatid}\nmsg: ${message}`);
    var msg = encodeURI(message);
    try {
        con.query("INSERT INTO ?? (message, username, timestamp, roomid, uid) VALUES ( ?, ?, TIME_FORMAT(CURTIME(), '%h:%i:%s %p'), ?, ?)", [nameString, msg, username, chatid, uid], function (error, results) {
            if (error) throw error;
        });
    } catch (Exception) {
        con.query("INSERT INTO ?? (message, username, timestamp) VALUES ( ?, ?, TIME_FORMAT(CURTIME(), '%h:%i:%s %p'))", [nameString, "error", username], function (error, results) {
            if (error) throw error;
        });
    }
}

function getMessage(chatid, isEmbed, pic) {
    console.log(`In getMessage, chatid ${chatid}`);
    var nameString = "room" + chatid;
    con.query("SELECT * FROM ( SELECT * FROM ?? ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", [nameString], function (error, rows, results) {
        console.log("Emitting message");
        console.log(rows);
        if (error) throw error;
        con.query("SELECT * FROM users WHERE users.name = ?", [rows[0].username], function (error, row) {
            if (pic) {
                io.to(chatid).emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, pic, rows[0].roomid);
            } else if (row.length < 1) {
                io.to(chatid).emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, "https://www.moosen.im/images/favicon.png", rows[0].roomid);
            } else {
                io.to(chatid).emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, row[0].profpic, rows[0].roomid);
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
    msg = /@moosen/ig[Symbol.replace](msg, '<@&277296480245514240>');
    msg = /@noah/ig[Symbol.replace](msg, '<@!207214113191886849>');
    msg = /@hunter/ig[Symbol.replace](msg, '<@!89758327621296128>');
    msg = /@nick/ig[Symbol.replace](msg, '<@!185934787679092736>');
    msg = /@kyle/ig[Symbol.replace](msg, '<@!147143598301773824>');
    msg = /@lane/ig[Symbol.replace](msg, '<@!81913971979849728>');
    msg = /:fn:/ig[Symbol.replace](msg, '<:fNoah1:318887883291230219> <:fNoah2:318887791096365056> <:fNoah3:318887914530668544>');
    await sleep(100);
    client.channels.get(config.discord.moosen).send(un + ': ' + msg);
}

function getMessageDiscord(un, msg, pic) {
    var nameString = "room" + config.discord.sendChannel;
    con.query("SELECT * FROM ( SELECT * FROM ?? ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", [nameString], function (error, rows, results) {
        io.emit('chat message', un, decodeURI(rows[0].message), moment().format('h:mm:ss a'), rows[0].id, pic, config.discord.sendChannel);
    });
}

//should be called when a user clicks on a different chatroom
function updatechat(roomid) {
    //TODO: set a user variable "current Room" to the value specified. 
    //reload page
    showLastMessages(10, 0, roomid);
}

function getCurroom(uid) {


    //return roomid
}

function showLastMessages(num, sid, roomid) {
    var nameString = "room" + roomid;
    console.log(nameString);
    con.query("SELECT * FROM ( SELECT * FROM ?? ORDER BY id DESC LIMIT ?) sub ORDER BY  id ASC", [nameString, num], function (error, rows, results) {
        singleGetMotd(roomid, sid);
        if (error) throw error;
        try {
            rows.forEach(function (element) {
                con.query("SELECT * FROM users WHERE users.name = ?", [element.username], function (error, row) {
                    if (row[0]) {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, row[0].profpic, element.roomid);
                    } else {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, "https://www.moosen.im/images/favicon.png", element.roomid);
                    }
                });
            });
        } catch (e) {
            console.log("last message isn't working.");
        }
    });
}

function showPreviousMessages(num, previous, sid, roomid) {
    var nameString = "room" + roomid;
    console.log(nameString);
    con.query("SELECT * FROM ( SELECT * FROM ?? WHERE id < ? ORDER BY id DESC LIMIT ?) sub ORDER BY id ASC", [nameString, previous, num], function (error, rows, results) {
      //  console.log(`Getting previous ${num} messages from ${previous} in room ${roomid}...`);
        if (error) throw error;
        try {
            rows.forEach(function (element) {
                con.query("SELECT * FROM users WHERE users.name = ?", [element.username], function (error, row) {
                    if (row[0]) {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, row[0].profpic, element.roomid);
                    } else {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, "https://www.moosen.im/images/favicon.png", element.roomid);
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
    try {
        var name = n;
        // get availible chatrooms from user SELECT room_id FROM room_users WHERE user_id = ? [user.uid]
        con.query("INSERT INTO rooms (name) VALUES(?)", [name], function (error) { });
        con.query("SELECT * FROM ( SELECT * FROM rooms ORDER BY serialid DESC LIMIT 1) sub ORDER BY  serialid ASC", function (error, row, results) {
            con.query("INSERT INTO room_users VALUES(?,?,1)", [row[0].serialid, uid]);

            con.query("CREATE TABLE ?? (id int AUTO_INCREMENT PRIMARY KEY, message text, username VARCHAR(100),timestamp VARCHAR(32),roomid int, uid VARCHAR(100))", ["room" + row[0].serialid]);
        });
    }
    catch (e){
        console.log('error creating new room: ' + e);
    }
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