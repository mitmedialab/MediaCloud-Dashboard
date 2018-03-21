App = {
    
    config: {
      debug: false,
      datepickerOptions: {
        format: 'yyyy-mm-dd'
      },
      persistHeader: true,
      cookieOpts: {
        'expires': 14
      }
    },
    
    // get the url to a tool
    getToolUrl: function(tool){
      return 'https://'+tool+'.'+App.config.cookieOpts['domain']+'/#'+App.con.queryCollection.dashboardUrl();
    },

    queryToExplorer: function(){
      var explorerUrl = "https://explorer.mediacloud.org/";
      var hashParts = window.location.hash.split("/");
      if (hashParts.length < 2) {
        window.location = explorerUrl;
      }
      // figure out what the query is
      var keywords = JSON.parse(decodeURIComponent(hashParts[1]));
      var queryCount = keywords.length;
      var sourcesAndCollections = JSON.parse(decodeURIComponent(hashParts[2]));
      console.log(sourcesAndCollections);
      var startDates = JSON.parse(decodeURIComponent(hashParts[3]));
      var endDates = JSON.parse(decodeURIComponent(hashParts[4]));
      var props = JSON.parse(decodeURIComponent(hashParts[5]));
      var queries = [];
      if (App.con.userModel.get('authenticated')) {
        for(i=0;i<queryCount;i++) {
          var parts =startDates[i].split('-');
          var startDate = new Date(parts[0], parts[1], parts[2]).toISOString().substr(0,10);
          parts =endDates[i].split('-');
          var endDate = new Date(parts[0], parts[1], parts[2]).toISOString().substr(0,10);
          queries[i] = {
            label: encodeURIComponent(props[i].name),
            q: encodeURIComponent(keywords[i]),
            color: encodeURIComponent("#"+props[i].color),
            startDate: startDate,
            endDate: endDate,
            sources: sourcesAndCollections[i].sources || [],
            collections: sourcesAndCollections[i].sets || [],
          };
        }
        //console.log(queries);
        explorerUrl += "/#/queries/search?q="+JSON.stringify(queries);
      } else {
        for(i=0;i<queryCount;i++) {
          queries[i] = {
            index: i,
            q: encodeURIComponent(keywords[i]),
            color: encodeURIComponent("#"+props[i].color)
          };
        }
        console.log(queries);
        // demo mode:
        explorerUrl += "/#/queries/demo/search?q="+JSON.stringify(queries);
      }
      window.location = explorerUrl;
    },

    getSourcesUrl: function(type,id){
      // type = [ sources | collections ]
      return 'https://sources.mediacloud.org/#'+type+'/'+id;
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
      var lastMonthYear = undefined;
      var lastYear = undefined;
      for (idx in dates){
        var d = dates[idx];
        var thisMonthYear = d.getUTCFullYear()+"-"+d.getUTCMonth();
        var thisYear = d.getUTCFullYear();
        if(thisMonthYear!=lastMonthYear){
          results['month'].push(d);
          lastMonthYear = thisMonthYear;
        }
        if(thisYear!=lastYear){
          results['year'].push(d);
          lastYear= thisYear;
        }
      }
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
