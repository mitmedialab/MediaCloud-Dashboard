App.Controller = {
    
    initialize: function () {
        App.debug('App.Controller.initialize()');
        App.instance = this;
        // Create models and router
        this.userModel = new App.UserModel();
        this.mediaSources = new App.MediaModel({parse:true});
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
        App.debug('App.Controller.onSignIn()');
        var that = this;
        if (this.mediaSources.get('sources').length == 0) {
            $.ajax('/static/core/data/media.json', {
                "dataType": "json",
                "success": function (data) {
                    App.debug('Received media json:');
                    that.mediaSources.set(that.mediaSources.parse(data));
                    that.mediaSources.trigger('sync');
                    that.mediaSourceData = data;
                }
            })
        }
        this.router.navigate('', true);
    },
    
    onSignOut: function () {
        App.debug('App.Controller.onSignOut()');
        this.router.navigate('login', true);
    }    
};