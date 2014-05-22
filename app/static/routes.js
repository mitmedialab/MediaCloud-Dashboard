App.Router = Backbone.Router.extend({
    routes: {
        '': 'home'
        , '/': 'home'
        , 'login': 'login'
        , 'demo': 'demo'
        , 'demo-query/:keywords/:media/:start/:end': 'demoQuery'
        , 'query/:keywords/:media/:start/:end': 'query'
        , 'debug/histogram': 'debugHistogram'
        , 'debug/wordCount': 'debugWordCount'
        , 'debug/wordCountComparison': 'debugWordCountComparison'

    },
    
    initialize: function (options) {
        var that = this;
        this.vm = new App.ViewManager({
            "selector": '.content .container'
        });
        this.userModel = options.userModel;
        this.mediaSources = options.mediaSources;
        App.debug('App.Router.initialize()');
        // Create application-level views
        this.controlsView = new App.ControlsView({ userModel: this.userModel });
        $('.controls').append(this.controlsView.el);
    },
    
    login: function () {
        App.debug('Route: login');
        this.loginView = this.vm.getView(App.LoginView, { model: this.userModel });
        this.vm.showView(this.loginView);
    },
    
    home: function () {
        App.debug('Route: home');
        var that = this;
        if (!this.userModel.get('authenticated')) {
            this.navigate('demo', true);
            return;
        }
        // Defaults media
        this.mediaModel = new App.MediaModel();
        this.mediaSources.deferred.then(function () {
            App.debug('Adding default media');
            that.mediaModel.get('sources').add(that.mediaSources.get('sources').get(1));
        });
        // Default tags
        // Defaults dates
        var dayMs = 24 * 60 * 60 * 1000;
        var ts = new Date().getTime();
        var start = new Date(ts - 97*dayMs);
        var end = new Date(ts - 7*dayMs);
        var attributes = {
            start: start.getFullYear() + '-' + (start.getMonth()+1) + '-' + start.getDate()
            , end: end.getFullYear() + '-' + (end.getMonth()+1) + '-' + end.getDate()
            , mediaModel: this.mediaModel
            , keywords: 'boston'
        };
        var options = {
            mediaSources: this.mediaSources
            , parse: true
        };
        if (!this.queryCollection) {
            this.queryCollection = new App.QueryCollection();
        } else {
            this.queryCollection.reset();
        }
        this.queryModel = new App.QueryModel(attributes, options);
        this.queryCollection.add(this.queryModel);
        this.queryListView = this.vm.getView(
            App.QueryListView
            , {
                collection: this.queryCollection
                , mediaSources: this.mediaSources
            }
        );
        this.queryCollection.on('execute', this.onQuery, this);
        this.vm.showView(this.queryListView);
    },
    
    demo: function () {
        App.debug('Route: demo');
        var that = this;
        // Defaults media
        this.mediaModel = new App.MediaModel();
        this.mediaModel.set(
            this.mediaModel.parse({
                'sources': []
                , 'tag_sets' : [
                    {
                        "tag_sets_id": 5
                        , "name": "collection"
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
        // Defaults dates
        var dayMs = 24 * 60 * 60 * 1000;
        var ts = new Date().getTime();
        var start = new Date(ts - 21*dayMs);
        var end = new Date(ts - 7*dayMs);
        var attributes = {
            start: start.getFullYear() + '-' + (start.getMonth()+1) + '-' + start.getDate()
            , end: end.getFullYear() + '-' + (end.getMonth()+1) + '-' + end.getDate()
            , mediaModel: this.mediaModel
            , keywords: 'boston'
        };
        var options = {
            mediaSources: this.mediaModel
            , parse: true };
        this.mediaModel.trigger('sync');
        if (!this.queryCollection) {
            this.queryCollection = new App.QueryCollection();
        } else {
            this.queryCollection.reset();
        }
        this.queryModel = new App.QueryModel(attributes, options);
        this.queryCollection.add(this.queryModel);
        this.queryListView = this.vm.getView(
            App.DemoQueryListView
            , {
                collection: this.queryCollection
                , mediaSources: this.mediaModel
            }
        );
        this.queryCollection.on('execute', this.onDemoQuery, this);
        this.vm.showView(this.queryListView);
    },
    
    demoQuery: function (keywords, media, start, end) {
        App.debug('Route: demoQuery');
        var that = this;
        // Defaults media
        this.mediaSources = new App.MediaModel();
        this.mediaSources.set(
            this.mediaSources.parse({
                'sources': []
                , 'tag_sets' : [
                    {
                        "tag_sets_id": 5
                        , "name": "collection"
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
        this.mediaSources.trigger('sync');
        keywordList = $.parseJSON(keywords);
        startList = $.parseJSON(start);
        endList = $.parseJSON(end);
        // Create query collection
        if (!this.queryCollection) {
            this.queryCollection = new App.QueryCollection();
        } else {
            this.queryCollection.reset();
        }
        // When sources are loaded, populate the media models from the url
        this.mediaSources.deferred.then(function() {
            // Add a media model for each query
            // TODO this should really happen in MediaCollection/MediaModel
            _.each($.parseJSON(media), function (d, i) {
                var mediaModel = new App.MediaModel();
                var queryModel = new App.QueryModel({
                    keywords: keywordList[i]
                    , mediaModel: mediaModel
                    , start: startList[i]
                    , end: endList[i]
                }, {
                    mediaSources: that.mediaSources
                    , parse: true
                });
                that.queryCollection.add(queryModel);
                var subset = that.mediaSources.subset(d);
                subset.get('sources').each(function (m) {
                    mediaModel.get('sources').add(m);
                });
                subset.get('tag_sets').each(function (m) {
                    mediaModel.get('tag_sets').add(m);
                })
            });
            that.queryCollection.execute();
        });
        this.queryListView = this.vm.getView(
            App.DemoQueryListView
            , {
                collection: this.queryCollection
                , mediaSources: this.mediaSources
            }
        );
        this.queryCollection.on('execute', this.onDemoQuery, this);
        this.queryCollection.on('add', this.onQueryAdd, this);
        this.showResults(this.queryCollection);
    },
    
    query: function (keywords, media, start, end) {
        App.debug('Route: query');
        var that = this;
        keywordList = $.parseJSON(keywords);
        startList = $.parseJSON(start);
        endList = $.parseJSON(end);
        if (!this.userModel.get('authenticated')) {
            this.navigate('login', true);
            return;
        }
        // Create query collection
        if (!this.queryCollection) {
            this.queryCollection = new App.QueryCollection();
        } else {
            this.queryCollection.reset();
        }
        // When sources are loaded, populate the media models from the url
        this.mediaSources.deferred.then(function() {
            // Add a media model for each query
            // TODO this should really happen in MediaCollection/MediaModel
            _.each($.parseJSON(media), function (d, i) {
                var mediaModel = new App.MediaModel();
                var queryModel = new App.QueryModel({
                    keywords: keywordList[i]
                    , mediaModel: mediaModel
                    , start: startList[i]
                    , end: endList[i]
                }, {
                    mediaSources: that.mediaSources
                    , parse: true
                });
                that.queryCollection.add(queryModel);
                var subset = that.mediaSources.subset(d);
                subset.get('sources').each(function (m) {
                    mediaModel.get('sources').add(m);
                });
                subset.get('tag_sets').each(function (m) {
                    mediaModel.get('tag_sets').add(m);
                })
            });
            that.queryCollection.execute();
        });
        this.queryListView = this.vm.getView(
            App.QueryListView
            , {
                collection: this.queryCollection
                , mediaSources: this.mediaSources
            }
        );
        this.queryCollection.on('execute', this.onQuery, this);
        this.queryCollection.on('add', this.onQueryAdd, this);
        this.showResults(this.queryCollection);
    },
    
    debugHistogram: function () {
        App.debug('Route: query');
        var that = this;
        // Create query collection and add a model
        var opts = {
            mediaSources: this.mediaSources
        };
        var queryCollection = new App.QueryCollection([], opts);
        console.log(queryCollection.length);
        var queryModel = new App.QueryModel({}, opts);
        queryCollection.add(queryModel);
        console.log(queryCollection.length);
        var datecounts = queryModel.get('results').get('datecounts')
        datecounts.url = '/static/data/test/datecounts.json';
        datecounts.fetch({ parse:true });
        console.log(queryCollection.length);
        var histogramView = new App.HistogramView({collection:queryCollection});
        this.vm.showViews([
            histogramView
        ]);
    },


    debugWordCount: function () {
        App.debug('Route: query');
        var that = this;
        // Create query collection and add a model
        var opts = {
            mediaSources: this.mediaSources
        };
        var queryCollection = new App.QueryCollection({}, opts);
        var queryModel = new App.QueryModel({}, opts);
        queryCollection.add(queryModel);

        var wordcounts = queryModel.get('results').get('wordcounts')
        wordcounts.url = '/static/data/test/wordcounts.json';

        wordcounts.fetch({
            parse:true
            , success:function (collection) { console.log(collection); }
        });
        var wordCountView = new App.DebugWordCountView({collection:queryCollection});
        this.vm.showViews([
            wordCountView
        ]);
    },
    // First pass at Comparison word cloud, based on static json data
    debugWordCountComparison: function () {
        App.debug('Route: query');
        var that = this;
        // Create query collection and add a model
        var opts = {
            mediaSources: this.mediaSources,
            query1Words: this.query1Words,
            query2Words: this.query2Words
        };

        var queryModel = new App.QueryModel({}, opts);
        var queryCollection = new App.QueryCollection(queryModel, opts);
        var wordcounts = queryModel.get('results').get('wordcounts');
        query1Words = queryModel.get('results').get('wordcounts');
        wordcounts.url = '/static/data/test/wordcounts.json';
        wordcounts.fetch({
            parse:true
            , success:function (collection) { console.log(collection); }
        });
        var queryModel2 = new App.QueryModel({}, opts);
        queryCollection.add(queryModel2);
        var wordcounts2 = queryModel2.get('results').get('wordcounts');
        query2Words = queryModel2.get('results').get('wordcounts');
        wordcounts2.url = '/static/data/test/wordcounts2.json';

        wordcounts2.fetch({
            parse:true
            , success:function (collection) { console.log(collection); }
        });

        var wordCountView = new App.WordCountComparisonView({collection:queryCollection
        });
        this.vm.showViews([
            wordCountView
        ]);
    },
    
    defaultRoute: function (routeId) {
        App.debug('Default route');
    },
    
    onQuery: function (queryCollection) {
        App.debug('App.Router.onQuery()');
        App.debug(queryCollection);
        var path = queryCollection.dashboardUrl();
        App.debug('Path: ' + path);
        this.navigate(path);
        this.showResults(queryCollection);
    },
    
    onDemoQuery: function (queryCollection) {
        App.debug('App.Router.onQuery()');
        App.debug(queryCollection);
        var path = queryCollection.dashboardDemoUrl();
        App.debug('Path: ' + path);
        this.navigate(path);
        this.showResults(queryCollection);
    },
    
    showResults: function (queryCollection) {
        // Create new results view
        var resultView = this.vm.getView(
            App.QueryResultView,
            { collection: queryCollection },
            true
        );
        this.vm.showViews([
            this.queryListView
            , resultView
        ]);
        resultView.render();
    }
}); 
