var express = require('express');
var router = express.Router();
var path = require('path');
app = express();


router.get('/', function(req, res){
   res.send('GET route on chat.');
});
router.post('/', function(req, res){
   res.send('POST route on chat.');
});

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/chat.html'));
});

//export this router to use in our index.js
module.exports = router;

http.listen(80, function () {
    console.log('listening on *:3000');
});