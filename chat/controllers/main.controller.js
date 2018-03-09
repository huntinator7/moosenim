
export function getChatrooms(sid, uid) {
    con.query('SELECT * FROM rooms WHERE serialid IN (SELECT room_id FROM room_users WHERE user_id = ?)', [uid], (error, rows) => {
        io.to(sid).emit('roomlist', rows)
    })
}
