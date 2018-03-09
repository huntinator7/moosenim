var controller = {

	getChatrooms: function(io, con, sid, uid) {
		con.query('SELECT * FROM rooms WHERE serialid IN (SELECT room_id FROM room_users WHERE user_id = ?)', [uid], (error, rows) => {
			io.to(sid).emit('roomlist', rows)
		})
	}

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
	}

}
module.exports = controller
