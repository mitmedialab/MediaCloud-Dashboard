App = {
    
    config: {
        debug: true
    },
    
    initialize: function () {
        App.debug('App.initialize()');
        App.instance = this;
        this.router = new App.Router()
        this.router.navigate('');
        Backbone.history.start();
    },
    
    debug: function (message) {
        if (App.config.debug) {
            console.log(message);
        }
    }
}
