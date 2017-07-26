var mysql = require('mysql');

var con = mysql.createConnection({
    host: "localhost",
    user: "yourusername",
    password: "yourpassword"
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

function sendMessage(message) {
    con.query("INSERT INTO messages (message, username,timestamp) VALUES('" + message + "', 'username', 'time'))");
}

postButton.addEventListener("click", function () {


});