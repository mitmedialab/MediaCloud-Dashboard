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
        this.$('.message').html(_.template($('#tpl-progress').html()));
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
    events: {
        "click .btn-primary": 'onQuery'
    },
    onQuery: function (event) {
        App.debug('App.QueryView.onQuery()');
        event.preventDefault();
        // Assemble data
        this.model.set('keywords', this.$('#keyword-view-keywords').val());
        this.model.set('start', this.$('#date-range-start').val());
        this.model.set('end', this.$('#date-range-end').val());
        this.model.execute();
    },
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
        this.dateRangeView = new App.DateRangeView();
        this.keywordView = new App.KeywordView();
        this.addSubView(this.mediaSelectView);
        this.addSubView(this.mediaListView);
        this.addSubView(this.dateRangeView);
        this.render();
    },
    render: function () {
        // Show loading
        this.$el.html(this.template());
        progress = _.template($('#tpl-progress').html());
        this.$('.query-view-content').html(progress);
        var that = this;
        this.mediaSources.deferred.done(function () {
            that.$el.html(that.template());
            // Replace loading with sub views
            that.$('.media-query-view')
                .html(that.mediaSelectView.el)
                .append(that.mediaListView.el);
            that.$('.date-range-view')
                .html(that.dateRangeView.el);
            that.$('.keyword-view')
                .html(that.keywordView.el);
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
            // Listen to custom typeahead events
            that.$('.media-input').bind(
                'typeahead:selected',
                function () { that.onTextEntered(); });
            that.$('.media-input').bind(
                'typeahead:autocompleted',
                function () { that.onTextEntered(); });
            _.defer(function () {
                $('.media-input', that.$el).focus();
            });
        });
        // Set listener context
        _.bindAll(this, 'onTextEntered');
    },
    render: function () {
        this.$el.html(this.template());
        var $el = this.$el;
        _.defer(function () {
            $('.media-input', $el).focus();
        });
    },
    onTextEntered: function (event) {
        App.debug('App.MediaSelectView.textEntered()');
        if (event) { event.preventDefault(); }
        var name = $('.media-input.tt-input', this.$el).typeahead('val');
        $('.media-input.tt-input', this.$el).typeahead('val', '');
        var $el = this.$el;
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

App.DateRangeView = Backbone.View.extend({
    template: _.template($('#tpl-date-range-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        this.$el.html(this.template())
        this.$('.datepicker').datepicker(App.config.datepickerOptions);
    }
});

App.KeywordView = Backbone.View.extend({
    template: _.template($('#tpl-keyword-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        this.$el.html(this.template());
    }
});

App.SentenceView = Backbone.View.extend({
    template: _.template($('#tpl-sentence-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        console.log('App.SentenceView.render()');
        this.$el.html(this.template());
        var $el = this.$('.sentence-view-content');
        progress = _.template($('#tpl-progress').html());
        $el.html(progress);
        this.collection.on('sync', function () {
            App.debug('App.SentenceView.collection: sync');
            $el.html('');
            this.collection.each(function (m) {
                var p = $('<p>').html(m.escape('sentence'));
                $el.append(p);
            });
        }, this);
    }
});

App.HistogramView = Backbone.View.extend({
    margin: {
        top: 10
        , right: 10
        , bottom: 10
        , left: 10
    },
    template: _.template($('#tpl-histogram-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        this.$el.html(this.template());
        this.$('.panel-body').html(_.template($('#tpl-progress').html())());
        this.collection.on('sync', this.renderD3, this);
    },
    renderD3: function () {
        App.debug('App.HistogramView.renderD3()');
        this.$el.html(this.template());
        var width = this.$('.histogram-view-content').width();
        var height = 100;
        var chartWidth = width - this.margin.left - this.margin.right;
        var chartHeight = height - this.margin.top - this.margin.bottom;
        var svg = d3.select('.histogram-view-content').append('svg')
            .attr('width', width).attr('height', height);
        // Convert collection to d3 data layer
        var allLayersData = [this.collection.toJSON()];
        // TODO - for multiple layers call d3.layout.stack
        // Create axes
        var x = d3.scale.ordinal()
            .domain(_.pluck(allLayersData[0], 'date'))
            .rangePoints([0, chartWidth]);
        var y = d3.scale.linear()
            .domain([0, d3.max(_.pluck(allLayersData[0], 'numFound'))])
            .range([chartHeight, 0]);
        // Create area chart
        var area = d3.svg.area()
            .x(function(d) { return x(d.date); })
            .y0(chartHeight) // TODO - multiple layers
            .y1(function(d) { return y(d.numFound); });
        var chart = svg.append('g')
            .classed('chart', true)
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
        chart.selectAll('path').data(allLayersData)
            .enter().append('path')
                .attr('width', chartWidth)
                .attr('d', area)
                .style('fill', 'red');
    }
});
