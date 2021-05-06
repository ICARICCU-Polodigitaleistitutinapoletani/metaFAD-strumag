(function() {
  'use strict';

  angular
    .module('fadStrumag')
    .config(config);

  /** @ngInject */
  function config($logProvider) {
    // Enable log
      $logProvider.debugEnabled(true);
  }

})();
