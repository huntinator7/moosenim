var angular = require('angular');
const ngRoute = require('angular-route')
var routing = require( './main.routes')

  function MainController() {
	/*@ngInject*/
	constructor($http, User, $uibModal) {
		this.$http = $http
		this.$uibModal = $uibModal
		this.User = User

		//this.Reviews=Reviews
		this.setData()
console.log('hello from main.component')

	}

	setData() {
		this.values = ['search']
		this.input = ['   ']
	}

	}

  function UserService($http) {
	'ngInject'
	var User = {
		getAllUsers() {
            //replace this shit with socket.io stuff
			return $http.get('moosen.im/blog/blog')

		}
	}
	return User
}

  function SearchFilter() {
	console.log('search filter')
  // this.filteredArray = filterFilter(this.input, 'a');
}

  default angular.module('Herd.main', [ngRoute])
	.config(routing)
	.filter('Search',SearchFilter)
	//.service('Recipes', RecipeService)
	.controller('FilterController', ['input', function FilterController(filterFilter) {
  this.array = [

  ];
  this.filteredArray = filterFilter(this.array, 'a');
}])
//	.service('Reviews',ReviewService)
	.component('main', {
		template: require('./main.html'),
		controller: MainController,
		controllerAs: 'mainController'
	}).name;
