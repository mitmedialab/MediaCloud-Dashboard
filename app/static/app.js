App = {
    
    config: {
        debug: true
    },
    
    initialize: function () {
        App.debug('App.initialize()');
        // Create models and router
        this.userModel = new App.UserModel();
        this.router = new App.Router({
            userModel: this.userModel
            , mediaSources: this.mediaSources
        });
        // Bind event handlers
        _.bindAll(this, 'onSignIn');
        _.bindAll(this, 'onSignOut');
        // Listener for events
        this.userModel.on('signin', this.onSignIn);
        this.userModel.on('signout', this.onSignOut);
        this.userModel.on('unauthorized', this.onSignOut);
        // Start navigation and log user in
        this.userModel.fetch({
            "type": "post"
            , "success": function() { _.defer(function () { Backbone.history.start(); }); }
            , "error": function() { _.defer(function () { Backbone.history.start(); }); }
        });
    },
    
    onSignIn: function () {
        App.debug('App.onSignIn()');
        var that = this;
        this.router.navigate('', true);
    },
    
    onSignOut: function () {
        App.debug('App.onSignOut()');
        this.router.navigate('login', true);
    },
    
    debug: function (message) {
        if (App.config.debug) {
            console.log(message);
        }
    }
}
