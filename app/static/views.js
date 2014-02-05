
/**
 * Login form.
 */
App.LoginView = Backbone.View.extend({
    
    template: _.template($('#tpl-login-view').html()),
    
    initialize: function () {
        App.debug('App.LoginView.initialize()');
        this.render();
        this.model.on('change', this.render, this);
    },
    
    events: {
        'click button': 'login'
    },
    
    render: function () {
        App.debug('App.LoginView.initialize()');
        if (this.model.get('authenticated')) {
            $(this.el).html('Hello, ' + this.model.get('username'))
        } else {
            $(this.el).html(this.template())
        }
        return this;
    },
    
    login: function (event) {
        event.preventDefault();
        App.debug('Login clicked');
        username = $('input[name=username]', this.$el).val();
        password = $('input[name=password]', this.$el).val();
        this.model.set('id', username);
        this.model.fetch({
            type: 'post',
            data: {'username': username, 'password': password},
            success: function (model, response, options) {
                App.debug('Signed in as user: ' + model.get('username'));
            },
            error: function (model, response, options) {
                App.debug('Error signing in');
            }
        });
    }
});
