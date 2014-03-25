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
        this.model.set('start', this.$('.date-range-start').val());
        this.model.set('end', this.$('.date-range-end').val());
        this.model.execute();
    },
    initialize: function (options) {
        App.debug('App.QueryView.initialize()');
        App.debug(options);
        this.mediaSources = options.mediaSources;
        this.mediaSelectView = new App.MediaSelectView({
            model: this.model.get('mediaModel')
            , mediaSources: this.mediaSources
        });
        this.mediaListView = new App.MediaListView({
            model: this.model.get('mediaModel')
        });
        this.dateRangeView = new App.DateRangeView({ model: this.model });
        this.keywordView = new App.KeywordView({"keywords":this.model.get('keywords')});
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
    }
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
        App.debug(options);
        App.debug(this.model);
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
        App.debug('App.MediaListView.render()');
        App.debug(this.model);
        var that = this;
        this.$el.html(this.template());
        this.model.get('sets').each(function (m) {
            that.onAdd(m, that.model.get('sets'), {});
        });
        this.model.get('sources').each(function (m) {
            that.onAdd(m, that.model.get('sets'), {});
        });
    },
    onAdd: function (model, collection, options) {
        App.debug('App.MediaListView.onAdd()');
        App.debug(model);
        var itemView = new App.MediaListItemView({model: model});
        itemView.on('removeClick', this.onRemoveClick);
        this.$('tbody').append(itemView.el);
        this.$('.media-list-view').removeClass('empty');
    },
    onRemoveClick: function (model) {
        App.debug('App.MediaListView.onRemoveClick()');
        // Figure out which collection to remove from,
        // otherwise we might remove the wrong thing.
        if (model.get('media_id')) {
            this.model.get('sources').remove(model);
        } else {
            this.model.get('sets').remove(model);
        }
    }
});

App.DateRangeView = Backbone.View.extend({
    template: _.template($('#tpl-date-range-view').html()),
    initialize: function (options) {
        App.debug('App.DateRangeView.initialize()');
        App.debug(options);
        this.render();
    },
    render: function () {
        App.debug('App.DateRangeView.render()');
        this.$el.html(this.template())
        this.$('.date-range-start').val(this.model.get('start'));
        this.$('.date-range-end').val(this.model.get('end'));
        // Create the datepickers and hide on selection / tab-out
        var start = this.$('.date-range-start').datepicker(
            App.config.datepickerOptions
        ).on('changeDate', function (event) {
            start.hide();
        }).on('keydown', function (event) {
            if (e.keyCode == 9) {
                start.hide();
            }
        }).data('datepicker');
        var end = this.$('.date-range-end').datepicker(
            App.config.datepickerOptions
        ).on('changeDate', function (event) {
            end.hide();
        }).on('keydown', function (event) {
            if (e.keyCode == 9) {
                end.hide();
            }
        }).data('datepicker');
    }
});

App.KeywordView = Backbone.View.extend({
    template: _.template($('#tpl-keyword-view').html()),
    initialize: function (options) {
        App.debug('App.KeywordView.initialize()');
        App.debug(options);
        this.keywords = options.keywords;
        this.render();
    },
    render: function () {
        this.$el.html(this.template());
        // Use default from template if there are no keywords
        if (this.keywords) {
            this.$('input').val(this.keywords);
        }
    }
});

App.SentenceView = Backbone.View.extend({
    template: _.template($('#tpl-sentence-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        var that = this;
        App.debug('App.SentenceView.render()');
        this.$el.html(this.template());
        var $el = this.$('.sentence-view-content');
        progress = _.template($('#tpl-progress').html());
        $el.html(progress);
        this.collection.on('sync', function () {
            App.debug('App.SentenceView.collection: sync');
            that.$('.count').html('(' + that.collection.length + ' found)');
            $el.html('');
            _.each(this.collection.last(10), function (m) {
                var p = $('<p>').html('<em>' + m.media() + '</em> - ' + m.date() + ': ' + m.escape('sentence'));
                $el.append(p);
            });
        }, this);
    }
});

App.WordCountView = Backbone.View.extend({
    config: {
        minSize: 4
        , maxSize: 32
    },
    template: _.template($('#tpl-wordcount-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        App.debug('App.WordCountView.render()');
        var that = this;
        this.$el.html(this.template());
        var $el = this.$('.panel-body');
        $el.html(_.template($('#tpl-progress').html())());
        this.collection.on('sync', function () {
            App.debug('App.WordCountView.collection:sync');
            var topWords = _.first(this.collection.toJSON(), 100);
            var counts = _.pluck(topWords, 'count');
            var min = d3.min(counts);
            var max = d3.max(counts);
            var slope = this.config.maxSize / Math.log(max);
            $el.html('');
            _.each(topWords, function (m) {
                var size = slope * Math.log(m['count']);
                if (size >= that.config.minSize) {
                    var word = $('<span>')
                        .css('font-size', size + 'pt')
                        .html(m['term']);
                    $el.append(word);
                    $el.append(' ');
                }
            });
        }, this);
    }
});

App.HistogramView = Backbone.View.extend({
    margin: {
        top: 10
        , right: 0
        , bottom: 0
        , left: 0
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
        this.$('.histogram-view-content')
            .html('')
            .css('padding', '0');
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
        // Create chart content
        var chart = svg.append('g')
            .classed('chart', true)
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
        // Draw background lines for each month
        var dateLines = chart.append('g');
        dateLines.selectAll('.date-line').data(allLayersData[0])
            .enter()
                .append('line').classed('date-line', true)
                    .attr('x1', function (d) { return Math.round(x(d.date)) - 0.5; })
                    .attr('x2', function (d) { return Math.round(x(d.date)) - 0.5; })
                    .attr('y1', y.range()[0])
                    .attr('y2', y.range()[1])
                    .attr('stroke', '#ccc')
                    .attr('opacity', function(d) {
                        return d.date.substring(8,10) == '01' ? '1' : '0'
                    });
        dateLines.selectAll('.date-text').data(allLayersData[0])
            .enter()
                .append('text')
                    .text(function (d) { return d.date.substring(0,7); })
                    .attr('text-anchor', 'end')
                    .attr('x', '-2')
                    .attr('y', function (d) { return Math.round(x(d.date)) - 0.5 })
                    .attr('dy', 13)
                    .attr('transform', 'rotate(270)')
                    .attr('fill', '#ccc')
                    .attr('opacity', function(d) {
                        return d.date.substring(8,10) == '01' ? '1' : '0'
                    });
        // Create line chart
        var path = d3.svg.line()
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.numFound); });
        chart.selectAll('path').data(allLayersData)
            .enter().append('path')
                .attr('width', chartWidth)
                .attr('d', path)
                .style('stroke', 'red')
                .style('fill', 'none');
    }
});
