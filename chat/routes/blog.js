var express = require('express');
var router = express.Router();
var blog = require('../models/blog');

router.get('/:id?', function (req, res, next) {
    if (req.params.id) {
        blog.GetLastMessages(req.params.id, function (err, rows) {
            if (err) {
                res.json(err);
            } else {
                res.json(rows);
            }
        });
    }
    else{
        blog.GetAll(function(err,rows){
            if (err) {
                res.json(err);
            } else {
                res.json(rows);
            }
        })
    }
});
router.get('/blog',function(req,res,next){
    blog.GetAll(function(err,rows){
        if (err) {
            res.json(err);
        } else {
            res.json(rows);
        }
})

module.exports = router;
