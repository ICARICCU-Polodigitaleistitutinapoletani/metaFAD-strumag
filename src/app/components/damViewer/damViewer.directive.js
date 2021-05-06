(function () {
    angular.module('damViewer').directive('damViewer', function ($parse, $uibModal) {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: 'app/components/damViewer/damViewer.html',
            link: function (scope, element, attributes) {
                scope.$watch(attributes.mediaList, function (value) {
                    if (value) {
                        scope.mediaList = value;
                        scope.nextMedia();
                    }

                }, true);

                scope.$watch('attributes.treeSource', function (value) {
                    if (value && value.length) {
                        scope.treeSource = value;
                    }

                }, true);

                scope.previousMedia = function () {
                    if (scope.mediaList) {
                        var newMediaIndex = 0;
                        if (scope.currentMedia) {
                            if (scope.mediaList.indexOf(scope.currentMedia) > 0) {
                                newMediaIndex = (scope.mediaList.indexOf(scope.currentMedia) - 1) % scope.mediaList.length;
                            } else {
                                newMediaIndex = scope.mediaList.length - 1;
                            }
                        }
                        scope.currentMedia = scope.mediaList[newMediaIndex];
                    }
                }

                scope.nextMedia = function () {
                    if (scope.mediaList) {
                        var newMediaIndex = 0;
                        if (scope.currentMedia && scope.mediaList.length > 0) {
                            newMediaIndex = (scope.mediaList.indexOf(scope.currentMedia) + 1) % scope.mediaList.length;
                        }
                        if (scope.mediaList.length > 0) {
                            angular.element("#currentMedia").show();
                            scope.currentMedia = scope.mediaList[newMediaIndex];
                        } else {
                            scope.currentMedia = [];
                            angular.element("#currentMedia").hide();
                        }
                    }
                }

                scope.closeDamViewer = function () {
                    angular.element("dam-viewer").parent().hide();
                }

                scope.fullScreen = function () {

                }


                scope.viewLightbox = function (sidebar) {
                    if (scope.mediaList && scope.mediaList.length > 0) {
                        var modalInstance = $uibModal.open({
                            animation: true,
                            templateUrl: 'myModalContent.html',
                            controller: 'ModalInstanceCtrl',
                            // appendTo: angular.element(".damViewer"),
                            windowClass: 'damLightbox',
                            appendTo: angular.element("body"),
                            size: 'lg',
                            backdrop: 'static',
                            resolve: {
                                items: function () {
                                    return scope.mediaList;
                                },
                                current: function () {
                                    return scope.currentMedia;
                                },
                                sidebar: function () {
                                    return sidebar;
                                },
                                treeSource: function () {
                                    return scope.treeSource;
                                }
                            }
                        });
                        angular.element("body").addClass('no-overflow');

                        modalInstance.result.then(function (selectedItem) {
                            scope.selected = selectedItem;
                        }, function () {
                        });
                    }
                };

                scope.toggleAnimation = function () {
                    //scope.animationsEnabled = !scope.animationsEnabled;
                };
            }
        }
    });


    angular.module('damViewer').controller('ModalInstanceCtrl', function ($scope, $rootScope, $uibModalInstance, items, current, sidebar, treeSource) {
        $scope.zoomCurrentImage = 1;
        $scope.isFullScreen = false;
        $scope.sidebar = sidebar;
        $scope.items = items;
        if (items) {
            $scope.selected = {
                item: $scope.items[0]
            };
        }
        $scope.currentImage = current;
        $uibModalInstance.closed.then(function () {
            angular.element("body").removeClass('no-overflow');
        });

        $scope.$watch('$viewContentLoaded', function () {
            $(".container").height(($(window).height() * 3) / 4);
            $(".left-sidebar").height(($(window).height() * 3) / 4);
            $(".left-tree").height(($(window).height() * 3) / 4);
            $('#currentImage').draggable({
                disabled: true,
                cursor: 'move'
            });
            if ($scope.sidebar) {
                $scope.showSidebar();
            } else {
                $scope.controlZoom();
                $scope.controlDrag();
            }
        });
        $scope.goFullScreen = function () {
            if (!$scope.isFullScreen) {
                $(".left-sidebar").height($(window).height() - $(".modal-header").height());
                $(".left-tree").height($(window).height() - $(".modal-header").height());
                $(".container").height($(window).height() - $(".modal-header").height());
                $(".ng-isolate-scope .modal-dialog").height($(window).height());
                $(".ng-isolate-scope .modal-dialog").width($(window).width());
                $(".ng-isolate-scope .modal-dialog").css("margin-top", "0");
                $scope.isFullScreen = true;
            } else {
                $(".container").height(($(window).height() * 3) / 4);
                $(".left-sidebar").height(($(window).height() * 3) / 4);
                $(".left-tree").height(($(window).height() * 3) / 4);
                $(".ng-isolate-scope .modal-dialog").removeAttr('style');
                $scope.isFullScreen = false;
            }
            $scope.controlZoom();
            $scope.controlDrag();
        }

        $scope.controlDrag = function () {
            var img;
            if ($scope.currentImage) {
                img = new Image();
                img.onload = function () {

                    $('#currentImage').css("left", 0);
                    $('#currentImage').css("top", 0);
                    var currentImageHeight = this.height * $scope.zoomCurrentImage;
                    var currentImageWidth = this.width * $scope.zoomCurrentImage;
                    console.log("dimensioni immagini: " + currentImageWidth + " , " + currentImageHeight);

                    var containerHeight = $('.container').height();
                    var containerWidth = $('.container').width();
                    console.log("dimensioni container: " + containerWidth + " , " + containerHeight);
                    if (currentImageWidth > containerWidth) {
                        $scope.enableDragX = true;
                    } else {
                        $scope.enableDragX = false;
                    }
                    if (currentImageHeight > containerHeight) {
                        $scope.enableDragY = true;
                    } else {
                        $scope.enableDragY = false;
                    }

                    if ($scope.enableDragX || $scope.enableDragY) {
                        $('#currentImage').draggable("option", "disabled", false);
                        //$scope.controlZoom(this.height, this.width, containerWidth, containerHeight);
                    } else {
                        $('#currentImage').draggable("option", "disabled", true);
                    }
                }
                img.src = $scope.currentImage.mediaUrlOriginal;
                //img.src = $scope.currentImage.mediaUrlOriginal;
            }

        }

        $scope.controlZoom = function () {
            var img = new Image();
            var initialHeight = window.innerHeight * 70 / 100;
            var initialWidth = window.innerWidth * 30 / 100;
            img.onload = function () {
                // var imgH = this.height;
                // var imgW = this.width;
                // var conH = $('.container').height();
                // var conW = $('.container').width();
                // var rH = conH / imgH;
                // console.log("rapporto H" + rH);
                // var rW = conW / imgW;
                // console.log("rapporto W" + rW);
                // if (imgH > imgW) {
                //     $scope.zoomCurrentImage = (rH < rW) ? rH : rW;
                // } else {
                //     $scope.zoomCurrentImage = (rH > rW) ? rH : rW;
                // }


                var imageH = img.height;
                var imageW = img.width;
                var widthBody, heightBody;
                widthBody = initialWidth - 25;
                heightBody = initialHeight - 40 - 25;
                var imgEl = $('#currentImage');
                var diffH = imageH - heightBody;
                var diffW = imageW - widthBody;

                var newImageW, newImageH;
                if (diffH > diffW) {
                    // Adatto l'immagine all'altezza della finestra e calcolo la larghezza
                    newImageH = heightBody;
                    newImageW = imageW * newImageH / imageH;
                } else {
                    // adatto l'immagine alla larghezza della finestra e calcolo l'altezza
                    newImageW = widthBody;
                    newImageH = imageH * newImageW / imageW;
                }
                imgEl.css({
                    'width': newImageW + 'px',
                    'height': newImageH + 'px'
                });
                $scope.initialImgWidth = newImageW;
                $scope.initialImgHeight = newImageH;
                $scope.zoomCurrentImage = 1;
                $scope.setZoomCurrentImage();
            }
            img.src = $scope.currentImage.mediaUrlOriginal;
        }
        $scope.fit = function() {

        };
        $scope.setZoomCurrentImage = function () {
            var currentImg = $("#currentImage");
            currentImg.css({
                "transform-origin": "top center",
                "-moz-transform": "scale(" + $scope.zoomCurrentImage + ")",
                "-webkit-transform": "scale(" + $scope.zoomCurrentImage + ")",
                "transform": "scale(" + $scope.zoomCurrentImage + ")"
            });
        }

        $scope.closeMyModal = function () {
            $uibModalInstance.close();
            angular.element("body").removeClass('no-overflow');
        }

        $scope.firstMedia = function () {
            if ($scope.items.length > 1) {
                /*$("#currentImage").css("zoom", 1);*/
                $scope.zoomCurrentImage = 1;
                if ($scope.items.length != 0) {
                    $scope.currentImage = $scope.items[0];
                }
                $scope.currentId = $scope.currentImage.id;
                $scope.controlZoom();
                $scope.controlDrag();
            }
        }

        $scope.lastMedia = function () {
            if ($scope.items.length > 1) {
                /*$("#currentImage").css("zoom", 1);*/
                $scope.zoomCurrentImage = 1;
                if ($scope.items.length != 0) {
                    $scope.currentImage = $scope.items[$scope.items.length - 1];
                }
                $scope.currentId = $scope.currentImage.id;
                $scope.controlZoom();
                $scope.controlDrag();
            }
        }

        if (current) {
            $scope.currentId = current.id;
        }

        $scope.previousMedia = function () {
            if ($scope.items.length > 1) {
                /*$("#currentImage").css("zoom", 1);*/
                $scope.zoomCurrentImage = 1;
                var newMediaIndex = 0;
                if ($scope.items.length != 0) {
                    if ($scope.items.indexOf($scope.currentImage) > 0) {
                        newMediaIndex = ($scope.items.indexOf($scope.currentImage) - 1) % $scope.items.length;
                    } else {
                        newMediaIndex = $scope.items.length - 1;
                    }
                    $scope.currentImage = $scope.items[newMediaIndex];
                }
                $scope.currentId = $scope.currentImage.id;
                $scope.controlZoom();
                $scope.controlDrag();
            }
        }

        $scope.selectMedia = function (index) {
            /*$("#currentImage").css("zoom", 1);*/
            $scope.zoomCurrentImage = 1;
            $scope.currentImage = $scope.items[index];
            $scope.currentId = $scope.currentImage.id;
            $scope.controlZoom();
            $scope.controlDrag();
        }

        $scope.nextMedia = function () {
            if ($scope.items.length > 1) {
                /*$("#currentImage").css("zoom", 1);*/
                $scope.zoomCurrentImage = 1;
                var newMediaIndex = 0;
                if ($scope.items.length != 0) {
                    newMediaIndex = ($scope.items.indexOf($scope.currentImage) + 1) % $scope.items.length;
                    $scope.currentImage = $scope.items[newMediaIndex];
                }
                console.log($scope.currentImage);
                $scope.currentId = $scope.currentImage.id;
                $scope.controlZoom();
                $scope.controlDrag();
            }
        }
        $scope.currentZoom;
        $scope.zoomIn = function () {
            if ($scope.zoomCurrentImage < 4) {
                $scope.zoomCurrentImage = $scope.zoomCurrentImage + 0.2;
                $scope.setZoomCurrentImage();
                $scope.controlDrag();
            }
        }

        $scope.zoomOut = function () {
            if ($scope.zoomCurrentImage > 0.2) {
                $scope.zoomCurrentImage = $scope.zoomCurrentImage - 0.2;
                $scope.setZoomCurrentImage();
                $scope.controlDrag();
            }
        }

        $scope.showSidebar = function () {
            angular.element(".modalTitle").show();
            if ($('.left-sidebar').css('display') == 'none') {
                /*$("#currentImage").css("zoom", 1);*/
                $scope.zoomCurrentImage = 1;
                $('.left-tree').hide();
                $('.left-sidebar').show();
                if ($scope.mediaList && $scope.mediaList.length == 0) {
                    angular.element("#currentImage").hide();
                } else {
                    angular.element("#currentImage").show();
                }
                if ($scope.allItems) {
                    $scope.items = $scope.allItems;
                }
                $('.container').css('width', '80%');
                //$('.container').css('margin-left','20%');
                $scope.controlZoom();
                $scope.controlDrag();
                console.log($scope.items);
            } else {
                $scope.zoomCurrentImage = 1;
                if ($scope.mediaList && $scope.mediaList.length == 0) {
                    angular.element("#currentImage").hide();
                } else {
                    angular.element("#currentImage").show();
                }
                /*$("#currentImage").css("zoom", 1);*/

                $('.left-sidebar').hide();
                $('.container').css('width', '100%');
                //$('.container').css('margin-left','0');
                $scope.controlZoom();
                $scope.controlDrag();
            }
        }

        $scope.showTree = function () {
            angular.element(".modalTitle").show();
            if ($('.left-tree').css('display') == 'none') {
                /*$("#currentImage").css("zoom", 1);*/
                $scope.zoomCurrentImage = 1;
                $scope.treeIsShown = true;
                var oldActiveNode = angular.element('.left-tree :ui-fancytree').fancytree("getTree").getActiveNode();
                if (oldActiveNode) {
                    oldActiveNode.setActive(false);
                }
                if ($scope.mediaList && $scope.mediaList.length == 0) {
                    angular.element("#currentImage").hide();
                } else {
                    angular.element("#currentImage").show();
                }
                /*$("#currentImage").css("zoom", 1);*/
                $scope.zoomCurrentImage = 1;
                $('.left-sidebar').hide();
                $('.left-tree').show();
                $('.container').css('width', '70%');
                //$('.container').css('margin-left','20%');
                $scope.controlZoom();
                $scope.controlDrag();
            } else {
                $scope.treeIsShown = false;
                if ($scope.mediaList && $scope.mediaList.length == 0) {
                    angular.element("#currentImage").hide();
                } else {
                    angular.element("#currentImage").show();
                }
                if ($scope.allItems) {
                    $scope.items = $scope.allItems;
                }
                console.log($scope.allItems);
                /*$("#currentImage").css("zoom", 1);*/
                $scope.zoomCurrentImage = 1;
                $('.left-tree').hide();
                $('.container').css('width', '100%');
                //$('.container').css('margin-left','0');
                $scope.controlZoom();
                $scope.controlDrag();
                console.log($scope.items);
            }
        }

        $scope.treeConfigViewer = {
            extensions: ["dnd", "glyph"],
            activate: function (event, data) {
                $scope.tree = angular.element('.left-tree :ui-fancytree').fancytree("getTree");
                // Funzionalità per filtrare i media in base alla cartella cliccata
                // if($scope.items){
                //     if(!$scope.allItems || ($scope.allItems && JSON.stringify($scope.allItems) == JSON.stringify($scope.items) ) ){console.log("Entrato per modificare");
                //         $scope.allItems = $scope.items;
                //     }
                //     $scope.items = new Array();
                //     var newArraylogic = new Array();

                //     for(var i=0; i < $scope.allItems.length; i++){
                //         if($scope.allItems[i].keyNode == $scope.tree.getActiveNode().key){
                //             newArraylogic.push($scope.allItems[i]);
                //         }
                //         if ($scope.allItems[i].aliasKeyNode && $scope.allItems[i].aliasKeyNode.indexOf($scope.tree.getActiveNode().key) !== -1) {
                //             var obj = _.clone($scope.allItems[i]);
                //             obj.alias = true;
                //             delete obj.$$hashKey;
                //             newArraylogic.push(obj);
                //         }
                //     }

                //     $scope.$apply(function(){
                //         $scope.items = newArraylogic;
                //         if($scope.items.length != 0){
                //             $scope.currentImage = $scope.items[0];
                //             angular.element(".modalTitle").show();
                //             angular.element("#currentImage").show();
                //         }
                //         else{
                //             angular.element(".modalTitle").hide();
                //             angular.element("#currentImage").hide();
                //         }
                //     });
                // }
                for (var i = 0; i < $scope.items.length; i++) {
                    if ($scope.items[i].keyNode == $scope.tree.getActiveNode().key) {
                        $scope.$apply(function () {
                            $scope.currentImage = $scope.items[i];
                            angular.element(".modalTitle").show();
                            angular.element("#currentImage").show();
                        });
                        return;
                    }
                    if ($scope.items[i].aliasKeyNode && $scope.items[i].aliasKeyNode.indexOf($scope.tree.getActiveNode().key) !== -1) {
                        $scope.$apply(function () {
                            $scope.currentImage = $scope.items[i];
                            angular.element(".modalTitle").show();
                            angular.element("#currentImage").show();
                        });
                        return;
                    }
                }
                return true;
            },
            glyph: {
                map: {
                    doc: "fa fa-align-left",
                    docOpen: "fa fa-align-left",
                    checkbox: "fa fa-unchecked",
                    checkboxSelected: "fa fa-check",
                    checkboxUnknown: "fa fa-share",
                    dropMarker: "fa fa-arrow-right",
                    expanderClosed: "fa fa-caret-right",
                    expanderOpen: "fa fa-caret-down",
                    folder: "fa fa-folder",
                    folderOpen: "fa fa-folder-open",
                }
            },
            dnd: {
                // autoExpandMS: 400,
                // draggable: {
                //     zIndex: 1000,
                //     scroll: false,
                //     revert: "invalid"
                // },
                // preventVoidMoves: true,
                // preventRecursiveMoves: true,
                // dragStart: function (node, data) {
                //     if (node.parent.children.length > 1) {
                //         node.parent.folder = true;
                //     }
                //     else {
                //         node.parent.folder = false;
                //     }
                //     node.parent.renderStatus();
                //     return true;
                // },
                // dragEnter: function (node, data) {
                //     return true;
                // },
                // dragOver: function (node, data) {
                // },
                // dragLeave: function (node, data) {

                // },
                // dragStop: function (node, data) {
                //     if (node.parent.children.length > 0) {
                //         node.parent.folder = true;
                //     }
                //     else {
                //         node.parent.folder = false;
                //     }
                //     node.parent.renderStatus();
                // },
                // dragDrop: function (node, data) {

                //     data.otherNode.moveTo(node, data.hitMode);
                //     if (node.children && node.children.length > 0) {
                //         node.folder = true;
                //     }
                //     else {
                //         node.folder = false;
                //     }
                //     node.renderStatus();
                // }
            },

            source: treeSource,
            renderNode: function (event, data) {
                var node = data.node;
                angular.element(node.span).find(".fa-trash").remove();
                var deleteButton = angular.element('<i class="fa fa-trash right"></i>');
                angular.element(node.span).append(deleteButton);
                deleteButton.hide();
                deleteButton.click(function () {
                    console.log(node);
                    if (node.parent.children.length == 1) {
                        node.parent.folder = false;
                    } else {
                        node.parent.folder = true;
                    }
                    node.parent.renderStatus();
                    node.remove();
                });
                angular.element(node.span).hover(function () {
                    //deleteButton.show();
                }, function () {
                    deleteButton.hide();
                });
                if ($scope.currentCollectionFolder && node.data.id == $scope.currentCollectionFolder.id) {
                    node.setActive();
                }
            },
            removeNode: function (event, data) {
                $scope.nameFolder = "";
                $scope.$apply();
                this.reload();
            }
        };


    });
}());
