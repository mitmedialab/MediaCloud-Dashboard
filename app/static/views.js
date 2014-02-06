
/**
 * Main application view.
 */
App.AppView = Backbone.View.extend({
    
    initialize: function (options) {
        App.debug('App.AppView.initialize()');
        this.options = options || {};
        this.userModel = options.userModel;
        _.bindAll(this, 'render');
        // Create models
        options.userModel.on('change', this.render);
        // Create sub-views
        this.loginView = new App.LoginView({ model: options.userModel });
        this.controlsView = new App.ControlsView({ userModel: options.userModel });
        this.render();
    },
    
    render: function () {
        this.$el.html('');
        $(this.el).append(this.controlsView.el);
        if (this.options.userModel.get('authenticated')) {
            $(this.el).append('Hello, ' + this.userModel.get('username'))
        } else {
            $(this.el).append(this.loginView.el);
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
            data: {'username': username, 'password': password}
        });
    }
});

/**
 * Controls drop-down menu
 */
App.ControlsView = Backbone.View.extend({
    
    template: _.template($('#tpl-controls-view').html()),
    
    initialize: function (options) {
        this.options = options || {};
        this.userModel = options.userModel;
        _.bindAll(this, 'render');
        this.userModel.on('change', this.render);
        this.controlsSignOutView = new App.ControlsSignOutView({ userModel: this.userModel })
        this.render();
    },
    
    render: function () {
        this.$el.addClass('controls');
        this.$el.html(this.template());
        if (this.userModel.get('authenticated')) {
            console.log('authed');
            $('ul', this.$el).append(this.controlsSignOutView.el);
        } else {
            console.log('not authed');
        }
        return this;
    }
});

App.ControlsSignOutView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#tpl-controls-sign-out-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        App.debug('rendering ControlsSignOutView');
        this.$el.html(this.template())
        return this;
    }
})

