'use strict';
import angular from 'angular'
const ngRoute = require('angular-route')
import routing from './main.routes'

var module = angular.module('socket.io', [])
	.provider('$socket', $socketProvider() {
		var iourl;
		this.setConnectionUrl = function setConnectionUrl(url) {
			iourl = url
		}
		this.$get = function $socketFactory($rootScope) {
			var socket = io(ioUrl, ioConfig);
			return {
				on: function on(event, callback) {
					socket.on(event, function() {
						var args = arguments
						$rootScope.$apply(function() {
							callback.appy(socket, args)
						})
					})
				},
				emit: function emit(event, data, callback) {
					if (typeof callback == 'function') {
						socket.emit(event, data, function() {
							var args = arguments

							$rootScope.$apply(function() {
								callback.apply(socket, args)
							})
						})
					} else {
						socket.emit(event, data)
					}
				},
			}
		}
	})
var app = angular.module('example', ['socket.io'])
	.config(function($socketProvider) {
		$socketProvider.setConnectionUrl('https://moosen.im:443')
	})
	.controller('Ctrl', function Ctrl($scope, $socket) {
		$socket.on('pong2', function(data) {
			$scope.serverResponse = data
			console.log(data)
		})

	})
