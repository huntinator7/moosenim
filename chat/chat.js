var express = require('express');
var router = express.Router();
var path = require('path');
app = express();



app.get('/', function (req, res) {
    console.log("loading chat.html");
    res.sendFile(path.join(__dirname + '/chat.html'));
});

router.get('/', function (req, res) {
    console.log("loading chat.html");
    res.sendFile(path.join(__dirname + '/chat.html'));
});
router.post('/', function(req, res){
   res.send('POST route on chat.');
});



//export this router to use in our index.js
module.exports = router;

