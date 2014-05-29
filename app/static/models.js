
/**
 * Base class for nested models, uses the scheme described here:
 * http://stackoverflow.com/questions/6535948/nested-models-in-backbone-js-how-to-approach
 */
App.NestedModel = Backbone.Model.extend({
    attributeModels: {},
    parse: function (response) {
        for (var key in this.attributeModels) {
            var subModel = this.attributeModels[key];
            var subData = response[key];
            response[key] = new subModel(subData, {parse: true})
            // Notify children that they have been updated
            response[key].trigger('parentSync');
        }
        App.debug(response);
        return response;
    }
})

App.UserModel = Backbone.Model.extend({
    
    id: 'user',
    urlRoot: '/api',
    defaults: {
        username: ''
        , anonymous: true
        , authenticated: false
        , error: ''
    },
    
    initialize: function () {
        App.debug('App.UserModel.initialize()')
        _.bindAll(this, 'onSync');
        _.bindAll(this, 'onSignIn');
        _.bindAll(this, 'onSignInError');
        _.bindAll(this, 'onSignOut');
        _.bindAll(this, 'signIn');
        _.bindAll(this, 'signOut');
        this.on('sync', this.onSync);
        this.on('error', this.onSignInError);
    },
    
    onSync: function () {
        App.debug('App.UserModel.onSync()');
        if (this.get('authenticated')) {
            this.onSignIn();
        } else {
            this.onSignOut();
        }
    },
    
    onSignIn: function () {
        App.debug('App.UserModel.onSignIn()');
        this.trigger('signin');
    },
    
    onSignInError: function (model, response, options) {
        App.debug('Error signing in: ' + response.status);
        this.set('error', 'Invalid username/password');
        if (response.status == 401) {
            this.trigger('unauthorized', 'Invalid username/password');
        }
    },
    
    onSignOut: function () {
        App.debug('App.UserModel.onSignOut()');
        this.trigger('signout');
    },
    
    signIn: function (username, password) {
        App.debug('App.UserModel.signIn()')
        that = this;
        if (typeof(route) === 'undefined') {
            route = 'home';
        }
        this.set('id', 'login');
        this.fetch({
          type: 'post',
          data: {'username': username, 'password': password}
        });
    },
    
    signOut: function () {
        App.debug('App.UserModel.signOut()')
        this.set('id', 'logout');
        this.fetch({type: 'post'});
    }
})

App.MediaSourceModel = Backbone.Model.extend({
    urlRoot: '/api/media/sources',
    url: function () {
        return this.get('media_id');
    },
    idAttribute: 'media_id',
    initialize: function (attributes, options) {
        this.set('type', 'media source');
    }
});

App.MediaSourceCollection = Backbone.Collection.extend({
    model: App.MediaSourceModel,
    url: '/api/media/sources',
    initialize: function () {
        App.debug('App.MediaSourceCollection.initialize()');
        this.nameToSource = {}
        this.on('sync', this.onSync);
        this.on('parentSync', this.onSync);
        _.bindAll(this, 'onSync');
    },
    onSync: function () {
        App.debug('App.MediaSourceCollection.onSync()');
        this.nameToSource = App.makeMap(this, 'name');
    },
    getSuggestions: function () {
        App.debug('MediaSourceCollection.getSuggestions()');
        if (!this.suggest) {
            this.suggest = new Bloodhound({
                datumTokenizer: function (d) {
                    return Bloodhound.tokenizers.whitespace(d.name);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: this.toJSON()
            });
            this.suggest.initialize();
        }
        return this.suggest;
    }
})

App.MediaSetModel = Backbone.Model.extend({
    urlRoot: '/api/media/sets'
    , defaults: {
        name: ''
        , media_ids: []
    },
    initialize: function (attributes, options) {
        this.set('type', 'media set');
    }
});

App.MediaSetCollection = Backbone.Collection.extend({
    model: App.MediaSetModel,
    url: '/api/media/sets',
    initialize: function () {
        App.debug('App.MediaSetCollection.initialize()');
        this.nameToSet = {}
        this.on('sync', this.onSync);
        this.on('parentSync', this.onSync);
        _.bindAll(this, 'onSync');
    },
    onSync: function () {
        App.debug('MediaSetCollection.onSync()');
        this.nameToSet = App.makeMap(this, 'name');
    },
    getSuggestions: function () {
        App.debug('MediaSetCollection.getSuggestions()');
        var suggest = new Bloodhound({
            datumTokenizer: function (d) {
                return Bloodhound.tokenizers.whitespace(d.name);
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: this.toJSON()
        });
        suggest.initialize();
        return suggest;
    }
});

App.TagModel = Backbone.Model.extend({
    url: '/api/tags/single',
    idAttribute: 'tags_id',
    initialize: function (options) {},
    clone: function () {
        var cloneModel = new App.TagModel();
        cloneModel.set('tags_id', this.get('tags_id'));
        cloneModel.set('tag_sets_id', this.get('tag_sets_id'));
        cloneModel.set('tag', this.get('tag'));
        cloneModel.set('label', this.get('label'));
        return cloneModel;
    }
});

App.TagCollection = Backbone.Collection.extend({
    model: App.TagModel,
    initialize: function (options) {
    },
    getSuggestions: function () {
        App.debug('TagCollection.getSuggestions()');
        if (!this.suggest) {
            App.debug('Creating new suggestion engine');
            var suggest = new Bloodhound({
                datumTokenizer: function (d) {
                    return Bloodhound.tokenizers.whitespace(d.label);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: this.toJSON()
            });
            suggest.initialize();
            this.suggest = suggest;
        } else {
            App.debug('Reusing suggestion engine');
        }
        return this.suggest;
    },
    clone: function () {
        var cloneCollection = new App.TagCollection();
        this.each(function (m) {
            cloneCollection.add(m.clone());
        });
        return cloneCollection;
    }
});

App.TagSetModel = App.NestedModel.extend({
    url: '/api/tag_sets/single',
    idAttribute: 'tag_sets_id',
    attributeModels: {
        'tags': App.TagCollection
    },
    initialize: function (options) {
        if (!this.get('tags')) {
            // TODO this should be moved into defaults
            this.set('tags', new App.TagCollection());
        }
    },
    clone: function () {
        newModel = this.cloneEmpty();
        newModel.set('tags', this.get('tags').clone());
        return newModel;
    },
    cloneEmpty: function () {
        newModel = new App.TagSetModel();
        newModel.set('tag_sets_id', this.get('tag_sets_id'));
        newModel.set('name', this.get('name'));
        newModel.set('label', this.get('label'));
        return newModel;
    },
    queryParam: function () {
        qp = {
            tag_sets_id: this.get('tag_sets_id')
            , tags_id: this.get('tags').pluck('tags_id')
        }
        return qp;
    }
});

App.TagSetCollection = Backbone.Collection.extend({
    model: App.TagSetModel,
    initialize: function (options) {
        var that = this;
    },
    getSuggestions: function () {
        App.debug('TagSetCollection.getSuggestions()');
        if (!this.suggest) {
            this.suggest = new Bloodhound({
                datumTokenizer: function (d) {
                    return Bloodhound.tokenizers.whitespace(d.name);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: this.toJSON()
            });
            this.suggest.initialize();
        }
        return this.suggest;
    },
    queryParam: function () {
        return this.map(function (m) { return m.queryParam(); });
    },
    clone: function () {
        var cloneCollection = new App.TagSetCollection();
        this.each(function (m) {
            cloneCollection.add(m.clone());
        });
        return cloneCollection;
    }
})

App.MediaModel = App.NestedModel.extend({
    urlRoot: '/api/media',
    attributeModels: {
        sources: App.MediaSourceCollection
        , tag_sets: App.TagSetCollection
    },
    initialize: function () {
        App.debug('App.MediaModel.initialize()');
        var that = this;
        this.set('sources', new App.MediaSourceCollection());
        this.set('tag_sets', new App.TagSetCollection());
        this.deferred = $.Deferred();
        this.on('sync', function () {
            this.deferred.resolve();
        }, this);
    },
    clone: function () {
        App.debug('App.MediaModel.clone()');
        var cloneModel = new App.MediaModel()
        this.get('sources').each(function (m) {
            cloneModel.get('sources').add(m);
        });
        cloneModel.set('tag_sets', this.get('tag_sets').clone());
        cloneModel.deferred.resolve();
        return cloneModel;
    },
    subset: function (o) {
        // Map path to model
        // Return a copy of this media model containing a subset of the
        // sources and sets according to an object like:
        // {sources:[1],tags:[{'tag_sets_id:23', 'tags_id:[4,5]'}]}
        App.debug('App.MediaModel.subset()');
        var that = this;
        media = new App.MediaModel();
        // Copy the source/tag from this MediaModel to a new one
        _.each(o.tags, function (tagParam) {
            var set = that.get('tag_sets').get(tagParam.tag_sets_id);
            var newSet = set.cloneEmpty();
            media.get('tag_sets').add(newSet);
            _.each(tagParam.tags_id, function (id) {
                var cloneTag = set.get('tags').get(id).clone();
                newSet.get('tags').add(cloneTag);
            });
        });
        _.each(o.sources, function (id) {
            var m = that.get('sources').get({id:id})
            media.get('sources').add(m);
        });
        return media;
    },
    // Map model to path
    queryParam: function () {
        var qp = {}
        var sources = this.get('sources');
        if (sources && sources.length > 0) {
            qp.sources = sources.pluck('media_id');
        }
        qp.tags = this.get('tag_sets').queryParam();
        return qp;
    }
})

App.QueryModel = Backbone.Model.extend({
    initialize: function (attributes, options) {
        App.debug('App.QueryModel.initialize()');
        App.debug(attributes);
        App.debug(options);
        App.debug(this.get('mediaModel'));
        this.mediaSources = options.mediaSources
        var opts = {
            mediaSources: this.mediaSources,
            params: this.get('params')
        };
        this.ResultModel = options.ResultModel;
        if (typeof(this.ResultModel) == 'undefined') {
            this.ResultModel = App.ResultModel;
        }
        this.set('results', new this.ResultModel({}, opts));
    },
    parse: function (response, options) {
        response.params = new Backbone.Model({
            keywords: response.keywords
            , mediaModel: response.mediaModel
            , start: response.start
            , end: response.end
        });
        delete response.keywords;
        delete response.mediaModel;
        delete response.start;
        delete response.end;
        return response;
    },
    execute: function () {
        App.debug('App.QueryModel.execute()');
        this.get('results').fetch();
        this.trigger('model:execute', this);
    }
});

App.QueryCollection = Backbone.Collection.extend({
    model: App.QueryModel,
    initialize: function () {
        this.resources = new ResourceListener();
        this.each(function (m) {
            this.onAdd(m, this);
        }, this);
        this.on('add', this.onAdd, this);
        this.on('remove', this.onRemove, this);
    },
    onAdd: function (model, collection, options) {
        // When adding a QueryModel, listen to it's ResultModel
        this.resources.listen(model.get('results'));
    },
    onRemove: function (model, collection, options) {
        // Unlisten when we remove
        this.resources.unlisten(model.get('results'));
    },
    execute: function () {
        App.debug('App.QueryCollection.execute()');
        // Execute each Query
        this.map(function (m) { m.execute(); });
        App.debug('Trigger App.QueryCollection:execute');
        this.trigger('execute', this);
    },
    keywords: function () {
        var allKeywords = this.map(function(m) { return m.get('params').get('keywords'); });
        return JSON.stringify(allKeywords);
    },
    start: function () {
        var allStart = this.map(function(m) { return m.get('params').get('start'); });
        return JSON.stringify(allStart);
    },
    end: function () {
        var allEnd = this.map(function(m) { return m.get('params').get('end'); });
        return JSON.stringify(allEnd);
    },
    media: function () {
        var allMedia = this.map(function (m) { return m.get('params').get('mediaModel').queryParam(); });
        return JSON.stringify(allMedia);
    },
    dashboardUrl: function () {
        return [
            'query'
            , this.keywords()
            , this.media()
            , this.start()
            , this.end()
        ].join('/');
    },
    dashboardDemoUrl: function () {
        return [
            'demo-query'
            , this.keywords()
            , this.media()
            , this.start()
            , this.end()
        ].join('/');
    }
})

App.SentenceModel = Backbone.Model.extend({
    initialize: function (attributes, options) {
    },
    date: function () {
        var dateString = this.get('publish_date');
        if (dateString.indexOf('T') >= 0) {
            dateString = dateString.substring(0, dateString.indexOf('T'));
        }
        var date = new Date(dateString);
        return date.toLocaleDateString();
    },
    media: function () {
        return this.get('medium_name');
    }
});

App.SentenceCollection = Backbone.Collection.extend({
    resourceType: 'sentence',
    model: App.SentenceModel,
    initialize: function (models, options) {
        this.params = options.params;
        this.mediaSources = options.mediaSources;
        this.waitForLoad = $.Deferred();
        this.on('sync', function () { console.log(this); this.waitForLoad.resolve(); }, this);
    },
    url: function () {
        var url = '/api/sentences/docs/';
        url += encodeURIComponent(this.params.get('keywords'));
        url += '/' + encodeURIComponent(JSON.stringify(this.params.get('mediaModel').queryParam()));
        url += '/' + encodeURIComponent(this.params.get('start'));
        url += '/' + encodeURIComponent(this.params.get('end'));
        return url;
    }
});

App.DemoSentenceCollection = App.SentenceCollection.extend({
    url: function () {
        var url = '/api/demo/sentences/docs/';
        url += encodeURIComponent(this.params.get('keywords'));
        return url;
    }
});


App.WordCountModel = Backbone.Model.extend({});
App.WordCountCollection = Backbone.Collection.extend({
    resourceType: 'wordcount',
    model: App.WordCountModel,
    initialize: function (models, options) {
        this.params = options.params;
    },
    url: function () {
        var url = '/api/wordcount/';
        url += encodeURIComponent(this.params.get('keywords'));
        url += '/' + encodeURIComponent(JSON.stringify(this.params.get('mediaModel').queryParam()));
        url += '/' + encodeURIComponent(this.params.get('start'));
        url += '/' + encodeURIComponent(this.params.get('end'));
        return url;
    }
});

App.DemoWordCountCollection = App.WordCountCollection.extend({
    url: function () {
        var url = '/api/demo/wordcount/';
        url += encodeURIComponent(this.params.get('keywords'));
        return url;
    }
});

App.DateCountModel = Backbone.Model.extend({
    parse: function (result) {
        var ymd = result.date.split('-');
        d = new Date(Date.UTC(ymd[0], ymd[1]-1, ymd[2]));
        result.dateObj = d;
        result.timestamp = d.getTime();
        return result;
    },
});
App.DateCountCollection = Backbone.Collection.extend({
    resourceType: 'datecount',
    model: App.DateCountModel,
    initialize: function (models, options) {
        this.params = options.params;
    },
    url: function () {
        var url = '/api/sentences/numfound/';
        url += this.params.get('keywords') + '/';
        url += JSON.stringify(this.params.get('mediaModel').queryParam()) + '/';
        url += this.params.get('start') + '/' + this.params.get('end');
        return url;
    }
});

App.DemoDateCountCollection = App.DateCountCollection.extend({
    url: function () {
        var url = '/api/demo/sentences/numfound/';
        url += this.params.get('keywords');
        return url;
    }
});

App.ResultModel = Backbone.Model.extend({
    initialize: function (attributes, options) {
        App.debug('App.ResultModel.initialize()');
        var sentences = new App.SentenceCollection([], options);
        var wordcounts = new App.WordCountCollection([], options);
        var datecounts = new App.DateCountCollection([], options);
        this.set('sentences', sentences);
        this.set('wordcounts', wordcounts);
        this.set('datecounts', datecounts);
        // Bubble-up events sent by the individual collections
        _.each([sentences, wordcounts, datecounts], function (m) {
            m.on('request', this.onRequest, this);
            m.on('error', this.onError, this);
            m.on('sync', this.onSync, this);
        }, this);
    },
    fetch: function () {
        this.get('sentences').fetch();
        this.get('wordcounts').fetch();
        this.get('datecounts').fetch();
    },
    onRequest: function (model_or_controller, request, options) {
        this.trigger('request', model_or_controller, request, options);
    },
    onError: function (model_or_controller, request, options) {
        this.trigger('error', model_or_controller, request, options);
    },
    onSync: function (model_or_controller, request, options) {
        this.trigger('sync', model_or_controller, request, options);
    }
});

App.DemoResultModel = App.ResultModel.extend({
    initialize: function (attributes, options) {
        App.debug('App.DemoResultModel.initialize()');
        App.debug(options);
        var sentences = new App.DemoSentenceCollection([], options);
        var wordcounts = new App.DemoWordCountCollection([], options);
        var datecounts = new App.DemoDateCountCollection([], options);
        this.set('sentences', sentences);
        this.set('wordcounts', wordcounts);
        this.set('datecounts', datecounts);
        // Bubble-up events sent by the individual collections
        _.each([sentences, wordcounts, datecounts], function (m) {
            m.on('request', this.onRequest, this);
            m.on('error', this.onError, this);
            m.on('sync', this.onSync, this);
        }, this);
    },
});
