

var db = require('../RESTmessages');

var messages = {

    GetLastMessages: function (id,callback) {
        return db.query("SELECT * FROM ( SELECT * FROM messages WHERE chatroom_id = ? ORDER BY id DESC LIMIT 10) sub ORDER BY  id ASC", [id]);

    },




};
module.exports = messages;
