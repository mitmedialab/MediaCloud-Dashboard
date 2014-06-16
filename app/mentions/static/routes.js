_.extend(App.Router.prototype.routes, {
    'query/:keywords/:media/:start/:end': App.Controller.routeQuery
});
