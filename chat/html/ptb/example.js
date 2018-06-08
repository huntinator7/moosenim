angular.module('plunker', ['ui.bootstrap']);

function ListCtrl($scope, $dialog) {
  
  $scope.items = [
    {name: 'foo', value: 'foo value'},
    {name: 'bar', value: 'bar value'},
    {name: 'baz', value: 'baz value'}
  ];
  
  var dialogOptions = {
    controller: 'EditCtrl',
    templateUrl: 'itemEdit.html'
  };

  $scope.edit = function(item){
    
    var itemToEdit = item;
    
    $dialog.dialog(angular.extend(dialogOptions, {resolve: {item: angular.copy(itemToEdit)}}))
      .open()
      .then(function(result) {
        if(result) {
          angular.copy(result, itemToEdit);                
        }
        itemToEdit = undefined;
    });
  };
}
// the dialog is injected in the specified controller
function EditCtrl($scope, item, dialog){
  
  $scope.item = item;
  
  $scope.save = function() {
    dialog.close($scope.item);
  };
  
  $scope.close = function(){
    dialog.close(undefined);
  };
}