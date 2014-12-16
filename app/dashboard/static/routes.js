
_.extend(App.Router.prototype.routes, {
    'demo-query/:keywords/:media/:start/:end': App.Controller.routeDemoQuery
    , 'demo-query/:keywords/:media/:start/:end/:qinfo': App.Controller.routeDemoQuery
    , 'query/:keywords/:media/:start/:end': App.Controller.routeQuery
    , 'debug/histogram': App.Controller.routeDebugHistogram
    , 'debug/wordCount': App.Controller.debugWordCount
    , 'debug/wordCountComparison': App.Controller.debugWordCountComparison
});
