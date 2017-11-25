const http = require('http')
const express = require('express')
const passport = require('passport')
const app = express()
const port = 3000
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: '333736509560-id8si5cbuim26d3e67s4l7oscjfsakat.apps.googleusercontent.com',
    clientSecret: 'ZCMQ511PhvMEQqozMGd5bmRH',
    callbackURL: 'http://moosen.im:3000/auth/google/callback'
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile)
        cb()
    }
))

app.use((req, res, next) => {
    console.log(req.headers)
    next()
})

app.get('/chance', (req, res) => {
    res.json({
        chance: req.chance
    })
})

app.get('/fail', (req, res) => {
    res.post('Login failed')
})

app.get('/',
    passport.authenticate('google', { scope: ['profile'] })
)

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/chance' }),
    function (req, res) {
        res.post('Logged in successfully')
    }
)

app.listen(port)