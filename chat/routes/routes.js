var express = require('express')
var router = express.Router()
router.get('/', function (req, res) {
  res.sendFile('/html/chat.html', { 'root': '/var/www/html/chat' })
})

router.get('/login', function (req, res) {
  res.sendFile('/html/login.html', { 'root': '/var/www/html/chat' })
})

router.get('/voice', function (req, res) {
  res.sendFile('/html/voice.html', { 'root': '/var/www/html/chat' })
})

router.get('/voicetest', function (req, res) {
  res.sendFile('/html/voicetest.html', { 'root': '/var/www/html/chat' })
})

router.get('/vr', function (req, res) {
  res.sendFile('/html/vr.html', { 'root': '/var/www/html/chat' })
})

router.post('/', function (req, res) {
  res.send('POST route on chat.')
})

//export this router to use in our index.js
module.exports = router

module.exports = function (passport) {

  /* GET login page. */
  router.get('/',
    passport.authenticate('google', {
      scope: ['https://www.googleapis.com/auth/plus.profile.emails.read', 'https://www.googleapis.com/auth/plus.login', 'profile', 'email'],
      failureRedirect: '/login'
    }),
    function (req, res) {
      res.redirect('/')
    }
  )
  return router
}
