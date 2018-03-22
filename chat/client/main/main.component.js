import angular from 'angular'
const ngRoute = require('angular-route')
import routing from './main.routes'

export class MainController {
	/*@ngInject*/
	constructor($http, User, $uibModal) {
		this.$http = $http
		this.$uibModal = $uibModal
		this.User = User

		//this.Reviews=Reviews
		this.setData()


	}

	setData() {
		this.values = ['search']
		this.input = ['   ']
	}

	}

export function UserService($http) {
	'ngInject'
	var User = {
		getAllUsers() {
            //replace this shit with socket.io stuff
			return $http.get('/api/users/')

		}
	}
	return User
}

export function SearchFilter() {
	console.log('search filter')
  // this.filteredArray = filterFilter(this.input, 'a');
}

export default angular.module('comp3705App.main', [ngRoute])
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