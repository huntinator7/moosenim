'use strict';
// import angular from 'angular'
// const ngRoute = require('angular-route')
// import routing from './main.routes'


var module = angular.module('socket.io', []).provider('$socket', function $socketProvider() {
    var iourl = '';


    this.setConnectionUrl = function setConnectionUrl(url) {
        iourl = url
    }

    this.$get = function $socketFactory($rootScope) {
        var socket = io.connect(iourl);
        return {
            on: function on(event, callback) {

                socket.on(event, function () {
                    var args = arguments
                    $rootScope.$apply(function () {
                        callback.apply(socket, args)
                    })
                })
            },
            emit: function emit(event, data, data2, data3, data4, data5, data6, callback) {
                if (typeof callback == 'function') {
                    socket.emit(event, data, function () {
                        var args = arguments
                        $rootScope.$apply(function () {
                            callback.apply(socket, args)
                        })
                    })
                } else {
                    //console.log('.emit called')
                    socket.emit(event, data, data2, data3, data4, data6)
                }
            },
        }
    }
})

var app = angular.module('mainApp', ['socket.io'])
    .config(function ($socketProvider) {
        $socketProvider.setConnectionUrl('https://moosen.im:443')
    })
    //.service('modalService', modalService)
    .controller('Ctrl', function Ctrl($scope, $socket) {
        $scope.isCollapsed = false
        $scope.messages = []
        moment().format()
        $socket.on('login', function (name, email, photo, uid, roomId) {
            console.log('login called')
            $scope.messages = []
            $socket.emit('getuser', $scope.roomId)

            $scope.dateString = moment().format('MM/DD/YYYY')

        })
        $socket.on('onconnect', function (data, isAdmin) {
            $scope.username = data[0].name
            $scope.roomId = data[0].curroom
            console.log('curroom = ' + data[0].curroom)

        })

        $socket.on('motd update', function (motd, roomid) {
            $scope.motd = motd

        })

        $socket.on('roomlist', function (rooms) {
            $scope.roomlist = []
            $scope.roomlist = rooms

        })
        $socket.on('getadminstatus', (rows) => {

            //$scope.adminStatus = rows.is_admin
        })

        $socket.on('chat message', function (Name, message, time, id, profpic, roomId, badge) {

            var msgPack = {
                name: Name,
                message: message,
                time: time,
                profpic: profpic,
                id: id,
                roomId: roomId,
                badge: badge
            }

            $scope.messages.push(msgPack)
        })
        $socket.on('get todo', (todolist, roomId) => {
            $scope.todo = []
            todolist.forEach((e, f) => {
                $scope.todo.push(e)
            })

        })

        $scope.changeRooms = function changeRooms(roomId) {
            $scope.messages = []
            $socket.emit('changerooms', roomId)
            $scope.roomId = roomId
        }

        $scope.emitBasic = function emitBasic() {
            console.log(moment.duration($scope.dateString.diff(moment())).get('hours'))
        }
        $scope.submitTodo = function submitTodo() {

            $socket.emit('addtodo', $scope.roomId, $scope.todotags, $scope.todomsg, moment().format('MM/DD/YYYY'))

            $scope.todomsg = ''
            $scope.todotags = ''
			console.log($scope.todotags, $scope.todomsg, $scope.dateString)
        }
        $scope.deleteTodo = function deleteTodo(todo) {
            console.log(todo)
            $socket.emit('removetodo', todo, $scope.roomId)
        }
        $scope.sendMessage = function sendMessage() {

            $socket.emit('chat message', $scope.dataToSend, $scope.roomId);

            $scope.dataToSend = '';
        }


    })
    .controller('VRapp', function modalCtrl($scope,$socket) {
      $scope.boxX='-3  0.5 -4'
      var theBox = document.getElementById("theBox")
      var sceneEl = document.querySelector('a-scene')
      var camera = document.getElementById("controller")
      var pos = document.querySelector('#camera').getAttribute('position')
      var totalPlayers = []
      console.log('is it looping?')
      $socket.emit('vrconnection', 0, 0)
      console.log('is it looping?')
      $socket.on('vrUpdatePos', function (players,uid) {
                console.log("successful reply"+uid)
                //totalPlayers = players
            //    players = [1,2,3,4]
                console.log('pre-loop: ' + players.length)
                $scope.uid = uid
                players.forEach(p => {
                    if(players.length>100) players=[]
                    console.log('p:' + players.length)
                //    if (p.uid != uid) {
                        console.log('if triggered:'+ players.length)
                        var avatar = document.createElement('a-entity')
                        avatar.setAttribute('position', { x: p.x, y: 1, z: p.z })

                        avatar.setAttribute('geometry', {
                            primitive: 'cylinder',
                            height: 1.5,
                            radius: 0.5
                        })
                        avatar.setAttribute('material', 'color', 'red')
                        sceneEl.appendChild(avatar)
                        totalPlayers.push(avatar)
                    //}
           })

            })
        $socket.on('vrTest', function (players) {
            try {
                console.log('box x: ' + camera.object3D.position.x + ' box z: ' + camera.object3D.position.z)
                  console.log('camera x: ' + pos.x + ' camera z: ' + pos.z)
                for (var i = 0; i < players.length; i++) {
                    //console.log('vrTest: ')
                    totalPlayers[i].setAttribute('position', { x: players[i].x, y: 1, z: players[i].y })

                }
                $socket.emit('vrlocalPos', $scope.uid, pos.x, pos.z)
            } catch (e) {
                console.log(e)
        }
})
      console.log('box x: ' + camera.object3D.position.x + ' box z: ' + camera.object3D.position.z+' '+$scope.boxX)

    })
