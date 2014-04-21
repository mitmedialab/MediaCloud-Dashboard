/**
 * View base class that automatically cleans up its sub-views.
 */
App.NestedView = Backbone.View.extend({
    close: function () {
        App.debug('Closing ' + this.cid);
        this.remove();
        // Unbind any objects listening to this
        this.unbind();
        // Unbind any objects this is listening to
        this.stopListening();
        this.closeSubViews();
        this.onClose();
    },
    closeSubViews: function () {
        _.each(this.subViews, function (view) {
            if (typeof(view.close) !== 'undefined') {
                view.close();
            }
        });
    },
    onClose: function () {
    },
    addSubView: function (subView) {
        if (!this.subViews) {
            this.subViews = [];
        }
        this.subViews.push(subView);
    }
});

/**
 * Login form.
 */
App.LoginView = App.NestedView.extend({
    
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
        var progress = _.template($('#tpl-progress').html());
        this.$('.message').html(progress());
        this.$('form').hide();
    },
    
    error: function (message) {
        this.$('.message').html('<p class="text-danger">' + message + '</p>');
        this.$('form').show()
        this.$('input[name=username]').focus();
    }
});

/**
 * Controls drop-down menu
 */
App.ControlsView = App.NestedView.extend({
    tagName: 'ul',
    initialize: function (options) {
        App.debug('App.ControlsView.initialize()');
        this.options = options || {};
        this.userModel = options.userModel;
        _.bindAll(this, 'render');
        // Add listeners
        this.userModel.on('change:authenticated', this.render);
        // Render
        this.render();
    },
    render: function () {
        App.debug('App.ControlsView.render()');
        // Reset sub-views
        this.closeSubViews();
        // Recreate sub-views
        if (this.userModel.get('authenticated')) {
            // Create sub-views
            this.controlsSignOutView = new App.ControlsSignOutView({ userModel: this.userModel });
            this.addSubView(this.controlsSignOutView);
            this.$el.append(this.controlsSignOutView.el);
        }
        return this;
    }
});

App.ControlsSignOutView = App.NestedView.extend({
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
        this.$el.html(this.template(this.options.userModel.get('username')));
    },
    signOut: function () {
        App.debug('App.ControlsSignOutView.signOut()');
        this.options.userModel.signOut();
    }
});

App.DemoView = App.NestedView.extend({
    template: _.template($('#tpl-demo-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        this.$el.html(this.template());
    }
})
