
_.extend(App.Router.prototype.routes, {
    'demo': App.Controller.routeDemo
    , 'demo-query': App.Controller.routeDemoQuery
    , 'query': App.Controller.routeQuery
    , 'debug/histogram': App.Controller.routeDebugHistogram
    , 'debug/wordCount': App.Controller.debugWordCount
    , 'debug/wordCountComparison': App.Controller.debugWordCountComparison
});
