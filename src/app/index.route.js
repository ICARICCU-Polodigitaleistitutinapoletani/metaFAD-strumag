(function() {
    'use strict';

    angular
        .module('fadStrumag')
        .config(routeConfig);

    function routeConfig($routeProvider) {
        $routeProvider
            .when('/strumag', {
            templateUrl: 'app/strumag/strumag.html',
            controller: 'StrumagCtrl',
        })
            .when('/mag', {
            templateUrl: 'static/meta_fad_strumag/app/views/fileMag.html',
            controller: 'FileMagCtrl',
        })
            .otherwise({
            redirectTo: '/strumag',
        });
    }

})();
