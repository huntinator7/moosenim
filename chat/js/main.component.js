var angular = require('angular');
const ngRoute = require('angular-route')
var routing = require( './main.routes')

angular.module("myapp", [])

.controller("HelloController", function($scope) {
   $scope.helloTo = {};
   $scope.helloTo.title = "AngularJS-test";

}
);
