App = {
    
    config: {
        debug: false
        , datepickerOptions: {
            format: 'yyyy-mm-dd'
        },
        fullMonthNames: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],
        shortMonthNames: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec" ],
        queryColors: ['#e14c11', "#249fc9"],
        queryNames: ['Main Query', 'Comparison Query'],
        cookieOpts: {
            'path': '/',
            'domain': 'mediameter.org'
        }
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
