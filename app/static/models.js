App.UserModel = Backbone.Model.extend({
    
    urlRoot: '/api',
    id: 'login',
    defaults: {
        username: ''
        , anonymous: true
        , authenticated: false
    },
    
    initialize: function () {
        App.debug('App.UserModel.initialize()')
        _.bindAll(this, 'signIn');
        _.bindAll(this, 'signOut');
        this.signIn();
        this.fetch({ type: 'post' });
    },
    
    signIn: function (username, password) {
        App.debug('App.UserModel.signIn()')
        this.set('id', 'login');
        this.fetch({
          type: 'post',
          data: {'username': username, 'password': password},
          success: function () {
            App.debug('Signed in');
          }
        });
    },
    
    signOut: function () {
        App.debug('App.UserModel.signOut()')
        this.set('id', 'logout');
        this.fetch({
            type: 'post',
            success: function () {
                App.debug('Signed out');
            }
        });
    }
})
