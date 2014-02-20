App.Router = Backbone.Router.extend({
    routes: {
        '': 'home'
        , '/': 'home'
        , 'login': 'login'
    },
    
    initialize: function (options) {
        var that = this;
        App.debug('App.Router.initialize()');
        // Create models
        this.userModel = new App.UserModel();
        this.queryModel = new App.QueryModel();
        this.sources = new App.MediaSourceCollection();
        // Add listeners
        _.bindAll(this, 'onSignIn');
        _.bindAll(this, 'onSignOut');
        this.userModel.on('signin', this.onSignIn);
        this.userModel.on('signout', this.onSignOut);
        this.userModel.on('unauthorized', this.onSignOut);
        // Create application-level views
        this.controlsView = new App.ControlsView({ userModel: this.userModel });
        $('.controls').append(this.controlsView.el);
        // Start navigation and log user in
        _.defer(function () {
            that.userModel.fetch({
                type: 'post'
                , success: function () {
                    App.debug('Starting history');
                    Backbone.history.start();
                    _.defer(function () { that.fetchSources(); })
                }
                , error: function () {
                    App.debug('Starting history');
                    Backbone.history.start();
                }
            });
        });
    },
    
    login: function () {
        App.debug('Route: login');
        this.loginView = new App.LoginView({ model: this.userModel });
        this.showView(this.loginView);
    },
    
    home: function () {
        App.debug('Route: home');
        if (!this.userModel.get('authenticated')) {
            this.navigate('login', true);
            return;
        }
        this.homeView = new App.HomeView({
            userModel: this.userModel,
            queryModel: this.queryModel,
            sources: this.sources
        });
        this.showView(this.homeView);
    },
    
    defaultRoute: function (routeId) {
        App.debug('Default route');
    },
    
    fetchSources: function () {
        // TODO prevent subsequent loads after first
        this.sources.fetch({
            success: function (collection, response, options) {
                App.debug('Fetched media sources.');
            },
            error: function (collection, response, options) {
                App.debug('Unable to fetch media sources.')
                App.debug(response);
            }
        });
    },
    
    onSignIn: function () {
        App.debug('App.Router.onSignIn()');
        this.navigate('', true);
        this.fetchSources();
    },
    
    onSignOut: function () {
        App.debug('App.Router.onSignOut()');
        this.navigate('login', true);
    },
    
    showView: function (view) {
        if (this.currentView) {
            this.currentView.close();
        }
        this.currentView = view;
        $('.content').html(view.el);
    }

})
