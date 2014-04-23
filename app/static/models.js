
/**
 * Base class for nested models, uses the scheme described here:
 * http://stackoverflow.com/questions/6535948/nested-models-in-backbone-js-how-to-approach
 */
App.NestedModel = Backbone.Model.extend({
    attributeModels: {},
    parse: function (response) {
        App.debug('NestedModel.parse');
        for (var key in this.attributeModels) {
            var subModel = this.attributeModels[key];
            var subData = response[key];
            response[key] = new subModel(subData)
            // Notify children that they have been updated
            response[key].trigger('parentSync');
        }
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

App.MediaModel = App.NestedModel.extend({
    urlRoot: '/api/media',
    attributeModels: {
        sources: App.MediaSourceCollection
        , sets: App.MediaSetCollection
    },
    initialize: function () {
        App.debug('App.MediaModel.initialize()');
        var that = this;
        this.set('sources', new App.MediaSourceCollection());
        this.set('sets', new App.MediaSetCollection());
        this.deferred = $.Deferred();
        this.on('sync', function () {
            App.debug('App.MediaModel:sync');
            this.deferred.resolve();
        }, this);
    },
    clone: function () {
        var cloneModel = new App.MediaModel()
        this.get('sets').each(function (m) {
            cloneModel.get('sets').add(m);
        });
        this.get('sources').each(function (m) {
            cloneModel.get('sources').add(m);
        });
        return cloneModel;
    },
    subset: function (s) {
        // Return a copy of this media model containing a subset of the
        // sources and sets according to a string like:
        // sets:[7125],sources:[1]
        App.debug('App.MediaModel.subset()');
        var that = this;
        media = new App.MediaModel();
        var o = s;
            // Copy the source/set from this MediaModel to a new one
        _.each(o.sets, function (id) {
            var m = that.get('sets').get(id);
            media.get('sets').add(m);
        });
        _.each(o.sources, function (id) {
            var m = that.get('sources').get({id:id})
            media.get('sources').add(m);
        });
        return media;
    },
    queryParam: function () {
        var qp = {
            sets: this.get('sets').pluck('id')
        }
        return qp;
    }
})

App.QueryModel = Backbone.Model.extend({
    initialize: function (attributes, options) {
        App.debug('App.QueryModel.initialize()');
        App.debug(attributes);
        App.debug(this.get('mediaModel'));
        this.mediaSources = options.mediaSources
        var opts = {
            mediaSources: this.mediaSources,
            params: this.get('params')
        };
        this.set('results', new App.ResultModel({}, opts));
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
    }
})

App.SentenceModel = Backbone.Model.extend({
    initialize: function (attributes, options) {
    },
    date: function () {
        var date = this.get('publish_date');
        date = new Date(date.substring(0, date.indexOf('T')));
        return date.toLocaleDateString();
    },
    media: function () {
        var sources = this.collection.mediaSources.get('sources');
        var media_id = this.get('media_id');
        var source = sources.get(media_id);
        return source.get('name');
    }
});

App.SentenceCollection = Backbone.Collection.extend({
    resourceType: 'sentence',
    model: App.SentenceModel,
    initialize: function (models, options) {
        this.params = options.params;
        this.mediaSources = options.mediaSources;
        this.waitForLoad = $.Deferred();
        this.on('sync', function () { this.waitForLoad.resolve(); }, this);
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
