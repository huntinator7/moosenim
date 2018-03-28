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
					console.log('.on called')
					socket.on(event, function() {
						var args = arguments
						$rootScope.$apply(function() {
							callback.apply(socket, args)
						})
					})
				},
				emit: function emit(event, data, data2, callback) {
					if (typeof callback == 'function') {
						socket.emit(event, data, function() {
							var args = arguments
							$rootScope.$apply(function() {
								callback.apply(socket, args)
							})
						})
					} else {
						console.log('.emit called')
						socket.emit(event, data, data2)
					}
				},
			}
		}
	})
	//function modalService($scope,$modal){

	//}
	var app = angular.module('example', ['socket.io'])
		.config(function($socketProvider) {
			$socketProvider.setConnectionUrl('https://moosen.im:443')
		})
		//.service('modalService', modalService)
		.controller('Ctrl', function Ctrl($scope, $socket) {

			$socket.on('pong2', function(data) {
				$socket.emit('retPre', 100, 1)
				$scope.serverResponse = data
				console.log(data)
			})

			$socket.on('motd update', function(motd, roomid) {
				$scope.motd = motd
			})

			$socket.on('roomlist', function(rooms) {
				$scope.roomlist = []
				$scope.roomlist = rooms
			})

			$socket.on('chatmessage2', function(rows) {
				console.log('chet message called' + rows[0].profipic)
				$scope.messages = []
				$scope.messages = rows
			})

			$scope.changeRooms = function changeRooms(roomId) {
				$socket.emit('changerooms', roomId)
				$socket.emit('retPre', 100, roomId)
			}

			$scope.emitBasic = function emitBasic() {
				$scope.dataToSend = '';
			}

			$scope.emitBasic2 = function emitBasic() {
				$socket.emit('chat message', $scope.dataToSend, 3);
				console.log('ping ')
				$scope.dataToSend = '';
			}



			$scope.todo = [
				"pay bills",
				"redo ui",
				"fix bugs",
				"think of more things to do",
			]
		})
