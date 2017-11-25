const http = require('http')
const express = require('express')
const passport = require('passport')
const app = express()
const port = 3000
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

passport.use(new GoogleStrategy({
    clientID: '333736509560-id8si5cbuim26d3e67s4l7oscjfsakat.apps.googleusercontent.com',
    clientSecret: 'ZCMQ511PhvMEQqozMGd5bmRH',
    callbackURL: 'http://moosen.im:3000/auth/google/callback'
},
    function (token, tokenSecret, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user)
        })
    }
))

// app.use((req, res, next) => {
//     console.log(req.headers)
//     next()
// })

app.get('/fail', (req, res) => {
    app.post('Login failed')
})

app.get('/auth/google',
    passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] })
)

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/fail' }),
    function (req, res) {
        res.redirect('/')
    }
)

app.listen(port)