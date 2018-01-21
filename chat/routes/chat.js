var express = require('express');
var router = express.Router();
router.get('/', function(req, res) {
  res.sendfile('chat/html/chat.html', {'root': '../'})
})

router.get('/login', function(req, res){
   //res.sendfile('chat/html/login.html', {'root': '../'})
   res.send("fuck routes"+__dirname)
});

router.post('/', function(req, res){
   res.send('POST route on chat.')
});

//export this router to use in our index.js
module.exports = router;
