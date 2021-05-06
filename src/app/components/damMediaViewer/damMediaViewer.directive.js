(function() {
  'use strict';

  angular
    .module('damMediaViewerMdl')
    .directive('damMediaViewer', damMediaViewer);

  /** @ngInject */
    function damMediaViewer() {
        var directive = {
            restrict: 'E',
            templateUrl: 'app/components/damMediaViewer/damMediaViewer.html',
            scope: {
                medias:"=",
                options:"="
            },
            controller: damMediaViewerController,
            controllerAs: 'damMediaViewer',
            bindToController: true,
            replace:true
        };
        return directive;
    }

    /** @ngInject */
    function damMediaViewerController($scope,$sce,$element) {
        // inizializzo una variabile che referenzia il modulo
        var vm = this;
        var render = function(){
            $element.find(".body img").on("load",$scope.setInitZoom);
            vm.setMedia(1);  
        };
        vm.pdfjsViewer = {
            url: CONFIG.status === "dev" ? "../bower_components/pdfjs-viewer/web/viewer.html" : "pdfjs-viewer/web/viewer.html"
        };
        vm.videogular = {};
        vm.videogular.onUpdateTime = function(current,total) {
            vm.videogular.currentTime = current*1000;
            vm.videogular.totalTime = total*1000;
        };
        vm.videogular.config = {
            sources: [],
            plugins: {
                poster: ""
            }
        };
        vm.close = function(){
            var params = vm.options.fnClosePrm;
            vm.options.fnClose.apply(this,params);
        }
        vm.currentMedia = 1;
        vm.totalMedias = vm.medias.length;
        vm.media = null;
        vm.prev = false;
        vm.next = false;
        vm.setMedia = function(val,dir){
            vm.currentMedia = val ? val : dir ? vm.currentMedia+dir : 1;
            vm.media = vm.medias[vm.currentMedia-1];
            if(vm.media.type==="PDF"){
                vm.media.PdfUrl = vm.pdfjsViewer.url + "?file=" + vm.media.url;
            }
            else if(vm.media.type==="VIDEO"){
                var extension = vm.media.url.split('.').pop();
                var source = {
                    src: $sce.trustAsResourceUrl(vm.media.url), type:"video/" + extension
                };
                vm.videogular.config.sources.push(source);
            }
            else {
                vm.media.url = vm.media.url + "?timestamp=" + new Date().getTime();
                $element.find(".body img").off().on("load",$scope.setInitZoom);
            }
            vm.prev = vm.currentMedia>1 ? true : false;
            vm.next = vm.currentMedia<(vm.medias.length) ? true : false;
        };
        $scope.$watch("damMediaViewer.currentMedia",function(newVal,oldVal){
            if(newVal && newVal !== oldVal){
                vm.setMedia(newVal);
            } 
        });
        vm.setZoom = null;
        $scope.setInitZoom = function(ev){
            var zoomWidth = null;
            var zoomHeight = null;
            var widthBody = $element.find('.body').width();
            var heightBody = $element.find('.body').height();
            var widthImg = $element.find('.body img').width();
            var heightImg = $element.find('.body img').height();
            if(widthImg>widthBody){
                zoomWidth = widthBody/widthImg;
            }
            if(heightImg>heightBody){
                zoomHeight = heightBody/heightImg;
            }
            if(zoomWidth && zoomHeight){
                vm.setZoom = zoomWidth<=zoomHeight ? zoomWidth : zoomHeight;
            }
            else{
                vm.setZoom = zoomWidth || zoomHeight || 1;
            }
            $element.find('.body img').css("zoom",vm.setZoom);
            $element.find(".body img").off("load");
        };
        vm.zoomIn = function(){
            vm.setZoom+=0.2;
            $element.find('.body img').css("zoom",vm.setZoom);
        };
        vm.zoomOut = function(){
            vm.setZoom-=0.2;
            $element.find('.body img').css("zoom",vm.setZoom);
        };
        vm.panelActive = false;
        vm.toggleEle = function(ele){
            if(ele)
                return false;
            else{
                return true;
            }
        };
        vm.getDefaultUrl = function(type){
            var defImg = "";
            switch(type) {
                case "IMAGE":
                    defImg = "img/default_document.png"
                    break;
                case "PDF":
                    defImg = "img/default_pdf.png"
                    break;
                case "VIDEO":
                    defImg = "img/default_video.png"
                    break;
                case "AUDIO":
                    defImg = "img/default_audio.png"
                    break;
                case "CONTAINER":
                    defImg = "img/default_document.png"
                    break;
                default:
                    "img/default_document.png"
            };
            return defImg;
        };
        vm.checkSupportedMedia = function(tipo){
            var supportMedia = ["IMAGE","VIDEO","AUDIO","PDF"];
            var support = supportMedia.indexOf(tipo) !==-1 ? true : false;
            return support;
        };
        render();
    }
})();
