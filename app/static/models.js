App.UserModel = Backbone.Model.extend({
    
    urlRoot: '/api',
    id: 'login',
    defaults: {
        username: ''
        , anonymous: true
        , authenticated: false
    },
    
    initialize: function () {
        this.fetch({ type: 'post' });
    }
})
