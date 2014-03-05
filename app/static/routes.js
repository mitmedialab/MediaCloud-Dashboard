App.Router = Backbone.Router.extend({
    routes: {
        '': 'home'
        , '/': 'home'
        , 'login': 'login'
    },
    
    initialize: function (options) {
        var that = this;
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
            mediaSources: this.mediaSources
        });
        var that = this;
        this.queryModel.on('execute', function (qm) {
            that.navigate('query/' + qm.path(), true);
        });
        this.showView(this.homeView);
    },
    
    defaultRoute: function (routeId) {
        App.debug('Default route');
    },
    
    showView: function (view) {
        if (this.currentView) {
            this.currentView.close();
        }
        this.currentView = view;
        $('.content').html(view.el);
    }

})
