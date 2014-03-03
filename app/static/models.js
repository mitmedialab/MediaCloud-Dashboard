
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
        _.bindAll(this, 'signIn');
        _.bindAll(this, 'signInError');
        _.bindAll(this, 'signOut');
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
          success: function (model, response, options) {
            App.debug('Signed in');
            that.trigger('signin');
          },
          error: this.signInError
        });
    },
    
    signInError: function (model, response, options) {
        App.debug('Error signing in: ' + response.status);
        this.set('error', 'Invalid username/password');
        if (response.status == 401) {
            this.trigger('unauthorized', 'Invalid username/password');
        }
    },
    
    signOut: function () {
        App.debug('App.UserModel.signOut()')
        that = this;
        this.set('id', 'logout');
        this.fetch({
            type: 'post',
            success: function () {
                App.debug('Signed out');
                that.trigger('signout');
            }
        });
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
    }
});
