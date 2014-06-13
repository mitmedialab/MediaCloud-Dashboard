_.extend(App.Controller, {
    
    // Override
    showResults: function (queryCollection) {
        // Create new results view
        App.debug("App.Controller.showResults")
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
        App.debug("done------------------------------------------------------------------------------------------------------------------------")
    },
    
    routeDemoQuery: function (keywords, media, start, end) {
        App.debug('Route: demoQuery ------------------------------------------------------------------------------------------------------------------------');
        var that = this;
        // Defaults media
        this.mediaSources = new App.MediaModel();
        this.mediaSources.set(
            this.mediaSources.parse({
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
                    , ResultModel: App.DemoResultModel
                });
                that.queryCollection.add(queryModel);
                var subset = that.mediaSources.subset(d);
                subset.get('sources').each(function (m) {
                    mediaModel.get('sources').add(m);
                });
                subset.get('tags').each(function(simpleTag){
                    mediaModel.get('tags').add(simpleTag);
                });
                subset.get('tag_sets').each(function (m) {
                    mediaModel.get('tag_sets').add(m);
                });
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
    
    routeQuery: function (keywords, media, start, end) {
        App.debug('Route: query ------------------------------------------------------------------------------------------------------------------------');
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
                subset.get('tags').each(function(simpleTag){
                    mediaModel.get('tags').add(simpleTag);
                });
                subset.get('tag_sets').each(function (m) {
                    mediaModel.get('tag_sets').add(m);
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
        this.queryCollection.on('add', this.onQueryAdd, this);
        this.showResults(this.queryCollection);
    },
    
    routeDebugHistogram: function () {
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

    routeDebugWordCount: function () {
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
    routeDebugWordCountComparison: function () {
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
});
