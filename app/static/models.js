
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
          data: {'username': username, 'password': password},
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
    initialize: function (options) {
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
    initialize: function (options) {
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
        this.set('sources', new App.MediaSourceCollection());
        this.set('sets', new App.MediaSetCollection());
        this.deferred = $.Deferred();
        this.on('sync', function () {
            App.debug('App.MediaModel:sync');
            this.deferred.resolve();
        }, this);
    }
})

App.QueryModel = Backbone.Model.extend({
    initialize: function () {
        this.set('media', new App.MediaModel());
    },
    execute: function () {
        this.trigger('execute', this);
    },
    media: function () {
        sets = this.get('media').get('sets').map(function (m) {
            return 'media_sets_id:' + m.get('id');
        });
        sources = this.get('media').get('sources').map(function (m) {
            return 'media_id:' + m.get('media_id');
        });
        var media = '1';
        if (sets.length > 0 || sources.length > 0) {
            media = '(';
            media += sets.concat(sources).join(' OR ');
            media += ')';
        }
        return media;
    }
});

App.SentenceModel = Backbone.Model.extend({
    date: function () {
        var date = this.get('publish_date');
        date = new Date(date.substring(0, date.indexOf('T')));
        return date.toLocaleDateString();
    },
    media: function () {
        var sources = this.collection.mediaSources.get('sources');
        return sources.get(this.get('media_id')).get('name');
    }
});

App.SentenceCollection = Backbone.Collection.extend({
    model: App.SentenceModel,
    initialize: function (options) {
        this.keywords = options.keywords;
        this.media = options.media;
        this.start = options.start;
        this.end = options.end;
        this.mediaSources = options.mediaSources;
    },
    url: function () {
        var url = '/api/sentences/docs/';
        url += encodeURIComponent(this.keywords);
        url += '/' + encodeURIComponent(this.media);
        url += '/' + encodeURIComponent(this.start);
        url += '/' + encodeURIComponent(this.end);
        return url;
    }
});

App.WordCountModel = Backbone.Model.extend({});
App.WordCountCollection = Backbone.Collection.extend({
    model: App.WordCountModel,
    initialize: function (options) {
        this.keywords = options.keywords;
        this.media = options.media;
        this.start = options.start;
        this.end = options.end;
    },
    url: function () {
        var url = '/api/wordcount/';
        url += encodeURIComponent(this.keywords);
        url += '/' + encodeURIComponent(this.media);
        url += '/' + encodeURIComponent(this.start);
        url += '/' + encodeURIComponent(this.end);
        return url;
    }
});

App.DateCountModel = Backbone.Model.extend({});
App.DateCountCollection = Backbone.Collection.extend({
    model: App.DateCountModel,
    initialize: function (options) {
        this.keywords = options.keywords;
        this.media = options.media;
        this.start = options.start;
        this.end = options.end;
    },
    url: function () {
        var url = '/api/sentences/numfound/';
        url += this.keywords + '/';
        url += this.media + '/';
        url += this.start + '/' + this.end;
        return url;
    }
})