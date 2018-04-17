var fs = require('fs')
var http = require('http')
var https = require('https')
var express = require('express')
var errorhandler = require('errorhandler')
var bodyParser = require('body-parser')
var mysql = require('mysql')
var siofu = require('socketio-file-upload')
var moment = require('moment')
var Discord = require('discord.js')
var request = require('request')
var cors = require('cors')
var util = require('util')
var path = require('path')
var favicon = require('serve-favicon')
var messages = require('./routes/messages')
var blog = require('./routes/blog')
var app = express()
var app2 = express()
var passportSocketIO = require('passport.socketio')
var passport = require('passport')
var strategy = require('passport-google-oauth').OAuth2Strategy
const redis = require('redis')
const session = require('express-session')
var redisStore = require('connect-redis')(session)
var redisClient = redis.createClient()
const sessionStore = new redisStore()
var cookieParser2 = require('cookie-parser')()
var uuidv4 = require('uuid/v4')
var escStrReg = require('escape-string-regexp')
const controller = require('./controllers/main.controller')
const VRctrl = require('./controllers/vr.controller')
var vr = require('./routes/vr.js')
var gcal = require('google-calendar')
var google_calendar
//import controller from './controllers/main.controller'


//--GENERAL HTTP----\\
app2.all('*', ensureSecure) // at top of routing calls

function ensureSecure(req, res, next) {
    res.redirect('https://www.moosen.im') // express 4.x
}

var options = {
    key: fs.readFileSync('./certs/domain.key'),
    cert: fs.readFileSync('./certs/www.moosen.im.crt')
}
var httpServer = http.createServer(app2).listen(80, () => {
    console.log('http redirect server up and running at port 80')
})
var server = https.createServer(options, app).listen(443, () => {
    console.log('server up and running at port 443')
})

process.on('uncaughtException', function (exception) {
    console.log(exception)
})

process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason)
})


var io = require('socket.io')(server)
io.attach(server, {
    pingInterval: 10000,
    pingTimeout: 6000,
})
//----PASSPORT----\\
passport.use(new strategy({
    clientID: '333736509560-id8si5cbuim26d3e67s4l7oscjfsakat.apps.googleusercontent.com',
    clientSecret: 'ZCMQ511PhvMEQqozMGd5bmRH',
    callbackURL: 'https://moosen.im/auth/google/callback'
},
    (accessToken, refreshToken, profile, cb) => {
        //  console.log('id '+profile.id+'name '+profile.name+'displayName '+profile.displayName+'email '+profile.email+'gender '+profile.gender)
        loginUser(profile.id, profile.displayName, profile.photos[0].value, profile.emails[0].value)
        google_calendar = new gcal.GoogleCalendar(accessToken)
        google_calendar.calendarList.list(function (err, calendarList) {
            console.log(calendarList)

        })
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
        client: redisClient,
        ttl: 86400
    })
}))

function onAuthorizeSuccess(data, accept) {
    console.log('success connection to socket.io')

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
        client: redisClient,
        ttl: 86400
    }),
    passport: passport,
    cookieParser: require('cookie-parser'),

}))
passport.serializeUser((user, cb) => {

    cb(null, user)
})

passport.deserializeUser((user, cb) => {

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
app.use(errorhandler())
app.use(favicon(path.join(__dirname, 'favicon.ico')))
app.use('/', routes)
//app.use('/messages', messages)
//app.use('/blog', blog)
app.use('/vr', vr)
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
app.use('/images', express.static(__dirname + '/images'))
app.use('/uploads', express.static(__dirname + '/uploads'))
app.use('/fonts', express.static(__dirname + '/fonts'))
app.use('/sounds', express.static(__dirname + '/sounds'))
app.use('/js', express.static(__dirname + '/js'))
app.use('/html', express.static(__dirname + '/html'))
app.use('/css', express.static(__dirname + '/css'))
app.use('/siofu', express.static(__dirname + '/node_modules/socketio-file-upload'))

//----AUTH----\\
app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/plus.profile.emails.read', 'https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/calendar', 'profile', 'email']
    }))

app.get('/auth/google/callback',
    passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/plus.profile.emails.read', 'https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/calendar', 'profile', 'email'],
        failureRedirect: '/login'
    }),
    (req, res) => {
        res.redirect('/')
    }
)

// API \\
app.use((req, res, next) => {

    var err = new Error('Not Found')
    //console.log(err.message + " ")
    err.status = 404

    next(err)

})

//google api authentication


//end athentication

module.exports = app

//----LOGIN----\\
function loginUser(uid, displayName, photoURL, email) {
    console.log('login user: ' + uid)

    con.query('SELECT * FROM users WHERE uid = ?', [uid], (error, rows, results) => {
        if (rows[0] == null) {
            //If no user, add to DB
            console.log('new user: ' + uid)
            con.query('INSERT INTO users (name, uid, profpic, isonline, totalmessages, email, curroom) VALUES ( ?, ?, ?, 1,1,?,1)', [displayName, uid, photoURL, email], (err, res) => {
                //add to general and report bug chatrooms
                controller.addToRoom(con, email, 1, 0, displayName)
                controller.addToRoom(con, email, 16, 0, displayName)
                controller.addToRoom(con, email, 42, 1, displayName)
                if (err) console.log(err)
            })
        } else {
            displayName = rows[0].name
            photoURL = rows[0].profpic
            email = rows[0].email

            con.query('UPDATE users SET profpic = ? WHERE uid = ?', [photoURL, uid])
            //  con.query('UPDATE users SET name = ? WHERE uid = ?', [displayName, uid])
        }
    })
}

//----WEBRTC----\\
var channels = {}
var sockets = {}
var players = []

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
    console.log(msg.author.id)
    // client.user.setAvatar('./images/discord.png')
    if (msg.channel.id == config.discord.moosen && !(msg.author.bot)) {
        var newmsg = msg.content
        var unRegex = RegExp('<@!?([0-9]+)>')
        var unArray
        while ((unArray = unRegex.exec(newmsg)) !== null) {
            console.log(`Found ${unArray[1]}`)
            msg.channel.members.forEach(e => {
                if (e.user.id == unArray[1]) {
                    console.log(e.user.username + ' ' + unArray[0])
                    var repstr = '@' + e.user.username
                    var regex2 = new RegExp(unArray[0])
                    newmsg = newmsg.replace(regex2, repstr)
                }
            })
        }
        var roleRegex = RegExp('<@&([0-9]+)>')
        var roleArray
        while ((roleArray = roleRegex.exec(newmsg)) !== null) {
            console.log(`Found ${roleArray[1]}`)
            msg.guild.roles.forEach(e => {
                if (e.id == roleArray[1]) {
                    console.log(e.name + ' ' + roleArray[0])
                    var repstr = '@' + e.name
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
                newmsg += msg.attachments.first().url

            } catch (e) {
                console.log('Message attachment has no url')
            }
        }
        controller.sendMessage(con, newmsg, 'disc' + msg.author.id, config.discord.sendChannel)
        getMessage(config.discord.sendChannel)
    }
})

//handlers for errors and disconnects
client.on('disconnect', function (event) {
    if (event.code != 1000) {
        console.log("Discord client disconnected with reason: " + event.reason + " (" + event.code + "). Attempting to reconnect in 6s...")
        setTimeout(function () {
            client.login(config.discord.key)
        }, 6000)
    }
})

client.on('error', function (err) {
    console.log("Discord client error '" + err.code + "'. Attempting to reconnect in 6s...")
    client.destroy()
    setTimeout(function () {
        client.login(config.discord.key)
    }, 6000)
})

process.on('rejectionHandled', (err) => {
    console.log(err)
    console.log("an error occurred. reconnecting...")
    client.destroy()
    setTimeout(function () {
        client.login(config.discord.key)
    }, 2000)
})

process.on('exit', function () {
    client.destroy()
})

//----SOCKET.IO----\\
io.sockets.on('connection', socket => {


    console.log('CONNECTED to socket io: ' + socket.request.user.displayName)
    controller.getChatrooms(io, con, socket.id, socket.request.user.id)
    con.query('SELECT room_id FROM room_users WHERE user_id = ?', [socket.request.user.id], (error, rows, results) => {
        socket.join(rows[0].room_id)
        io.to(rows[0].room_id).emit('login', socket.request.user.displayName, socket.request.user.emails[0].value, socket.request.user.photos[0].value, socket.request.user.id, rows[0].room_id)
    })
    con.query('SELECT * FROM users WHERE uid = ?', [socket.request.user.id], (error, rows, results) => {
        joinChatroom(socket, rows[0].curroom)
    })

    //----WEBRTC VOICE----\\
    socket.channels = {}
    sockets[socket.id] = socket

    console.log('[' + socket.id + '] connection accepted')
    socket.on('disconnect', () => {
        for (var channel in socket.channels) {
            part(channel)
        }
        console.log('[' + socket.id + '] disconnected')
        delete sockets[socket.id]
    })


    socket.on('join', conf => {
        console.log('[' + socket.id + '] join ', conf)
        var channel = conf.channel
        var userdata = conf.userdata

        if (channel in socket.channels) {
            console.log('[' + socket.id + '] ERROR: already joined ', channel)
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
        //  console.log('[' + socket.id + '] part ')

        if (!(channel in socket.channels)) {
            console.log('[' + socket.id + '] ERROR: not in ', channel)
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





    socket.on('relayICECandidate', conf => {
        var peer_id = conf.peer_id
        var ice_candidate = conf.ice_candidate
        console.log('[' + socket.id + '] relaying ICE candidate to [' + peer_id + '] ', ice_candidate)

        if (peer_id in sockets) {
            sockets[peer_id].emit('iceCandidate', {
                'peer_id': socket.id,
                'ice_candidate': ice_candidate
            })
        }
    })

    socket.on('relaySessionDescription', conf => {
        var peer_id = conf.peer_id
        var session_description = conf.session_description
        console.log('[' + socket.id + '] relaying session description to [' + peer_id + '] ', session_description)

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

    uploader.on('start', event => {
        console.log('Starting upload to ' + event.file.name + ' of type ' + event.file.meta.filetype + ' to ' + uploader.dir)
    })

    uploader.on('saved', event => {
        var un = socket.request.user.displayName
        var uid = socket.request.user.id
        var name = event.file.name
        var type = event.file.meta.filetype
        //  console.log('room: ' + event.file.meta.room)
        var roomId = event.file.meta.room
        console.log('upload     socket.id: ' + socket.id)
        console.log(name + ' successfully saved.')
        console.log(type)
        var msg
        if (/video/g.test(type)) {
            msg = 'https://moosen.im/uploads/' + name
        } else if (/image/g.test(type)) {
            msg = 'https://moosen.im/uploads/' + name
        } else {
            msg = '<a href="/uploads/' + name + '" download="' + name + '">' + name + '</a>'
        }
        controller.sendMessage(con, msg, uid, roomId)
        getMessage(roomId)
        if (roomId == config.discord.sendChannel) {
            client.channels.get(config.discord.moosen).send({
                files: [('./uploads/' + name)]
            })
        }
    })

    //----GENERAL SOCKET.IO----\\

    //Test emit
    socket.on('getuser', rid => {

        controller.getAdminStatus(con, io, socket.request.user.id, rid, socket.id)
        controller.getUser(con, io, socket.request.user.id, socket.id)
        //console.log(Object.keys(io.sockets.sockets))
    })

    socket.on('get-motd', function (roomId) {
        controller.getMotd(con, io, roomId)
        //console.log(Object.keys(io.sockets.sockets))
    })

    //Emit for when on mobile and needing the logs
    socket.on('log', message => {
        console.log(socket.id + ': ' + message)
        //socket.emit('onconnect',socket.request.user.displayName)
    })

    socket.on('addroom', name => {
        controller.createChatroom(con, io, name, socket.request.user.id, socket.request.user.displayName)

    })
    socket.on('updateuser', (nickname, url) => {
        controller.updateUser(con, socket.request.user.id, nickname, url)
    })
    socket.on('addcommand', (roomId, cmd, actn, msg, username, pic, regex) => {
        if (regex) addNewCommand(roomId, cmd, actn, msg, username, pic)
        else addNewCommand(roomId, escStrReg(cmd), actn, msg, username, pic)
    })
    socket.on('addtodo', (roomId, tags, t, date) => {
        console.log('addtodo: ', t)
        addTODO(roomId, socket.request.user.id, tags, t, date)
    })


    socket.on('updateroomtheme', (params, icon, type, roomId) => {
        controller.changeRoomTheme(con, params, icon, type, roomId)
        joinChatroom(socket, roomId)
    })

    socket.on('changerooms', roomId => {
        joinChatroom(socket, roomId)
    })

    socket.on('removeCommand', (command, roomId) => {
        controller.removeRegexCommand(con, io, command, roomId)
    })
    socket.on('removetodo', (todo, roomId) => {
        controller.removeTODO(con, io, todo, roomId)
    })

    //for adduser function. Email is entered by the user, roomId is caled from chat.html, isAdmin should just default to 0 for now.
    socket.on('adduser', (email, roomId, isAdmin) => {
        console.log('add user called')
        controller.addToRoom(con, email, roomId, 0, '')
        joinChatroom(socket, roomId)
    })

    socket.on('joincode', (code, roomId, isAdmin) => {
        console.log('join code called')
        controller.joinRoom(con, io, code, socket.request.user.id, socket.id)
    })


    socket.on('searchusers', email => {
        //maybe make this variable do something...
        var id = searchUsers(email)
    })

    socket.on('retPre', (previous, roomId) => {
        console.log('retpre called' + previous + " " + roomId)
        showPreviousMessages(10, previous, socket.id, roomId)
    })

    //vr State Code

    socket.on('vrconnection', function (x, y) {
        // console.log('hello from VR')

        const addplayer = new Promise((resolve, reject) => {
            // console.log('begin promise')
            players.forEach(p => {
                // console.log('begin for each')
                if (p.uid == socket.request.user.id) reject()
                // console.log('players' + p.uid)
            })

            // console.log('begin filling array')
            var p = {
                uid: socket.request.user.id,
                name: socket.request.user.displayName,
                x: x,
                y: y,
                rot: 0,
                color: 'red'
            }
            // console.log('begin push')
            players.push(p)
            // console.log('player info: ' + players.length)
            resolve(/*socket.emit('vrUpdatePos', players, socket.request.user.id)*/)
        })
    })

    function updateClient() {
        socket.emit('vrTest', players)
    }

    socket.on('vrlocalPos', function (uid, x, y, rot) {
        //console.log('player length '+players.length)
        for (var i = 0; i < players.length; i++) {
            //console.log('update for '+players[i].uid+' '+players[i].x+players[i].y)
            if (uid = players[i].uid) {
                players[i].x = x
                players[i].y = y
                players[i].rot = rot
                break
            }
        }
    })

    //----CHAT MESSAGE----\\
    socket.on('chat message', (msg, roomId) => {
        var isAdmin
        con.query('SELECT is_admin FROM room_users WHERE room_id = ? AND user_id = ?', [roomId, socket.request.user.id], (error, rows, results) => {
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
                if (/!doggo/.test(msg)) {
                    controller.getDoggo().then(url => strReplacePromise(/!doggo/ig, msg, url))
                        .then(reply => sendMsg(reply))
                        .catch(err => {
                            console.log(err)
                        })
                } else sendMsg(msg)

                function sendMsg(message) {
                    var un = socket.request.user.displayName
                    var uid = socket.request.user.id
                    controller.sendMessage(con, message, uid, roomId)
                    getMessage(roomId)
                }
            }
        })
    })
})

function strReplacePromise(reg, str, rep) {
    return new Promise((resolve, reject) => {
        resolve(str.replace(reg, rep))
    })
}

//----MYSQL DB----\\

var connect = config.db
var con

function handleDisconnect() {
    con = mysql.createConnection(connect)

    con.connect(err => {
        if (err) {
            console.log('error when connecting to db:', err)
            setTimeout(handleDisconnect, 2000)
        } else {
            console.log('Connected!')
        }
    })

    con.on('error', err => {
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
function addNewCommand(roomId, cmd, actn, msg, username, pic) {
    console.log(msg)
    // console.log(encodeURI(msg))
    console.log(roomId + ' new command: ' + cmd)
    var arr = {
        cmd,
        actn,
        msg: encodeURI(msg),
        username,
        pic
    }
    var isValid = true
    try {
        new RegExp(cmd)
    } catch (e) {
        isValid = false
    }
    if (isValid) {
        con.query('SELECT commands FROM rooms WHERE serialid = ?', [roomId], (error, rows) => {
            const addCommand = new Promise((resolve, reject) => {
                var newArr = JSON.parse(rows[0].commands)
                newArr.push(arr)
                myArrString = JSON.stringify(newArr)
                con.query('UPDATE rooms set commands = ? WHERE serialid = ?', [myArrString, roomId])
                resolve(controller.getRegexCommands(con, io, roomId, roomId))
            })

        })
    }
}
//addTODO (roomId, socket.request.user.id, tags, msg, date)
function addTODO(roomId, uid, tags, todo, date) {
    console.log(todo)
    // console.log(encodeURI(msg))
    console.log(roomId + ' new todo: ')
    var arr = {
        uid,
        tags,
        todo,
        date
    }
    //console.log(arr.todo)
    try {
        con.query('SELECT todo FROM rooms WHERE serialid = ?', [roomId], (error, rows) => {
            const addtodo = new Promise((resolve, reject) => {
                var newArr = JSON.parse(rows[0].todo)
                newArr.push(arr)
                myArrString = JSON.stringify(newArr)
                con.query('UPDATE rooms set todo = ? WHERE serialid = ?', [myArrString, roomId])
                resolve(controller.getTODO(con, io, roomId))
            })

        })
    } catch (e) {
        console.log(e.message)
    }
}

function getMessage(roomId) {
    console.log(`In getMessage, roomId ${roomId}`)
    var nameString = 'room' + roomId
    con.query('SELECT * FROM ( SELECT * FROM ?? ORDER BY id DESC LIMIT 1) sub ORDER BY  id ASC', [nameString], (error, rows, results) => {
        if (error) throw error
        getDBUN(rows[0].uid).then(dbRes => {
            io.to(roomId).emit('chat message', dbRes[0], decodeURI(rows[0].message), rows[0].timestamp, rows[0].id, dbRes[1], roomId, dbRes[2])
            io.to(roomId).emit('chatmessage2', rows)
            if (roomId == config.discord.sendChannel && dbRes[2] !== 'Discord') {
                //send to Discord
                var msg = decodeURI(rows[0].message)
                msg = msg.replace(/&lt;/ig, '<')
                msg = msg.replace(/&gt;/ig, '>')
                sendToDiscord(dbRes[0], msg)
            }
        })
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function getDBUN(id) {
    if (client.status === 0) {
        return new Promise(resolve => {
            if (id.substr(0, 4) === 'disc') {
                var user = client.users.get(id.substr(4))
                resolve([user.username, 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png', 'Discord'])
            } else {
                con.query('SELECT name, profpic, badge FROM users WHERE uid = ?', [id], (error, row) => {
                    if (row.length < 1) {
                        resolve(['Undefined', 'https://moosen.im/uploads/moosenim4ColoredSmall.png', null])
                    } else {
                        resolve([row[0].name, row[0].profpic, row[0].badge])
                    }
                })
            }
        })
    }
}

//----PREVIOUS MESSAGES----\\

function joinChatroom(socket, roomId) {
    if (roomId == null) roomId = 1
    var isAdmin = false
    new Promise((resolve, reject) => {
        con.query('SELECT is_admin FROM room_users WHERE room_id = ? AND user_id = ?', [roomId, socket.request.user.id], (error, rows, results) => {
            if (!rows[0]) {
                console.log('Access Denied')
                reject()
            } else {
                isAdmin = rows[0].is_admin == 1 ? true : false
                con.query('SELECT * FROM rooms WHERE serialid = ?', [roomId], (err, row, res) => {
                    if (!row[0]) {
                        console.log('ERROR: Cannot connect to room')
                        reject()
                    } else {
                        io.to(socket.id).emit('switchToRoom', isAdmin, row[0])
                        con.query('UPDATE users SET curroom = ? WHERE uid = ?', [roomId, socket.request.user.id])
                        socket.join(roomId)
                        controller.getRegexCommands(con, io, roomId, socket.id)
                        controller.getTODO(con, io, roomId)
                        resolve()
                    }
                })

            }
        })
    }).then(() => {
        var nameString = 'room' + roomId
        console.log('show last messages for ' + nameString)
        con.query('SELECT * FROM ( SELECT * FROM ?? ORDER BY id DESC LIMIT ?) sub ORDER BY  id ASC', [nameString, 10], (error, rows, results) => {
            controller.singleGetMotd(con, io, roomId, socket.id)
            if (error) throw error
            try {
                rows.forEach(e => {
                    getDBUN(e.uid).then(dbRes => {
                        io.to(socket.id).emit('chat message', dbRes[0], decodeURI(e.message), e.timestamp, e.id, dbRes[1], roomId, dbRes[2])
                    })
                })
            } catch (e) {
                console.log("last message isn't working.")
            }
        })
    })
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
    //104635400788300812127
    //207214113191886849
}

async function showPreviousMessages(num, previous, sid, roomId) {
    var nameString = 'room' + roomId
    con.query('SELECT * FROM ( SELECT * FROM ?? WHERE id < ? ORDER BY id DESC LIMIT ?) sub ORDER BY id ASC', [nameString, previous, num], (error, rows, results) => {
        //  console.log(`Getting previous ${num} messages from ${previous} in room ${roomId}...`)
        if (error) throw error
        try {
            rows.forEach(e => {
                getDBUN(e.uid).then(dbRes => {
                    io.to(sid).emit('chat message', dbRes[0], decodeURI(e.message), e.timestamp, e.id, dbRes[1], roomId, dbRes[2])
                    io.to(sid).emit('chatmessage2', rows)

                })
            })
        } catch (e) {
            console.log("Previous message isn't working.")
        }
    })
}
