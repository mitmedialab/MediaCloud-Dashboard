
/**
 * Main application view.
 */
App.AppView = Backbone.View.extend({
    
    initialize: function (options) {
        App.debug('App.AppView.initialize()');
        this.options = options || {};
        this.userModel = options.userModel;
        _.bindAll(this, 'render');
        options.userModel.on('change', this.render);
        this.loginView = new App.LoginView({ model: options.userModel });
        this.render();
    },
    
    render: function () {
        if (this.options.userModel.get('authenticated')) {
            $(this.el).html('Hello, ' + this.userModel.get('username'))
        } else {
            $(this.el).html(this.loginView.el);
        }
        return this;
    }
})

/**
 * Login form.
 */
App.LoginView = Backbone.View.extend({
    
    template: _.template($('#tpl-login-view').html()),
    
    initialize: function (options) {
        App.debug('App.LoginView.initialize()');
        this.options = options || {};
        _.bindAll(this, 'render');
        _.bindAll(this, 'login');
        this.render();
    },
    
    events: {
        'click button': 'login'
    },
    
    render: function () {
        $(this.el).html(this.template())
        return this;
    },
    
    login: function (event) {
        event.preventDefault();
        App.debug('Login clicked');
        username = $('input[name=username]', this.$el).val();
        password = $('input[name=password]', this.$el).val();
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
