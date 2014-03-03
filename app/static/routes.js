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
                , success: function () { Backbone.history.start(); }
                , error: function () { Backbone.history.start(); }
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
        this.queryModel = new App.QueryModel();
        this.homeView = new App.HomeView({
            userModel: this.userModel,
            queryModel: this.queryModel,
            mediaSources: App.mediaSources
        });
        this.showView(this.homeView);
    },
    
    defaultRoute: function (routeId) {
        App.debug('Default route');
    },
    
    onSignIn: function () {
        App.debug('App.Router.onSignIn()');
        this.navigate('', true);
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
