_.extend(App.Controller, {
    
    // Override
    showResults: function (queryCollection) {
        // Create new results view
        App.debug("App.Controller.showResults")
        var resultView = App.con.vm.getView(
            App.QueryResultView,
            { collection: queryCollection },
            true
        );
        var errorListView = App.con.queryVm.getView(
            App.ErrorListView,
            { collection: App.con.getErrorCollection() }
        );
        App.con.queryVm.showViews([
            errorListView
            , App.con.queryListView
        ]);
        App.con.vm.showViews([
            , resultView
        ]);
        resultView.render();
        App.debug("done------------------------------------------------------------------------------------------------------------------------")
    },
    
    routeDemoQuery: function (keywords, media, start, end, qinfo) {
        App.debug('Route: demoQuery ------------------------------------------------------------------------------------------------------------------------');
        if (App.con.userModel.get('authenticated')) {  // if they are logged in take the home
            App.con.router.navigate('/', true);
            return;
        }
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
                                ,"label":"U.S. Top Online News"
                                ,"tag":"pew_top_50_news_20160225"
                                ,"tags_id":9139487
                                ,"description":"Top 50 online news sites according to Pew / Comscore as of 2015."
                            }
                        ]
                    }
                ]
            })
        );
        App.con.mediaSources.trigger('sync');
        keywordList = $.parseJSON(keywords);
        startList = $.parseJSON(start);
        endList = $.parseJSON(end);
        if (typeof(qinfo) !== 'undefined' && qinfo !== null) {
            var qinfoList = $.parseJSON(qinfo);
        } else {
            // Fill qinfoList with empty objects
            var qinfoList = [];
            _.each(keywordList, function () {
                qinfoList.push({});
            });
        }
        // Create query collection
        if (!App.con.queryCollection) {
            App.con.queryCollection = new App.QueryCollection();
        } else {
            App.con.queryCollection.reset();
        }
        // When sources are loaded, populate the media models from the url
        App.con.mediaSources.deferred.then(function() {
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
                    , ResultModel: App.DemoResultModel
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
        });
        App.con.queryListView = App.con.vm.getView(
            App.DemoQueryListView
            , {
                collection: App.con.queryCollection
                , mediaSources: App.con.mediaSources
            }
        );
        App.con.queryCollection.on('execute', App.con.onDemoQuery, this);
        App.con.queryCollection.on('add', App.con.onQueryAdd, this);
        App.con.showResults(App.con.queryCollection);
    },
    
    routeQuery: function (keywords, media, start, end, qinfo) {
        App.debug('Route: query ------------------------------------------------------------------------------------------------------------------------');
        keywordList = $.parseJSON(keywords);
        startList = $.parseJSON(start);
        endList = $.parseJSON(end);
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
            this.navigate('login', true);
            return;
        }
        // Create query collection
        if (!App.con.queryCollection) {
            App.con.queryCollection = new App.QueryCollection();
        } else {
            App.con.queryCollection.reset();
        }
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
                subset.get('tag_sets').each(function (m) {
                    mediaModel.get('tag_sets').add(m);
                });
            });
            App.con.queryCollection.execute();
        });
        App.con.queryListView = App.con.vm.getView(
            App.QueryListView
            , {
                collection: App.con.queryCollection
                , mediaSources: App.con.mediaSources
            }
        );
        App.con.queryCollection.on('execute', App.con.onQuery, this);
        App.con.queryCollection.on('add', App.con.onQueryAdd, this);
        App.con.showResults(App.con.queryCollection);
    },
    
    routeDebugHistogram: function () {
        App.debug('Route: query');
        // Create query collection and add a model
        var opts = {
            mediaSources: App.con.mediaSources
        };
        var queryCollection = new App.QueryCollection([], opts);
        var queryModel = new App.QueryModel({}, opts);
        var queryModel2 = new App.QueryModel({}, opts);
        var queryModel3 = new App.QueryModel({}, opts);
        queryCollection.add(queryModel);
        queryCollection.add(queryModel2);
        queryCollection.add(queryModel3);
        var datecounts = queryModel.get('results').get('datecounts');
        var datecounts2 = queryModel2.get('results').get('datecounts');
        var datecounts3 = queryModel3.get('results').get('datecounts');
        datecounts.url = '/static/core/data/test/datecounts.json';
        datecounts2.url = '/static/core/data/test/datecounts-2.json';
        datecounts3.url = '/static/core/data/test/datecounts-3.json';
        datecounts.fetch({ parse:true });
        datecounts2.fetch({ parse:true });
        datecounts3.fetch({ parse:true });
        var histogramView = new App.HistogramView({collection:queryCollection});
        App.con.vm.showViews([
            histogramView
        ]);
    },

    routeDebugWordCount: function () {
        App.debug('Route: query');
        // Create query collection and add a model
        var opts = {
            mediaSources: App.con.mediaSources
        };
        var queryCollection = new App.QueryCollection({}, opts);
        var queryModel = new App.QueryModel({}, opts);
        queryCollection.add(queryModel);

        var wordcounts = queryModel.get('results').get('wordcounts')
        wordcounts.url = '/static/data/test/wordcounts.json';

        wordcounts.fetch({
            parse:true
            , success:function (collection) { }
        });
        var wordCountView = new App.DebugWordCountView({collection:queryCollection});
        App.con.vm.showViews([
            wordCountView
        ]);
    },
    
    // First pass at Comparison word cloud, based on static json data
    routeDebugWordCountComparison: function () {
        App.debug('Route: query');
        // Create query collection and add a model
        var opts = {
            mediaSources: App.con.mediaSources,
            query1Words: App.con.query1Words,
            query2Words: App.con.query2Words
        };

        var queryModel = new App.QueryModel({}, opts);
        var queryCollection = new App.QueryCollection(queryModel, opts);
        var wordcounts = queryModel.get('results').get('wordcounts');
        query1Words = queryModel.get('results').get('wordcounts');
        wordcounts.url = '/static/data/test/wordcounts.json';
        wordcounts.fetch({
            parse:true
            , success:function (collection) { }
        });
        var queryModel2 = new App.QueryModel({}, opts);
        queryCollection.add(queryModel2);
        var wordcounts2 = queryModel2.get('results').get('wordcounts');
        query2Words = queryModel2.get('results').get('wordcounts');
        wordcounts2.url = '/static/data/test/wordcounts2.json';

        wordcounts2.fetch({
            parse:true
            , success:function (collection) { }
        });

        var wordCountView = new App.WordCountComparisonView({collection:queryCollection
        });
        App.con.vm.showViews([
            wordCountView
        ]);
    },
});
