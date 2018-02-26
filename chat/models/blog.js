
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
        return con.query("SELECT * FROM ( SELECT * FROM entry WHERE id = ? ORDER BY id DESC LIMIT 10) sub ORDER BY  id ASC", [id], callback);
   },
    GetAll: function(callback){
    return con.query("SELECT * FROM entry")
    },




};
module.exports = blogs;
