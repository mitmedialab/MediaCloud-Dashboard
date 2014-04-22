App.Router = Backbone.Router.extend({
    routes: {
        '': 'home'
        , '/': 'home'
        , 'login': 'login'
    },
    
    initialize: function (options) {
        var that = this;
        this.vm = new App.ViewManager({
            "selector": '.content .container'
        });
        this.userModel = options.userModel;
        this.mediaSources = options.mediaSources;
        App.debug('App.Router.initialize()');
        // Create application-level views
        this.controlsView = new App.ControlsView({ userModel: this.userModel });
        $('.controls').append(this.controlsView.el);
    },
    
    login: function () {
        App.debug('Route: login');
        this.loginView = this.vm.getView(App.LoginView, { model: this.userModel });
        this.vm.showView(this.loginView);
    },
    
    home: function () {
        App.debug('Route: home');
        var that = this;
        if (!this.userModel.get('authenticated')) {
            this.navigate('login', true);
            return;
        }
        var demoView = this.vm.getView(App.DemoView);
        this.vm.showView(demoView);
    },
    
    defaultRoute: function (routeId) {
        App.debug('Default route');
    },
}); 
