
var event
var camera = document.getElementById("controller")

var theBox = document.getElementById("theBox")
// var ground = document.getElementById("ground")
$(function () {
    var uid = socket.id
    var sceneEl = document.querySelector('a-scene')
    var Xpos = Math.random(10) * 10
    var Zpos = Math.random(10) * 10
    var totalPlayers = []
    // ground.Three.Color = new Three.Color(0x003711)
    socket.emit('vrconnection', uid, Xpos, Zpos)
    var p = { x: Xpos, z: Zpos, uid: uid }

    uid = socket.id

    socket.on('vrUpdatePos', function (players) {
        console.log("successful reply")
        totalPlayers = [];
        for (var i = 0; i < players.length; i++) {
            if (players.uid != uid) {
                var avatar = document.createElement('a-entity')
                avatar.setAttribute('position', { x: players[i].x, y: 1, z: players[i].z })

                avatar.setAttribute('geometry', {
                    primitive: 'cylinder',
                    height: 1.5,
                    radius: 0.5
                })
                avatar.setAttribute('material', 'color', 'red')
                sceneEl.appendChild(avatar)
                totalPlayers.push(avatar)

            }
        }


    })
    console.log("before")

    var oldX = 0
    var oldZ = 0


    console.log("after")
    socket.on('vrTest', function (players) {
        var theBox = document.getElementById("theBox")
        var camera = document.getElementById("controller")
        var pos = document.querySelector('#camera').getAttribute('position')
        try {
            for (var i = 0; i < players.length; i++) {

                totalPlayers[i].setAttribute('position', { x: players[i].x, y: 1, z: players[i].y })
            }

            // theBox.setAttribute('position', { x: pos.x, y: 1, z: pos.z })

            console.log('box x: ' + theBox.object3D.position.x + ' box z: ' + theBox.object3D.position.z)
            socket.emit('vrlocalPos', uid, pos.x, pos.z)
        } catch (e) {
            console.log(e)
        }

    })
})
