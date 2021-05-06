(function() {
  'use strict';

  angular
    .module('fadStrumag')
    .run(runBlock);

  /** @ngInject */
  function runBlock($log) {

    $log.debug('runBlock end');
  }

})();
