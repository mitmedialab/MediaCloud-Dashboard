App = {
    
    config: {
        debug: true
        , datepickerOptions: {
            format: 'yyyy-mm-dd'
        },
        fullMonthNames: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],
        shortMonthNames: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec" ],
        queryColors: ['#e14c11', "#249fc9"]
    },
    
    initialize: function () {
        App.debug('App.initialize()');
        App.instance = this;
        // Create models and router
        this.userModel = new App.UserModel();
        this.mediaSources = new App.MediaModel({parse:true});
console.log(this.mediaSources);
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
    
    /**
     * Given array of date objects, return object with keys:
     * - year
     * - month
     * Each contains the first date object for a given year/month
     */
    dateLabels: function (dates) {
       results = { year: [], month:[] };
       // Find indeces of first occurence of each month
       var monthIndeces = _.map(dates, function (d) { return d.getUTCMonth(); });
       var monthUnique = _.uniq(monthIndeces);
       var monthFirstIndex = _.map(monthUnique, function (m) { return _.indexOf(monthIndeces, m); });
       results.month = _.map(monthFirstIndex, function (i) { return dates[i]; });
       // Find indeces of first occurence of each year
       // Years are ordered and increasing so we can use sorted=true
       var yearIndeces = _.map(dates, function (d) { return d.getUTCFullYear(); });
       var yearUnique = _.uniq(yearIndeces, true);
       var yearFirstIndex = _.map(yearUnique, function (y) { return _.indexOf(yearIndeces, y, true); });
       results.year = _.map(yearFirstIndex, function (i) { return dates[i]; });
       return results;
    },
    
    monthName: function (m) {
        return App.config.shortMonthNames[m];
    },
    
    // Round n to nearest half-integer
    halfint: function (n) {
        return Math.round(n + 0.5) - 0.5;
    },
    
    debug: function (message) {
        if (App.config.debug) {
            console.log(message);
        }
    }
}
