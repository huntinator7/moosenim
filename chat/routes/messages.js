var express = require('express');
var router = express.Router();
var Mess = require('../models/messages'); 

router.get('/:id?', function (req, res, next) {
    if (req.params.id) {
        Mess.GetLastMessages(req.params.id, function (err, rows) {
            if (err) {
                res.json(err);
            } else {
                res.json(rows);
            }
        });
    }
});
router.get('/', function (req, res) {
    res.sendFile('chat.html');
});


module.exports = router;
