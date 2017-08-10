var express = require('express');
var router = express.Router();
var http = require('http').Server(express);
var io = require('socket.io')(http);
var mysql = require('mysql');

router.get('/', function(req, res){
   res.sendFile(__dirname + '/chat.html');
});
router.post('/', function(req, res){
   res.send('POST route on chat.');
});

//export this router to use in our index.js
module.exports = router;
//
// io.on('connection', function (socket) {
//     console.log('A user connected - chat.js');
//     var uploader = new siofu();
//     uploader.dir = __dirname + '/user_uploads';
//     uploader.listen(socket);
//
//     uploader.on("start", function(event){
//         console.log('Starting upload to ' + event.file.name + ' of type ' + event.file.meta.filetype + ' to ' + uploader.dir);
//     });
//     uploader.on("saved", function(event){
//         console.log(event.file.name + ' successfully saved.');
//         var user = online.filter(function( obj ) {
//             return obj.id === socket.id;
//         })[0];
//         if (user === null) {
//             user = { name:"AutoMod" };
//         }
//         var msg;
//         if (event.file.meta.filetype.match('image.*')) {
//             msg = '<img class="materialboxed responsive-img initialized" src="http://moosen.im/user_uploads/' + event.file.name + '" alt="Mighty Moosen">';
//         } else if (event.file.meta.filetype.match('video.*')) {
//             msg = event.file.name + '<br><video class="responsive-video" width="100%" controls><source src="http://moosen.im/user_uploads/' + event.file.name + '" type="' + event.file.meta.filetype + '">Your browser does not support HTML5 video.</video>';
//         } else if (event.file.meta.filetype.match('audio.*')) {
//             msg = event.file.name + '<br><audio controls><source src="http://moosen.im/user_uploads/' + event.file.name + '" type="' + event.file.meta.filetype + '">Your browser does not support the audio element.</audio>';
//         } else {
//             msg = 'Cannot display this file type';
//         }
//
//         sendMessage(msg, user.name);
//         io.emit(getMessage(1));
//     });
//
//     socket.on('chat message', function (msg, un) {
//
//         console.log('un: ' + un + ' | message: ' + msg);
//
//         if (msg.indexOf("lag") > -1) {
//             sendMessage("I love Rick Astley!", 'notch');
//         } else if (msg.indexOf("*autistic screeching*") > -1) {
//             sendMessage(msg, un);
//             io.emit(getMessage(1));
//             sendMessage(un +" is a feckin normie <strong>REEEEEEEEEEEEEEEEEEEEEEEEEEEEEE</strong>", "AutoMod");
//         } else if (msg.indexOf("!pepe") == 0) {
//             sendMessage("<img style=\"height:10vh\" src='https://tinyurl.com/yd62jfua' alt=\"Mighty Moosen\">", un)
//         } else if (msg.indexOf("nigger") > -1) {
//             var newmsg = msg.replace("nigger", "Basketball American");
//             sendMessage(newmsg, un + ', casual racist');
//         } else if (msg.indexOf("<script") > -1) {
//             sendMessage("Stop right there, criminal scum! You violated my mother!", "AutoMod");
//         } else if (/^http\S*\.(jpg|gif|png|svg)$/.test(msg)) {
//             sendMessage('<img class="materialboxed responsive-img initialized" src="' + msg + '" alt="' + msg + '">', un);
//         } else if (/http\S*youtube\S*/.test(msg)) {
//             var ind = msg.search(/watch\?v=\S*/);
//             var res = msg.substring(ind+8, ind+19);
//             var newmsg = '<div class="video-container"><iframe width="100%" src="//www.youtube.com/embed/' + res + '?rel=0" frameborder="0" allowfullscreen></iframe></div>';
//             sendMessage(newmsg, un);
//         } else if (/http\S*youtu\.be\S*/.test(msg)) {
//             var ind = msg.search(/youtu\.be\//);
//             var res = msg.substring(ind+9, ind+20);
//             var newmsg = '<div class="video-container"><iframe width="100%" src="//www.youtube.com/embed/' + res + '?rel=0" frameborder="0" allowfullscreen></iframe></div>';
//             sendMessage(newmsg, un);
//         } else if (/\S*twitch\.tv\S*/.test(msg)) {
//             console.log('Is Twitch message');
//             if (/\S*clips\S*/.test(msg)) { // Twitch clips
//                 console.log('Is Twitch clip');
//                 var ind = msg.search(/\.tv\//);
//                 var res = msg.substring(ind+4);
//                 console.log(newmsg);
//                 var newmsg = '<iframe style="width:64vw; height:36vw" src="https://clips.twitch.tv/embed?clip=' + res + '" scrolling="no" frameborder="0" autoplay=true muted=true allowfullscreen=true></iframe>';
//                 sendMessage(newmsg, un);
//             } else if (/\S*videos\S*/.test(msg)) { // Twitch VODs
//                 console.log('Is Twitch VOD');
//                 var ind = msg.search(/videos\//);
//                 var res = msg.substring(ind+7);
//                 var newmsg = '<div id="' + res + '"></div><script type="text/javascript"> var player = new Twitch.Player("' + res + '", { width: 100%, video: "' + res + '",});player.setVolume(0.5);</script>'
//                 console.log(newmsg);
//                 sendMessage(newmsg, un);
//             } else { // Twitch channel/stream
//                 console.log('Is Twitch channel/stream');
//                 var ind = msg.search(/\.tv\//);
//                 var res = msg.substring(ind+4);
//                 var newmsg = '<div id="' + res + '"></div><script type="text/javascript"> var player = new Twitch.Player("' + res + '", { width:100% channel:"' + res + '"}); player.setVolume(0.5); </script>'
//                 console.log(newmsg);
//                 sendMessage(newmsg, un);
//             }
//         } else {
//             sendMessage(msg, un);
//         }
//
//         io.emit(getMessage(1));
//
//     });
//
//     socket.on('login message', function (un,email,photo,uid) {
//         console.log('un: ' + un + ' logged in');
//         console.log(un + 's email ' + email);
//         showLastMessages(10, socket.id);
//         if (un != 'ping timeout') {
//             addOnline(un,email,photo,uid);
//         }
//         socket.broadcast.emit('login message', un);
//     });
//
//     socket.on('local message', function (un, num) {
//         console.log(un + ' accessing db');
//         showLastMessages(num, socket.id);
//     });
//
//     socket.on('disconnect', function (un) {
//         console.log('user disconnected, id ' + socket.id);
//         removeOnline(socket.id);
//         // if (un != 'ping timeout') {
//         //     socket.broadcast.emit('logout message', un);
//         // }
//     });
// });
//
// //connection variable
// var con = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: "raspberry",
//     database: "moosenim"
// });
//
// //connects to mysql database
// con.connect(function (err) {
//     if (err) throw err;
//     console.log("Connected!");
// });
//
// var online = [];
//
// function addOnline(un,email,photo,uid) {
//     var user = {
//         name:un,
//         id: uid,
//         photo: photo,
//         email:email
//     };
//     online.push(user);
//     console.log('Adding ' + un + ', id ' + uid);
//     updateOnline();
// }
//
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
//
// function sendMessage(message, username) {
//     try {
//         con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?, CURTIME())", [message, username], function (error, results) {
//             if (error) throw error;
//         });
//     }
//     catch (Exception) {
//         con.query("INSERT INTO messages (message, username, timestamp) VALUES ( ?, ?, CURTIME())", ["error", username], function (error, results) {
//             if (error) throw error;
//         });
//     }
// }
//
// function getMessage() {
//     con.query("SELECT * FROM ( SELECT * FROM messages ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", function (error, rows, results) {
//         console.log("emitting message");
//         if (error) throw error;
//         io.emit('chat message', rows[0].username, rows[0].message, rows[0].timestamp, rows[0].id);
//     });
// }
//
// function showLastMessages(num, id) {
//     con.query("SELECT * FROM ( SELECT * FROM messages ORDER BY id DESC LIMIT ?) sub ORDER BY  id ASC", [num], function (error, rows, results) {
//         console.log("getting messages...");
//         if (error) throw error;
//         for (var i = 0; i < num; i++) {
//             io.to(id).emit('chat message', rows[i].username, rows[i].message, rows[i].timestamp, rows[i].id);
//         }
//     });
// }
