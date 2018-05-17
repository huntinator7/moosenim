var express = require('express')
var router = express.Router()

router.get('/', (req, res) => {
    if (req.user) {
        res.sendFile('/client/main.html', { 'root': '/var/www/html/chat' })
    } else {
        res.redirect('/login')
    }
})
router.get('/login',            (req, res) => res.sendFile('/html/login.html', { 'root': '/var/www/html/chat' }))
router.get('/voice',            (req, res) => res.sendFile('/html/voice.html', { 'root': '/var/www/html/chat' }))
router.get('/voicetest',        (req, res) => res.sendFile('/html/voicetest.html', { 'root': '/var/www/html/chat' }))
router.get('/vr',               (req, res) => res.sendFile('/html/vr.html', { 'root': '/var/www/html/chat' }))
router.get('/android',          (req, res) => res.sendFile('/html/androidapp.html', { 'root': '/var/www/html/chat' }))
router.get('/chat',             (req, res) => res.sendFile('/html/chat.html', { 'root': '/var/www/html/chat' }))
router.get('/settings',         (req, res) => res.sendFile('/client/userSettings.html', { 'root': '/var/www/html/chat' }))
router.get('/react',            (req, res) => res.render('reactTest', {name: 'Nigolus'}))
router.get('/freerealestate',   (req, res) => res.render('realEstate', {}))
//export this router to use in our index.js
module.exports = router
