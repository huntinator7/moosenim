var controller = {

	getChatrooms: function(io, con, sid, uid) {
		con.query('SELECT * FROM rooms WHERE serialid IN (SELECT room_id FROM room_users WHERE user_id = ?)', [uid], (error, rows) => {
			io.to(sid).emit('roomlist', rows)
		})
	},

	addToRoom: function(con, email, roomId, isAdmin) {
		con.query('SELECT * FROM users WHERE email = ?', [email], (error, rows, result) => {
			try {
				rows.forEach(e => {
					con.query('INSERT INTO room_users VALUES(?,?,?,?)', [roomId, e.uid, isAdmin, 0])
					console.log('user ' + e.uid + ' was added to room ' + roomId)
				})
			} catch (e) {
				console.log(e)
				console.log('user not found')
			}
		})
	},

    createChatroom: function(con, n, uid) {
        var roomId
        try {
            var promise1 = new Promise((resolve, reject) => {
                resolve('Success!')

                var name = n
                // get availible chatrooms from user SELECT room_id FROM room_users WHERE user_id = ? [user.uid]
                con.query('INSERT INTO rooms (name,motd,join_code,back1,back2,text_color,icon,text_color2,background_type,message_back2,commands) VALUES(?,?,?,?,?,?,?,?,?,?,?)', [name, 'motd', uuidv4(), '#6EB7FF', '#23ffdd', '#000000', 'https://moosen.im/uploads/moosenim4ColoredSmall.png', '#000000', 0, '#000000', '[{"cmd":"!ping","actn":"Respond","msg":"Pong!","username":"Server","pic":"https://cdnimages.opentip.com/full/8DHS/8DHS-AB05520.jpg"}] '], error => {
                    console.log(error)
                    //  getChatrooms(socket.id,uid)
                })
            })
            promise1.then(() => {
                con.query('SELECT * FROM ( SELECT * FROM rooms ORDER BY serialid DESC LIMIT 1) sub ORDER BY  serialid ASC', (error, rows, results) => {
                    con.query('INSERT INTO room_users VALUES(?,?,1,0)', [rows[0].serialid, uid])
                    var id = rows[0].serialid
                    console.log(id + ' new room id')
                    con.query('CREATE TABLE ?? (id int AUTO_INCREMENT PRIMARY KEY, message text, timestamp VARCHAR(32), uid VARCHAR(100))', ['room' + id])
                })
            })

        } catch (e) {
            console.log('error creating new room: ' + e)
        }
    },
    joinRoom: function(con,joinCode, uid, sid) {
        con.query('SELECT * FROM rooms WHERE join_code = ?', [joinCode], (error, rows, result) => {
            try {
                con.query('INSERT INTO room_users VALUES(?,?,?,NULL)', [rows[0].serialid, uid, 0]).then(controller.getChatrooms(io,con,sid, uid))
                console.log('user ' + uid + ' was added to room ' + rows[0].serialid)
            } catch (e) {
                console.log(e)
                console.log('room not found -' + joinCode)
            }
        })
    },
}
module.exports = controller
