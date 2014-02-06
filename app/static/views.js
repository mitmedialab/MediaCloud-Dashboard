
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
        options.userModel.on('change:authenticated', this.render);
        // Create sub-views
        this.render();
    },
    
    render: function () {
        App.debug('App.AppView.render()')
        this.loginView = new App.LoginView({ model: this.userModel });
        this.controlsView = new App.ControlsView({ userModel: this.userModel });
        this.$el.html('');
        this.$el.append(this.controlsView.el);
        if (this.options.userModel.get('authenticated')) {
            this.$el.append('Hello, ' + this.userModel.get('username'))
        } else {
            this.$el.append(this.loginView.el);
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
        _.bindAll(this, 'error');
        this.model.on('unauthorized', this.error)
        this.render();
    },
    
    events: {
        'click button': 'login'
    },
    
    render: function () {
        App.debug('App.LoginView.render()');
        this.$el.html(this.template());
        var $el = this.$el;
        _.defer(function () {
            $('input[name=username]', $el).focus();
        });
        return this;
    },
    
    login: function (event) {
        App.debug('App.LoginView.login()');
        event.preventDefault();
        username = $('input[name=username]', this.$el).val();
        password = $('input[name=password]', this.$el).val();
        $('input[name=username]', this.$el).val('');
        $('input[name=password]', this.$el).val('');
        this.model.signIn(username, password);
    },
    
    error: function (message) {
        $('.message', this.$el).html(message);
        $('input[name=username]', this.$el).focus();
    }
});

/**
 * Controls drop-down menu
 */
App.ControlsView = Backbone.View.extend({
    
    template: _.template($('#tpl-controls-view').html()),
    
    initialize: function (options) {
        App.debug('App.ControlsView.initialize()');
        this.options = options || {};
        this.userModel = options.userModel;
        _.bindAll(this, 'render');
        this.controlsSignOutView = new App.ControlsSignOutView({ userModel: this.userModel });
        this.render();
    },
    
    render: function () {
        App.debug('App.ControlsView.render()');
        this.$el.addClass('controls');
        var disabled = true;
        this.$el.html(this.template());
        if (this.userModel.get('authenticated')) {
            disabled = false;
            $('ul', this.$el).append(this.controlsSignOutView.el);
        }
        if (disabled) {
            $('button', this.$el).attr('disabled', 'disabled');
        }
        return this;
    }
});

App.ControlsSignOutView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#tpl-controls-sign-out-view').html()),
    events: {
        'click a': 'signOut'
    },
    initialize: function (options) {
        App.debug('App.ControlSignOutView.initialize()');
        this.options = options || {}
        _.bindAll(this, 'render');
        this.render();
    },
    render: function () {
        App.debug('App.ControlSignoutView.render()');
        this.$el.html(this.template());
        $('span', this.$el).html(this.options.userModel.get('username'));
        return this;
    },
    signOut: function () {
        App.debug('App.ControlsSignOutView.signOut()');
        this.options.userModel.signOut();
    }
});
