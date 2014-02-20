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
    urlRoot: '/api/sources',
    url: function () {
        return this.get('media_id');
    },
    idAttribute: 'media_id'
});

App.MediaSourceCollection = Backbone.Collection.extend({
    model: App.MediaSourceModel,
    url: '/api/sources',
    initialize: function (options) {
        _.bindAll(this, 'onSync');
        this.on('sync', this.onSync);
    },
    onSync: function() {
        App.debug('Source collection changed')
        this.nameToSource = App.makeMap(this, 'name');
        App.debug('Triggering syncComplete');
        this.trigger('syncComplete');
    },
    getSuggestions: function () {
        App.debug('Creating new media source suggestion engine');
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

App.QueryModel = Backbone.Model.extend({
    initialize: function () {
        this.set('sources', new App.MediaSourceCollection());
    }
});
