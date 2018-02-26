
var sql = require('mysql');
var connect = {
    host: "localhost",
    user: "root",
    password: "raspberry",
    database: "moosenblog"
};
module.exports = connect;
//var db = require('../RESTmessages');
var con = sql.createConnection(connect);
var blogs = {

    GetLastMessages: function (id, callback) {
        return con.query("SELECT * FROM entry where id = ?", [id], callback);
   },
    GetAll: function(callback){
    return con.query("SELECT * FROM entry",callback)
    },




};
module.exports = blogs;
