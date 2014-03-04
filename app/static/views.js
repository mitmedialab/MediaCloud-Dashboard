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
        this.mediaSources = options.mediaSources;
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
                , mediaSources: this.mediaSources
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
        App.debug('App.QueryView.initialize()');
        this.mediaSources = options.mediaSources;
        this.mediaSelectView = new App.MediaSelectView({
            model: this.model.get('media')
            , mediaSources: this.mediaSources
        });
        this.mediaListView = new App.MediaListView({
            model: this.model.get('media')
        });
        this.addSubView(this.mediaSelectView);
        this.addSubView(this.mediaListView);
        this.render();
    },
    render: function () {
        this.$el.html(this.template());
        // Show loading
        progress = _.template($('#tpl-progress').html());
        this.$('.media-query-view').html(progress);
        var that = this;
        this.mediaSources.deferred.done(function () {
            // Replace loading with sub views
            
            that.$('.media-query-view')
                .html(that.mediaSelectView.el)
                .append(that.mediaListView.el);
        });
    }
});

App.MediaSelectView = App.NestedView.extend({
    template: _.template($('#tpl-media-select-view').html()),
    events: {
        'click button': 'onTextEntered'
    },
    initialize: function (options) {
        App.debug('App.MediaSelectView.initialize()');
        this.mediaSources = options.mediaSources;
        // Set deferred callbacks
        var that = this;
        this.mediaSources.deferred.done(function () {
            that.render();
            App.debug('Creating typeahead');
            $('.media-input', that.$el).typeahead(null, {
                templates: { header:'<h3>Media Sets</h3>' },
                name: 'sets',
                displayKey: 'name',
                source: that.mediaSources.get('sets').getSuggestions().ttAdapter()
            }, {
                templates: { header: '<h3>Media Sources</h3>' },
                name: 'sources',
                displayKey: 'name',
                source: that.mediaSources.get('sources').getSuggestions().ttAdapter()
            });
            _.defer(function () {
                $('.media-input', that.$el).focus();
            });
        });
        // Set listener context
        _.bindAll(this, 'onTextEntered');
    },
    render: function () {
        this.$el.html(this.template());
        $el = this.$el;
        _.defer(function () {
            $('.media-input', $el).focus();
        });
    },
    onTextEntered: function (event) {
        App.debug('App.MediaSelectView.textEntered()');
        event.preventDefault();
        var name = $('.media-input.tt-input', this.$el).typeahead('val');
        $('.media-input.tt-input', this.$el).typeahead('val', '');
        $el = this.$el;
        _.defer(function () {
            $('.media-input', $el).focus();
        });
        source = this.mediaSources.get('sources').nameToSource[name]
        set = this.mediaSources.get('sets').nameToSet[name]
        if (source) {
            this.model.get('sources').add(source);
        } else if (set) {
            this.model.get('sets').add(set);
        }
    },
});

App.MediaListItemView = Backbone.View.extend({
    tagName: 'tr',
    events: {
        'click .remove': 'onClickRemove'
    },
    initialize: function (options) {
        this.render();
        _.bindAll(this, 'onClickRemove');
    },
    render: function () {
        this.template = _.template(
            $('#tpl-media-list-item-view').html(),
            this.model.attributes);
        this.$el.html(this.template);
    },
    onClickRemove: function (event) {
        event.preventDefault();
        this.trigger('removeClick', this.model);
        this.remove();
    }
});

App.MediaListView = App.NestedView.extend({
    template: _.template($('#tpl-media-list-view').html()),
    initialize: function (options) {
        App.debug('App.MediaListView.initialize()');
        this.render();
        // Add listeners
        this.model.get('sources').on('add', this.onAdd, this);
        this.model.get('sources').on('remove', this.onRemove);
        this.model.get('sets').on('add', this.onAdd, this);
        // Set listener context
        _.bindAll(this, 'onAdd');
        _.bindAll(this, 'onRemoveClick');
    },
    render: function () {
        this.$el.html(this.template());
    },
    onAdd: function (model, collection, options) {
        App.debug('App.MediaListView.onAdd()');
        var itemView = new App.MediaListItemView({model: model});
        that = this;
        itemView.on('removeClick', this.onRemoveClick);
        $('tbody', this.$el).append(itemView.el);
        $('.media-list-view').removeClass('empty');
    },
    onRemoveClick: function (model) {
        App.debug('App.MediaListView.onRemoveClick()');
        this.model.get('sources').remove(model);
        this.model.get('sets').remove(model);
    }
});
