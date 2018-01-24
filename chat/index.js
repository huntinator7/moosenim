var fs = require('fs')
var http = require('http')
var https = require('https')
var express = require('express')
var bodyParser = require('body-parser')
var mysql = require('mysql')
var siofu = require("socketio-file-upload")
var moment = require('moment')
var Discord = require("discord.js")
var cors = require('cors')
var util = require('util')
var messages = require('./routes/messages')
var app = express()
var app2 = express()
var passportSocketIO = require('passport.socketio')
var passport = require('passport')
var strategy = require('passport-google-oauth').OAuth2Strategy
const redis = require("redis")
const session = require('express-session')
var redisStore = require('connect-redis')(session)
var client = redis.createClient()
const sessionStore = new redisStore()
var cookieParser2 = require('cookie-parser')()
var uuid = require('uuid/v1')()

//--GENERAL HTTP----\\
app2.all('*', ensureSecure) // at top of routing calls

function ensureSecure(req, res, next) {
    res.redirect('https://www.moosen.im') // express 4.x
}

var options = {
    key: fs.readFileSync('./certs/domain.key'),
    cert: fs.readFileSync('./certs/www.moosen.im.crt')
}
var httpServer = http.createServer(app2).listen(80, function () {
    console.log('http redirect server up and running at port 80')
})
var server = https.createServer(options, app).listen(443, function () {
    console.log('server up and running at port 443')
})

//----ADMIN MESSAGING----\\
process.stdin.resume()
process.stdin.setEncoding('utf8')

process.stdin.on('data', function (text) {
    var room = 1
    var msg = util.inspect(text.trim())
    console.log('received data:', msg)
    sendMessage(msg.substr(1, msg.length - 2), '<span style="color:red">Admin</span>', 1, room)
    io.to(room).emit(getMessage(room, false, 'https://i.imgur.com/CgVX6vv.png'))
})

var io = require('socket.io')(server)

//----PASSPORT----\\
passport.use(new strategy({
    clientID: '333736509560-id8si5cbuim26d3e67s4l7oscjfsakat.apps.googleusercontent.com',
    clientSecret: 'ZCMQ511PhvMEQqozMGd5bmRH',
    callbackURL: 'https://moosen.im/auth/google/callback'
},
    function (accessToken, refreshToken, profile, cb) {
        //  console.log("id "+profile.id+"name "+profile.name+"displayName "+profile.displayName+"email "+profile.email+"gender "+profile.gender)
        loginUser(profile.id, profile.displayName, profile.photos[0].value, profile.emails[0].value)

        return cb(null, profile)
    }
))
app.use(session({
    key: 'connect.sid',
    secret: 'richardnixon',
    resave: true,
    saveUninitialized: true,
    store: new redisStore({
        host: 'localhost',
        port: 6379,
        client: client,
        ttl: 260
    })
}))

function onAuthorizeSuccess(data, accept) {
    console.log('success connection to socket.io')
    console.log(data)
    accept()
}

function onAuthorizeFail(data, message, error, accept) {
    if (error) {
        throw new Error(message)
    }
    console.log('failed connection to socket.io:', message)
    // this error will be sent to the user as a special error-package
    // see: http://socket.io/docs/client-api/#socket > error-object
}
app.use(passport.initialize())
app.use(passport.session())
io.use(passportSocketIO.authorize({
    key: 'connect.sid',
    secret: 'richardnixon',
    store: new redisStore({
        host: 'localhost',
        port: 6379,
        client: client,
        ttl: 260
    }),
    passport: passport,
    cookieParser: require('cookie-parser'),

}))
passport.serializeUser(function (user, cb) {
    cb(null, user)
})

passport.deserializeUser(function (user, cb) {

    // loginUser(user.id)
    cb(null, user)

})

//----ROUTES AND EXPRESS----\\
var routes = require('./routes/routes.js')
var config = require('./config')

// object definitions
var user = require('./js/user.js')

//Associating .js files with URLs
app.use(cors())
app.use(bodyParser.json())
app.use('/', routes)
app.use('/messages', messages)
app.use('/headliner_font_woff', express.static(__dirname + '/fonts/headliner/headliner.woff'))
app.use('/headliner_font_woff2', express.static(__dirname + '/fonts/headliner/headliner.woff2'))
app.use('/headliner_font_tff', express.static(__dirname + '/fonts/headliner/headliner.ttf'))
app.use('/productsans_font_woff', express.static(__dirname + '/fonts/productsans/productsans.woff'))
app.use('/productsans_font_woff2', express.static(__dirname + '/fonts/productsans/productsans.woff2'))
app.use('/monofonto_font_woff', express.static(__dirname + '/fonts/monofonto/monofonto.woff'))
app.use('/monofonto_font_woff2', express.static(__dirname + '/fonts/monofonto/monofonto.woff2'))
app.use('/monofonto_font_tff', express.static(__dirname + '/fonts/monofonto/monofonto.ttf'))
app.use('/certs', express.static(__dirname + '/certs'))
app.use('/.well-known/pki-validation/', express.static(__dirname + '/.well-known/pki-validation/'))
app.use("/images", express.static(__dirname + '/images'))
app.use("/uploads", express.static(__dirname + '/uploads'))
app.use("/fonts", express.static(__dirname + '/fonts'))
app.use("/sounds", express.static(__dirname + '/sounds'))
app.use("/js", express.static(__dirname + '/js'))
app.use("/html", express.static(__dirname + '/html'))
app.use("/css", express.static(__dirname + '/css'))
app.use("/siofu", express.static(__dirname + '/node_modules/socketio-file-upload'))



//----AUTH----\\
app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/plus.profile.emails.read', 'https://www.googleapis.com/auth/plus.login', 'profile', 'email']
    }))

app.get('/auth/google/callback',
    passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/plus.profile.emails.read', 'https://www.googleapis.com/auth/plus.login', 'profile', 'email'],
        failureRedirect: '/login'
    }),
    function (req, res) {
        res.redirect('/')
    }
)



//----LOGIN----\\
function loginUser(uid, displayName, photoURL, email) {
    console.log("login user: " + uid)
    con.query("SELECT * FROM users WHERE uid = ?", [uid], function (error, rows, results) {
        if (rows[0] == null) {
            //If no user, add to DB
            console.log('new user: ' + uid)
            con.query("INSERT INTO users (name, uid, profpic, isonline, totalmessages, email, curroom) VALUES ( ?, ?, ?, 1,1,?,1)", [displayName, uid, photoURL, email], function (error, results) {
                //add to general and report bug chatrooms
                addToRoom(email, 1, 0)
                addToRoom(email, 16, 0)
                if (error) console.log(error)

            })
        } else {
            displayName = rows[0].name
            photoURL = rows[0].profpic
            email = rows[0].email

            //  con.query("UPDATE users SET profpic = ? WHERE uid = ?", [photoURL, uid])
            //  con.query("UPDATE users SET name = ? WHERE uid = ?", [displayName, uid])
        }
    })
}

//----WEBRTC----\\
var channels = {}
var sockets = {}
var players = []

//----SOCKET.IO----\\
io.sockets.on('connection', function (socket) {
var testID = new uuid()
    console.log(testID)
    console.log('CONNECTED to socket io: ' + socket.request.user.displayName)
    con.query("SELECT room_id FROM room_users WHERE user_id = ?", [socket.request.user.id], function (error, rows, results) {
        rows.forEach(function (element) {
            io.to(element).emit('login', socket.request.user.displayName, socket.request.user.emails[0].value, socket.request.user.photos[0].value, socket.request.user.id)
        })
    })
    getChatrooms(socket.id, socket.request.user.id)
    con.query("SELECT * FROM users WHERE uid = ?", [socket.request.user.id], function (error, rows, results) {
        showLastMessages(10, socket.id, rows[0].curroom)
        socket.join(rows[0].curroom)
    })

    //----WEBRTC VOICE----\\
    socket.channels = {}
    sockets[socket.id] = socket

    console.log("[" + socket.id + "] connection accepted")
    socket.on('disconnect', function () {
        for (var channel in socket.channels) {
            part(channel)
        }
        console.log("[" + socket.id + "] disconnected")
        delete sockets[socket.id]
    })


    socket.on('join', function (conf) {
        console.log("[" + socket.id + "] join ", conf)
        var channel = conf.channel
        var userdata = conf.userdata

        if (channel in socket.channels) {
            console.log("[" + socket.id + "] ERROR: already joined ", channel)
            return
        }

        if (!(channel in channels)) {
            channels[channel] = {}
        }

        for (id in channels[channel]) {
            channels[channel][id].emit('addPeer', {
                'peer_id': socket.id,
                'should_create_offer': false
            })
            socket.emit('addPeer', {
                'peer_id': id,
                'should_create_offer': true
            })
        }

        channels[channel][socket.id] = socket
        socket.channels[channel] = channel
    })

    function part(channel) {
        console.log("[" + socket.id + "] part ")

        if (!(channel in socket.channels)) {
            console.log("[" + socket.id + "] ERROR: not in ", channel)
            return
        }

        delete socket.channels[channel]
        delete channels[channel][socket.id]

        for (id in channels[channel]) {
            channels[channel][id].emit('removePeer', {
                'peer_id': socket.id
            })
            socket.emit('removePeer', {
                'peer_id': id
            })
        }
    }
    socket.on('part', part)





    socket.on('relayICECandidate', function (conf) {
        var peer_id = conf.peer_id
        var ice_candidate = conf.ice_candidate
        console.log("[" + socket.id + "] relaying ICE candidate to [" + peer_id + "] ", ice_candidate)

        if (peer_id in sockets) {
            sockets[peer_id].emit('iceCandidate', {
                'peer_id': socket.id,
                'ice_candidate': ice_candidate
            })
        }
    })

    socket.on('relaySessionDescription', function (conf) {
        var peer_id = conf.peer_id
        var session_description = conf.session_description
        console.log("[" + socket.id + "] relaying session description to [" + peer_id + "] ", session_description)

        if (peer_id in sockets) {
            sockets[peer_id].emit('sessionDescription', {
                'peer_id': socket.id,
                'session_description': session_description
            })
        }
    })

    //----SOCKET.IO-FILE-UPLOAD----\\
    var uploader = new siofu()
    uploader.dir = __dirname + '/uploads'
    uploader.listen(socket)
    socket.join(1)


    uploader.on("start", function (event) {
        console.log('Starting upload to ' + event.file.name + ' of type ' + event.file.meta.filetype + ' to ' + uploader.dir)
    })

    uploader.on("saved", function (event) {
        var un = socket.request.user.displayName
        var uid = id
        console.log("room: " + event.file.meta.room)
        var curroom = event.file.meta.room
        console.log('upload     socket.id: ' + socket.id)
        console.log(event.file.name + ' successfully saved.')
        console.log(event.file.meta.filetype)
        var msg
        if (/video/g.test(event.file.meta.filetype)) {
            msg = '<div class="video-container"><iframe style="width:64vw height:36vw" src="https://moosen.im/uploads/' + event.file.name + '" frameborder="0" allowfullscreen></iframe></div>'
        } else if (/image/g.test(event.file.meta.filetype)) {
            msg = '<img class="materialboxed responsive-img" style="height:20vh" src="https://moosen.im/uploads/' + event.file.name + '" alt="Mighty Moosen">'
        } else {
            msg = '<a href="/uploads/' + event.file.name + '" download="' + event.file.name + '">' + event.file.name + '</a>'
        }
        sendMessage(msg, un, uid, curroom)
        var pic
        io.emit(getMessage(curroom, true, pic))
        if (curroom == config.discord.sendChannel) {
            client.channels.get(config.discord.moosen).send({
                files: [('./uploads/' + event.file.name)]
            })
        }
    })

    //----GENERAL SOCKET.IO----\\

    //Test emit
    socket.on('ping', function (name) {
        console.log('pong')
        console.log(Object.keys(io.sockets.sockets))
    })

    //Emit for when on mobile and needing the logs
    socket.on('log', function (message) {
        console.log(socket.id + ': ' + message)
    })

    socket.on('changerooms', function (roomid) {
        if (roomid == null) roomid = 1
        console.log("changed rooms" + roomid + " " + socket.request.user.id)
        con.query("UPDATE users SET curroom = ? WHERE uid = ?", [roomid, socket.request.user.id])
        console.log('Rooms: ' + io.sockets.adapter.rooms)
        socket.join(roomid)
        showLastMessages(10, socket.id, roomid)
        var room = io.sockets.adapter.rooms[roomid]
        console.log("room user amount: " + room.length)
    })

    //for adduser function. Email is entered by the user, rid is caled from chat.html, isAdmin should just default to 0 for now.
    socket.on('adduser', function (email, rid, isAdmin) {
        console.log('add user called')
        addToRoom(email, rid, 0)
    })


    socket.on('searchusers', function (email) {
        //maybe make this variable do something...
        var id = searchUsers(email)
    })

    socket.on('retPre', function (previous, roomid) {
        showPreviousMessages(10, previous, socket.id, roomid)
    })

    //----CHAT MESSAGE----\\
    socket.on('chat message', function (msg, curroom) {
        console.log(socket.rooms)
        var ogMsg = msg
        var un = socket.request.user.displayName
        var uid = socket.request.user.id
        var pic = socket.request.user.photos[0].value
        var isEmbed = false
        var send = true
        console.log('chat message       socket.id: ' + socket.id)
        if (!socket.request.user.id) {
            io.to(socket.id).emit('retreat')
            console.log('Retreating ' + socket.id)
        } else {
            console.log('message: ' + msg)
            if (msg.substr(0, 1) == "!") {
                console.log('Is a command')
                var command = /\S*/i.exec(msg.substr(1))
                config.regex.commands.forEach(function (element) {
                    if (command[0] == element.command) {
                        console.log('element.action: ' + element.action)
                        switch (element.action) {
                            case "replace":
                                msg = element.message
                                break
                            case "replaceEmbed":
                                msg = element.message
                                isEmbed = true
                                break
                            case "function":
                                send = false
                                var message = /(\S*)\s((\S*\s?)*)/i.exec(msg.substr(1))
                                var newmsg
                                if (message) newmsg = message[2]
                                var params = [socket, un, uid, curroom, newmsg]
                                var fn = userRegexParse[command[0]]
                                if (typeof fn === "function") {
                                    console.log('Is function')
                                    fn.apply(null, params)
                                }
                                break
                            default:
                                break
                        }
                    }
                })
            } else {
                config.regex.matches.forEach(function (element) {
                    var re = new RegExp(element.regex, 'ig')
                    if (re.test(msg)) {
                        switch (element.action) {
                            case "replace":
                                msg = msg.replace(re, element.message)
                                break
                            case "replaceWhole":
                                msg = element.message
                                break
                            case "replaceEmbed":
                                msg = msg.replace(re, element.message)
                                isEmbed = true
                                break
                            case "respond":
                                sendMessage(msg, un, uid, curroom)
                                io.to(curroom).emit(getMessage(curroom, isEmbed))
                                msg = element.message
                                un = 'Automod'
                                if (element.un) un = element.un
                                if (element.pic) pic = element.pic
                                uid = '1'
                                break
                            default:
                                break
                        }
                    }
                })
            }
            if (send) {
                sendMessage(msg, un, uid, curroom)
                io.to(curroom).emit(getMessage(curroom, isEmbed, pic))
                console.log(`config.discord.sendChannel = ${config.discord.sendChannel}`)
                if (isEmbed && curroom == config.discord.sendChannel) {
                    sendToDiscord(un, ogMsg)
                }
            }
        }
    })
})

//----USER COMMANDS----\\
var userRegexParse = {}
userRegexParse.motd = function (socket, un, uid, curroom, msg) {
    console.log('In motd')
    con.query('UPDATE rooms SET motd = ? WHERE serialid = ?', [msg, curroom], function (error) {
        if (error) throw error
    })
    getMotd(curroom)
}
userRegexParse.createroom = function (socket, un, uid, curroom, msg) {
    console.log('In createroom')
    createChatroom(msg, uid)
}
userRegexParse.refreshconfig = function (socket, un, uid, curroom, msg) {
    delete require.cache[require.resolve('./config')]
    config = require('./config')
    console.log('In refreshconfig')
}
userRegexParse.configchange = function (socket, un, uid, curroom, msg) {
    config.test = msg
    console.log('In configchange')
}

//----DISCORD----\\

//Discord login with token from dev page
var client = new Discord.Client()
client.login(config.token)

//Login message for Discord
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`)
})

//Any time a Discord message is sent, bot checks to see if in moosen-im channel and if not sent by bot. If so, it adds the message to the DB and emits it
client.on('message', msg => {
    // console.log(msg.channel.id)
    // client.user.setAvatar('./images/discord.png')
    if (msg.channel.id == config.discord.moosen && !(msg.author.bot)) {
        var newmsg = msg.content
        var unRegex = RegExp('<@!?([0-9]+)>')
        var unArray
        while ((unArray = unRegex.exec(newmsg)) !== null) {
            console.log(`Found ${unArray[1]}`)
            msg.channel.members.forEach(function (element) {
                if (element.user.id == unArray[1]) {
                    console.log(element.user.username + ' ' + unArray[0])
                    var repstr = '@' + element.user.username
                    var regex2 = new RegExp(unArray[0])
                    newmsg = newmsg.replace(regex2, repstr)
                }
            })
        }
        var roleRegex = RegExp('<@&([0-9]+)>')
        var roleArray
        while ((roleArray = roleRegex.exec(newmsg)) !== null) {
            console.log(`Found ${roleArray[1]}`)
            msg.guild.roles.forEach(function (element) {
                if (element.id == roleArray[1]) {
                    console.log(element.name + ' ' + roleArray[0])
                    var repstr = '@' + element.name
                    var regex2 = new RegExp(roleArray[0])
                    newmsg = newmsg.replace(regex2, repstr)
                }
            })
        }
        // <@&319362702197915648>
        var emoteRegex = RegExp('<:.*?:([0-9]+)>')
        var emoteArray
        while ((emoteArray = emoteRegex.exec(newmsg)) !== null) {
            console.log(`Found ${emoteArray[1]} in ${emoteArray[0]}`)
            var repstr = '<img class="mm-discord-emoji" src="https://cdn.discordapp.com/emojis/' + emoteArray[1] + '.png" alt="Error - Image not found">'
            var regex2 = new RegExp(emoteArray[0])
            newmsg = newmsg.replace(regex2, repstr)
        }

        if (msg.attachments.array().length) {
            try {
                console.log(msg.attachments.first().url)
                newmsg += '<img class="img-fluid" style="height:20vh" src="' + msg.attachments.first().url + '" alt="Error - Image not found">'

            } catch (e) {
                console.log('Message attachment has no url')
            }
        }
        sendMessage(newmsg, msg.author.username, config.discord.uid, config.discord.sendChannel)
        getMessageDiscord(msg.author.username, newmsg, msg.author.avatarURL)
        console.log(msg.author.username + ': ' + msg.content)
        console.log('Newmsg: ' + newmsg)
    }
})

//----MYSQL DB----\\

var connect = config.db
var con

function getMotd(roomid) {
    con.query('SELECT * FROM rooms WHERE serialid = ?', [roomid], function (error, row) {
        if (error) console.log(error)
        io.to(roomid).emit('motd update', row[0].motd, roomid)
    })
}

function singleGetMotd(roomid, sid) {
    con.query('SELECT * FROM rooms WHERE serialid = ?', [roomid], function (error, row) {
        if (error) console.log(error)
        io.to(sid).emit('motd update', row[0].motd, roomid)
    })
}

function handleDisconnect() {
    con = mysql.createConnection(connect)

    con.connect(function (err) {
        if (err) {
            console.log('error when connecting to db:', err)
            setTimeout(handleDisconnect, 2000)
        } else {
            console.log("Connected!")
        }
    })

    con.on('error', function (err) {
        console.log('db error', err)
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect()
        } else {
            throw err
        }
    })
}

handleDisconnect()

//----MESSAGE HANDLING----\\

function sendMessage(message, username, uid, chatid) {
    var nameString = "room" + chatid
    if (chatid == null) chatid = 1
    // console.log(`In sendMessage, chatid: ${chatid}\nmsg: ${message}`)
    var msg = encodeURI(message)
    try {
        con.query("INSERT INTO ?? (message, username, timestamp, roomid, uid) VALUES ( ?, ?, TIME_FORMAT(CURTIME(), '%h:%i:%s %p'), ?, ?)", [nameString, msg, username, chatid, uid], function (error, results) {
            if (error) throw error
        })
    } catch (Exception) {
        con.query("INSERT INTO ?? (message, username, timestamp) VALUES ( ?, ?, TIME_FORMAT(CURTIME(), '%h:%i:%s %p'))", [nameString, "error", username], function (error, results) {
            if (error) throw error
        })
    }
}

function getMessage(chatid, isEmbed, pic) {
    console.log(`In getMessage, chatid ${chatid}`)
    var nameString = "room" + chatid
    con.query("SELECT * FROM ( SELECT * FROM ?? ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", [nameString], function (error, rows, results) {
        console.log("Emitting message")
        console.log(rows)
        if (error) throw error
        con.query("SELECT * FROM users WHERE users.name = ?", [rows[0].username], function (error, row) {
            if (pic) {
                io.to(chatid).emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, pic, rows[0].roomid)
            } else if (row.length < 1) {
                io.to(chatid).emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, "https://www.moosen.im/images/favicon.png", rows[0].roomid)
            } else {
                io.to(chatid).emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, row[0].profpic, rows[0].roomid)
            }
            if (chatid == config.discord.sendChannel && !isEmbed) {
                //send to Discord
                sendToDiscord(rows[0].username, decodeURI(rows[0].message))
            }
        })
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function sendToDiscord(un, msg) {
    msg = /@moosen/ig[Symbol.replace](msg, '<@&277296480245514240>')
    msg = /@noah/ig[Symbol.replace](msg, '<@!207214113191886849>')
    msg = /@hunter/ig[Symbol.replace](msg, '<@!89758327621296128>')
    msg = /@nick/ig[Symbol.replace](msg, '<@!185934787679092736>')
    msg = /@kyle/ig[Symbol.replace](msg, '<@!147143598301773824>')
    msg = /@lane/ig[Symbol.replace](msg, '<@!81913971979849728>')
    msg = /:fn:/ig[Symbol.replace](msg, '<:fNoah1:318887883291230219> <:fNoah2:318887791096365056> <:fNoah3:318887914530668544>')
    await sleep(100)
    client.channels.get(config.discord.moosen).send(un + ': ' + msg)
}

function getMessageDiscord(un, msg, pic) {
    var nameString = "room" + config.discord.sendChannel
    con.query("SELECT * FROM ( SELECT * FROM ?? ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", [nameString], function (error, rows, results) {
        io.emit('chat message', un, decodeURI(rows[0].message), moment().format('h:mm:ss a'), rows[0].id, pic, config.discord.sendChannel)
    })
}

//should be called when a user clicks on a different chatroom
function updatechat(roomid) {
    //TODO: set a user variable "current Room" to the value specified.
    //reload page
    showLastMessages(10, 0, roomid)
}

function getCurroom(uid) {


    //return roomid
}

//----PREVIOUS MESSAGES----\\

function showLastMessages(num, sid, roomid) {
    if (roomid == null) roomid = 1
    var nameString = "room" + roomid
    console.log("show last messages for " + nameString)
    con.query("SELECT * FROM ( SELECT * FROM ?? ORDER BY id DESC LIMIT ?) sub ORDER BY  id ASC", [nameString, num], function (error, rows, results) {
        singleGetMotd(roomid, sid)
        if (error) throw error
        try {
            rows.forEach(function (element) {
                con.query("SELECT * FROM users WHERE users.name = ?", [element.username], function (error, row) {
                    if (row[0]) {
                        if (row[0].profpic) {
                            io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, row[0].profpic, element.roomid)
                        } else {
                            io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, "https://www.moosen.im/images/favicon.png", element.roomid)
                        }
                    } else {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, "https://www.moosen.im/images/favicon.png", element.roomid)
                    }
                })
            })
        } catch (e) {
            console.log("last message isn't working.")
        }
    })
}

function showPreviousMessages(num, previous, sid, roomid) {
    var nameString = "room" + roomid
    console.log(nameString)
    con.query("SELECT * FROM ( SELECT * FROM ?? WHERE id < ? ORDER BY id DESC LIMIT ?) sub ORDER BY id ASC", [nameString, previous, num], function (error, rows, results) {
        //  console.log(`Getting previous ${num} messages from ${previous} in room ${roomid}...`)
        if (error) throw error
        try {
            rows.forEach(function (element) {
                con.query("SELECT * FROM users WHERE users.name = ?", [element.username], function (error, row) {
                    if (row[0]) {
                        if (row[0].profpic) {
                            io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, row[0].profpic, element.roomid)
                        } else {
                            io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, "https://www.moosen.im/images/favicon.png", element.roomid)
                        }
                    } else {
                        io.to(sid).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, "https://www.moosen.im/images/favicon.png", element.roomid)
                    }
                    console.log(element.id)
                })
            })
        } catch (e) {
            console.log("Previous message isn't working.")
        }
    })
}

//----CHATROOMS----\\

function getChatrooms(sid, uid) {
    con.query("SELECT * FROM rooms WHERE serialid IN (SELECT room_id FROM room_users WHERE user_id = ?)", [uid], function (error, row) {
        io.to(sid).emit('roomlist', row)
    })
}

function createChatroom(n, uid) {
    var roomid
    try {
        var name = n
        // get availible chatrooms from user SELECT room_id FROM room_users WHERE user_id = ? [user.uid]
        con.query("INSERT INTO rooms (name) VALUES(?)", [name], function (error) { })
        con.query("SELECT * FROM ( SELECT * FROM rooms ORDER BY serialid DESC LIMIT 1) sub ORDER BY  serialid ASC", function (error, row, results) {
            con.query("INSERT INTO room_users VALUES(?,?,1)", [row[0].serialid, uid])

            con.query("CREATE TABLE ?? (id int AUTO_INCREMENT PRIMARY KEY, message text, username VARCHAR(100),timestamp VARCHAR(32),roomid int, uid VARCHAR(100))", ["room" + row[0].serialid])
        })
    } catch (e) {
        console.log('error creating new room: ' + e)
    }
}

function searchUsers(email) {
    con.query("SELECT * FROM users WHERE email = ?", [email], function (error, rows) {
        return rows[0].uid
    })
}

function addToRoom(email, roomid, isAdmin) {
    con.query("SELECT * FROM users WHERE email = ?", [email], function (error, rows, result) {
        try {
            rows.forEach(function (element) {
                con.query("INSERT INTO room_users VALUES(?,?,?)", [roomid, element.uid, isAdmin])
                console.log("user " + element.uid + " was added to room " + roomid)
            })
        } catch (e) {
            console.log(e)
            console.log("user not found")
        }
    })
}
