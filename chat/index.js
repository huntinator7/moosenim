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
var uuidv4 = require('uuid/v4')

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
    var roomId = 1
    var msg = util.inspect(text.trim())
    console.log('received data:', msg)
    sendMessage(msg.substr(1, msg.length - 2), '<span style="color:red">Admin</span>', 1, roomId)
    getMessage(roomId, 'https://i.imgur.com/CgVX6vv.png')
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

            con.query("UPDATE users SET profpic = ? WHERE uid = ?", [photoURL, uid])
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

    console.log('CONNECTED to socket io: ' + socket.request.user.displayName)
    getChatrooms(socket.id, socket.request.user.id)
    con.query("SELECT room_id FROM room_users WHERE user_id = ?", [socket.request.user.id], function (error, rows, results) {
        rows.forEach(function (element) {
            io.to(element.room_id).emit('login', socket.request.user.displayName, socket.request.user.emails[0].value, socket.request.user.photos[0].value, socket.request.user.id, element.room_id)
            console.log('Joining room ' + element.room_id)
            socket.join(element.room_id)
        })
        socket.request.user.photos.forEach(function (e) {
            console.log(e)
        })

    })
    con.query("SELECT * FROM users WHERE uid = ?", [socket.request.user.id], function (error, rows, results) {
        joinChatroom(socket, rows[0].curroom)
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
        //  console.log("[" + socket.id + "] part ")

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

    uploader.on("start", function (event) {
        console.log('Starting upload to ' + event.file.name + ' of type ' + event.file.meta.filetype + ' to ' + uploader.dir)
    })

    uploader.on("saved", function (event) {
        var un = socket.request.user.displayName
        var uid = socket.request.user.id
        var pic = socket.request.user.photos[0].value
        var name = event.file.name
        var type = event.file.meta.filetype
        //  console.log("room: " + event.file.meta.room)
        var roomId = event.file.meta.room
        console.log('upload     socket.id: ' + socket.id)
        console.log(name + ' successfully saved.')
        console.log(type)
        var msg
        if (/video/g.test(type)) {
            msg = '<div class="embed-responsive embed-responsive-16by9"><iframe style="width:64vw height:36vw" src="https://moosen.im/uploads/' + name + '" frameborder="0" allowfullscreen></iframe></div>'
        } else if (/image/g.test(type)) {
            msg = '<img class="materialboxed responsive-img" style="height:20vh" src="https://moosen.im/uploads/' + name + '" alt="Mighty Moosen">'
        } else {
            msg = '<a href="/uploads/' + name + '" download="' + name + '">' + name + '</a>'
        }
        sendMessage(msg, un, uid, roomId)
        getMessage(roomId, pic)
        if (roomId == config.discord.sendChannel) {
            client.channels.get(config.discord.moosen).send({
                files: [('./uploads/' + name)]
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

    socket.on('addroom', function (name) {
        createChatroom(name, socket.request.user.id)

    })

    socket.on('addcommand', function (roomId, cmd, actn, msg, username, pic) {
        addNewCommand(roomId, cmd, actn, msg, username, pic)
        getRegexCommands(roomId, socket.id)
    })

    socket.on('updateroomtheme', function (back1, back2, backImg, text1, text2, msg1, msg2, icon, type, roomId) {
        changeRoomTheme(back1, back2, backImg, text1, text2, msg1, msg2, icon, type, roomId)
        joinChatroom(socket, roomId)
    })

    socket.on('changerooms', function (roomId) {
        joinChatroom(socket, roomId)
    })

    //for adduser function. Email is entered by the user, roomId is caled from chat.html, isAdmin should just default to 0 for now.
    socket.on('adduser', function (email, roomId, isAdmin) {
        console.log('add user called')
        addToRoom(email, roomId, 0)
        joinChatroom(socket, roomId)
    })

    socket.on('joincode', function (code, roomId,isAdmin) {
        console.log('join code called')
        joinRoom(code, socket.request.user.id)
    //    joinChatroom(socket, roomId)
    })


    socket.on('searchusers', function (email) {
        //maybe make this variable do something...
        var id = searchUsers(email)
    })

    socket.on('retPre', function (previous, roomId) {
        showPreviousMessages(10, previous, socket.id, roomId)
    })

    //----CHAT MESSAGE----\\
    socket.on('chat message', function (msg, roomId) {
        var isAdmin;
        con.query("SELECT is_admin FROM room_users WHERE room_id = ? AND user_id = ?", [roomId, socket.request.user.id], (error, rows, results) => {
            if (!rows) {
                console.log('Access Denied')
                return
            } else {
                try {
                    isAdmin = rows[0].is_admin == '1' ? true : false
                } catch (e) {
                    console.log(e)
                }
                msg = msg.replace(/</ig, '&lt;')
                msg = msg.replace(/>/ig, '&gt;')
                var myRe = /#([a-z])?/g
                var regArray = []
                var myArray
                while ((myArray = myRe.exec(msg)) !== null) {
                    regArray.push({'a':myArray[0], 'b':myArray.index})
                }
                console.log(regArray)
                // var tagTest = new RegExp('#([a-z]) (.+[^\\\\])#', 'g')
                // msg = msg.replace(tagTest, `<${lookup[result[1]].rep} ${lookup[result[1]].addl}>$2</${lookup[result[1]].rep}>`)
                var un = socket.request.user.displayName
                var uid = socket.request.user.id
                var pic = socket.request.user.photos[0].value
                console.log("User profile picture: " + pic)
                sendMessage(msg, un, uid, roomId)
                getMessage(roomId, pic)
            }
        })
    })
})

//----USER COMMANDS----\\
var userRegexParse = {}
userRegexParse.motd = function (socket, un, uid, roomId, msg) {
    console.log('In motd')
    con.query('UPDATE rooms SET motd = ? WHERE serialid = ?', [msg, roomId], function (error) {
        if (error) throw error
    })
    getMotd(roomId)
}

userRegexParse.createroom = function (socket, un, uid, roomId, msg) {
    console.log('In createroom')
    createChatroom(msg, uid)
}
userRegexParse.refreshconfig = function (socket, un, uid, roomId, msg) {
    delete require.cache[require.resolve('./config')]
    config = require('./config')
    console.log('In refreshconfig')
}
userRegexParse.configchange = function (socket, un, uid, roomId, msg) {
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
                newmsg += '<img class="materialboxed img-fluid" style="height:20vh" src="' + msg.attachments.first().url + '" alt="Error - Image not found">'

            } catch (e) {
                console.log('Message attachment has no url')
            }
        }
        sendMessage(newmsg, msg.author.username, config.discord.uid, config.discord.sendChannel)
        getMessageDiscord(msg.author.username, newmsg, msg.author.avatarURL)
        //console.log(msg.author.username + ': ' + msg.content)
        //  console.log('Newmsg: ' + newmsg)
    }
})


var lookup = {}
for (var i = 0, len = config.regex.length; i < len; i++) {
    lookup[config.regex[i].tag] = config.regex[i]
}

//----MYSQL DB----\\

var connect = config.db
var con

function getMotd(roomId) {
    con.query('SELECT * FROM rooms WHERE serialid = ?', [roomId], function (error, rows) {
        if (error) console.log(error)
        io.to(roomId).emit('motd update', rows[0].motd, roomId)
    })
}

function singleGetMotd(roomId, sid) {
    con.query('SELECT * FROM rooms WHERE serialid = ?', [roomId], function (error, rows) {
        if (error) console.log(error)
        io.to(sid).emit('motd update', rows[0].motd, roomId)
    })
}
// new regex code
//command object

function addNewCommand(roomId, cmd, actn, msg, username, pic) {
    console.log(msg)
    console.log(encodeURI(msg))
    console.log(roomId + " new command: " + cmd)
    var arr = {
        cmd,
        actn,
        msg: encodeURI(msg),
        username,
        pic
    }
    con.query('SELECT commands FROM rooms WHERE serialid = ?', [roomId], function (error, rows) {
        const addCommand = new Promise((resolve, reject) => {
            var newArr = JSON.parse(rows[0].commands)
            newArr.push(arr)
            myArrString = JSON.stringify(newArr)
            con.query('UPDATE rooms set commands = ? WHERE serialid = ?', [myArrString, roomId])
            resolve(getRegexCommands(roomId, roomId))
        })

    })
}

function getRegexCommands(roomId, sid) {
    con.query('SELECT commands FROM rooms WHERE serialid = ?', [roomId], function (error, rows) {
        if (error) console.log(error)
        var coms = JSON.parse(rows[0].commands)
        // console.log(coms)
        const decode = new Promise((resolve, reject) => {
            coms.forEach(function (element) {
                element.msg = decodeURI(element.msg)
            })
            resolve(io.to(sid).emit('get commands', coms, roomId))
        })
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

function sendMessage(message, username, uid, roomId) {
    var nameString = "room" + roomId
    if (roomId == null) roomId = 1
    // console.log(`In sendMessage, roomId: ${roomId}\nmsg: ${message}`)
    var msg = encodeURI(message)
    try {
        con.query("INSERT INTO ?? (message, username, timestamp, roomid, uid) VALUES ( ?, ?, TIME_FORMAT(CURTIME(), '%h:%i:%s %p'), ?, ?)", [nameString, msg, username, roomId, uid], function (error, results) {
            if (error) throw error
        })
    } catch (Exception) {
        con.query("INSERT INTO ?? (message, username, timestamp) VALUES ( ?, ?, TIME_FORMAT(CURTIME(), '%h:%i:%s %p'))", [nameString, "error", username], function (error, results) {
            if (error) throw error
        })
    }
}

function getMessage(roomId, pic) {
    console.log(`In getMessage, roomId ${roomId}`)
    var nameString = "room" + roomId
    con.query("SELECT * FROM ( SELECT * FROM ?? ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC", [nameString], function (error, rows, results) {
        if (error) throw error
        con.query("SELECT * FROM users WHERE uid = ?", [rows[0].uid], function (error, row) {
            if (pic) {
                io.to(roomId).emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, pic, rows[0].roomid)
            } else if (row.length < 1) {
                io.to(roomId).emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, "https://www.moosen.im/images/favicon.png", rows[0].roomid)
            } else {
                io.to(roomId).emit('chat message', rows[0].username, decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, rows[0].profpic, rows[0].roomid)
            }
            if (roomId == config.discord.sendChannel) {
                //send to Discord
                var msg = decodeURI(rows[0].message)
                msg = msg.replace(/&lt;/ig, '<')
                msg = msg.replace(/&gt;/ig, '>')
                sendToDiscord(rows[0].username, msg)
            }
        })
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function sendToDiscord(un, msg) {
    msg = /@moosen/ig [Symbol.replace](msg, '<@&277296480245514240>')
    msg = /@noah/ig [Symbol.replace](msg, '<@!207214113191886849>')
    msg = /@hunter/ig [Symbol.replace](msg, '<@!89758327621296128>')
    msg = /@nick/ig [Symbol.replace](msg, '<@!185934787679092736>')
    msg = /@kyle/ig [Symbol.replace](msg, '<@!147143598301773824>')
    msg = /@lane/ig [Symbol.replace](msg, '<@!81913971979849728>')
    msg = /:fn:/ig [Symbol.replace](msg, '<:fNoah1:318887883291230219> <:fNoah2:318887791096365056> <:fNoah3:318887914530668544>')
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
}

//----PREVIOUS MESSAGES----\\

function joinChatroom(socket, roomId) {
    if (roomId == null) roomId = 1
    var isAdmin = false
    con.query("SELECT is_admin FROM room_users WHERE room_id = ? AND user_id = ?", [roomId, socket.request.user.id], (error, rows, results) => {
        if (!rows[0]) {
            console.log('Access Denied')
        } else {
            isAdmin = rows[0].is_admin == 1 ? true : false
            con.query("UPDATE users SET curroom = ? WHERE uid = ?", [roomId, socket.request.user.id])
            var roomName;
            con.query("SELECT * FROM rooms WHERE serialid = ?", [roomId], (error, rows, results) => {
                if (!rows[0]) {
                    console.log("ERROR: Cannot connect to room")
                } else {
                    io.to(socket.id).emit('switchToRoom', isAdmin, rows[0])
                }
            })
            socket.join(roomId)
            getRegexCommands(roomId, socket.id)
        }
    })
    var nameString = "room" + roomId
    console.log("show last messages for " + nameString)
    con.query("SELECT * FROM ( SELECT * FROM ?? ORDER BY id DESC LIMIT ?) sub ORDER BY  id ASC", [nameString, 10], function (error, rows, results) {
        singleGetMotd(roomId, socket.id)
        if (error) throw error
        try {
            rows.forEach(function (element) {
                con.query("SELECT * FROM users WHERE users.name = ?", [element.username], function (error, row) {
                    if (row[0]) {
                        if (row[0].profpic) {
                            io.to(socket.id).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, row[0].profpic, element.roomid)
                        } else {
                            io.to(socket.id).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, "https://www.moosen.im/images/favicon.png", element.roomid)
                        }
                    } else {
                        io.to(socket.id).emit('chat message', element.username, decodeURI(element.message), element.timestamp, element.id, "https://www.moosen.im/images/favicon.png", element.roomid)
                    }
                })
            })
        } catch (e) {
            console.log("last message isn't working.")
        }
    })
}

function showPreviousMessages(num, previous, sid, roomId) {
    var nameString = "room" + roomId
    console.log(nameString)
    con.query("SELECT * FROM ( SELECT * FROM ?? WHERE id < ? ORDER BY id DESC LIMIT ?) sub ORDER BY id ASC", [nameString, previous, num], function (error, rows, results) {
        //  console.log(`Getting previous ${num} messages from ${previous} in room ${roomId}...`)
        if (error) throw error
        try {
            rows.forEach(function (element) {
                con.query("SELECT * FROM users WHERE uid = ?", [element.uid], function (error, row) {
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
    con.query("SELECT * FROM rooms WHERE serialid IN (SELECT room_id FROM room_users WHERE user_id = ?)", [uid], function (error, rows) {
        io.to(sid).emit('roomlist', rows)
    })
}

function createChatroom(n, uid) {
    var roomId
    try {
        var name = n
        // get availible chatrooms from user SELECT room_id FROM room_users WHERE user_id = ? [user.uid]
        con.query("INSERT INTO rooms (name,motd,join_code,back1,back2,text_color,icon,text_color2,commands) VALUES(?,?,?,?,?,?,?,?)", [name, 'motd', uuidv4(), '#6EB7FF', '#23ffdd', '#000000', 'https://www.moosen.im/images/favicon.png', '#000000', '[{"cmd":"!ping","actn":"Respond","msg":"Pong!","username":"Server","pic":"https://cdnimages.opentip.com/full/8DHS/8DHS-AB05520.jpg"}] '], function (error) {
            console.log(error)
            con.query("SELECT * FROM ( SELECT * FROM rooms ORDER BY serialid DESC LIMIT 1) sub ORDER BY  serialid ASC", function (error, rows, results) {
                con.query("INSERT INTO room_users VALUES(?,?,1,0)", [rows[0].serialid, uid])
                var id = rows[0].serialid;
                con.query("CREATE TABLE ?? (id int AUTO_INCREMENT PRIMARY KEY, message text, username VARCHAR(100),timestamp VARCHAR(32),roomid int, uid VARCHAR(100))", ["room" + id])
                //  getChatrooms(socket.id,uid)
            })
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

function changeRoomTheme(back1, back2, backImg, text1, text2, msg1, msg2, icon, type, roomId) {
    try {
        con.query("UPDATE rooms SET back1=?, back2=?,back_img=?,text_color=?,text_color2=?,message_back=?,message_back2=?,icon=?,background_type=? WHERE serialid = ?", [back1, back2, backImg, text1, text2, msg1, msg2, icon, type, roomId])
        console.log(back1, back2, backImg, text1, text2, msg1, msg2, icon, type, roomId)
    } catch (e) {
        console.log(e)
    }
}

function joinRoom(joinCode, uid) {
    con.query("SELECT * FROM rooms WHERE join_code = ?", [joinCode], function (error, rows, result) {
        try {
            rows.forEach(function (element) {
                con.query("INSERT INTO room_users VALUES(?,?,?)", [rows[0].serialid, uid, 0])
                console.log("user " + uid + " was added to room " + rows[0].serialid)
            })
        } catch (e) {
            console.log(e)
            console.log("room not found -" + joinCode)
        }
    })
}

function addToRoom(email, roomId, isAdmin) {
    con.query("SELECT * FROM users WHERE email = ?", [email], function (error, rows, result) {
        try {
            rows.forEach(function (element) {
                con.query("INSERT INTO room_users VALUES(?,?,?,?)", [roomId, element.uid, isAdmin, 0])
                console.log("user " + element.uid + " was added to room " + roomId)
            })
        } catch (e) {
            console.log(e)
            console.log("user not found")
        }
    })
}
