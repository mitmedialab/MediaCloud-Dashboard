/**
 * View base class that automatically cleans up its sub-views.
 */
App.NestedView = Backbone.View.extend({
    close: function () {
        this.remove();
        this.unbind();
        this.closeSubViews();
        this.onClose();
    },
    closeSubViews: function () {
        _.each(this.subViews, function (view) {
            view.close();
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
 * Main application view.
 */
App.HomeView = App.NestedView.extend({
    
    initialize: function (options) {
        App.debug('App.HomeView.initialize()');
        this.options = options || {};
        this.userModel = options.userModel;
        this.queryModel = options.queryModel;
        this.sources = options.sources;
        _.bindAll(this, 'render');
        // Create models
        options.userModel.on('change:authenticated', this.render);
        // Render
        this.render();
    },
    onClose: function () {
        this.userModel.unbind('change:authenticated', this.render);
    },
    render: function () {
        App.debug('App.HomeView.render()')
        this.$el.html('');
        // Render from scratch
        if (this.options.userModel.get('authenticated')) {
            this.queryView = new App.QueryView({
                model: this.queryModel
                , sources: this.sources
            });
            this.addSubView(this.queryView);
            this.$el.append(this.queryView.el);
        } else {
        }
        return this;
    }
})

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
    },
    
    error: function (message) {
        $('.message', this.$el).html(message);
        $('input[name=username]', this.$el).focus();
    }
});

/**
 * Controls drop-down menu
 */
App.ControlsView = App.NestedView.extend({
    
    template: _.template($('#tpl-controls-view').html()),
    
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
        var disabled = true;
        // Reset sub-views
        this.closeSubViews();
        // Recreate sub-views
        this.$el.html(this.template());
        if (this.userModel.get('authenticated')) {
            disabled = false;
            // Create sub-views
            this.controlsSignOutView = new App.ControlsSignOutView({ userModel: this.userModel });
            this.addSubView(this.controlsSignOutView);
            $('ul', this.$el).append(this.controlsSignOutView.el);
        }
        if (disabled) {
            $('button', this.$el).attr('disabled', 'disabled');
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
        this.$el.html(this.template());
        $('span', this.$el).html(this.options.userModel.get('username'));
        return this;
    },
    signOut: function () {
        App.debug('App.ControlsSignOutView.signOut()');
        this.options.userModel.signOut();
    }
});

App.QueryView = App.NestedView.extend({
    template: _.template($('#tpl-query-view').html()),
    initialize: function (options) {
        this.sources = options.sources;
        this.mediaSelectView = new App.MediaSelectView({
            collection: this.model.get('sources')
            , sources: this.sources
        });
        this.mediaListView = new App.MediaListView({
            collection: this.model.get('sources')
        });
        this.addSubView(this.mediaSelectView);
        this.addSubView(this.mediaListView);
        this.render();
    },
    render: function () {
        this.$el.html(this.template());
        $('.media-query-view', this.el)
            .append(this.mediaSelectView.el)
            .append(this.mediaListView.el);
    }
});

App.MediaSelectView = App.NestedView.extend({
    template: _.template($('#tpl-media-select-view').html()),
    events: {
        'click button': 'onTextEntered'
    },
    initialize: function (options) {
        App.debug('App.MediaSelectView.initialize()');
        this.render();
        this.sources = options.sources;
        // Add listeners
        _.bindAll(this, 'onTextEntered');
        _.bindAll(this, 'onSourceSync');
        App.debug('Binding MediaSelectView ');
        this.sources.on('syncComplete', this.onSourceSync);
    },
    render: function () {
        this.$el.html(this.template());
        $el = this.$el;
        _.defer(function () {
            $('.media-input', $el).focus();
        });
    },
    onClose: function () {
        App.debug('Unbinding MediaSelectView');
        this.sources.unbind('syncComplete', this.onSourceSync);
    },
    onTextEntered: function (event) {
        event.preventDefault();
        var name = $('.media-input.tt-input', this.$el).typeahead('val');
        $('.media-input.tt-input', this.$el).typeahead('val', '');
        $el = this.$el;
        _.defer(function () {
            $('.media-input', $el).focus();
        });
        this.collection.add(this.sources.nameToSource[name].attributes);
        App.debug('Added source: ' + name);
    },
    onSourceSync: function (event) {
        console.log('App.MediaSelectView.onSourceSync()');
        $el = this.$el;
        App.debug('Creating typeahead');
        $('.media-input', this.$el).typeahead(null, {
            displayKey: 'name',
            source: this.sources.getSuggestions().ttAdapter()
        });
        _.defer(function () {
            $('.media-input', $el).focus();
        });
    }
});

App.MediaListView = App.NestedView.extend({
    template: _.template($('#tpl-media-list-view').html()),
    initialize: function () {
        this.render();
        _.bindAll(this, 'add');
        _.bindAll(this, 'remove');
        this.collection.on('add', this.add);
        this.collection.on('remove', this.remove);
    },
    render: function () {
        this.$el.html(this.template());
    },
    add: function (source) {
        var row = $('<tr>');
        row.append($('<td>').html(source.get('name')));
        $('tbody', this.$el).append(row);
        $('.media-list-view').removeClass('empty');
    },
    remove: function (source) {
        
    },
});
