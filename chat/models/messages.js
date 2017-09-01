
var sql = require('mysql');
var connect = {
    host: "localhost",
    user: "root",
    password: "raspberry",
    database: "moosenim"
};
module.exports = connect;
var db = require('../RESTmessages');

var messages = {

    GetLastMessages: function (id, callback) {
        return connect.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? ORDER BY id DESC LIMIT 10) sub ORDER BY  id ASC", [id], callback);

    },




};
module.exports = messages;
