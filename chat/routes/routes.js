var express = require('express')
var router = express.Router()

router.get('/', function (req, res) {
    if (req.user) {
        res.sendFile('/client/main.html', { 'root': '/var/www/html/chat' })
    } else {
        res.redirect('/login')
    }
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
router.get('/android', function (req, res) {
    res.sendFile('/html/androidapp.html', { 'root': '/var/www/html/chat' })
})
router.get('/chat', function (req, res) {
    res.sendFile('/html/chat.html', { 'root': '/var/www/html/chat' })
})
router.get('/settings', function (req, res) {
    res.sendFile('/client/userSettings.html', { 'root': '/var/www/html/chat' })
})
router.get('/react', function (req, res) {
    res.render('reactTest', {name: 'Nigolus'})
})
//export this router to use in our index.js
module.exports = router
