App = {
    
    config: {
        debug: true
    },
    
    initialize: function () {
        App.debug('App.initialize()');
        App.instance = this;
        App.router = new App.Router()
    },
    
    // Take a Collection and return a map using the specified key
    makeMap: function (col, key) {
        dataMap = {};
        _.each(col.toArray(), function (datum) {
            dataMap[datum.get(key)] = _.clone(datum);
        });
        return dataMap;
    },
    
    debug: function (message) {
        if (App.config.debug) {
            console.log(message);
        }
    }
}
