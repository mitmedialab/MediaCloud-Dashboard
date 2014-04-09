App.Router = Backbone.Router.extend({
    routes: {
        '': 'home'
        , '/': 'home'
        , 'login': 'login'
        , 'query/:keywords/:media/:start/:end': 'query'
        , 'debug/histogram': 'debugHistogram'
    },
    
    initialize: function (options) {
        var that = this;
        this.vm = App.ViewManager;
        this.vm.initialize();
        this.userModel = options.userModel;
        this.mediaSources = options.mediaSources;
        App.debug('App.Router.initialize()');
        // Create application-level views
        this.controlsView = new App.ControlsView({ userModel: this.userModel });
        $('.controls').append(this.controlsView.el);
    },
    
    login: function () {
        App.debug('Route: login');
        this.loginView = new App.LoginView({ model: this.userModel });
        this.vm.showView(this.loginView);
    },
    
    home: function () {
        App.debug('Route: home');
        var that = this;
        if (!this.userModel.get('authenticated')) {
            this.navigate('login', true);
            return;
        }
        // Defaults media
        this.mediaModel = new App.MediaModel();
        this.mediaSources.deferred.then(function () {
            App.debug('Adding default media');
            that.mediaModel.get('sets').add(that.mediaSources.get('sets').get(1));
        });
        // Defaults dates
        var weekMs = 7 * 24 * 60 * 60 * 1000;
        var ts = new Date().getTime();
        var start = new Date(ts - 2*weekMs);
        var end = new Date(ts - weekMs);
        var attributes = {
            start: start.getFullYear() + '-' + (start.getMonth()+1) + '-' + start.getDate()
            , end: end.getFullYear() + '-' + (end.getMonth()+1) + '-' + end.getDate()
            , mediaModel: this.mediaModel
            , keywords: 'boston'
        };
        var options = { mediaSources: this.mediaSources, parse: true };
        this.queryCollection = new App.QueryCollection();
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
        this.queryCollection = new App.QueryCollection();
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
                subset.get('sets').each(function (m) {
                    mediaModel.get('sets').add(m);
                });
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
        this.showResults(this.queryCollection);
    },
    
    debugHistogram: function () {
        App.debug('Route: query');
        var that = this;
        // Create query collection and add a model
        var opts = {
            mediaSources: this.mediaSources
        };
        var queryCollection = new App.QueryCollection({}, opts);
        var queryModel = new App.QueryModel({}, opts);
        queryCollection.add(queryModel);
        var datecounts = queryModel.get('results').get('datecounts')
        datecounts.url = '/static/data/test/datecounts.json';
        datecounts.fetch({ parse:true });
        var histogramView = new App.HistogramView({collection:queryCollection});
        this.vm.showViews([
            histogramView
        ]);
    },
    
    defaultRoute: function (routeId) {
        App.debug('Default route');
    },
    
    onQuery: function (queryCollection) {
        App.debug('App.Router.onQuery()');
        App.debug(queryCollection);
        var path = queryCollection.dashboardUrl();
        this.navigate(path);
        this.showResults(queryCollection);
    },
    
    showResults: function (queryCollection) {
        // Create new results view
        var resultView = new App.QueryResultView({
            collection: queryCollection
        });
        this.vm.showViews([
            this.queryListView
            , resultView
        ]);
    }
}); 
