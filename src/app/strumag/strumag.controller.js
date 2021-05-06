(function () {
    'use strict';
    angular.module('fadStrumag')
        .run(function ($templateCache) {
            $templateCache.put('angular-advanced-searchbox.html',
                "<div class=\"advancedSearchBoxContainer\"><div class=\"advancedSearchBox col-xs-9\" ng-class={active:focus} ng-init=\"focus = false\"><div><a id=\"removeAllFilters\"ng-href=\"\" ng-show=\"false\" ng-click=removeAll() role=button><span class=\"remove-all-icon glyphicon glyphicon-trash\"></span></a><div class=search-parameter ng-repeat=\"searchParam in searchParams\"><a ng-href=\"\" ng-click=removeSearchParam($index) role=button><span class=\"remove glyphicon glyphicon-remove-circle\"></span></a><div class=key>{{searchParam.name}}:</div><div class=value><span ng-show=!searchParam.editMode ng-click=enterEditMode($index)>{{searchParam.value}}</span> <input name=value nit-auto-size-input nit-set-focus=searchParam.editMode ng-keydown=\"keydown($event, $index)\" ng-blur=leaveEditMode($index) ng-show=searchParam.editMode ng-model=searchParam.value placeholder=\"{{searchParam.placeholder}}\"></div></div><input name=searchbox class=search-parameter-input nit-set-focus=setSearchFocus ng-keydown=keydown($event) placeholder={{placeholder}} ng-focus=\"focus = true\" ng-blur=\"focus = false\" typeahead-on-select=\"typeaheadOnSelect($item, $model, $label)\" typeahead=\"parameter as parameter.name for parameter in parameters | filter:{name:$viewValue} | limitTo:8\" ng-model=\"searchQuery\"></div><div class=search-parameter-suggestions ng-show=\"parameters && focus\"><span class=title>Filtra per:</span> <span class=search-parameter ng-repeat=\"param in parameters | limitTo:8\" ng-mousedown=addSearchParam(param)>{{param.name}}</span></div></div><div class=\"col-xs-3 advancedSearchBoxButtons\"><div class=\"button fg-white bg-blue left col-xs-6\" ng-click=\"$parent.findResults() \" >Cerca</div><div class=\"button fg-white left col-xs-6\" ng-click=\"removeAll(); $parent.clearQuery();\">Azzera</div></div></div>"
            );
        })
        .controller('StrumagCtrl', StrumagCtrl)
        .controller('ModalCtrl', ModalCtrl)
        .directive('fancyTree', function ($parse) {
            return {
                restrict: 'E',
                compile: function (element, attributes) {
                    var treeConfig = $parse(attributes.treeConfig);
                    return function (scope, element, attributes, controller) {
                        scope.$watch(treeConfig, function (value, old) {
                            if (value && value.source && value.source.length > 0) {
                                var newElement = $('<div></div>');
                                newElement.fancytree(value);
                                element.html(newElement);
                            }
                        }, true);

                    };
                }
            }
        });

    function StrumagCtrl($scope, $rootScope, notificationService, $timeout, $document, $http, $sce, $compile, $uibModal, $location, $route, MainService, $uiMrFeedback, $window) {
        $scope.paginationOpt = {
            itemsPage: CONFIG.defaultItemsPerPage,
            currentPage: 0,
            itemPerPageOptions: CONFIG.itemPerPageOptions
        };
        $scope.freeMediaPaginationOpt = {
            itemsPage: CONFIG.defaultItemsPerPage,
            currentPage: 0,
            itemPerPageOptions: CONFIG.itemPerPageOptions
        };
        $scope.folderPaginationOpt = {
            itemsPage: CONFIG.defaultItemsPerPage,
            currentPage: 0,
            itemPerPageOptions: CONFIG.itemPerPageOptions
        };
        var feedbackInstance;
        var render = function () {
            $scope.idMetadato = $location.search().id || null;
            if ($scope.idMetadato) {
                var feedback = {
                    "title": "Caricamento",
                    "msg": "Attendi il caricamento dei dati...",
                    "close": false
                };
                feedbackInstance = $uiMrFeedback.open(feedback);
                $timeout(function () {
                    MainService.serviceProvider.getMetadato($scope.idMetadato, clbGetData);
                }, 500);
                try {
                    $scope.status = $location.search().status ? JSON.parse($location.search().status) : { 'open': true };
                } catch (err) {
                    console.log('error get status', err);
                }
                $scope.backId = $location.search().backId || null;
                $scope.state = $location.search().state || null;
            }
            $scope.instituteKey = $location.search().instituteKey || null;
            angular.element("iframe").height(($(window).height() * 85) / 100);
            angular.element(".modal-dialog").width("95%");
            $scope.buttonSelectText = 'Seleziona tutti';
            $scope.currentFolderButtonSelectText = 'Seleziona tutti';
            $scope.freeMediaButtonSelectText = 'Seleziona tutti';
            /*$("#sortImage").sortable({
                axis: 'y',
                opacity: 0.5,
                update: endChange,
                start: startChange
            }).disableSelection();*/
        };
        $scope.struTab = 'sf';
        $scope.logicalStruFolder = {
            nameFolder: '',
            fromSeq: '', // indice di posizione dell'elemento nella struttura fisica
            toSeq: '', // indice di posizione dell'elemento nella struttura fisica
            fromSeqFreeIndex: '', // indice di posizione dell'elemento tra i media liberi
            toSeqFreeIndex: '', // indice di posizione dell'elemento tra i media liberi
            arrForSel: 'Immagini'
        };
        $scope.availableArrayForSel = ['Immagini', 'Documenti', 'Audio', 'Video'];
        $scope.arrayLogic = [];
        $scope.metaMediaViewerList = {
            medias: [],
            options: {
                modal: true,
                btnClose: true,
                fnClose: function () {
                    $scope.openMetaMediaViewer = false;
                },
                fnClosePrm: []
            }
        };
        $scope.openMetaMediaViewer = false;
        $scope.config = CONFIG;
        $scope.generalInfo = {};
        $scope.toggle = function (ele) {
            ele = ele ? false : true;
            return ele;
        };
        $scope.sortableOptions = {
            stop: function (e, ui) {
                console.log($scope.arrayImage);
            },
            distance: 10
        };
        $scope.changeCurrentPage = function (paginationOptionObj, newPageNumber) {
            paginationOptionObj.currentPage = newPageNumber - 1;
            $scope.updateDraggableItems();
            $scope.updateDroppableContainers();
            $scope.updateFoldersHeight();
        };
        $scope.itemsInPage = [];
        $scope.itemsInitialized = false;
        $scope.setCurrentItemInPage = function (paginationOptionObj, obj) {
            if (obj) {
                if ($scope.itemsInPage.length === paginationOptionObj.itemsPage) {
                    $scope.itemsInPage = [];
                }
                $scope.itemsInPage.push(obj);
                $scope.itemsInitialized = true;
            }
        };
        var inputParams = [];
        $scope.$on('advanced-searchbox:modelUpdated', function (event, model) {
            inputParams = event.targetScope.searchParams;
        });
        $scope.iframeDamUrl = "";
        var modalDamInstance;
        $scope.findResults = function () {
            var params = [];
            var query = $(".advancedSearchBoxContainer .search-parameter-input").val();
            if (query) {
                var obj = { "text": query };
                params.push(obj);
            }
            for (var i = 0; i < inputParams.length; i++) {
                var obj = {};
                obj[inputParams[i].key] = inputParams[i].value;
                params.push(obj);
            }
            var mediaTypeAr = ["IMAGE", "PDF", "AUDIO", "VIDEO", "CONTAINER"];
            var mediaType = mediaTypeAr[$scope.currentTab];
            var externalFilters = "&mediaType=" + encodeURI(mediaType);
            var externalInput = "";
            if (params.length > 0) {
                externalInput = "&externalInput=" + encodeURI(JSON.stringify(params));
            }
            var instance = "";
            if ($scope.instituteKey)
                instance = "&instance=" + $scope.instituteKey;
            var iframeDamUrl = CONFIG.serverDam + "#/tecadam?cms=true" + externalFilters + externalInput + instance;
            modalDamInstance = $uibModal.open({
                templateUrl: 'modal-dam.html',
                appendTo: angular.element("body"),
                windowClass: 'modalDam',
                openedClass: "modal-dam",
                backdrop: 'static',
                controller: function ($scope, $sce, $uibModalInstance) {
                    $scope.iframeDamUrl = $sce.trustAsResourceUrl(iframeDamUrl);
                    $scope.iframeHeight = ($(window).height() * 85) / 100 + "px";
                    $scope.closeModal = function () {
                        $uibModalInstance.dismiss();
                        angular.element("body").removeClass('no-overflow');
                    }
                    $uibModalInstance.closed.then(function () {
                        angular.element("body").removeClass('no-overflow');
                    });
                }
            });
            angular.element("body").addClass('no-overflow');
        }
        $scope.availableSearchParams = [
            { key: "title", name: "Titolo", placeholder: "Titolo..." },
            { key: "author", name: "Autore", placeholder: "Autore..." },
            { key: "tag", name: "Tag", placeholder: "Tag..." },
            { key: "folder", name: "Cartella", placeholder: "Cartella..." },
            { key: "collection", name: "Collezione", placeholder: "Collezione..." },
        ];

        $scope.multipleSelectedDocs = [];
        $scope.keyDown = null;

        $document.keydown(function (e) {
            $scope.keyDown = e;
        });
        $document.keyup(function (e) {
            $scope.keyDown = null;
        });

        $scope.handleDropImageEnd = function (node, data) {
            var draggedEl = $(data.draggable.element[0]);
            var itemId = draggedEl.attr("data-item-id");
            if (!itemId) {
                $scope.confirmAction(node.key);
            } else {
                var fromFreeMedia = draggedEl.attr("data-free-media");
                var obj;
                if (fromFreeMedia) {
                    obj = _.find($scope.arrayLogic, { "id": itemId });
                    var objIndex = _.findIndex($scope.arrayLogic, { "id": itemId });
                    $scope.selectSingleFreeMedia(obj, objIndex);
                    $scope.confirmAction(node.key);
                } else {
                    $scope.moveSelectedMediaFromFolderToOther(node);
                }
            }
            $scope.updateFoldersHeight();
        };
        $scope.updateDroppableContainers = function () {
            $("#boxItemFolder").droppable({
                tolerance: 'pointer',
                accept: ".freeMedia-item",
                hoverClass: 'ui-droppable-hover',
                activeClass: "ui-droppable-hover",
                drop: function (event, data) {
                    try {
                        var draggedEl = $(data.draggable[0]);
                        var itemId = draggedEl.attr("data-item-id");
                        var obj = _.find($scope.arrayLogic, { "id": itemId });
                        var objIndex = _.findIndex($scope.arrayLogic, { "id": itemId });
                        $scope.selectSingleFreeMedia(obj, objIndex);
                        var node = $scope.tree && $scope.tree.getActiveNode();
                        $scope.confirmAction(node.key);
                    } catch (e) { console.log(e); }
                    $scope.updateFoldersHeight();
                    $('.dropContainer').remove();
                    return true;
                }
            });
            $("#freeMediaFolder").droppable({
                tolerance: 'pointer',
                accept: ".currentFolder-item",
                hoverClass: 'ui-droppable-hover',
                activeClass: "ui-droppable-hover",
                drop: function (event, data) {
                    $scope.removeSelectedMediaFromFolder();
                    $scope.updateFoldersHeight();
                    $('.dropContainer').remove();
                    return true;
                }
            });
        }

        $scope.updateDraggableItems = function () {
            $(".freeMedia-item, .currentFolder-item").draggable({
                revert: true,
                cursorAt: { top: -5, left: -5 },
                connectToFancytree: true,
                cursor: "move",
                appendTo: "body",
                refreshPositions: true,
                helper: function (e) {
                    var item = $(this);
                    var elements;
                    if (item && item.hasClass('currentFolder-item')) {
                        $scope.unselectAllFreeMedia();
                        if (item && !item.hasClass('item-selected')) {
                            item.siblings('.item-selected').removeClass('item-selected');
                            $scope.unselectAllFolderMedia();
                            item.addClass('item-selected');
                            var itemId = item.attr("data-item-id");
                            var obj = _.find($scope.sonsFolder, { "id": itemId });
                            var objIndex = _.findIndex($scope.sonsFolder, { "id": itemId });
                            $scope.selectSingleFolderMedia(obj, objIndex);
                            elements = item.clone();
                        } else {
                            elements = $('.item-selected').clone();
                        }
                    } else {
                        $scope.unselectAllFolderMedia();
                        if (item && !item.hasClass('item-selected')) {
                            item.siblings('.item-selected').removeClass('item-selected');
                            $scope.unselectAllFreeMedia();
                            item.addClass('item-selected');
                            var itemId = item.attr("data-item-id");
                            var obj = _.find($scope.arrayLogic, { "id": itemId });
                            var objIndex = _.findIndex($scope.arrayLogic, { "id": itemId });
                            $scope.selectSingleFreeMedia(obj, objIndex);
                            elements = item.clone();
                        } else {
                            elements = $('.item-selected').clone();
                        }
                    }
                    elements.removeClass('list');
                    var helper = $('<div/>');
                    helper.addClass('dropContainer');
                    // item.siblings('.item-selected').addClass('hidden');
                    elements = elements.splice(0, 5);
                    var totEl = elements.length;
                    var i = 0;
                    elements.forEach(function (el) {
                        $(el).css({
                            top: i * 5,
                            left: i * 5,
                            zIndex: totEl - i
                        });
                        i++;
                    });
                    return helper.append(elements);
                }
            });
        };
        $scope.askForItemMoving = true;
        $scope.removingNode = false;
        $scope.treeConfig = {
            extensions: ["dnd", "glyph"],
            click: function (event, data) {
                if (data.node.isActive()) {
                    event.stopPropagation();
                    data.node.setActive(false);
                    $scope.$apply(function () { });
                    return false;
                }
            },
            activate: function (event, data) {
                var struLink = data.node.data.struLink;
                if (!struLink) {
                    $scope.nodeLinkStru = false;
                    $scope.logicalStruFolder.nameFolder = data.node.title;
                    whenNodeActivated();
                } else {
                    $scope.nodeLinkStru = data.node;
                    if (struLink !== "notSetted") {
                        $scope.$broadcast('angucomplete-alt:changeInput', 'linkedStru', struLink);
                    } else {
                        $scope.$broadcast('angucomplete-alt:clearInput', 'linkedStru');
                    }
                    $scope.updateFoldersHeight();
                }
                if (!$scope.$$phase) {
                    $scope.$digest();
                }
                return false;
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
                autoExpandMS: 400,
                draggable: {
                    zIndex: 1000,
                    scroll: false,
                    revert: "invalid"
                },
                preventVoidMoves: true,
                preventRecursiveMoves: true,
                dragStart: function (node, data) {
                    if (node.parent.children.length > 1) {
                        node.parent.folder = true;
                    } else {
                        node.parent.folder = false;
                    }
                    node.parent.renderStatus();
                    return true;
                },
                dragEnter: function (node, data) {
                    return true;
                },
                dragOver: function (node, data) {
                },
                dragLeave: function (node, data) {

                },
                dragStop: function (node, data) {
                    if (node.parent.children.length > 0) {
                        node.parent.folder = true;
                    } else {
                        node.parent.folder = false;
                    }
                    node.parent.renderStatus();
                },
                dragDrop: function (node, data) {
                    if (!data.otherNode) {
                        if (node.data.struLink) {
                            notificationService.error("Non puoi inserire media in questo nodo");
                            return false;
                        }
                        if (!node.isActive() && $scope.askForItemMoving) {
                            var dialog = document.createElement('div');
                            dialog.setAttribute('title', 'Aggiunta media');
                            var mediaTitle = '';
                            var draggedEl = $(data.draggable.element[0]);
                            var fromFreeMedia = draggedEl.attr("data-free-media");
                            if (fromFreeMedia && $scope.multipleSelectedDocs.length > 1) {
                                mediaTitle = $scope.multipleSelectedDocs.length + ' media ';
                            } else if (!fromFreeMedia && $scope.multipleSelectedFolderDocs.length > 1) {
                                mediaTitle = $scope.multipleSelectedFolderDocs.length + ' media ';
                            } else {
                                var itemTitle = '';
                                try {
                                    itemTitle = "\"" + draggedEl.find('.item-label').text() + "\" ";
                                } catch (e) { }
                                mediaTitle = 'il media ' + itemTitle;
                            }
                            dialog.innerHTML = "<p>Vuoi veramente aggiungere " + mediaTitle + "all'elemento \"" + node.title + "\" dell'indice?</p>";
                            $(dialog).dialog({
                                resizable: false,
                                height: "auto",
                                width: 400,
                                modal: true,
                                buttons: {
                                    "Annulla": function () {
                                        $(this).dialog("close");
                                    },
                                    "Conferma": function () {
                                        $scope.handleDropImageEnd(node, data);
                                        $(this).dialog("close");
                                    },
                                    "Conferma sempre": function () {
                                        $scope.askForItemMoving = false;
                                        $scope.handleDropImageEnd(node, data);
                                        $(this).dialog("close");
                                    }
                                }
                            });
                        } else {
                            $scope.handleDropImageEnd(node, data);
                        }
                        return;
                    }
                    if (data.node.key === "exclude") {
                        notificationService.error("Non puoi inserire cartelle in questo nodo");
                        return false;
                    }
                    data.otherNode.moveTo(node, data.hitMode);
                    if (node.children && node.children.length > 0) {
                        node.folder = true;
                    } else {
                        node.folder = false;
                    }
                    node.renderStatus();
                }
            },
            source: [{
                title: "Elementi esclusi",
                folder: false,
                children: [],
                key: "exclude"
            }],
            renderNode: function (event, data) {
                var node = data.node;
                angular.element(node.span).find(".btn-remove-folder").remove();
                angular.element(node.span).attr('title', node.title);
                if (node.key !== 'exclude') {
                    var deleteButton = angular.element('<span class="btn btn-danger btn-remove-folder"><i class="fa fa-trash right"></i></span>');
                    angular.element(node.span).append(deleteButton);
                    deleteButton.hide();
                    deleteButton.click(function (event) {
                        event.stopPropagation();
                        event.preventDefault();
                        $scope.removingNode = true;
                        if (node.parent.children.length == 1) {
                            node.parent.folder = false;
                        } else {
                            node.parent.folder = true;
                        }
                        node.setActive(false);
                        node.remove();
                        if (node.parent) {
                            node.parent.renderStatus();
                        }
                    });
                    angular.element(node.span).hover(function () {
                        deleteButton.show();
                    }, function () {
                        deleteButton.hide();
                    });
                }
            },
            removeNode: function (event, data) {
                data.node.setActive();
                var key = data.node.key;
                _.forEach($scope.arrayImage, function (value, indice) {
                    if (value.keyNode == key)
                        $scope.removeMedia(event, $scope.sonsFolder.indexOf(value));
                })
                data.node.setFocus(false);
                data.node.setActive(false);
                $scope.removingNode = false;
            }
        };

        $scope.treeSource = [{
            title: "Elementi esclusi",
            folder: false,
            children: [],
            key: "exclude"
        }];
        $scope.showPopover = function () {
            $('[data-toggle="popover"]').popover({ html: true })
                .click(function (ev) {
                    //this is workaround needed in order to make ng-click work inside of popover
                    $compile($('.popover.in').contents())($scope);
                });
        }

        $scope.exclusiveCheck = function (i) {
            for (var j = 0; j < 3; j++) {
                if (j != i) {
                    $("#check" + j).prop('checked', false);
                }
            }
            $scope.generalInfo.state = i;
        };


        $scope.sidePageChecked = function (i, id) {
            //alert('ok');
            var startingId;
            var lr = i;
            //console.log(id);
            $('#optionSidePage0').removeClass('sideActive');
            $('#optionSidePage1').removeClass('sideActive');
            $('#optionSidePage2').removeClass('sideActive');
            $('#optionSidePage' + i).addClass('sideActive');

            for (var j = 0; j < $scope.arrayImage.length; j++) {
                if ($scope.arrayImage[j].id == id) {
                    startingId = j;
                    break;
                }
            }

            if (i == 0) {
                for (var j = startingId; j < $scope.arrayImage.length; j++) {
                    $scope.arrayImage[j].side = 0;
                }
                return;
            }
            if (i == 1 || i == 2) {
                for (var j = startingId; j < $scope.arrayImage.length; j++) {
                    if (lr == 1) {
                        lr = 2;
                        $scope.arrayImage[j].side = 1;
                    } else {
                        lr = 1;
                        $scope.arrayImage[j].side = 2;
                    }
                }
                return;
            }
            if (i == 3) {
                $scope.arrayImage[startingId].side = 3;
                return;
            }
        };


        $scope.sortableOptions = {
            axis: 'y',
            opacity: 0.5,
            start: function (ev, ui) {
                $(".textTitle").blur();
            },
            update: function (ev, ui) {
                var startPos = ($scope.paginationOpt.currentPage * $scope.paginationOpt.itemsPage) + ui.item.sortable.index;
                var changedPos = ($scope.paginationOpt.currentPage * $scope.paginationOpt.itemsPage) + ui.item.sortable.dropindex;
                var obj = $scope.arrayCurrent[startPos];
                var objmediaListArray = $scope.mediaListArray[startPos];
                $scope.arrayCurrent.splice(startPos, 1);
                $scope.arrayCurrent.splice(changedPos, 0, obj);
                $scope.mediaListArray.splice(startPos, 1);
                $scope.mediaListArray.splice(changedPos, 0, objmediaListArray);
                recountPosition($scope.arrayCurrent);
                recountPosition($scope.mediaListArray);
            }
        };

        var recountPosition = function (ar) {
            _.forEach(ar, function (value, key) {
                value.pos = key
            });
        };

        $scope.changeCurrentArray = function (tab) {
            if ($scope.arrayCurrent) {
                for (var i = 0; i < $scope.arrayCurrent.length; i++) {
                    $scope.arrayCurrent[i].isChecked = false;
                }
            }
            $scope.selectedItems = 0;

            if (tab !== 0 && $scope.dataForNewPattern.type !== 'pag') {
                $scope.dataForNewPattern.type = 'pag';
            }
            $scope.buttonSelectText = 'Seleziona tutti';
            $scope.itemsInitialized = false;
            $scope.currentTab = tab;
            $scope.arrayCurrent = $scope.arrayMatrix && $scope.arrayMatrix[tab] ? $scope.arrayMatrix[tab] : $scope.arrayImage;
            $scope.itemsInitialized = true;
            $scope.closePosition();
        };

        $scope.dropItem = function (idToDrop) {
            notificationService.notify({
                title: 'Eliminazione Elemento',
                text: 'Vuoi veramente eliminare l\' elemento?',
                hide: false,
                confirm: {
                    confirm: true
                },
                buttons: {
                    closer: false,
                    sticker: false
                },
                history: {
                    history: false
                }
            }).get().on('pnotify.confirm', function () {
                for (var j = 0; j < $scope.arrayCurrent.length; j++) {
                    if ($scope.arrayCurrent[j].id == idToDrop) {
                        $scope.arrayCurrent.splice(j, 1);
                        break;
                    }
                }
                if ($scope.arrayLogic) {
                    for (var j = 0; j < $scope.arrayLogic.length; j++) {
                        if ($scope.arrayLogic[j].id == idToDrop) {
                            $scope.arrayLogic.splice(j, 1);
                            break;
                        }
                    }
                }
                if ($scope.mediaListArray) {
                    for (var j = 0; j < $scope.mediaListArray.length; j++) {
                        if ($scope.mediaListArray[j].id == idToDrop) {
                            $scope.mediaListArray.splice(j, 1);
                            break;
                        }
                    }
                }
                if (!$scope.$$phase) {
                    $scope.$digest();
                }
            }).on('pnotify.cancel', function () {

            });
        };

        $scope.openPosition = function (ev, obj) {
            var x = ev.pageX - 135;
            var y = ev.pageY - 115;
            $scope.popoverPosition = {
                left: x + "px",
                top: y + "px"
            };
            if ($scope.objPopoverPosition && ($scope.objPopoverPosition.id === obj.id))
                return;
            $timeout(function () { $scope.objPopoverPosition = obj; }, 100);
        };
        $scope.closePosition = function () {
            $scope.objPopoverPosition = null;
        };

        $scope.changeTitle = function (id) {
            var textInput = $('#item-sf-' + id + ' .textTitle');
            textInput.focus();
            // for(var j = 0 ; j < $scope.arrayCurrent.length; j++ ){
            //     if( $scope.arrayCurrent[j].id == id ){
            //         //angular.element('.tab-pane.active .textTitle')[j].removeAttribute('disabled');
            //         angular.element('.tab-pane.active .textTitle')[j].focus();
            //         //angular.element('.tab-pane.active .textTitle')[j].value = '';
            //     }
            // }
            // //var text = angular.element('.tab-pane.active .textTitle')[i];
            // //text.removeAttribute('disabled');
        };

        $scope.saveTitle = function () {
            var id = this.obj.id;
            for (var j = 0; j < $scope.arrayCurrent.length; j++) {
                if ($scope.arrayCurrent[j].id == id) {
                    $scope.arrayCurrent[j].title = angular.element('.tab-pane.active .textTitle')[j].value;
                    //angular.element('.tab-pane.active .textTitle')[0].disabled = true;
                }
            }
        };

        $scope.deselectNode = function () {
            var node = $scope.tree && $scope.tree.getActiveNode();
            if (node) {
                node.setSelected(false);
                $scope.tree.activateKey(null);
            }
        }

        var pad = function (str, max) {
            str = str.toString();
            return str.length < max ? pad("0" + str, max) : str;
        };
        $scope.selectedItems = 0;
        $scope.selectAll = function () {
            //var allInput = angular.element('input[type=checkbox]');
            //var activeInput = angular.element('.tab-pane.active.typeMedia').find(allInput);
            /*for(var i = 0 ; i < activeInput.length ; i++ ){
                if($scope.buttonSelectText =='Seleziona tutti'){
                    activeInput[i].checked = true; 
                }
                else{
                    activeInput[i].checked = false; 
                }
            }*/
            for (var i = 0; i < $scope.arrayCurrent.length; i++) {
                if ($scope.buttonSelectText == 'Seleziona tutti') {
                    $scope.arrayCurrent[i].isChecked = true;
                } else {
                    $scope.arrayCurrent[i].isChecked = false;
                }
            }
            if ($scope.buttonSelectText == 'Seleziona tutti') {
                $scope.buttonSelectText = 'Deseleziona tutti';
                $scope.selectedItems = $scope.arrayCurrent.length;
            } else {
                $scope.buttonSelectText = 'Seleziona tutti';
                $scope.selectedItems = 0;
            }
        };

        $scope.lastIndexChecked = 0;
        $scope.calculateChecked = function (event, index, isChecked) {
            var realIndex = index + $scope.paginationOpt.currentPage * $scope.paginationOpt.itemsPage;
            if (event.shiftKey) {
                var start = Math.min($scope.lastIndexChecked, realIndex);
                var end = Math.max($scope.lastIndexChecked, realIndex);
                for (var i = start; i <= end; i++) {
                    $scope.arrayCurrent[i].isChecked = isChecked;
                }
            }
            $scope.lastIndexChecked = realIndex;
            var itemsChecked = _.filter($scope.arrayCurrent, function (item) { return item.isChecked === true });
            $scope.selectedItems = itemsChecked.length;
            if (itemsChecked.length == $scope.arrayCurrent) {
                $scope.buttonSelectText = 'Deseleziona tutti';
            } else {
                $scope.buttonSelectText = 'Seleziona tutti';
            }
        }
        $scope.patternSelected = 'pag';
        $scope.dataForNewPattern = {
            type: 'pag',
            text: '',
            start: '',
            step: '',
            endIndex: '',
            fillWithZeros: false
        };
        $scope.namePattern = '';
        $scope.startPattern = '';
        $scope.stepPattern = '';
        $scope.elementsToConsider = '';
        $scope.tooltipPatternType = 'Con pattern di tipo "paginazione" sarà possibile personalizzare lo step con cui incrementare il numero da abbinare al pattern stesso. ' +
            'Con pattern di tipo "cartulazione", verranno aggiunti automaticamente i suffissi "v" (verso) e "r" (recto).';
        $scope.tooltipPatternText = 'Inserire il pattern per la nuova nomenclatura può del testo fisso e tanti simboli "#" quante sono le cifre previste dalla numerazione stabilita. ' +
            'Per avviare la rinominazione è necessario inserire uno o più simboli "#" consecutivi. ' +
            'Quindi uno ("#") per i numeri da 1 a 9, due ("##") per i numeri da 1 a 20, etc.).';
        $scope.tooltipPatternStart = 'Inserire il numero con cui iniziare la numerazione per la nuova nomenclatura.';
        $scope.tooltipPatternStep = 'Inserire lo step di incremento della numerazione. Lasciare il campo vuoto per incrementare di 1.';
        $scope.tooltipPatternEndIndex = "Inserire l'indice dell'ultimo elemento tra i selezionati da prendere in considerazione per la modifica. " +
            "Dopo la modifica solo gli elementi considerati verranno deselezionati, pertanto si potrà continuare con l'applicazione di una nuova nomenclatura ai restanti). " +
            "Lasciare il campo vuoto per modificare tutti gli elementi.";
        $scope.tooltipPatternFillWithZeros = 'Selezionare per inserire automaticamente gli zeri necessari a riempire il pattern indicato ' +
            '(Es. Con pattern "pag_###" si otterrà "pag_001" e non "pag_1").';
        $scope.applyPattern = function () {
            // Per modificare la nomenclatura degli elementi vengono presi in considerazione diversi dati:
            // - [type] La tipologia: paginazione o cartulazione. 
            //   Nel primo caso sarà possibile personalizzare lo step con cui incrementare il numero da abbinare al pattern;
            //   Nel secondo caso verranno aggiunti automaticamente i suffissi "v" (verso) e "r" (recto).
            // - [text] Il pattern per la nuova nomenclatura, che conterrà del testo fisso e tanti simboli "#" 
            //   quante sono le cifre previste dalla numerazione stabilita. Per avviare la rinominazione è necessario inserire almeno un simbolo "#"; 
            //   In caso di più simboli "#", questi dovranno essere consecutivi. 
            //   (Es. se prevediamo di avere numeri da 1 a 9 basterà un solo "#", se invece vogliamo i numeri da 1 a 20 ne serviranno 2, e così via).
            // - [start] Il numero con cui iniziare la numerazione per la nuova nomenclatura
            // - [step] Lo step con cui incrementare la numerazione (a partire ovviamente dal valore di inizio indicato)
            // - [endIndex] L'indice dell'ultimo elemento da prendere in considerazione per la modifica, sempre considerando i selezionati (Questa funzionalità è utile nel caso 
            //   in cui, per praticità d'uso, si siano selezionati tutti gli elementi in una volta sola, ma si vogliano applicare le modifiche solo a determinati elementi.
            //   Dopo la modifica gli elementi considerati verranno deselezionati, pertanto si potrà continuare con l'applicazione di una nuova nomenclatura ai restanti).
            //   Se lasciato vuoto verranno modificati tutti gli elementi selezionati.
            // - [fillWithZeros] Se il checkbox "Riempi con zeri" è selezionato, verranno inseriti tanti zeri quanti necessari
            //   a riempire il pattern indicato (Es. Con pattern "pag_###" avrò "pag_001" e non "pag_1").
            if ($scope.arrayCurrent.length == 0) {
                notificationService.error('In questa sezione non ci sono elementi; quindi non è possibile avviare il processo di modifica della nomenclatura.');
                return;
            }

            var itemsChecked = _.filter($scope.arrayCurrent, function (item) { return item.isChecked === true });
            if (itemsChecked.length == 0) {
                notificationService.error('È necessario selezionare almeno un elemento per avviare il processo di modifica della nomenclatura.');
                return;
            }

            var newPattern = $scope.dataForNewPattern.text;
            var startPattern = $scope.dataForNewPattern.start;
            var endIndexToConsider = $scope.dataForNewPattern.endIndex;
            var stepPattern = $scope.dataForNewPattern.step;

            if (newPattern == '' || startPattern == '') {
                notificationService.error('È necessario compilare almeno i campi "Nomenclatura" e "Inizio"  per avviare il processo di modifica della nomenclatura.');
                return;
            }

            var firstHash = newPattern.search('#');
            if (firstHash == -1) {
                notificationService.error('È necessario inserire uno o più simboli "#" consecutivi per avviare il processo di modifica della nomenclatura.');
                return;
            }

            var lastHash = newPattern.lastIndexOf('#');
            var substringBetweenHashes = newPattern.substring(firstHash, lastHash + 1);
            for (var i = 0; i < substringBetweenHashes.length; i++) {
                if (substringBetweenHashes.charAt(i) != '#') {
                    notificationService.error('I simboli "#" devono essere consecutivi.');
                    return;
                }
            }

            if (isNaN(parseInt(startPattern)) || isNaN(endIndexToConsider) || isNaN(stepPattern)) {
                // Questo controllo teoricamente non serve più: messo input type="number" nell'HTML
                var errorMsg = "";
                if ($scope.dataForNewPattern.type !== 'pag') {
                    errorMsg = 'I campi "Inizio numerazione" e "Indice finale" devono essere valori numerici.';
                } else {
                    errorMsg = 'I campi "Inizio numerazione", "Step numerazione" e "Indice finale" devono essere valori numerici.';
                }
                notificationService.error(errorMsg);
                return;
            }

            var numChecked = 0;
            if (endIndexToConsider == '') { // Se fine non impostata, andremo a modificare tutti gli elementi
                endIndexToConsider = $scope.arrayCurrent.length;
            }

            // TODO: Capire se questo controllo serve o meno
            // if (parseInt(startPattern) > parseInt(endIndexToConsider)) {
            //     notificationService.error("La fine deve essere maggiore dell'inizio");
            //     return;
            // }
            var firstItemChecked = _.findIndex($scope.arrayCurrent, function (item) { return item.isChecked === true; });
            if (firstItemChecked >= parseInt(endIndexToConsider)) {
                notificationService.error("L'indice finale deve essere maggiore dell'indice del primo elemento selezionato (ovvero " + (firstItemChecked + 1) + ")");
                return;
            }

            var lengthPattern = endIndexToConsider && endIndexToConsider < $scope.arrayCurrent.length ? parseInt(endIndexToConsider) : $scope.arrayCurrent.length;
            for (var i = 0; i < lengthPattern; i++) {
                if ($scope.arrayCurrent[i].isChecked) {
                    numChecked++;
                }
            }
            if (numChecked == 0) {
                notificationService.error("È necessario spuntare almeno una checkbox entro l'indice finale indicato.");
                return;
            }

            var cartInit = null;
            if ($scope.dataForNewPattern.type === "cart") {
                cartInit = startPattern.indexOf("r") === -1 ? startPattern.indexOf("v") === -1 ? "r" : "v" : "r";
            }
            // if ($scope.dataForNewPattern.fillWithZeros) { ==> Rimuovere commento se si vuole disattivare il controllo sui "#" quando riempimento con "0" disattivato
            var numNeeded = stepPattern ? numChecked * stepPattern : numChecked;
            if (cartInit === "r") {
                numNeeded = numNeeded / 2
            } else if (cartInit === "v") {
                numNeeded = numNeeded / 2 + 1
            }
            if (numNeeded > (Math.pow(10, substringBetweenHashes.length) - 1)) {
                var symbolsNeeded = numNeeded.toString().length;
                symbolsNeeded += symbolsNeeded === 1 ? ' carattere "#"' : ' caratteri "#"';
                notificationService.error('Per l\'autocompletamento con gli "0", il numero dei simboli "#" e l\'intervallo dato devono essere compatibili. \n Inserire almeno ' + symbolsNeeded + ' per coprire la numerazione fino a ' + numNeeded + '.');
                return;
            }
            // }
            // TODO: Capire se questo controllo serve sempre
            // if (numChecked > (parseInt(endIndexToConsider) - parseInt(startPattern) + 1)) {
            //     notificationService.error('Il numero delle check spuntate e l\'intervallo dato non sono compatibili');
            //     return;
            // }
            var currentPattern = parseInt(startPattern);
            var labelPattern;
            for (var j = 0; j < lengthPattern; j++) {
                if ($scope.arrayCurrent[j].isChecked) {
                    if ($scope.dataForNewPattern.type === "pag") {
                        // Calcola pattern in base a step
                        console.log(currentPattern);
                        currentPattern = stepPattern && j !== 0 ? currentPattern + (stepPattern - 1) : currentPattern;
                    }
                    if ($scope.dataForNewPattern.fillWithZeros) {
                        // Auto inserimento degli zeri prima del numero (esempio 001 e non 1);
                        labelPattern = newPattern.replace(substringBetweenHashes, pad(currentPattern, substringBetweenHashes.length));
                    } else {
                        labelPattern = newPattern.replace(substringBetweenHashes, currentPattern);
                    }

                    if ($scope.dataForNewPattern.type === "pag") {
                        $scope.arrayCurrent[j].label = labelPattern;
                        currentPattern++;
                    } else {
                        // Aggiungo suffisso cartografico
                        labelPattern += cartInit;
                        $scope.arrayCurrent[j].label = labelPattern;
                        if (cartInit === "r") {
                            cartInit = "v";
                        } else {
                            cartInit = "r";
                            currentPattern++;
                        }
                    }
                }
                $scope.arrayCurrent[j].isChecked = false;
                $scope.selectedItems--;
            }
            if ($scope.selectedItems < $scope.arrayCurrent.length) {
                $scope.buttonSelectText = 'Seleziona tutti';
            }
        };

        $scope.changeActiveTab = function (type) {
            if (type === "logica") {
                $(".hideWhenSf").removeClass("hide");
                $(".showWhenSf").addClass("hide");
                whenNodeActivated();
            } else {
                $(".showWhenSf").removeClass("hide");
                $(".hideWhenSf").addClass("hide");
            }
        };

        $scope.getSelectedArrayForSel = function () {
            switch ($scope.logicalStruFolder.arrForSel) {
                case 'Immagini':
                    return $scope.arrayImage;
                case 'Documenti':
                    return $scope.arrayDoc;
                case 'Audio':
                    return $scope.arrayAudio;
                case 'Video':
                    return $scope.arrayVideo;
                default:
                    return $scope.arrayImage;
            }
        }

        function isError(showNotification) {
            $scope.tree = angular.element(':ui-fancytree').fancytree("getTree");
            if ($scope.tree.length == 0) {
                if (showNotification) {
                    notificationService.error("Per aggiungere elementi all'indice è necessario aggiungere almeno una cartella!");
                }
                return true;
            } else if (!$scope.tree.getActiveNode()) {
                if (showNotification) {
                    notificationService.error("Per aggiungere elementi all'indice è necessario selezionare una cartella!");
                }
                return true;
            } else {
                var selectedArray = $scope.getSelectedArrayForSel();
                if (selectedArray.length == 0) {
                    if (showNotification) {
                        notificationService.error("Nessun selezionabile per l'aggiunta media presente.");
                    }
                    return true;
                } else {
                    $scope.treeSource = angular.element(':ui-fancytree').fancytree("getTree").toDict();
                    if ($scope.logicalStruFolder.fromSeq === '' || $scope.logicalStruFolder.toSeq === '') {
                        if (showNotification) {
                            notificationService.error("Non è stato inserito alcun intervallo!");
                        }
                        return true;
                    } else if ($scope.logicalStruFolder.fromSeq < 0 || $scope.logicalStruFolder.toSeq < 0 ||
                        isNaN($scope.logicalStruFolder.fromSeq) || isNaN($scope.logicalStruFolder.toSeq) ||
                        $scope.logicalStruFolder.fromSeq > $scope.logicalStruFolder.toSeq) {
                        if (showNotification) {
                            notificationService.error("L'intervallo inserito non è valido!");
                        }
                        return true;
                    }
                }
            }
            return false;
        };

        $scope.licenseUrl = $scope.config.serverRest + "ecommerce/getLicense?search=";

        $scope.appliedLicenses = {
            license: null,
            start: 1,
            end: null
        };

        $scope.selectedLicenseCallback = function (selected) {
            if (selected && selected.originalObject.id) {
                $scope.appliedLicenses.license = selected.originalObject;
            }
        };

        $scope.formatLicenseResponse = function (data) {
            data.unshift({ "id": "nolicense", "text": "Nessuna licenza" });
            return data;
        }

        $scope.applyLicenses = function () {
            var license_id = $scope.appliedLicenses.license && $scope.appliedLicenses.license.id;
            var itemStart = $scope.appliedLicenses.start && typeof $scope.appliedLicenses.start === "number" ? $scope.appliedLicenses.start - 1 : null;
            var itemEnd = $scope.appliedLicenses.end && typeof $scope.appliedLicenses.end === "number" ? $scope.appliedLicenses.end - 1 : $scope.arrayImage.length - 1;
            var err;
            if (!license_id)
                err = "Devi scegliere una licenza da associare agli elementi";
            if ((itemStart !== 0 && !itemStart) || (itemStart !== 0 && !itemEnd))
                err = "Devi inserire un range di elementi ('Inizio' e 'Fine') a cui applicare la licenza";
            if (itemStart > itemEnd)
                err = "Il valore 'Inizio' deve essere minore o uguale al valore 'Fine'";
            if (err) {
                var feedback = {
                    "title": "Attenzione",
                    "msg": err,
                    "close": true
                };
                feedbackInstance = $uiMrFeedback.open(feedback);
                return;
            }
            var applicaLicenze = function (start, end, license) {
                for (var i = start; i <= end; i++) {
                    delete $scope.arrayImage[i].id_license;
                    $scope.arrayImage[i].license = license.id === "nolicense" ? null : license;
                }
                feedbackInstance.remove();
            };
            var feedback = {
                "title": "Applica licenza",
                "msg": "Sei sicuro di voler applicare la licenza '" + $scope.appliedLicenses.license.text + "' ai seguenti elementi: da " + $scope.appliedLicenses.start + " a " + $scope.appliedLicenses.end + " ?",
                "close": true,
                "btnAction": [
                    {
                        text: "Applica",
                        func: applicaLicenze,
                        params: [itemStart, itemEnd, $scope.appliedLicenses.license]
                    },
                    {
                        text: "Annulla",
                        func: function () { feedbackInstance.remove(); },
                        params: []
                    }
                ]
            };
            feedbackInstance = $uiMrFeedback.open(feedback);
        };

        $scope.changeArrToSel = function () {
            $scope.logicalStruFolder.fromSeq = '';
            $scope.logicalStruFolder.toSeq = '';
            $scope.updateFreeMedia();
        };

        $scope.changeSelectedObj = function () {
            $scope.logicalStruFolder.fromSeqFreeIndex = _.findIndex($scope.arrayLogic, { pos: parseInt($scope.logicalStruFolder.fromSeq) - 1 });
            $scope.logicalStruFolder.toSeqFreeIndex = _.findIndex($scope.arrayLogic, { pos: parseInt($scope.logicalStruFolder.toSeq) - 1 });
            if ($scope.logicalStruFolder.toSeqFreeIndex < 0) {
                var itemsBeforeTo = $scope.arrayLogic.map(function (o) { return o.pos + 1; }).filter(function (item) { return item < parseInt($scope.logicalStruFolder.toSeq); });
                $scope.logicalStruFolder.toSeqFreeIndex = itemsBeforeTo.length - 1;
            }
            // if (!isError(false)) {
            $scope.updateSelection();
            // } else {
            //     $scope.resetSelection();
            // }
        };
        $scope.resetSelection = function () {
            if ($scope.arrayLogic) {
                for (var i = 0; i < $scope.arrayLogic.length; i++) {
                    $scope.arrayLogic[i].selected = false;
                }
            }
            $scope.multipleSelectedDocs = [];
            $scope.selectedFreeMedia = 0;
            $scope.freeMediaButtonSelectText = 'Seleziona tutti';
        };
        $scope.updateSelection = function () {
            $scope.resetSelection();
            $scope.selectedDoc = $scope.arrayLogic[$scope.logicalStruFolder.fromSeqFreeIndex]; // TODO => Capire a cosa serve
            var toEnd = ($scope.logicalStruFolder.toSeqFreeIndex < $scope.arrayLogic.length) ? $scope.logicalStruFolder.toSeqFreeIndex : $scope.arrayLogic.length;
            // Seleziono gli elementi nell'intervallo indicato dall'inizio alla fine (o alla fine dell'array)
            for (var i = $scope.logicalStruFolder.fromSeqFreeIndex; i <= toEnd; i++) {
                if ($scope.arrayLogic[i]) {
                    try {
                        $scope.arrayLogic[i].selected = true;
                        $scope.multipleSelectedDocs.push($scope.arrayLogic[i]);
                    } catch (e) { console.log(e); }
                }
            }
            $scope.selectedFreeMedia = $scope.multipleSelectedDocs.length;
            if ($scope.multipleSelectedDocs.length > 0 && $scope.multipleSelectedDocs.length == $scope.arrayLogic.length) {
                $scope.freeMediaButtonSelectText = 'Deseleziona tutti';
            } else {
                $scope.freeMediaButtonSelectText = 'Seleziona tutti';
            }
        };
        $scope.resetLogicalInputSel = function () {
            $scope.logicalStruFolder.fromSeq = '';
            $scope.logicalStruFolder.toSeq = '';
            $scope.logicalStruFolder.fromSeqFreeIndex = '';
            $scope.logicalStruFolder.toSeqFreeIndex = '';
        };
        $scope.confirmTitleFolder = function () {
            var activeNode = $scope.tree.getActiveNode();
            activeNode.setTitle($scope.logicalStruFolder.nameFolder);
            activeNode.render();
        };

        $scope.removeSelectedMediaFromFolder = function () {
            if (($scope.logicalStruFolder.fromSeqFolder !== 0 && !$scope.logicalStruFolder.fromSeqFolder) &&
                ($scope.logicalStruFolder.toSeqFolder !== 0 && !$scope.logicalStruFolder.toSeqFolder) &&
                $scope.multipleSelectedFolderDocs.length === 0) {
                return;
            }
            if ($scope.logicalStruFolder.fromSeqFolder !== '' &&
                ($scope.logicalStruFolder.toSeqFolder !== 0 && !$scope.logicalStruFolder.toSeqFolder) &&
                $scope.multipleSelectedFolderDocs.length === 0) {
                var fromSeqFreeIndex = _.findIndex($scope.sonsFolder, { pos: parseInt($scope.logicalStruFolder.fromSeqFolder) - 1 });
                $scope.sonsFolder[fromSeqFreeIndex].selected;
                $scope.multipleSelectedFolderDocs.push($scope.sonsFolder[fromSeqFreeIndex]);
            }

            $scope.multipleSelectedFolderDocs.forEach(function (obj) {
                $scope.removeMedia(undefined, $scope.sonsFolder.indexOf(obj));
            });

            $scope.logicalStruFolder.fromSeqFolder = '';
            $scope.logicalStruFolder.toSeqFolder = '';
            $scope.multipleSelectedFolderDocs = [];
            $scope.selectedFolderMedia = 0;
            $scope.folderMediaButtonSelectText = 'Seleziona tutti';
        }
        $scope.confirmAction = function (nodeKey, noDrop) {
            console.log('confirmAction', noDrop);
            if (noDrop) {
                if (isError(true)) {
                    return;
                }
            }
            if (($scope.logicalStruFolder.fromSeq !== 0 && !$scope.logicalStruFolder.fromSeq) &&
                ($scope.logicalStruFolder.toSeq !== 0 && !$scope.logicalStruFolder.toSeq) &&
                $scope.multipleSelectedDocs.length === 0) {
                return;
            }
            if ($scope.logicalStruFolder.fromSeq !== '' &&
                ($scope.logicalStruFolder.toSeq !== 0 && !$scope.logicalStruFolder.toSeq) &&
                $scope.multipleSelectedDocs.length === 0) {
                var fromSeqFreeIndex = _.findIndex($scope.arrayLogic, { pos: parseInt($scope.logicalStruFolder.fromSeq) - 1 });
                $scope.arrayLogic[fromSeqFreeIndex].selected;
                $scope.multipleSelectedDocs.push($scope.arrayLogic[fromSeqFreeIndex]);
            }

            $scope.multipleSelectedDocs.forEach(function (obj) {
                var keyNode = obj.keyNode;
                obj.selected = false;
                if (keyNode == null || !$scope.tree.getNodeByKey(keyNode)) {
                    obj.keyNode = nodeKey;
                }
            });
            if (noDrop) {
                $scope.changeCurrentFolderContentType($scope.logicalStruFolder.arrForSel);
            }
            setMediaForViewer($scope.arrayImage);
            $scope.updateFreeMedia();

            var activeNode = $scope.tree.getActiveNode();
            var activeNodeKey = activeNode ? activeNode.key : undefined;
            if (nodeKey === activeNodeKey) {
                $scope.deselectNode();
                $scope.tree.activateKey(nodeKey);
            } else {
                whenNodeActivated();
            }

            $scope.logicalStruFolder.fromSeq = '';
            $scope.logicalStruFolder.toSeq = '';
            $scope.multipleSelectedDocs = [];
            $scope.selectedFreeMedia = 0;
            $scope.freeMediaButtonSelectText = 'Seleziona tutti';
            $scope.updateFoldersHeight();
        };

        $scope.moveSelectedMediaFromFolderToOther = function (node) {
            if (($scope.logicalStruFolder.fromSeqFolder !== 0 && !$scope.logicalStruFolder.fromSeqFolder) &&
                ($scope.logicalStruFolder.toSeqFolder !== 0 && !$scope.logicalStruFolder.toSeqFolder) &&
                $scope.multipleSelectedFolderDocs.length === 0) {
                return;
            }
            if ($scope.logicalStruFolder.fromSeqFolder !== '' &&
                ($scope.logicalStruFolder.toSeqFolder !== 0 && !$scope.logicalStruFolder.toSeqFolder) &&
                $scope.multipleSelectedFolderDocs.length === 0) {
                var fromSeqFreeIndex = _.findIndex($scope.sonsFolder, { pos: parseInt($scope.logicalStruFolder.fromSeqFolder) - 1 });
                $scope.sonsFolder[fromSeqFreeIndex].selected;
                $scope.multipleSelectedFolderDocs.push($scope.sonsFolder[fromSeqFreeIndex]);
            }

            $scope.multipleSelectedFolderDocs.forEach(function (obj) {
                $scope.moveItem(obj, node);
            });
            whenNodeActivated();

            $scope.logicalStruFolder.fromSeqFolder = '';
            $scope.logicalStruFolder.toSeqFolder = '';
            $scope.multipleSelectedFolderDocs = [];
            $scope.selectedFolderMedia = 0;
            $scope.folderMediaButtonSelectText = 'Seleziona tutti';
        };

        $scope.moveItem = function (obj, node) {
            if (obj.keyNode == node.key) {
                return notificationService.error('Media già presente nella cartella.');
            }
            obj.keyNode = node.key;
        };
        $scope.createNewStruIndexItem = function (type) {
            $scope.tree = angular.element(':ui-fancytree').fancytree('getTree');
            var activeNode = $scope.tree.getActiveNode();
            if (activeNode && activeNode.key === 'exclude') {
                notificationService.info('Non puoi inserire cartelle in questo nodo.');
                return;
            }
            var newFolder;
            newFolder = {
                title: type === 'link' ? 'Link a Metadato' : 'Nuova cartella',
                folder: false,
                children: [],
                key: new Date().getTime(),
                icon: type === 'link' ? 'img/linkStru.jpg' : undefined,
                struLink: type === 'link' ? { id: '', title: '' } : undefined
            }
            if ($scope.tree.length == 0) {
                $scope.treeConfig.source.push(newFolder);
            } else {
                if (activeNode && activeNode.parent) {
                    var newFolderNode = activeNode.addNode(newFolder);
                    activeNode.folder = true;
                    activeNode.setExpanded(true);
                    activeNode.render();
                    newFolderNode.setActive();
                } else {
                    var newFolderNode = $scope.tree.getRootNode().addNode(newFolder);
                    newFolderNode.setActive();
                }
            }
            $scope.treeSource = angular.element(':ui-fancytree').fancytree('getTree').toDict();
        }

        $scope.selectedStruCallback = function (selected) {
            if (selected && selected.title) {
                $scope.nodeLinkStru.title = selected.originalObject.title;
                $scope.nodeLinkStru.data.struLink.title = selected.originalObject.title;
                $scope.nodeLinkStru.data.struLink.id = selected.originalObject.id;
                $scope.treeConfig.source = angular.element(':ui-fancytree').fancytree("getTree").toDict();
                $timeout(function () {
                    $scope.tree = angular.element(':ui-fancytree').fancytree("getTree");
                    $scope.tree.activateKey($scope.nodeLinkStru.key);
                }, 200, false);
            }
        };
        $scope.goToStruLink = function (id, idBack) {
            var dialog = document.createElement('div');
            dialog.setAttribute('title', 'Aggiunta media');
            dialog.innerHTML = "<p>Salvare le modifiche prima di aprire il metadato?";
            if (idBack) {
                $(dialog).dialog({
                    resizable: false,
                    height: "auto",
                    width: 400,
                    modal: true,
                    buttons: {
                        "Salva": function () {
                            $(this).dialog("close");
                            $scope.saveData(0, function () {
                                $scope._goToStruLink(id, idBack);
                            });
                        },
                        "Procedi senza salvare": function () {
                            $scope._goToStruLink(id, idBack);
                            $(this).dialog("close");
                        }
                    }
                });
            } else {
                $scope._goToStruLink(id, idBack);
            }
        };
        $scope._goToStruLink = function (id, idBack) {
            $location.search('id', id);
            $location.search('backId', idBack);
            render();
        }

        $scope.updateFreeMedia = function () {
            // Aggiorna lista media liberi
            var selectedArray = $scope.getSelectedArrayForSel();
            $scope.arrayLogic = []; // Array dei media liberi
            $scope.tree = angular.element(':ui-fancytree').fancytree("getTree");
            for (var i = 0; i < selectedArray.length; i++) {
                var keyNode = selectedArray[i].keyNode;
                selectedArray[i].selected = false;
                if (keyNode == null || !$scope.tree.getNodeByKey(keyNode)) {
                    // TODO: Check aliasKeyNode (?)
                    $scope.arrayLogic.push(selectedArray[i]);
                }
            }
            if (!$scope.$$phase) {
                $scope.$digest();
            }
            setTimeout(function () { // Necessario attendere aggiornamento UI
                if ($scope.arrayLogic.length > 0) {
                    $scope.updateDraggableItems();
                }
                $scope.updateDroppableContainers();
            }, 42);
        }
        $scope.currentFolderContentType = 'Immagini';
        $scope.changeCurrentFolderContentType = function (type) {
            $scope.currentFolderContentType = type;
            $scope.updateVisibleFolderContents();
        };
        $scope.updateVisibleFolderContents = function () {
            var arrayToCheck = [];
            switch ($scope.currentFolderContentType) {
                case 'Immagini':
                    arrayToCheck = $scope.arrayImage;
                    break;
                case 'Documenti':
                    arrayToCheck = $scope.arrayDoc;
                    break;
                case 'Audio':
                    arrayToCheck = $scope.arrayAudio;
                    break;
                case 'Video':
                    arrayToCheck = $scope.arrayVideo;
                    break;
                default:
                    arrayToCheck = $scope.arrayImage;
            }
            var sonsFolder = [];
            $scope.tree = angular.element(':ui-fancytree').fancytree("getTree");
            for (var i = 0; i < arrayToCheck.length; i++) {
                if (arrayToCheck[i].keyNode == $scope.tree.getActiveNode().key) {
                    arrayToCheck[i].selected = false;
                    sonsFolder.push(arrayToCheck[i]);
                }
                if (arrayToCheck[i].aliasKeyNode && arrayToCheck[i].aliasKeyNode.indexOf($scope.tree.getActiveNode().key) !== -1) {
                    arrayToCheck[i].selected = false;
                    var obj = _.clone(arrayToCheck[i]);
                    obj.alias = true;
                    delete obj.$$hashKey;
                    sonsFolder.push(obj);
                }
            }
            sonsFolder = _.sortBy(sonsFolder, 'pos');
            $scope.sonsFolder = sonsFolder;
            if (!$scope.$$phase) {
                $scope.$digest();
            }
            setTimeout(function () { // Necessario attendere aggiornamento UI
                $scope.updateDraggableItems();
                $scope.updateDroppableContainers();
            }, 42);

        }
        $scope.selectStruTab = function (tab) {
            if ($scope.struTab !== tab) {
                $scope.struTab = tab;
                $scope.closePosition();
                if (tab === 'sl') {
                    $scope.freeMediaPaginationOpt.currentPage = 0;
                    $scope.folderPaginationOpt.currentPage = 0;
                    $scope.updateFreeMedia();
                    try {
                        if ($scope.paginationOpt.itemsPage === CONFIG.defaultItemsPerPage) {
                            var boxItemFolder = angular.element('#boxItemFolder')[0];
                            var boxItemWidth;
                            if (boxItemFolder) {
                                boxItemWidth = boxItemFolder.clientWidth;
                            } else {
                                var mainContainer = angular.element('#sf')[0];
                                boxItemWidth = mainContainer.clientWidth - (mainContainer.clientWidth * 33.33333333 / 100) - 30;
                            }
                            var itemsPerPage = Math.floor(boxItemWidth / 170) * 2;
                            itemsPerPage = !isNaN(itemsPerPage) ? itemsPerPage : CONFIG.defaultItemsPerPage;
                            $scope.freeMediaPaginationOpt.itemsPage = itemsPerPage;
                            $scope.folderPaginationOpt.itemsPage = itemsPerPage;
                            var itemPerPageOptions = CONFIG.itemPerPageOptions;
                            if (itemPerPageOptions.indexOf(itemsPerPage) < 0) {
                                itemPerPageOptions.push(itemsPerPage);
                                itemPerPageOptions.sort(function (a, b) {
                                    if (a < b) {
                                        return -1;
                                    }
                                    if (a > b) {
                                        return 1;
                                    }
                                    return 0;
                                });
                                $scope.freeMediaPaginationOpt.itemPerPageOptions = itemPerPageOptions;
                                $scope.folderPaginationOpt.itemPerPageOptions = itemPerPageOptions;
                            }
                        }
                    } catch (e) {
                        console.log(e);
                    }
                    $scope.updateFoldersMinHeight();
                } else {
                    $scope.paginationOpt.currentPage = 0;
                    try {
                        $scope.tree = angular.element(':ui-fancytree').fancytree("getTree");
                        $scope.tree.getActiveNode().setActive(false);
                    } catch (e) { }
                    // $scope.paginationOpt.itemsPage = CONFIG.defaultItemsPerPage;
                    $scope.logicalStruFolder = {
                        nameFolder: '',
                        fromSeq: '',
                        toSeq: '',
                        fromSeqFreeIndex: '',
                        toSeqFreeIndex: '',
                        arrForSel: 'Immagini'
                    };
                }
            }
        };
        function whenNodeActivated() {
            $scope.tree = angular.element(':ui-fancytree').fancytree("getTree");
            if ($scope.tree.getActiveNode()) {
                $scope.sonsFolder = [];
                $scope.multipleSelectedDocs = [];

                // Aggiorno lista dei media contenuti nella cartella
                $scope.updateVisibleFolderContents();
            }
            $scope.updateDraggableItems();
            $scope.updateDroppableContainers();
            $scope.unselectAllFolderMedia();
            $scope.unselectAllFreeMedia();
            $scope.updateFoldersHeight();
        };

        function alreadyInmediaListArray(id) {
            if ($scope.mediaListArray) {
                for (var i in $scope.mediaListArray) {
                    if ($scope.mediaListArray[i].id == id) {
                        return true;
                    }
                }
            }
            return false;
        };

        Pinax.events.on('dam.selectMedia', function (e) {
            $scope.arrayTemp = null;
            $scope.arrayTemp = e.message;
            var arType = {
                "IMAGE": $scope.arrayImage,
                "PDF": $scope.arrayDoc,
                "AUDIO": $scope.arrayAudio,
                "VIDEO": $scope.arrayVideo,
                "CONTAINER": []
            };
            for (var i in $scope.arrayTemp) {
                arType[$scope.arrayTemp[i].type].push($scope.arrayTemp[i]);
                arType[$scope.arrayTemp[i].type][arType[$scope.arrayTemp[i].type].length - 1].side = -1;
                arType[$scope.arrayTemp[i].type][arType[$scope.arrayTemp[i].type].length - 1].keyNode = null;
                if (!alreadyInmediaListArray($scope.arrayTemp[i].id)) {
                    if (!$scope.mediaListArray) {
                        $scope.mediaListArray = new Array();
                    }
                    $scope.mediaListArray.push({
                        id: $scope.arrayTemp[i].id,
                        mediaUrl: $scope.arrayTemp[i].thumbnail,
                        mediaUrlOriginal: checkResize(($scope.arrayTemp[i].thumbnail).replace("thumbnail", "original")),
                        mediaCaption: $scope.arrayTemp[i].title,
                        type: 'img'
                    });
                }
            }
            $scope.arrayCurrent = $scope.arrayTemp[0] && $scope.arrayTemp[0].type ? arType[$scope.arrayTemp[0].type] : arType["IMAGE"];
            if (!$scope.$$phase) {
                $scope.$digest();
            }
            if (modalDamInstance) {
                modalDamInstance.close();
            }
            recountPosition($scope.arrayCurrent);
            recountPosition($scope.mediaListArray);
            if ($scope.currentTab === 4) {
                $scope.currentTab = 0;
            }
        });

        $scope.arrayImage = [];
        $scope.arrayVideo = [];
        $scope.arrayAudio = [];
        $scope.arrayDoc = [];
        $scope.currentTab = 0;
        var clbGetData = function (err, data) {
            if (err) {
                feedbackInstance.title = "Attenzione";
                feedbackInstance.msg = "C'è stato un errore durante il caricamento dei dati..."
                feedbackInstance.close = true;
                return;
            }
            feedbackInstance.remove();
            $scope.arrayImage = [];
            $scope.arrayVideo = [];
            $scope.arrayAudio = [];
            $scope.arrayDoc = [];
            var obj;
            //var relatedMAG = angular.element('#relatedMAG').html();

            var title = data.data.title;
            var state = data.data.state;
            var linkedRecord = data.data.linkedRecord;
            var physicalSTRU = data.data.physicalSTRU;
            if (physicalSTRU) {
                $scope.arrayImage = physicalSTRU.image || [];
                $scope.arrayDoc = physicalSTRU.documents || [];
                $scope.arrayAudio = physicalSTRU.audio || [];
                $scope.arrayVideo = physicalSTRU.video || [];

                setMediaForViewer($scope.arrayImage);
            }
            $scope.arrayMatrix = [$scope.arrayImage, $scope.arrayDoc, $scope.arrayAudio, $scope.arrayVideo];
            $scope.currentTab = 0;
            $scope.arrayCurrent = $scope.arrayMatrix[0];
            var logicalSTRU = data.data.logicalSTRU;
            if (logicalSTRU != '') {
                $scope.treeConfig.source = logicalSTRU;
            }
            $scope.generalInfo.title = title;
            $scope.generalInfo.state = state;
            $scope.generalInfo.linkedRecord = linkedRecord;
            if (linkedRecord) {
                $scope.$broadcast('angucomplete-alt:changeInput', 'linkedRecord', linkedRecord);
            } else {
                $scope.$broadcast('angucomplete-alt:clearInput', 'linkedRecord');
            } 
            var MAG = data.data.MAG;
            if (MAG != '') {
                obj = MAG;
                $scope.magChosen = obj;
                angular.element('#relatedMAG_t').val(obj.text);
            }
        };

        var setMediaForViewer = function (ar) {
            $scope.mediaListArray = new Array();
            for (var i = 0; i < ar.length; i++) {
                $scope.mediaListArray.push({
                    id: ar[i].id,
                    mediaUrl: ar[i].thumbnail,
                    mediaUrlOriginal: checkResize((ar[i].thumbnail).replace("thumbnail", "original")),
                    mediaCaption: ar[i].label || ar[i].title,
                    keyNode: ar[i].keyNode,
                    aliasKeyNode: ar[i].aliasKeyNode,
                    type: 'img'
                });
                $scope.metaMediaViewerList.medias.push({
                    "thumbnail": ar[i].thumbnail,
                    "title": ar[i].label || ar[i].title,
                    "type": "IMAGE",
                    "url": checkResize((ar[i].thumbnail).replace("thumbnail", "original"))
                });
            }
        }

        $scope.metadatiMediaChanged = function () {
            setMediaForViewer($scope.arrayImage);
        }

        $scope.selectedObjCallback = function (selected) {
            //console.log(selected); 
            if (typeof selected != 'undefined') {
                $scope.magChosen = { "id": selected.originalObject.id, "text": selected.originalObject.text };
            } else {
                $scope.magChosen = '';
            }

        };

        var setMediaInNode = function (medias, tree) {
            function findMediaInNode(node) {
                if (!node.data)
                    node.data = {
                        count: 0
                    };
                var media = _.filter(medias, function (media) {
                    if (media.keyNode === node.key || (media.aliasKeyNode && media.aliasKeyNode.indexOf(node.key) !== -1))
                        node.data.count++;
                });
                if (!node.children)
                    return false;
                for (var i = 0; i < node.children.length; i++) {
                    findMediaInNode(node.children[i]);
                }
                return false;
            };
            for (var i = 0; i < tree.length; i++) {
                findMediaInNode(tree[i]);
            }
            return false;
        }
        $scope.getEmptyFolderText = function () {
            switch ($scope.currentFolderContentType) {
                case 'Immagini':
                    return 'Nessuna immagine inserita in questa cartella.';
                case 'Documenti':
                    return 'Nessun documento inserito in questa cartella.';
                case 'Audio':
                    return 'Nessun file audio inserito in questa cartella.';
                case 'Video':
                    return 'Nessun video inserito in questa cartella.';
                default:
                    return 'Nessun media inserito in questa cartella.';
            }
        }
        $scope.getEmptyFreeMediaFolderText = function () {
            switch ($scope.logicalStruFolder.arrForSel) {
                case 'Immagini':
                    return 'Nessuna immagine rimasta libera.';
                case 'Documenti':
                    return 'Nessun documento rimasto libero.';
                case 'Audio':
                    return 'Nessun file audio rimasto libero.';
                case 'Video':
                    return 'Nessun video rimasto libero.';
                default:
                    return 'Nessun media rimasto libero.';
            }
        }
        $scope.saveData = function (close, callback) {
            var physicalSTRU = {
                "image": $scope.arrayImage,
                "documents": $scope.arrayDoc,
                "audio": $scope.arrayAudio,
                "video": $scope.arrayVideo
            };
            var logicalSTRU = null;
            if (angular.element(':ui-fancytree').fancytree("getTree").length != 0) {
                logicalSTRU = angular.element(':ui-fancytree').fancytree("getTree").toDict();
            }
            if (logicalSTRU) {
                setMediaInNode(physicalSTRU.image, logicalSTRU);
            }
            var obj = {
                "title": $scope.generalInfo.title,
                "state": $scope.generalInfo.state,
                "physicalSTRU": physicalSTRU,
                "logicalSTRU": logicalSTRU,
                "instituteKey": $scope.instituteKey,
                "linkedRecord": $scope.generalInfo.linkedRecord || null
            };
            var feedback = {
                "title": "Salvataggio",
                "msg": "Attendi il salvataggio dei dati...",
                "close": false
            };
            console.log('SAVE', obj);
            feedbackInstance = $uiMrFeedback.open(feedback);
            $timeout(function () {
                if ($scope.idMetadato) {
                    $scope.putData($scope.idMetadato, obj, close, callback);
                } else {
                    $scope.postData(obj, close, callback);
                }
            }, 500);
        };
        $scope.goToTeca = function () {
            window.top.location.href = CONFIG.serverTecaStrumag;
        };
        $scope.putData = function (id, data, close, callback) {
            var clb = function (err, data) {
                if (err) {
                    feedbackInstance.title = "Attenzione";
                    feedbackInstance.msg = "C'è stato un errore durante il salvataggio dei dati..."
                    feedbackInstance.close = true;
                    console.log(err);
                    return;
                }
                feedbackInstance.remove();
                if (close) {
                    window.top.location.href = CONFIG.serverTecaStrumag;
                }
                if (callback) {
                    callback();
                }
            }
            MainService.serviceProvider.putMetadato(id, data, clb);
        };
        $scope.postData = function (data, close, callback) {
            var clb = function (err, data) {
                if (err) {
                    feedbackInstance.title = "Attenzione";
                    feedbackInstance.msg = "C'è stato un errore durante il salvataggio dei dati..."
                    feedbackInstance.close = true;
                    console.log(err);
                    return;
                }
                $scope.idMetadato = data.data.id;
                feedbackInstance.remove();
                if (close) {
                    window.top.location.href = CONFIG.serverTecaStrumag;
                }
                if (callback) {
                    callback();
                }
            }
            MainService.serviceProvider.postMetadato(data, clb);
        };
        $scope.moveUp = function (pos) {
            if (pos === 0) {
                return;
            } else {
                var currentObj = $scope.arrayCurrent[pos];
                $scope.arrayCurrent[pos] = $scope.arrayCurrent[pos - 1];
                $scope.arrayCurrent[pos - 1] = currentObj;
            }
        };

        $scope.moveDown = function (pos) {
            if (pos === $scope.arrayCurrent.length - 1) {
                return;
            } else {
                var currentObj = $scope.arrayCurrent[pos];
                $scope.arrayCurrent[pos] = $scope.arrayCurrent[pos + 1];
                $scope.arrayCurrent[pos + 1] = currentObj;
            }
        };
        $scope.damViewerVisible = false;
        $scope.showDamViewer = function () {
            $scope.treeSource = angular.element(':ui-fancytree').fancytree("getTree").toDict();
            angular.element(".containerDamViewer").show();
            $scope.damViewerVisible = true;
        };
        $scope.hideDamViewer = function () {
            angular.element(".containerDamViewer").hide();
            $scope.damViewerVisible = false;
        };
        $scope.getMediaImageUrl = function (obj) {
            switch (obj.type) {
                case 'IMAGE':
                    return obj.thumbnail;
                case 'PDF':
                    return 'img/default_document.png';
                case 'AUDIO':
                    return 'img/default_audio.png';
                case 'VIDEO':
                    return 'img/default_video.png';
                default:
                    return obj.thumbnail;
            }
        }
        /*1) GESTIRE IL TASTO CTRL/CMD.
          2) VEDERE COSA FARE QUANDO IN UNA CARTELLA SONO GIA' ASSOCIATI DEI MEDIA:
                - POSSO SELEZIONARLI DI NUOVO, E IN TAL CASO COSA FACCIO, OPPURE NO (TOGLIENDO LA SELEZIONE E OSCURANDO "DA"/"A")?
        */
        $scope.multipleSelectedFolderDocs = [];
        $scope.selectedFolderDoc;
        $scope.selectedFolderMedia = 0;
        $scope.logicalStruFolder.fromSeqFolder = '';
        $scope.logicalStruFolder.toSeqFolder = '';
        $scope.logicalStruFolder.fromSeqFreeIndexFolder = '';
        $scope.logicalStruFolder.toSeqFreeIndexFolder = '';
        $scope.fromSeqFolder = "";
        $scope.toSeqFolder = "";
        $scope.folderMediaButtonSelectText = 'Seleziona tutti';
        $scope.toggleCurrentFolderSelected = function (event, obj, index) {
            $scope.unselectAllFreeMedia();
            if (event && event.shiftKey) { // MULTIPLE SELECTION
                $scope.multipleSelectedFolderDocs.forEach(function (otherDoc) {
                    otherDoc.selected = false;
                });
                $scope.multipleSelectedFolderDocs = new Array();
                var startIndex = 0;
                var lastIndex = 0;
                if ($scope.sonsFolder.indexOf(obj) < $scope.sonsFolder.indexOf($scope.selectedFolderDoc)) {
                    var startIndex = $scope.sonsFolder.indexOf(obj);
                    var lastIndex = $scope.sonsFolder.indexOf($scope.selectedFolderDoc);
                    $scope.logicalStruFolder.toSeqFreeIndexFolder = $scope.logicalStruFolder.fromSeqFreeIndexFolder;
                    $scope.logicalStruFolder.fromSeqFreeIndexFolder = startIndex;
                    $scope.logicalStruFolder.toSeqFolder = $scope.logicalStruFolder.fromSeqFolder;
                    $scope.logicalStruFolder.fromSeqFolder = obj.pos + 1
                } else {
                    var startIndex = $scope.sonsFolder.indexOf($scope.selectedFolderDoc);
                    var lastIndex = $scope.sonsFolder.indexOf(obj);
                    $scope.logicalStruFolder.toSeqFreeIndexFolder = index;
                    $scope.logicalStruFolder.toSeqFolder = obj.pos + 1;
                }
                $scope.selectedFolderDoc = $scope.sonsFolder[startIndex];
                for (startIndex; startIndex <= lastIndex; startIndex++) {
                    if ($scope.sonsFolder[startIndex]) {
                        $scope.sonsFolder[startIndex].selected = true;
                        $scope.multipleSelectedFolderDocs.push($scope.sonsFolder[startIndex]);
                    }
                }
                // } else if ($scope.selectedFreeMedia === $scope.sonsFolder.length) {
                //     if (event && (event.cmdKey || event.metaKey)) {
                //         $scope.unselectSingleFreeMedia(obj, index);
                //     } else {
                //         $scope.selectSingleFreeMedia(obj, index);
                //     }
            } else if (obj.selected == true) {
                if (event && (event.cmdKey || event.metaKey)) {
                    $scope.unselectSingleFolderMedia(obj, index);
                } else {
                    $scope.unselectAllFolderMedia();
                    $scope.selectSingleFolderMedia(obj, index);
                }
            } else {
                if (event && (event.cmdKey || event.metaKey)) {
                    $scope.selectSingleFolderMedia(obj, index);
                } else {
                    $scope.selectFolderMedia(obj, index);
                }
            }
            $scope.selectedFolderMedia = $scope.multipleSelectedFolderDocs.length;
            if ($scope.multipleSelectedFolderDocs.length == $scope.sonsFolder.length) {
                $scope.folderMediaButtonSelectText = 'Deseleziona tutti';
            } else {
                $scope.folderMediaButtonSelectText = 'Seleziona tutti';
            }

        };

        $scope.selectFolderMedia = function (obj, index) {
            $scope.multipleSelectedFolderDocs.forEach(function (otherDoc) {
                otherDoc.selected = false;
            });
            $scope.multipleSelectedFolderDocs = new Array(obj);
            obj.selected = true;
            $scope.selectedFolderDoc = obj;
            $scope.logicalStruFolder.fromSeqFreeIndexFolder = index;
            $scope.logicalStruFolder.toSeqFreeIndexFolder = index;
            $scope.logicalStruFolder.fromSeqFolder = obj.pos + 1;
            $scope.logicalStruFolder.toSeqFolder = obj.pos + 1;
        };

        $scope.unselectSingleFolderMedia = function (obj, index) {
            var selectedIndex = _.findIndex($scope.multipleSelectedFolderDocs, function (otherObj) { return otherObj.id === obj.id });
            if (selectedIndex >= 0) {
                $scope.sonsFolder[index].selected = false;
                $scope.multipleSelectedFolderDocs.splice(selectedIndex, 1);
            }
            delete $scope.selectedFolderDoc;
        };

        $scope.selectSingleFolderMedia = function (obj, index) {
            $scope.sonsFolder[index].selected = true;
            obj.selected = true;
            $scope.multipleSelectedFolderDocs.push(obj);
        };

        $scope.unselectAllFolderMedia = function () {
            $scope.multipleSelectedFolderDocs.forEach(function (otherDoc) {
                otherDoc.selected = false;
            });
            $scope.multipleSelectedFolderDocs = new Array();
            delete $scope.selectedFolderDoc;
            $scope.logicalStruFolder.fromSeqFolder = '';
            $scope.logicalStruFolder.toSeqFolder = '';
            $scope.logicalStruFolder.fromSeqFreeIndexFolder = '';
            $scope.logicalStruFolder.toSeqFreeIndexFolder = '';
            $scope.fromSeqFolder = "";
            $scope.toSeqFolder = "";
            $scope.folderMediaButtonSelectText = 'Seleziona tutti';
            $scope.selectedFolderMedia = 0;
            $scope.resetSelectionFolder();
            $scope.updateSelectionFolder();
            if (!$scope.$$phase) {
                $scope.$digest();
            }
        };
        $scope.selectAllFolderMedia = function () {
            $scope.folderMediaButtonSelectText = 'Deseleziona tutti';
            $scope.selectedFolderMedia = $scope.sonsFolder.length;
            $scope.logicalStruFolder.fromSeqFreeIndexFolder = 0;
            $scope.logicalStruFolder.toSeqFreeIndexFolder = $scope.sonsFolder.length - 1;
            $scope.logicalStruFolder.fromSeqFolder = $scope.sonsFolder[0].pos + 1;
            $scope.logicalStruFolder.toSeqFolder = $scope.sonsFolder[$scope.sonsFolder.length - 1].pos + 1;
            $scope.updateSelectionFolder();
        };
        $scope.toggleAllFolderMedia = function () {
            if ($scope.folderMediaButtonSelectText == 'Seleziona tutti') {
                $scope.selectAllFolderMedia();
            } else {
                $scope.unselectAllFolderMedia();
            }
        }
        $scope.resetSelectionFolder = function () {
            if ($scope.sonsFolder) {
                for (var i = 0; i < $scope.sonsFolder.length; i++) {
                    $scope.sonsFolder[i].selected = false;
                }
            }
            $scope.multipleSelectedFolderDocs = [];
            $scope.selectedFolderMedia = 0;
            $scope.folderMediaButtonSelectText = 'Seleziona tutti';
        };
        $scope.updateSelectionFolder = function () {
            var activeNode = $scope.tree.getActiveNode();
            if (!activeNode) {
                return;
            }
            $scope.logicalStruFolder.fromSeqFreeIndexFolder = _.findIndex($scope.sonsFolder, { pos: parseInt($scope.logicalStruFolder.fromSeqFolder) - 1 });
            $scope.logicalStruFolder.toSeqFreeIndexFolder = _.findIndex($scope.sonsFolder, { pos: parseInt($scope.logicalStruFolder.toSeqFolder) - 1 });
            if ($scope.sonsFolder && $scope.logicalStruFolder.toSeqFreeIndexFolder < 0) {
                var itemsBeforeTo = $scope.sonsFolder.map(function (o) { return o.pos + 1; }).filter(function (item) { return item < parseInt($scope.logicalStruFolder.toSeqFolder); });
                $scope.logicalStruFolder.toSeqFreeIndexFolder = itemsBeforeTo.length - 1;
            }
            $scope.resetSelectionFolder();
            $scope.selectedFolderDoc = $scope.sonsFolder[$scope.logicalStruFolder.fromSeqFreeIndexFolder]; // TODO => Capire a cosa serve
            var toEnd = ($scope.logicalStruFolder.toSeqFreeIndexFolder < $scope.sonsFolder.length) ? $scope.logicalStruFolder.toSeqFreeIndexFolder : $scope.sonsFolder.length;
            // Seleziono gli elementi nell'intervallo indicato dall'inizio alla fine (o alla fine dell'array)
            for (var i = $scope.logicalStruFolder.fromSeqFreeIndexFolder; i <= toEnd; i++) {
                if ($scope.sonsFolder[i]) {
                    try {
                        $scope.sonsFolder[i].selected = true;
                        $scope.multipleSelectedFolderDocs.push($scope.sonsFolder[i]);
                    } catch (e) { console.log(e); }
                }
            }
            $scope.selectedFolderMedia = $scope.multipleSelectedFolderDocs.length;
            if ($scope.multipleSelectedFolderDocs.length > 0 && $scope.multipleSelectedFolderDocs.length == $scope.sonsFolder.length) {
                $scope.folderMediaButtonSelectText = 'Deseleziona tutti';
            } else {
                $scope.folderMediaButtonSelectText = 'Seleziona tutti';
            }
        };
        // FREE MEDIA SELECTION
        $scope.freeMediaButtonSelectText = 'Seleziona tutti';
        $scope.selectedFreeMedia = 0;
        $scope.toggleFreeMediaSelected = function (event, obj, index) {
            $scope.unselectAllFolderMedia();
            if (event && event.shiftKey) { // MULTIPLE SELECTION
                $scope.multipleSelectedDocs.forEach(function (otherDoc) {
                    otherDoc.selected = false;
                });
                $scope.multipleSelectedDocs = new Array();
                var startIndex = 0;
                var lastIndex = 0;
                if ($scope.arrayLogic.indexOf(obj) < $scope.arrayLogic.indexOf($scope.selectedDoc)) {
                    var startIndex = $scope.arrayLogic.indexOf(obj);
                    var lastIndex = $scope.arrayLogic.indexOf($scope.selectedDoc);
                    $scope.logicalStruFolder.toSeqFreeIndex = $scope.logicalStruFolder.fromSeqFreeIndex;
                    $scope.logicalStruFolder.fromSeqFreeIndex = startIndex;
                    $scope.logicalStruFolder.toSeq = $scope.logicalStruFolder.fromSeq;
                    $scope.logicalStruFolder.fromSeq = obj.pos + 1
                } else {
                    var startIndex = $scope.arrayLogic.indexOf($scope.selectedDoc);
                    var lastIndex = $scope.arrayLogic.indexOf(obj);
                    $scope.logicalStruFolder.toSeqFreeIndex = index;
                    $scope.logicalStruFolder.toSeq = obj.pos + 1;
                }
                $scope.selectedDoc = $scope.arrayLogic[startIndex];
                for (startIndex; startIndex <= lastIndex; startIndex++) {
                    if ($scope.arrayLogic[startIndex]) {
                        $scope.arrayLogic[startIndex].selected = true;
                        $scope.multipleSelectedDocs.push($scope.arrayLogic[startIndex]);
                    }
                }
                // } else if ($scope.selectedFreeMedia === $scope.arrayLogic.length) {
                //     if (event && (event.cmdKey || event.metaKey)) {
                //         $scope.unselectSingleFreeMedia(obj, index);
                //     } else {
                //         $scope.selectSingleFreeMedia(obj, index);
                //     }
            } else if (obj.selected == true) {
                if (event && (event.cmdKey || event.metaKey)) {
                    $scope.unselectSingleFreeMedia(obj, index);
                } else {
                    $scope.unselectAllFreeMedia();
                    $scope.selectSingleFreeMedia(obj, index);
                }
            } else {
                if (event && (event.cmdKey || event.metaKey)) {
                    $scope.selectSingleFreeMedia(obj, index);
                } else {
                    $scope.selectFreeMedia(obj, index);
                }
            }
            $scope.selectedFreeMedia = $scope.multipleSelectedDocs.length;
            if ($scope.multipleSelectedDocs.length == $scope.arrayLogic.length) {
                $scope.freeMediaButtonSelectText = 'Deseleziona tutti';
            } else {
                $scope.freeMediaButtonSelectText = 'Seleziona tutti';
            }
        };

        $scope.selectFreeMedia = function (obj, index) {
            $scope.multipleSelectedDocs.forEach(function (otherDoc) {
                otherDoc.selected = false;
            });
            $scope.multipleSelectedDocs = new Array(obj);
            obj.selected = true;
            $scope.selectedDoc = obj;
            $scope.logicalStruFolder.fromSeqFreeIndex = index;
            $scope.logicalStruFolder.toSeqFreeIndex = index;
            $scope.logicalStruFolder.fromSeq = obj.pos + 1;
            $scope.logicalStruFolder.toSeq = obj.pos + 1;
        };

        $scope.unselectSingleFreeMedia = function (obj, index) {
            var selectedIndex = _.findIndex($scope.multipleSelectedDocs, function (otherObj) { return otherObj.id === obj.id });
            if (selectedIndex >= 0) {
                $scope.arrayLogic[index].selected = false;
                $scope.multipleSelectedDocs.splice(selectedIndex, 1);
            }
            delete $scope.selectedDoc;
        };
        $scope.selectSingleFreeMedia = function (obj, index) {
            $scope.arrayLogic[index].selected = true;
            obj.selected = true;
            $scope.multipleSelectedDocs.push(obj);
        };
        $scope.unselectAllFreeMedia = function () {
            $scope.freeMediaButtonSelectText = 'Seleziona tutti';
            $scope.selectedFreeMedia = 0;
            if ($scope.multipleSelectedDocs) {
                $scope.multipleSelectedDocs.forEach(function (otherDoc) {
                    otherDoc.selected = false;
                });
            }
            $scope.multipleSelectedDocs = new Array();
            delete $scope.selectedDoc;
            $scope.logicalStruFolder.fromSeq = '';
            $scope.logicalStruFolder.toSeq = '';
            $scope.logicalStruFolder.fromSeqFreeIndex = '';
            $scope.logicalStruFolder.toSeqFreeIndex = '';
            $scope.fromSeq = "";
            $scope.toSeq = "";
            $scope.resetSelection();
            $scope.changeSelectedObj();
        };
        $scope.selectAllFreeMedia = function () {
            $scope.freeMediaButtonSelectText = 'Deseleziona tutti';
            $scope.selectedFreeMedia = $scope.arrayLogic.length;
            $scope.logicalStruFolder.fromSeqFreeIndex = 0;
            $scope.logicalStruFolder.toSeqFreeIndex = $scope.arrayLogic.length - 1;
            $scope.logicalStruFolder.fromSeq = $scope.arrayLogic[0].pos + 1;
            $scope.logicalStruFolder.toSeq = $scope.arrayLogic[$scope.arrayLogic.length - 1].pos + 1;
            $scope.changeSelectedObj();
        };
        $scope.toggleAllFreeMedia = function () {
            if ($scope.freeMediaButtonSelectText == 'Seleziona tutti') {
                $scope.selectAllFreeMedia();
            } else {
                $scope.unselectAllFreeMedia();
            }
        }
        var checkResize = function (url) {
            var check = url.indexOf('/original') !== -1 && CONFIG.originalResize;
            if (check) {
                url = url.replace('get', 'resize');
                url = url.indexOf('/original?') !== -1 ? url += '&' + CONFIG.originalResize : url += '?' + CONFIG.originalResize;
            }
            return url;
        };

        $scope.openBox = function (event, obj) {
            event.stopPropagation();
            if (obj.type === "IMAGE") {
                $scope.openBoxImg(obj);
                return;
            }
            $scope.metaMediaViewerList.medias = [{
                "thumbnail": obj.thumbnail,
                "title": obj.title,
                "type": obj.type,
                "url": obj.src
            }];
            $scope.openMetaMediaViewer = true;
        };
        $scope.openBoxImg = function (obj) {
            var setModalOnFocus = function (ele) {
                var modals = $(".boxImage");
                var maxIndex = 0;
                _.forEach(modals, function (value) {
                    if (value.style.zIndex > maxIndex)
                        maxIndex = value.style.zIndex;
                });
                if (ele.style.zIndex !== maxIndex) {
                    ele.style.zIndex = parseInt(maxIndex) + 10;
                }
            };
            var idModale = obj.id ? obj.id : new Date().getTime();
            if ($('.boxImage_' + idModale).length > 0) {
                setModalOnFocus($('.boxImage_' + idModale)[0]);
                return;
            }
            var modalInstance = $uibModal.open({
                animation: false,
                backdrop: false,
                appendTo: angular.element("body"),
                templateUrl: 'boxNonModal.html',
                controller: 'ModalCtrl',
                windowClass: 'boxImage boxImage_' + idModale,
                backdropClass: 'displayNoneModal',
                resolve: {
                    item: function () {
                        return checkResize(obj.src);
                    },
                    title: function () {
                        var title = obj.label || obj.title;
                        return title
                    },
                    id: function () {
                        return obj.id;
                    },
                    pos: function () {
                        return (obj.pos + 1);
                    },
                    idModal: function () {
                        return idModale;
                    }
                }
            });
            modalInstance.rendered.then(function () {
                $('.boxImage_' + idModale).draggable({
                    handle: ".modal-draggable",
                    containment: "body",
                    scroll: false,
                    start: function () {
                        setModalOnFocus($('.boxImage_' + idModale)[0]);
                    },
                    stop: function () {
                        // Evita che la modale scompaia troppo in alto o troppo a sinistra
                        try {
                            if ($('.boxImage_' + idModale).css('top').replace('px', '') < 0) {
                                $('.boxImage_' + idModale).css('top', 0);
                            }
                        } catch (e) { }
                        try {
                            if ($('.boxImage_' + idModale).css('left').replace('px', '') < 0) {
                                $('.boxImage_' + idModale).css('left', 0);
                            }
                        } catch (e) { }
                        setModalOnFocus($('.boxImage_' + idModale)[0]);
                    }
                });
                $('.boxImage_' + idModale + ' .modal-dialog').resizable({
                    maxHeight: window.innerHeight,
                    maxWidth: window.innerWidth,
                    minHeight: 150,
                    minWidth: 200,
                    resize: function () {
                        $scope.$emit('boxImage:resize', idModale);
                    },
                    stop: function () {
                        $scope.$emit('boxImage:resize', idModale);
                    }
                });
                $('.boxImage_' + idModale).on("click", function (ev) {
                    setModalOnFocus(ev.currentTarget);
                });
                setModalOnFocus($('.boxImage_' + idModale)[0]);
            });
        };
        $scope.removeMedia = function (event, index) {
            if (event && event.stopPropagation) {
                event.stopPropagation();
            }
            var media = $scope.sonsFolder[index];
            media.keyNode = null;
            $scope.updateFreeMedia();
            $scope.updateVisibleFolderContents();
        };
        $scope.removeAlias = function (event, obj) {
            event.stopPropagation();
            var arType = {
                "IMAGE": $scope.arrayImage,
                "PDF": $scope.arrayDoc,
                "AUDIO": $scope.arrayAudio,
                "VIDEO": $scope.arrayVideo,
                "CONTAINER": []
            };
            var alias = _.find(arType[obj.type], { id: obj.id });
            if (alias) {
                var tree = angular.element(':ui-fancytree').fancytree("getTree");
                var nodeActive = tree.getActiveNode();
                _.remove(alias.aliasKeyNode, function (ele) {
                    return ele === nodeActive.key;
                });
                if (!alias.aliasKeyNode.length)
                    delete alias.aliasKeyNode;
            }
            _.remove($scope.sonsFolder, { id: obj.id });
        };
        var mediaAlias;
        var createMediaAlias = function (node) {
            if (!mediaAlias.aliasKeyNode)
                mediaAlias.aliasKeyNode = [];
            if (mediaAlias.aliasKeyNode.indexOf(node.node.key) !== -1)
                alert('Alias già presente in questo nodo');
            mediaAlias.aliasKeyNode.push(node.node.key);
            setMediaForViewer($scope.arrayImage);
        };
        var treeConfigAlias = {
            extensions: ["glyph"],
            click: function (event, data) {
                if (!data.node.data || !data.node.data.active) {
                    return false;
                }
            },
            activate: function (event, data) {
                createMediaAlias(data);
                if (modalTreeAliasInstance)
                    modalTreeAliasInstance.close();
                return false;
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
            renderNode: function (event, data) {
                var node = data.node;
                var classToAdd = node.data && node.data.active ? 'active' : 'disabled';
                angular.element(node.li).addClass(classToAdd);
            },
            source: []
        };
        var modalTreeAliasInstance;
        var findKeyInTree = function (tree, key) {
            function findRecurse(node) {
                if (node.key === key)
                    return node;

                var result;
                if (!node.children)
                    return false;
                for (var i = 0; i < node.children.length; i++) {
                    result = findRecurse(node.children[i]);
                    if (result) return result;
                }
                return false;
            };
            var folder;
            for (var i = 0; i < tree.length; i++) {
                folder = findRecurse(tree[i]);
                if (folder)
                    return folder;
            }
            return false;
        };
        var setAliasTree = function (tree, media) {
            function findRecurse(node) {
                if (active && (!media.aliasKeyNode || media.aliasKeyNode.indexOf(node.key) === -1)) {
                    if (!node.data) node.data = {};
                    node.data.active = true;
                }
                if (node.key === media.keyNode) {
                    active = true;
                }
                if (!node.children)
                    return false;
                for (var i = 0; i < node.children.length; i++) {
                    findRecurse(node.children[i]);
                }
                return false;
            };
            var active = false;
            for (var i = 0; i < tree.length; i++) {
                if (active) {
                    if (!tree[i].data) tree[i].data = {};
                    tree[i].data.active = true;
                }
                findRecurse(tree[i]);
            }
            return false;
        }
        $scope.openTree = function (event, obj) {
            event.stopPropagation();
            mediaAlias = obj;
            var tree = angular.element(':ui-fancytree').fancytree("getTree").toDict();
            setAliasTree(tree, mediaAlias);
            treeConfigAlias.source = tree
            modalTreeAliasInstance = $uibModal.open({
                templateUrl: 'modal-treeAlias.html',
                openedClass: "modal-treeAlias",
                controller: function ($scope, $sce, $uibModalInstance) {
                    $scope.treeConfigAlias = treeConfigAlias;
                    $scope.closeModal = function () {
                        $uibModalInstance.dismiss();
                    }
                }
            });
        };
        $scope.$on('$includeContentLoaded', function () {
            //alert('view loaded');
            angular.element("iframe").height(($(window).height() * 85) / 100);
            angular.element(".modal-dialog").width("95%");
            $scope.buttonSelectText = 'Seleziona tutti';


            $("#sortImage").sortable($scope.sortableOptions).disableSelection();
            /*
            $("#sortDoc").sortable({
                axis: 'y',
                opacity: 0.5,
                update: endChange,
                start: startChange
            }).disableSelection();
        
            $("#sortAudio").sortable({
                axis: 'y',
                opacity: 0.5,
                update: endChange,
                start: startChange
            }).disableSelection();
        
            $("#sortVideo").sortable({
                axis: 'y',
                opacity: 0.5,
                update: endChange,
                start: startChange
            }).disableSelection();*/
            if ($scope.idMetadato) {
                MainService.serviceProvider.getMetadato($scope.idMetadato, clbGetData);
            }
        });
        $scope.windowWidth = $window.innerWidth
        angular.element($window).bind('resize', function () {
            $scope.windowWidth = $window.innerWidth
            // manuall $digest required as resize event
            // is outside of angular
            $scope.$digest();
            $scope.updateFoldersMinHeight();
            $scope.updateFoldersHeight();
        });
        $scope.indexOpened = true;
        $scope.toggleIndex = function () {
            $scope.indexOpened = !$scope.indexOpened;
        };
        $scope.currentFolderActiveView = 'preview';
        $scope.changeFolderItemsView = function (newView) {
            $scope.currentFolderActiveView = newView;
            $scope.updateFoldersHeight();
        };
        $scope.currentFreeMediaActiveView = 'preview';
        $scope.changeFreeMediaItemsView = function (newView) {
            $scope.currentFreeMediaActiveView = newView;
            $scope.updateFoldersHeight();
        };
        $scope.updateFoldersMinHeight = function () {
            try {
                var minHeightFolders = $window.innerHeight - $('#magSubcontainer .nav').outerHeight() - $('.mainContainerDamViewer').outerHeight() - 100;
                if (minHeightFolders < 100) {
                    minHeightFolders = 100;
                }
                $('.folderContainer-col').css('min-height', minHeightFolders + 'px');
            } catch (e) { console.log(e); }
        };
        $scope.updateFoldersHeight = function () {
            $timeout(function () {
                var height = 0;
                var folders = $('.folderContainer-col');
                for (var i = 0; i < folders.length; i++) {
                    $(folders[i]).css('height', 'auto');
                    if ($(folders[i]).outerHeight() > height) {
                        height = $(folders[i]).outerHeight();
                    }
                }
                if ($('.folderContainer-col .paginationContainer .pagination').length > 0) {
                    height += 30;
                }
                $('.folderContainer-col').css('height', height + 'px');
            }, 100);
        }
        $scope.selectedLinkedRecordCallback = function (selected) {
            if (selected) {
                $scope.generalInfo.linkedRecord = selected.originalObject;
            } else {
                $scope.generalInfo.linkedRecord = undefined;
            }
        };
        render();
    }

    function ModalCtrl($scope, $rootScope, $uibModalInstance, item, title, id, pos, idModal) {
        $scope.sourceImage = item;
        $scope.titleImage = title;
        $scope.idImage = id;
        $scope.posImage = pos;
        $scope.setZoom = 1;
        $scope.initialImgWidth;
        $scope.initialImgHeight;
        var img = new Image();
        $rootScope.$on('boxImage:resize', function (event, idModale) {
            if (idModale === idModal && $scope.setZoom === 1) {
                $scope.fit(true);
            }
        });
        var initialHeight = window.innerHeight * 85 / 100;
        var initialWidth = window.innerWidth * 45 / 100;
        img.onload = function () {
            var modalDialog = $('.boxImage_' + idModal + ' .modal-dialog ');
            modalDialog.width((initialWidth) + "px");
            modalDialog.height((initialHeight) + "px");
            modalDialog.css({
                "max-width": (window.innerWidth) + "px",
                "max-height": (window.innerHeight) + "px"
            });
            var newData = $scope.fit();
            modalDialog.width((newData.width + 50) + 'px');
            modalDialog.height((newData.height + 40 + 50) + 'px');

            modalDialog.css({
                "visibility": "visible",
                "min-width": "unset",
                "min-height": "unset"
            });
        };
        $scope.fit = function (fromResize) {
            var imageH = img.height;
            var imageW = img.width;
            var widthBody, heightBody;
            var modalBody = $('.boxImage_' + idModal + ' .modal-dialog .modal-body');
            if (fromResize) {
                widthBody = modalBody.width() - 50;
                heightBody = modalBody.height() - 50;
            } else {
                widthBody = initialWidth - 25;
                heightBody = initialHeight - 40 - 25;
            }
            var imgEl = modalBody.find('img');
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
            $scope.setZoom = 1;
            return { width: newImageW, height: newImageH };
        };
        img.src = item;
        $scope.close = function () {
            $uibModalInstance.dismiss('');
        };
        $scope.zoomIn = function () {
            $scope.setZoom += 0.2;
        };
        $scope.zoomOut = function () {
            $scope.setZoom -= 0.2;
            if ($scope.setZoom < 0) {
                $scope.setZoom = 0.1;
            }
        };
    }
})();
