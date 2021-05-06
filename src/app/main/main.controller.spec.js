(function() {
  'use strict';

  describe('controllers', function(){
    var vm;
    var $timeout;
    beforeEach(module('struMag'));
    beforeEach(inject(function(_$controller_, _$timeout_) {
      vm = _$controller_('MainController');
      $timeout = _$timeout_;
    }));

    /*it('should define more than 5 awesome things', function() {
      expect(angular.isArray(vm.awesomeThings)).toBeTruthy();
      expect(vm.awesomeThings.length === 5).toBeTruthy();
    });*/
  });
})();
