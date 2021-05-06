(function() {
    'use strict';

    angular
        .module('fadStrumag')
        .service('MainService', MainService);

    /** @ngInject */
    function MainService($http) {
        var vm = this; 
        vm.serviceProvider = {
            "getMetadato":function(id,next){
                var request = $http({
                    method: "GET",
                    url: CONFIG.serverRoot + id,
                    withCredentials: true
                });
                request.then(
                    function(data){
                        next(null,data);
                    }
                )
                .catch(
                    function(err){
                        next(err,null);
                    }
                );
            },
            "postMetadato":function(data,next){
                var request = $http({
                    method: "POST",
                    url: CONFIG.serverRoot,
                    data:data,
                    withCredentials: true
                });
                request.then(
                    function(data){
                        next(null,data);
                    }
                )
                .catch(
                    function(err){
                        next(err,null);
                    }
                );
            },
            "putMetadato":function(id,data,next){
                var request = $http({
                    method: "PUT",
                    url: CONFIG.serverRoot + id,
                    data:data,
                    withCredentials: true
                });
                request.then(
                    function(data){
                        next(null,data);
                    }
                )
                .catch(
                    function(err){
                        next(err,null);
                    }
                );
            }
        };
    }
})();