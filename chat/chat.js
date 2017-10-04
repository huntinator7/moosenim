var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    res.sendFile(__dirname + '/chat.html');
});
router.post('/', function (req, res) {
    res.send('POST route on chat.');
});

module.exports = router;