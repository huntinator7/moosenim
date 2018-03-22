var express = require('express');
var router = express.Router();
router.get('/', function(req, res){
    res.sendFile(__dirname + '../client/main/main.html');
});
router.get('/main', function(req, res){
    res.sendFile('/var/www/html/chat/client/main/main.html');
});
router.post('/', function(req, res){
   res.send('POST route on business.');
});

//export this router to use in our index.js
module.exports = router;
