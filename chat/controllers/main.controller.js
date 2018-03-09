var request = require('request')


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
	joinRoom: function(con,io, joinCode, uid, sid) {
		con.query('SELECT * FROM rooms WHERE join_code = ?', [joinCode], (error, rows, result) => {
			try {
				con.query('INSERT INTO room_users VALUES(?,?,?,NULL)', [rows[0].serialid, uid, 0]).then(controller.getChatrooms(io, con, sid, uid))
				console.log('user ' + uid + ' was added to room ' + rows[0].serialid)
			} catch (e) {
				console.log(e)
				console.log('room not found -' + joinCode)
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
	getMotd: function(con,io, roomId) {
		con.query('SELECT * FROM rooms WHERE serialid = ?', [roomId], (error, rows) => {
			if (error) console.log(error)
			io.to(roomId).emit('motd update', rows[0].motd, roomId)
		})
	},
    singleGetMotd: function(con,io, roomId, sid) {
        con.query('SELECT * FROM rooms WHERE serialid = ?', [roomId], (error, rows) => {
            if (error) console.log(error)
            io.to(sid).emit('motd update', rows[0].motd, roomId)
        })
    },
    getDoggo:function() {
        return new Promise((resolve, reject) => {
            request('https://dog.ceo/api/breeds/image/random', (err, res, body) => {
                if (err) reject('Website Error')
                console.log('statusCode:', res && res.statusCode)
                if (res && res.statusCode != '200') reject('HTTP Error')
                else resolve(JSON.parse(body).message)
                console.log('body:', JSON.parse(body).message)
            })
        })
    },
    searchUsers: function(con,email) {
        con.query('SELECT * FROM users WHERE email = ?', [email], (error, rows) => {
            return rows[0].uid
        })
    },
    changeRoomTheme: function(con,params, icon, type, roomId) {
        var oldParams = []
        const getOldParams = new Promise(resolve => {
            con.query('SELECT * FROM rooms WHERE serialid = ?', [roomId], (error, rows) => {
                console.log(rows)
                // rows.forEach(e => {
                //     oldParam
                // })
            })
            resolve()
        })
        try {
            if (params[7]) {
                con.query('UPDATE rooms SET back1=?, back2=?,back_img=?,text_color=?,text_color2=?,message_back=?,message_back2=?,icon=?,background_type=? WHERE serialid = ?', [params[0], params[1], params[2], params[3], params[4], null, null, icon, type, roomId])
                console.log(params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], icon, type, roomId)
            } else {
                con.query('UPDATE rooms SET back1=?, back2=?,back_img=?,text_color=?,text_color2=?,message_back=?,message_back2=?,icon=?,background_type=? WHERE serialid = ?', [params[0], params[1], params[2], params[3], params[4], params[5], params[6], icon, type, roomId])
                console.log(params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], icon, type, roomId)
            }
        } catch (e) {
            console.log(e)
        }
    },
    addNewCommand: function(con, roomId, cmd, actn, msg, username, pic) {
        console.log(msg)
        // console.log(encodeURI(msg))
        console.log(roomId + ' new command: ' + cmd)
        var arr = {
            cmd,
            actn,
            msg: encodeURI(msg),
            username,
            pic
        }
        var isValid = true;
        try {
            new RegExp(cmd);
        } catch (e) {
            isValid = false;
        }
        if (isValid) {
            con.query('SELECT commands FROM rooms WHERE serialid = ?', [roomId], (error, rows) => {
                const addCommand = new Promise((resolve, reject) => {
                    var newArr = JSON.parse(rows[0].commands)
                    newArr.push(arr)
                    myArrString = JSON.stringify(newArr)
                    con.query('UPDATE rooms set commands = ? WHERE serialid = ?', [myArrString, roomId])
                    resolve(getRegexCommands(roomId, roomId))
                })

            })
        }
    },
    sendMessage: function(con,message, uid, roomId) {
        var nameString = 'room' + roomId
        // console.log(`In sendMessage, roomId: ${roomId}\nmsg: ${message}`)
        var msg = encodeURI(message)
        try {
            con.query("INSERT INTO ?? (message, timestamp, uid) VALUES ( ?, NOW(), ?)", [nameString, msg, uid], (error, results) => {
                if (error) throw error
            })
        } catch (Exception) {
            console.log('Error inserting message')
        }

    },
    getRegexCommands: function(con, io, roomId, sid) {
        con.query('SELECT commands FROM rooms WHERE serialid = ?', [roomId], (error, rows) => {
            if (error) console.log(error)
            var coms = JSON.parse(rows[0].commands)
            // console.log(coms)
            const decode = new Promise((resolve, reject) => {
                coms.forEach(e => {
                    e.msg = decodeURI(e.msg)
                })
                resolve(io.to(sid).emit('get commands', coms, roomId))
            })
        })
    },
    updateUser: function(con,uid,nickname,url){
      con.query("update users set name=?,profpic=? WHERE uid = ?", [nickname,url,uid], (error, results) => {
          if (error) throw error
      })
    }

}
module.exports = controller
