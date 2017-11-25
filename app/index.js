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
  function(accessToken, refreshToken, profile, cb) {
    profile.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user)
    })
  }
))

app.use((request, response, next) => {
    console.log(request.headers)
    next()
})

app.get('/chance', (request, response) => {
    response.json({
        chance: request.chance
    })
})

app.get('/',
    passport.authenticate('google', { scope: ['profile'] })
)

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    function (req, res) {
        res.post('Logged in successfully')
    }
)

app.listen(port)