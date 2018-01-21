var express = require('express');
var router = express.Router();
router.get('/login', function(req, res){
   res.sendfile('chat/html/login.html', {'root': '../'})
});
router.post('/', function(req, res){
   res.send('POST route on login.');
});

//export this router to use in our index.js
module.exports = router;
