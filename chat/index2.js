var fs = require('fs');
var https = require('https');

var express = require('express');
var cookie = require('cookie');
var app = express();

var options = {
    key: fs.readFileSync('./certs/domain.key'),
    cert: fs.readFileSync('./certs/www.moosen.im.crt')
}
var serverPort = 443;

var server = https.createServer(options, app);
var io = require('socket.io')(server);

server.listen(serverPort, function () {
    console.log('server up and running at %s port', serverPort);
});

// var http = require('http').Server(express);
// var io = require('socket.io').listen(app.listen(80));
var mysql = require('mysql');
var siofu = require("socketio-file-upload");

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
app.use('/certs', express.static(__dirname + '/certs'));
app.use('/.well-known/pki-validation/', express.static(__dirname + '/.well-known/pki-validation/'));
app.use("/images", express.static(__dirname + '/images'));
app.use("/uploads", express.static(__dirname + '/uploads'));
app.use("/sounds", express.static(__dirname + '/sounds'));
app.use("/siofu", express.static(__dirname + '/node_modules/socketio-file-upload'));

//Discord login with token from dev page
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
        // msg.channel.members.forEach(function (element) {
        //     try {
        //         console.log(`Username: ${element.displayName}`);
        //         console.log(`ID: ${element.user.id}`);
        //     } catch (e) {
        //         console.log('User didn\'t work');
        //     }
        // });
        var newmsg = msg.content;
        if (/<@(&?277296480245514240|!?207214113191886849|!?89758327621296128|!?185934787679092736|!?147143598301773824|!?81913971979849728)>/g.test(newmsg)) {
            console.log('here');
            newmsg = /<@&?277296480245514240>/g[Symbol.replace](newmsg, '@Moosen');
            newmsg = /<@!?207214113191886849> /g[Symbol.replace](newmsg, '@Noah');
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
//329020807487553537 - moosen-im
//319938734135050240 - dev-test

//Main socket.io listener
io.sockets.on('connection', function (socket) {
    var uploader = new siofu();
    uploader.dir = __dirname + '/uploads';
    uploader.listen(socket);

    uploader.on("start", function (event) {
        console.log('Starting upload to ' + event.file.name + ' of type ' + event.file.meta.filetype + ' to ' + uploader.dir);
    });

    uploader.on("saved", function (event) {
        var un = 'Error - Username Not Found';
        var uid;
        var curroom = 1;
        console.log('chat message       socket.id: ' + socket.id);
        users.forEach(function (user) {
            if (user.sid == socket.id) {
                con.query("SELECT * FROM users WHERE uid = ?", [user.uid], function (error, rows, results) {
                    un = rows[0].name;
                });
                console.log("New message from " + un);
                uid = user.uid;
                user.curroom = curroom;
            }
        });
        console.log(event.file.name + ' successfully saved.');
        var msg = '<img class="materialboxed responsive-img" style="height:20vh" src="https://moosen.im/uploads/' + event.file.name + '" alt="Mighty Moosen">';
        sendMessage(msg, un, uid, curroom);
        io.emit(getMessage(curroom, true));
        client.channels.get(config.discord.moosen).send({ files: [('./uploads/' + event.file.name)] });
    });

    // console.log('Sockets: ' + Object.keys(io.sockets.sockets));
    //Login process and recording
    socket.on('login message', function (displayName, email, photoURL, uid, token) {
        console.log("uid: " + uid + " displayName: " + displayName + " socket.id: " + socket.id + " token: " + token);
        con.query("SELECT * FROM users WHERE uid = ?", [uid], function (error, rows, results) {
            if (rows[0] == null) {
                //If no user, add to DB
                con.query("INSERT INTO users (name, uid, profpic, isonline, totalmessages, email) VALUES ( ?, ?, ?, 1,1,?)", [displayName, uid, photoURL, email], function (error, results) {
                    if (error) console.log(error);
                });
            } else {
                con.query("SELECT profpic FROM users WHERE uid = ?", [uid], function (error, row, results) {
                    if (row[0].profpic != photoURL) {
                        con.query("UPDATE users SET profpic = ? ", [photoURL]);
                    }
                });
            }
            // addOnline(displayName, email, photoURL, uid, socket.id, 1);
            addToUsers(uid, token, socket.id, 1);
        });
        io.emit('login', displayName, email, photoURL, uid);
    });

    // Workaround for different login page
    // socket.on('associate', function (uid) {
    //     console.log('Associating ' + uid + ' with ' + socket.id);
    //     var match;
    //     //Replace the last entry in online[] with the current socket being checked. Prevents overwrite of multiple devices for single user.
    //     for (var i = 0; i < online.length; i++) {
    //         if (online[i].uid == uid) {
    //             match = i;
    //         }
    //     }
    //     if (match) {
    //         io.to(socket.id).emit('roomlist', getChatrooms(socket.id, uid));
    //         console.log('Replacing ' + online[match].sid + ' with ' + socket.id + ', match = ' + match);
    //         online[match].sid = socket.id;
    //         //Show the last 10 messages to the user
    //         showLastMessages(10, socket.id, 1);
    //     } else {
    //         io.to(socket.id).emit('retreat');
    //     }
    // });

    //Workaround for different login page
    socket.on('tokenAuth', function (token) {
        var tokenObj = cookie.parse(token);
        console.log('Authenticating token ' + tokenObj.token + ' for socket ' + socket.id);
        var match;
        //Replace the last entry in online[] with the current socket being checked. Prevents overwrite of multiple devices for single user.
        users.forEach(function (user, ind) {
            if (user.token == tokenObj.token) match = ind;
        });
        if (match) {
            io.to(socket.id).emit('roomlist', getChatrooms(socket.id, users[match].uid));
            console.log('Replacing ' + users[match].sid + ' with ' + socket.id + ', match = ' + match);
            users[match].sid = socket.id;
            //Show the last 10 messages to the user
            showLastMessages(10, socket.id, 1);
        } else {
            io.to(socket.id).emit('retreat');
        }
    });

    socket.on('changerooms', function (roomid) {
        showLastMessages(10, socket.id, roomid)
    });

    //for adduser function. Email is entered by the user, rid is caled from chat.html, isAdmin should just default to 0 for now. 
    socket.on('adduser', function (email, rid, isAdmin) {
        addToRoom(email, rid, 0);
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
        // for (var i = 0; i < online.length; i++) {
        //     console.log(i + ': ' + online[i].sid);
        //     if (online[i].sid == socket.id) {
        //         console.log("New message from " + online[i].name);
        //         un = online[i].name;
        //         uid = online[i].uid;
        //         online[i].curroom = curroom;
        //     }
        // }
        users.forEach(function (user) {
            if (user.sid == socket.id) {
                con.query("SELECT * FROM users WHERE uid = ?", [user.uid], function (error, rows, results) {
                    un = rows[0].name;
                });
                console.log("New message from " + un);
                uid = user.uid;
                user.curroom = curroom;
            }
        });
        if (un == 'Error - Username Not Found') {
            io.to(socket.id).emit('retreat');
            console.log('Retreating ' + socket.id);
        } else {
            console.log('message: ' + msg);
            if (msg.indexOf("lag") > -1) {
                sendMessage("I love Rick Astley!", 'notch', uid, curroom);
            } else if (msg.indexOf("*autistic screeching*") > -1) {
                sendMessage(msg, un, uid, curroom);
                io.emit(getMessage(curroom, isEmbed));
                sendMessage(un + " is a feckin normie <strong>REEEEEEEEEEEEEEEEEEEEEEEEEEEEEE</strong>", "AutoMod", uid, curroom);
                // } else if (msg.indexOf("!myrooms") > -1) {
                //     sendMessage("your rooms: " + getrooms(uid).toString() + " curroom" + curroom, un, uid, curroom);
            } else if (msg.indexOf("!createroom") > -1) {
                createChatroom("newRoom", uid);
                send = false;
            } else if (msg.indexOf("!pepe") == 0) {
                isEmbed = true;
                sendMessage("<img style=\"height:10vh\" src='https://tinyurl.com/yd62jfua' alt=\"Mighty Moosen\">", un, uid, curroom)
            } else if (/nigger/ig.test(msg)) {
                var newmsg = /nigger/ig[Symbol.replace](msg, 'Basketball American');
                sendMessage(newmsg, un + ', casual racist', uid, curroom);
            } else if (msg.indexOf("<script") > -1) {
                sendMessage("Stop right there, criminal scum! You violated my mother!", "AutoMod", uid, curroom);
            } else if (/^http\S*\.(jpg|gif|png|svg)\S*/.test(msg)) {
                isEmbed = true;
                sendMessage(msg + '<br><img class="materialboxed responsive-img" src="' + msg + '" alt="' + msg + '">', un, uid, curroom);
            } else if (/http\S*youtube\S*/.test(msg)) {
                var ind = msg.search(/watch\?v=\S*/);
                var res = msg.substring(ind + 8, ind + 19);
                var newmsg = '<div class="video-container"><iframe width="100%" src="//www.youtube.com/embed/' + res + '?rel=0" frameborder="0" allowfullscreen></iframe></div>';
                isEmbed = true;
                sendMessage(newmsg, un, uid, curroom);
            } else if (/http\S*youtu\.be\S*/.test(msg)) {
                var ind = msg.search(/youtu\.be\//);
                var res = msg.substring(ind + 9, ind + 20);
                var newmsg = '<div class="video-container"><iframe width="100%" src="//www.youtube.com/embed/' + res + '?rel=0" frameborder="0" allowfullscreen></iframe></div>';
                isEmbed = true;
                sendMessage(newmsg, un, uid, curroom);
            } else if (/\S*twitch\.tv\S*/.test(msg)) {
                console.log('Is Twitch message');
                if (/\S*clips\S*/.test(msg)) { // Twitch clips
                    console.log('Is Twitch clip');
                    var ind = msg.search(/\.tv\//);
                    var res = msg.substring(ind + 4);
                    console.log(newmsg);
                    var newmsg = '<iframe style="width:64vw; height:36vw" src="https://clips.twitch.tv/embed?clip=' + res + '" scrolling="no" frameborder="0" autoplay=false muted=true allowfullscreen=true></iframe>';
                    isEmbed = true;
                    sendMessage(newmsg, un, uid, curroom);
                } else if (/\S*videos\S*/.test(msg)) { // Twitch VODs
                    console.log('Is Twitch VOD');
                    var ind = msg.search(/videos\//);
                    var res = msg.substring(ind + 7);
                    var newmsg = '<div id="' + res + '"></div><script type="text/javascript"> var player = new Twitch.Player("' + res + '", { width: 100%, video: "' + res + '",});player.setVolume(0.5);</script>'
                    isEmbed = true;
                    console.log(newmsg);
                    sendMessage(newmsg, un, uid, curroom);
                } else { // Twitch channel/stream
                    console.log('Is Twitch channel/stream');
                    var ind = msg.search(/\.tv\//);
                    var res = msg.substring(ind + 4);
                    var newmsg = '<div id="' + res + '"></div><script type="text/javascript"> var player = new Twitch.Player("' + res + '", { width:100% channel:"' + res + '"}); player.setVolume(0.5); </script>'
                    isEmbed = true;
                    console.log(newmsg);
                    sendMessage(newmsg, un, uid, curroom);
                }
            }
            else if (msg.indexOf("!motd") > -1) {
                send = false;
                var newmsg = msg.substring(5, msg.length);
                io.emit('motd update', newmsg);
                con.query('UPDATE rooms SET motd = ? WHERE serialid = ?', [newmsg, curroom], function (error) { if (error) throw error; });
            }
            else {
                console.log('In chat message, curroom: ' + curroom);
                sendMessage(msg, un, uid, curroom);
            }
            if (send) {
                io.emit(getMessage(curroom, isEmbed));
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
        io.emit('motd update', row[0].motd);
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

// var online = [];
// function addOnline(un, email, photo, uid, sock, room, allrooms) {
//     var user = {
//         name: un,
//         uid: uid,
//         photo: photo,
//         email: email,
//         sid: sock,
//         curroom: room//,
//         //allrooms: allrooms
//     };
//     online.push(user);
// }

var users = [];
function addToUsers(uid, token, sock, room) {
    var user = {
        uid: uid,
        token: token,
        sid: sock,
        curroom: room
    };
    users.push(user);
    // console.log(user);
    // console.log(users);
}

function sendMessage(message, username, uid, chatid) {
    console.log(`In sendMessage, chatid: ${chatid}\nmsg: ${message}`);
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
                io.emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, "https://www.moosen.im/images/favicon.png", rows[0].chatroom_id);
            } else {
                io.emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, row[0].profpic, rows[0].chatroom_id);
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

function showLastMessages(num, sid, roomid) {
    con.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? ORDER BY id DESC LIMIT ?) sub ORDER BY  id ASC", [roomid, num], function (error, rows, results) {
        var m = getMotd(roomid);
        console.log(m);
        io.emit('motd update', m);
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