App.con = App.Controller = {
    
    initialize: function () {
        App.debug('App.Controller.initialize()');
        App.instance = this;
        // Set up error handling
        // Get initial fragment
        App.con.fragment = window.location.hash.substring(1);
        // Set up colors
        PrimeColor.setSeed(225, 76, 17);
        // Create models
        App.con.userModel = new App.UserModel();
        App.con.mediaSources = new App.MediaModel({parse:true});
        App.con.mediaExplorer = new App.MediaExploreView({
            mediaSources: App.con.mediaSources
        });
        App.con.queryCollection = new App.QueryCollection();
        App.con.legendView = new App.LegendView({
            collection: App.con.queryCollection
        });
        // Create view manager and app-level views
        App.con.vm = new App.ViewManager({
            "selector": '.content .container-fixed'
        });
        App.con.queryVm = new App.ViewManager({
            "selector": ".content .container-fluid"
        });
        App.con.controlsView = new App.ControlsView({ userModel: App.con.userModel });
        App.con.toolView = new App.ToolListView({
            collection:App.con.queryCollection
        });
        $('.brand-toolbar .links').append(App.con.toolView.el);
        $('.controls').append(App.con.controlsView.el);
        $('.drawer .container').html(App.con.legendView.el);
        App.con.router = new App.Router();
        // Bind event handlers
        _.bindAll(this, 'onSignIn');
        _.bindAll(this, 'onSignOut');
        // Listener for events
        App.con.queryCollection.resources.on('error', function (model_or_controller, request) {
            App.debug('Received error: ' + request.status);
            if (request.status == 401 || request.status == 403) {
                App.con.userModel.signOut();
            } else {
                var content = JSON.parse(request.responseText);
                var error = new Backbone.Model({
                    "message": content.error
                });
                App.con.getErrorCollection().add(error);
            }
        });
        // Start navigation and log user in
        App.con.userModel.on('signin', App.con.onSignIn);
        App.con.userModel.on('signout', App.con.onSignOut);
        App.con.userModel.on('unauthorized', App.con.onUnauthorized);
        Backbone.history.start();
        App.con.userModel.signIn({});
    },
    
    onSignIn: function () {
        App.debug('App.Controller.onSignIn()');
        App.con.router.navigate('', true);
        if (typeof(App.con.fragment) !== 'undefined'
            && App.con.fragment !== ''
            && App.con.fragment != 'login'
        ) {
            App.con.router.navigate(App.con.fragment, true);
            delete App.con.fragment;
        } else {
            App.con.router.navigate('', true);
        }
    },
    
    onSignOut: function () {
        App.debug('App.Controller.onSignOut()');
        App.con.router.navigate('login', true);
    },
    
    onUnauthorized: function () {
        App.debug('App.Controller.onUnauthorized()');
        App.con.router.navigate('login', true);
    },
    
    onQuery: function (queryCollection) {
        App.debug('App.Controller.onQuery()');
        App.debug(queryCollection);
        App.con.errorCollection.reset();
        var path = queryCollection.dashboardUrl();
        App.debug('Path: ' + path);
        App.con.router.navigate(path);
        App.con.showResults(queryCollection);
    },
    
    onDemoQuery: function (queryCollection) {
        App.debug('App.Controller.onQuery()');
        App.debug(queryCollection);
        var path = queryCollection.dashboardDemoUrl();
        App.debug('Path: ' + path);
        App.con.router.navigate(path);
        App.con.showResults(queryCollection);
    },
    
    showResults: function (queryCollection) {
        App.debug("App.Controller.showResults")
    },
    
    routeLogin: function () {
        App.debug('Route: login');
        App.con.queryCollection.reset([]);
        App.con.loginView = App.con.vm.getView(App.LoginView, { model: App.con.userModel });
        App.con.vm.showView(App.con.loginView);
        App.con.queryVm.showViews([]);
    },
    
    routeHome: function () {
        App.debug('Route: home');
        if (!App.con.userModel.get('authenticated')) {
            App.con.router.navigate('demo', true);
            return;
        }
        // Defaults media
        App.con.mediaModel = new App.MediaModel();
        App.con.comparisonMediaModel = new App.MediaModel();
        App.con.mediaSources.get('tags').getDeferred(8875027).then(function (m) {
            App.con.mediaModel.get('tags').add(m);
        });
        App.con.mediaSources.get('tags').getDeferred(8875027).then(function (m) {
            App.con.comparisonMediaModel.get('tags').add(m);
        });
        // Default tags
        // Defaults dates
        var dayMs = 24 * 60 * 60 * 1000;
        var ts = new Date().getTime();
        var start = new Date(ts - 15*dayMs);
        var end = new Date(ts - 1*dayMs);
        var attributes = {
            start: start.getFullYear() + '-' + (start.getMonth()+1) + '-' + start.getDate()
            , end: end.getFullYear() + '-' + (end.getMonth()+1) + '-' + end.getDate()
            , mediaModel: App.con.mediaModel
            , keywords: 'truth'
            , qinfo: { 'name': 'Truth'}
        };
        var options = {
            mediaSources: App.con.mediaSources
            , parse: true
        };
        App.con.errorListView = App.con.queryVm.getView(
            App.ErrorListView
            , { collection: App.con.getErrorCollection() }
        );
        App.con.queryCollection.reset();
        App.QueryModel.nextUid = 1;
        App.con.queryModel = new App.QueryModel(attributes, options);
        App.con.queryCollection.add(App.con.queryModel);
        attributes.keywords = 'beauty';
        attributes.qinfo.name = 'Beauty';
        attributes.mediaModel = App.con.comparisonMediaModel;
        var comparison = new App.QueryModel(attributes, options);
        App.con.queryCollection.add(comparison);
        App.con.queryListView = App.con.queryVm.getView(
            App.QueryListView
            , {
                collection: App.con.queryCollection
                , mediaSources: App.con.mediaSources
            }
        );
        App.con.queryCollection.on('execute', App.con.onQuery, this);
        App.debug("Showing query list");
        App.con.queryVm.showViews([
            App.con.errorListView
            , App.con.queryListView
        ]);
        App.con.vm.showViews([]);
    },
    
    routeDemo: function () {
        App.debug('Route: demo');
        // Defaults media
        App.con.mediaSources = new App.MediaModel();
        App.con.mediaSources.set(
            App.con.mediaSources.parse({
                'sources': [{"media_id":1,"url":"http://nytimes.com","name":"New York Times"},{"media_id":2,"url":"http://washingtonpost.com","name":"Washington Post"},{"media_id":4,"url":"http://www.usatoday.com","name":"USA Today"},{"media_id":6,"url":"http://www.latimes.com/","name":"LA Times"},{"media_id":7,"url":"http://www.nypost.com/","name":"The New York Post"},{"media_id":8,"url":"http://www.nydailynews.com/","name":"The Daily News New York"},{"media_id":14,"url":"http://www.sfgate.com/","name":"San Francisco Chronicle"},{"media_id":314,"url":"http://www.huffingtonpost.com/","name":"The Huffington Post"},{"media_id":1089,"url":"http://www.reuters.com/","name":"Reuters"},{"media_id":1092,"url":"http://www.foxnews.com/","name":"FOX News"},{"media_id":1094,"url":"http://www.bbc.co.uk/?ok","name":"BBC"},{"media_id":1095,"url":"http://www.cnn.com/","name":"CNN"},{"media_id":1098,"url":"http://www.newsweek.com/","name":"Newsweek "},{"media_id":1104,"url":"http://www.forbes.com/","name":"Forbes"},{"media_id":1149,"url":"http://www.msnbc.msn.com/","name":"MSNBC"},{"media_id":1747,"url":"http://www.dailymail.co.uk/home/index.html","name":"Daily Mail"},{"media_id":1750,"url":"http://www.telegraph.co.uk/","name":"Daily Telegraph"},{"media_id":1751,"url":"http://www.guardian.co.uk/","name":"Guardian"},{"media_id":1752,"url":"http://www.cbsnews.com/","name":"CBS News"},{"media_id":4415,"url":"http://cnet.com","name":"CNET"},{"media_id":4418,"url":"http://examiner.com","name":"Examiner.com"},{"media_id":4419,"url":"http://time.com","name":"TIME.com"}]
                , 'tag_sets' : [
                    {
                        "tag_sets_id": 5
                        , "name": "collection"
                        , "label": "Collections"
                        , "tags": [
                            {
                                "tag_sets_id":5
                                ,"label":"U.S. Mainstream Media"
                                ,"tag":"ap_english_us_top25_20100110"
                                ,"tags_id":8875027
                                ,"description":"Top U.S. mainstream media according Google Ad Planner's measure of unique monthly users."
                            }
                        ]
                    }
                ]
            })
        );
        App.con.mediaSources.trigger('sync');
        App.con.mediaModel = App.con.mediaSources.subset({"sets":[8875027]});
        App.con.comparisonMediaModel = App.con.mediaSources.subset({"sets":[8875027]});
        // Initialize collection
        if (!App.con.queryCollection) {
            App.con.queryCollection = new App.QueryCollection();
        } else {
            App.con.queryCollection.reset();
            App.QueryModel.nextUid = 1;
        }
        // Defaults dates
        var dayMs = 24 * 60 * 60 * 1000;
        var ts = new Date().getTime();
        var start = new Date(ts - 15*dayMs);
        var end = new Date(ts - 1*dayMs);
        var attributes = {
            start: start.getFullYear() + '-' + (start.getMonth()+1) + '-' + start.getDate()
            , end: end.getFullYear() + '-' + (end.getMonth()+1) + '-' + end.getDate()
            , mediaModel: App.con.mediaModel
            , keywords: 'truth'
            , qinfo: { 'name': 'Truth'}
        };
        var options = {
            mediaSources: App.con.mediaSources
            , parse: true
            , ResultModel: App.DemoResultModel
        };
        App.con.queryModel = new App.QueryModel(attributes, options);
        App.con.queryCollection.add(App.con.queryModel);
        attributes.keywords = 'beauty';
        attributes.qinfo.name = 'Beauty';
        attributes.mediaModel = App.con.comparisonMediaModel;
        var comparison = new App.QueryModel(attributes, options);
        App.con.queryCollection.add(comparison);
        App.con.queryListView = App.con.queryVm.getView(
            App.DemoQueryListView
            , {
                collection: App.con.queryCollection
                , mediaSources: App.con.mediaSources
            }
        );
        App.con.queryCollection.on('execute', App.con.onQuery, this);
        App.con.errorListView = App.con.queryVm.getView(
            App.ErrorListView
            , { collection: App.con.getErrorCollection() }
        );
        App.con.queryVm.showViews([
            App.con.errorListView
            , App.con.queryListView
        ]);
        App.con.vm.showViews([]);
    },
    
    routeDemoQuery: function (keywords, media, start, end, qinfo) {
        App.debug('Route: demoQuery ------------------------------------------------------------------------------------------------------------------------');
    },
    
    routeQuery: function (keywords, media, start, end, qinfo) {
        App.debug('Route: query ------------------------------------------------------------------------------------------------------------------------');
        var keywordList = $.parseJSON(keywords);
        var startList = $.parseJSON(start);
        var endList = $.parseJSON(end);
        if (typeof(qinfo) !== 'undefined' && qinfo !== null) {
            var qinfoList = $.parseJSON(qinfo);
        } else {
            // Fill qinfoList with empty objects
            var qinfoList = [];
            _.each(keywordList, function () {
                qinfoList.push({});
            });
        }
        if (!App.con.userModel.get('authenticated')) {
            App.con.router.navigate('login', true);
            return;
        }
        // Create query collection
        App.con.queryCollection.reset();
        // Load media
        App.con.mediaSources.getDeferred(JSON.parse(media)).then(function() {
            // Add a media model for each query
            // TODO this should really happen in MediaCollection/MediaModel
            _.each($.parseJSON(media), function (d, i) {
                var mediaModel = new App.MediaModel();
                var queryModel = new App.QueryModel({
                    keywords: keywordList[i]
                    , mediaModel: mediaModel
                    , start: startList[i]
                    , end: endList[i]
                    , qinfo: qinfoList[i]
                }, {
                    mediaSources: App.con.mediaSources
                    , parse: true
                });
                App.con.queryCollection.add(queryModel);
                var subset = App.con.mediaSources.subset(d);
                subset.get('sources').each(function (m) {
                    mediaModel.get('sources').add(m);
                });
                subset.get('tags').each(function(simpleTag){
                    mediaModel.get('tags').add(simpleTag);
                });
            });
            App.con.queryCollection.execute();
            App.con.queryListView = App.con.queryVm.getView(
                App.QueryListView
                , {
                    collection: App.con.queryCollection
                    , mediaSources: App.con.mediaSources
                }
            );
            App.con.queryCollection.on('execute', App.con.onQuery, App.con);
            App.con.queryCollection.on('add', App.con.onQueryAdd, App.con);
            App.con.showResults(App.con.queryCollection);
        });
    },
    
    getErrorCollection: function () {
        if (typeof(this.errorCollection) === 'undefined') {
            this.errorCollection = new Backbone.Collection();
        }
        return this.errorCollection;
    }
};