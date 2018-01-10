var express = require('express');
var router = express.Router();
router.get('/', function(req, res){
   res.sendFile(__dirname + '/vr.html');
});
router.post('/', function(req, res){
   res.send('POST route on vr.');
});

//export this router to use in our index.js
module.exports = router;