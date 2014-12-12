App.Router = Backbone.Router.extend({
    routes: {
        '': App.Controller.routeHome
        , '/': App.Controller.routeHome
        , 'login': App.Controller.routeLogin
        , 'demo': App.Controller.routeDemo
        , 'demo-query/:keywords/:media/:start/:end': App.Controller.routeDemoQuery
        , 'demo-query/:keywords/:media/:start/:end/:qinfo': App.Controller.routeDemoQuery
        , 'query/:keywords/:media/:start/:end': App.Controller.routeQuery
        , 'query/:keywords/:media/:start/:end/:qinfo': App.Controller.routeQuery
    },
    
    initialize: function () {
        App.debug('App.Router.initialize()');
    },
        
    defaultRoute: function (routeId) {
        App.debug('Default route');
    },
}); 
