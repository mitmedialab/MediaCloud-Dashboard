App = {
    
    config: {
        debug: true
    },
    
    initialize: function () {
        App.debug('App.initialize()');
        App.instance = this;
        App.loadData();
        App.router = new App.Router();
    },
    
    loadData: function () {
        App.mediaSources = new App.MediaModel({parse:true});
        App.debug('App.loadData()');
        App.mediaSources.fetch();
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
