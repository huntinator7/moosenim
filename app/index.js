const http = require('http')
var express = require('express')
const passport = require('passport')
var mysql = require('mysql')
const port = 3000
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
const redis = require("redis")
const session = require('express-session')
var redisStore = require('connect-redis')(session)
var client = redis.createClient();
const sessionStore = new redisStore()
//const cookieParser = require('socket.io-cookie-parser')()
var cookieParser2 = require('cookie-parser')()
const sioc = require('socket.io-client')
const sio = require('socket.io')
var async = require('async')

var app = express()
//app.use(cookieParser)
app.use(cookieParser2)
var pool = mysql.createPool({
    connectionLimit: 100,
    host: 'localhost',
    user: 'root',
    password: 'raspberry',
    database: 'moosenim'

})

app.use(session({
    key: 'keyboard cat',
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
    store: new redisStore({ host: 'localhost', port: 6379, client: client, ttl: 260 })
}))

var server = http.createServer(app).listen(port, function () {
    console.log(`server up and running at port ${port}`)
})

// initialize our modules
var io = require("socket.io")(server),
    passportSocketIo = require("passport.socketio")



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

//app.use(require('morgan')('combined'))
app.use(require('body-parser').urlencoded({ extended: true }))

io.use(passportSocketIo.authorize({
    cookieParser: require('cookie-parser'),       // the same middleware you registrer in express
    key: 'keyboard cat',       // the name of the cookie where express/connect stores its session_id
    secret: 'keyboard cat',    // the session_secret to parse the cookie
    store: new redisStore({ host: 'localhost', port: 6379, client: client, ttl: 260 }),      // we NEED to use a sessionstore. no memorystore please
    fail: onAuthorizeFail,     // *optional* callback on fail/error - read more below
}))

function onAuthorizeFail(data, message, error, accept) {
    if (error) throw new Error(message)
    return accept()
}

passport.use(new GoogleStrategy({
    clientID: '333736509560-id8si5cbuim26d3e67s4l7oscjfsakat.apps.googleusercontent.com',
    clientSecret: 'ZCMQ511PhvMEQqozMGd5bmRH',
    callbackURL: 'http://moosen.im:3000/auth/google/callback'
},
    function (accessToken, refreshToken, profile, cb) {
        //console.log(profile)
        return cb(null, profile)
    }
))

//redis setup and test
var client = redis.createClient()
client.on('connect', function () {
    console.log("redis server connected test")
})
client.set('test', 'successful')

client.get('test', function (err, reply) {
    console.log(`test reply: ${reply}`)
})
var socket

var URL_SERVER = 'http://moosen.im:3000'
socket = sioc.connect(URL_SERVER)

function handle_database(req, type, callback) {
    async.waterfall([
        function (callback) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    callback(true)

                }
                else {
                    callback(null, connection)
                }
            })

        },
        function (connection, callback) {
            var sqlquery
            switch (type) {
                case 'login':
                    sqlquery = "SELECT * FROM users WHERE email = '" + req.body.user_email + "'"
                    console.log(req.user)
                    break
                case 'checkEmail':
                    sqlquery = "SELECT email FROM users WHERE email = '" + req.body.user_email + "'"
                    break
                case 'register':
                    sqlquery = "INSERT INTO users (name, uid,profpic,isonline,totalmessages,email,curroom ) VALUES ('" + req.session.key['user_name'] + "','" + req.session.key['user_id'] + "', 'profpic', true, 0, 'email', 'curroom'"
                    break
            }
            callback(null, connection, sqlquery)
        }, function (connection, sqlquery, callback) {
            connection.query(sqlquery, function (err, rows) {
                connection.release()
                if (!err) {
                    if (type == 'login') {
                        callback(rows.length == 0 ? false : rows[0])
                        console.log('connection.query ' + rows[0])
                    } else if (type == 'register') {
                        callback(false)
                    }
                }
                else {
                    callback(true)
                }
            })
        }, function (result) {
            // This function gets call after every async task finished.
            if (typeof (result) === "boolean" && result === true) {
                callback(null)
            } else {
                callback(result)
            }
        }])

}

io.on('connection', function () {
    // console.log(socket.request.user)
    console.log("socket request")

    socket.on('test', function (s) {
        console.log(s)
    })
    io.emit('test', 'testingio-onconnection')

    passport.serializeUser(function (user, cb) {
        client.set('users', user.id)
        client.sadd('online', user.displayName)
        socket.emit('test', 'testing')
        io.emit('test', 'testingio-serialize. display name = ' + user.displayName)
        cb(null, user)
    })

    passport.deserializeUser(function (obj, cb) {
        socket.emit('test', 'testing')
        io.emit('test', 'testingio-deserialize')
        cb(null, obj)
    })
})
// Configure view engine to render EJS templates.
app.set('views', __dirname + '/../views')
app.set('view engine', 'ejs')

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize())
app.use(passport.session())


// Define routes.
app.get('/',
    function (req, res) {
        res.render('home', { user: req.user })
    })

app.get('/login',
    function (req, res) {
        socket.emit('test', 'testing')
        res.render('login')
    })

app.get('/profile',
    require('connect-ensure-login').ensureLoggedIn(),
    function (req, res) {
        socket.emit('test', 'testing')
        io.emit('test', 'testingio-profile')
        client.get('users', function (err, reply) {
            console.log(`uid reply: ${reply}`)
        })
        handle_database(req, 'login', function (res) {
            console.log('handle_database test: ' + res)
        })
        client.smembers('online', function (err, reply) {
            console.log(`users online: ${reply}`)
        })
        res.render('profile', { user: req.user })
    })

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] })
)

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', failureFlash: true }),
    function (req, res) {
        res.redirect('/profile')
    })