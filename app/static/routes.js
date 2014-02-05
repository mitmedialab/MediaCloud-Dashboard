App.Router = Backbone.Router.extend({
    routes: {
        '': 'home'
        , '/': 'home'
    },
    
    initialize: function (options) {
        App.debug('App.Router.initialize()');
    },
    
    home: function () {
        App.debug('Route: home');
        user = new App.UserModel();
        loginView = new App.LoginView({ model: user });
        $('.content').html(loginView.el)
    },
    
    defaultRoute: function (routeId) {
        App.debug('Default route');
        console.log('Default route: ' + routeId);
    }
})
