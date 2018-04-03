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

					socket.on(event, function() {
						var args = arguments
						$rootScope.$apply(function() {
							callback.apply(socket, args)
						})
					})
				},
				emit: function emit(event, data, data2,data3,data4,data5,data6,callback) {
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
	var app = angular.module('mainApp', ['socket.io'])
		.config(function($socketProvider) {
			$socketProvider.setConnectionUrl('https://moosen.im:443')
		})
		//.service('modalService', modalService)
		.controller('Ctrl', function Ctrl($scope, $socket) {

			$socket.on('onconnect', function(data) {
				$scope.messages=[]

				$scope.serverResponse = data
			})

			$socket.on('motd update', function(motd, roomid) {
				$scope.motd = motd
			})

			$socket.on('roomlist', function(rooms) {
				$scope.roomlist = []
				$scope.roomlist = rooms
			})
			//fix json formatting.
			$socket.on('chat message', function(Name,message,time,id,profpic,roomId,badge) {

				var msgPack = {
					name:Name,
					message:message,
					time:time,
					profpic:profpic,
					id:id,
					roomId:roomId,
					badge:badge
				}

				$scope.messages.push(msgPack)
			})

			$scope.changeRooms = function changeRooms(roomId) {
				$socket.emit('changerooms', roomId)
				$socket.emit('retPre', 100, roomId)
			}

			$scope.emitBasic = function emitBasic() {
				$scope.dataToSend = '';
			}

			$scope.emitBasic2 = function emitBasic() {
				$socket.emit('chat message', $scope.dataToSend, $scope.messages[0].roomId);

				$scope.dataToSend = '';
			}



			$scope.todo = [
				"pay bills",
				"redo ui",
				"fix bugs",
				"think of more things to do",
			]
		})
