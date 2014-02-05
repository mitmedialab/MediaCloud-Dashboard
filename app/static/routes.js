App.Router = Backbone.Router.extend({
    routes: {
        '': 'home'
        , '/': 'home'
    },
    
    initialize: function (options) {
        App.debug('App.Router.initialize()');
        this.userModel = new App.UserModel();
        this.appView = new App.AppView({
            userModel: this.userModel
        })
    },
    
    home: function () {
        App.debug('Route: home');
        $('.content').html(this.appView.el)
    },
    
    defaultRoute: function (routeId) {
        App.debug('Default route');
        console.log('Default route: ' + routeId);
    }
})
