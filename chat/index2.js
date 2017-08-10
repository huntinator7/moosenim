var express = require('express');
var app = express();
var http = require('http').Server(express);
var io = require('socket.io').listen(app.listen(80));
var mysql = require('mysql');
var siofu = require("socketio-file-upload");

var chat = require('./chat.js');
var login = require('./login.js');

//both index.js and things.js should be in same directory
app.use('/chat', chat);
app.use('/login', login);
// app.use('/index', index);

io.sockets.on('connection', function (socket) {
    console.log('client connect');
    socket.on('echo', function (data) {
        io.sockets.emit('message', data);
    });
});



console.log('listening on *:80');
/*
io.on('connection', function (socket) {
    console.log('a user connected');

    var uploader = new siofu();
    uploader.dir = __dirname + '/user_uploads';
    uploader.listen(socket);

    uploader.on("start", function (event) {
        console.log('Starting upload to ' + event.file.name + ' of type ' + event.file.meta.filetype + ' to ' + uploader.dir);
    });
    uploader.on("saved", function (event) {
        console.log(event.file.name + ' successfully saved.');
        var user = online.filter(function (obj) {
            return obj.id === socket.id;
        })[0];
        if (user === null) {
            user = { name: "AutoMod" };
        }
        var msg;
        if (event.file.meta.filetype.match('image.*')) {
            msg = '<img class="materialboxed responsive-img initialized" src="http://moosen.im/user_uploads/' + event.file.name + '" alt="Mighty Moosen">';
        } else if (event.file.meta.filetype.match('video.*')) {
            msg = event.file.name + '<br><video class="responsive-video" width="100%" controls><source src="http://moosen.im/user_uploads/' + event.file.name + '" type="' + event.file.meta.filetype + '">Your browser does not support HTML5 video.</video>';
        } else if (event.file.meta.filetype.match('audio.*')) {
            msg = event.file.name + '<br><audio controls><source src="http://moosen.im/user_uploads/' + event.file.name + '" type="' + event.file.meta.filetype + '">Your browser does not support the audio element.</audio>';
        } else {
            msg = 'Cannot display this file type';
        }

        sendMessage(msg, user.name);
        io.emit(getMessage(1));
    });

    socket.on('chat message', function (msg, un) {

        console.log('un: ' + un + ' | message: ' + msg);

        if (msg.indexOf("lag") > -1) {
            sendMessage("I love Rick Astley!", 'notch');
        } else if (msg.indexOf("*autistic screeching*") > -1) {
            sendMessage(msg, un);
            io.emit(getMessage(1));
            sendMessage(un + " is a feckin normie <strong>REEEEEEEEEEEEEEEEEEEEEEEEEEEEEE</strong>", "AutoMod");
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
            var res = msg.substring(ind + 8, ind + 19);
            var newmsg = '<div class="video-container"><iframe width="100%" src="//www.youtube.com/embed/' + res + '?rel=0" frameborder="0" allowfullscreen></iframe></div>';
            sendMessage(newmsg, un);
        } else if (/http\S*youtu\.be\S*/.test(msg)) {
            var ind = msg.search(/youtu\.be\//);
            var res = msg.substring(ind + 9, ind + 20);
            var newmsg = '<div class="video-container"><iframe width="100%" src="//www.youtube.com/embed/' + res + '?rel=0" frameborder="0" allowfullscreen></iframe></div>';
            sendMessage(newmsg, un);
        } else if (/\S*twitch\.tv\S*/.test(msg)) {
            console.log('Is Twitch message');
            if (/\S*clips\S*/.test(msg)) { // Twitch clips
                console.log('Is Twitch clip');
                var ind = msg.search(/\.tv\//);
                var res = msg.substring(ind + 4);
                console.log(newmsg);
                var newmsg = '<iframe style="width:64vw; height:36vw" src="https://clips.twitch.tv/embed?clip=' + res + '" scrolling="no" frameborder="0" autoplay=true muted=true allowfullscreen=true></iframe>';
                sendMessage(newmsg, un);
            } else if (/\S*videos\S*/.test(msg)) { // Twitch VODs
                console.log('Is Twitch VOD');
                var ind = msg.search(/videos\//);
                var res = msg.substring(ind + 7);
                var newmsg = '<div id="' + res + '"></div><script type="text/javascript"> var player = new Twitch.Player("' + res + '", { width: 100%, video: "' + res + '",});player.setVolume(0.5);</script>'
                console.log(newmsg);
                sendMessage(newmsg, un);
            } else { // Twitch channel/stream
                console.log('Is Twitch channel/stream');
                var ind = msg.search(/\.tv\//);
                var res = msg.substring(ind + 4);
                var newmsg = '<div id="' + res + '"></div><script type="text/javascript"> var player = new Twitch.Player("' + res + '", { width:100% channel:"' + res + '"}); player.setVolume(0.5); </script>'
                console.log(newmsg);
                sendMessage(newmsg, un);
            }
        } else {
            sendMessage(msg, un);
        }

        io.emit(getMessage(1));

    });

    socket.on('login message', function (un, email, photo, uid) {
        console.log('un: ' + un + ' logged in');
        console.log(un + 's email ' + email);
        showLastMessages(10, socket.id);
        if (un != 'ping timeout') {
            addOnline(un, email, photo, uid);
        }
        socket.broadcast.emit('login message', un);
    });

    socket.on('local message', function (un, num) {
        console.log(un + ' accessing db');
        showLastMessages(num, socket.id);
    });

    socket.on('disconnect', function (un) {
        console.log('user disconnected, id ' + socket.id);
        removeOnline(socket.id);
        // if (un != 'ping timeout') {
        //     socket.broadcast.emit('logout message', un);
        // }
    });
});
/*
