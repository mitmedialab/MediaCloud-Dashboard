App = {
    
    config: {
        debug: true
        , datepickerOptions: {
            format: 'yyyy-mm-dd'
        }
    },
    
    initialize: function () {
        App.debug('App.initialize()');
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
        App.debug('App.onSignIn()');
        var that = this;
        if (this.mediaSources.get('sources').length == 0) {
            $.ajax('/static/data/media.json', {
                "dataType": "json",
                "success": function (data) {
                    App.debug('Received media json');
                    that.mediaSources.set(that.mediaSources.parse(data));
                    that.mediaSources.trigger('sync');
                    that.mediaSourceData = data;
                }
            })
        }
        this.router.navigate('', true);
    },
    
    onSignOut: function () {
        App.debug('App.onSignOut()');
        this.router.navigate('login', true);
    },
    
    // Take a Collection and return a map using the specified key
    makeMap: function (col, key) {
        dataMap = {};
        col.each(function (datum) {
            dataMap[datum.get(key)] = datum;
        });
        return dataMap;
    },
    
    debug: function (message) {
        if (App.config.debug) {
            console.log(message);
        }
    }
}
