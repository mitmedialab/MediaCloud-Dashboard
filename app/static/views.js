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
        App.debug(options);
        this.mediaSources = options.mediaSources;
        this.mediaSelectView = new App.MediaSelectView({
            model: this.model.get('params').get('mediaModel')
            , mediaSources: this.mediaSources
        });
        this.mediaListView = new App.MediaListView({
            model: this.model.get('params').get('mediaModel')
        });
        this.dateRangeView = new App.DateRangeView({ model: this.model });
        this.keywordView = new App.KeywordView({model: this.model});
        this.addSubView(this.mediaSelectView);
        this.addSubView(this.mediaListView);
        this.addSubView(this.dateRangeView);
        this.render();
    },
    render: function () {
        // Show loading
        this.$el.html(this.template());
        progress = _.template($('#tpl-progress').html());
        this.$('.query-view-content').html(progress());
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

App.QueryListView = App.NestedView.extend({
    template: _.template($('#tpl-query-list-view').html()),
    events: {
        "click .btn-primary": 'onQuery'
    },
    initialize: function (options) {
        App.debug('App.QueryListView.initialize()');
        this.mediaSources = options.mediaSources;
        this.render();
    },
    render: function () {
        // Show loading
        this.$el.html(this.template());
        progress = _.template($('#tpl-progress').html());
        this.$('.query-list-view-content').html(progress());
        var that = this;
        this.mediaSources.deferred.done(function () {
            that.$el.html(that.template());
            // Replace loading with queries
            that.collection.each(function (m) {
                var queryView = new App.QueryView({
                    model: m,
                    mediaSources: that.mediaSources
                });
                that.addSubView(queryView);
                that.$('.query-views').append(queryView.$el);
            });
        });
    },
    onQuery: function (ev) {
        ev.preventDefault();
        this.collection.execute();
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
        _.bindAll(this, 'onTextEntered');
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
        source = this.mediaSources.get('sources').nameToSource[name];
        set = this.mediaSources.get('sets').nameToSet[name];
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
        _.bindAll(this, 'onAdd');
        _.bindAll(this, 'onRemoveClick');
        this.render();
        // Add listeners
        this.model.get('sources').on('add', this.onAdd, this);
        this.model.get('sets').on('add', this.onAdd, this);
        // Set listener context
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
    events: {
        "change input": "onContentChange"
    },
    initialize: function (options) {
        App.debug('App.DateRangeView.initialize()');
        App.debug(options);
        _.bindAll(this, "onContentChange");
        this.render();
    },
    render: function () {
        App.debug('App.DateRangeView.render()');
        var that = this;
        this.$el.html(this.template())
        this.$('.date-range-start').val(this.model.get('params').get('start'));
        this.$('.date-range-end').val(this.model.get('params').get('end'));
        // Create the datepickers and hide on selection / tab-out
        var start = this.$('.date-range-start').datepicker(
            App.config.datepickerOptions
        ).on('changeDate', function (event) {
            that.onContentChange();
            start.hide();
        }).on('keydown', function (event) {
            if (e.keyCode == 9) {
                start.hide();
            }
        }).data('datepicker');
        var end = this.$('.date-range-end').datepicker(
            App.config.datepickerOptions
        ).on('changeDate', function (event) {
            that.onContentChange();
            end.hide();
        }).on('keydown', function (event) {
            if (e.keyCode == 9) {
                end.hide();
            }
        }).data('datepicker');
    },
    onContentChange: function () {
        App.debug('App.DateRangeView.onContentChange()');
        this.model.get('params').set('start', this.$('.date-range-start').val());
        this.model.get('params').set('end', this.$('.date-range-end').val());
    }
});

App.KeywordView = Backbone.View.extend({
    template: _.template($('#tpl-keyword-view').html()),
    events: {
        "change input": "contentChanged"
    },
    initialize: function (options) {
        App.debug('App.KeywordView.initialize()');
        App.debug(options);
        _.bindAll(this, 'contentChanged');
        this.render();
    },
    render: function () {
        this.$el.html(this.template());
        // Use default from template if there are no keywords
        this.$input = this.$('input');
        if (this.model.get('params').get('keywords')) {
            this.$input.val(this.model.get('params').get('keywords'));
        }
    },
    contentChanged: function () {
        this.model.get('params').set('keywords', this.$input.val());
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
        $el.html(progress());
        // TODO split into two views, one for the QueryColleciton and one for SentenceColleciton
        this.collection.resources.on('sync:sentence', function (sentences) {
            App.debug('App.SentenceView.sentenceCollection: sync');
            that.$('.count').html('(' + sentences.length + ' found)');
            $el.html('');
            _.each(sentences.last(10), function (m) {
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
        // TODO support multiple queries
        this.collection.resources.on('sync:wordcount', function (wordcounts) {
            App.debug('App.WordCountView.collection:sync');
            var topWords = _.first(wordcounts.toJSON(), 100);
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

// First pass of single wordcloud
App.DebugWordCountView = Backbone.View.extend({
    config: {
        minSize: 4,
        maxSize: 48
    },
    template: _.template($('#tpl-wordcount-view').html()),
    
    initialize: function (options) {
        this.render();
    },

    render: function () {
        App.debug('App.WordCountView.render()');
        this.$el.html(this.template());
        progress = _.template($('#tpl-progress').html());
        this.$('.panel-body').html(progress());
        this.collection.resources.on('sync:wordcount', this.renderD3, this);
    },

    renderD3: function (wordcounts) {
        App.debug('App.DebugWordCountView.renderD3()');
        this.$('.wordcount-view-content')
            .html('')
            .css('padding', '0');
        var width = this.$('.wordcount-view-content').width();
        var height = 400;
        var topWords = _.first(wordcounts.toJSON(), 100);
        var counts = _.pluck(topWords, 'count');
        var min = d3.min(counts);
        var max = d3.max(counts);
        var slope = this.config.maxSize / Math.log(max);
        // get list of all words and sizes
        wordList = [];
        _.each(topWords, function (m) {
                wordList.push({text: m['term'], size: slope * Math.log(m['count'])});
            }
        );
        // create wordcloud
        d3.layout.cloud().size([1000, 350])
        .words(wordList)
        .rotate(function() { return ~~(Math.random() * 1) * 90; })
        .font("Arial")
        .fontSize(function(d) { return d.size; })
        .on("end", draw)
        .start();

        function draw(words) {
            // Black and white
            // var fill = d3.scale.linear().domain([0,100]).range(["black","white"]);
            // Colors
            var fill = d3.scale.category20();
            var svg = d3.select('.wordcount-view-content').append('svg')
            .attr('width', width).attr('height', height)    
            .append("g")
            .attr("transform", "translate(575,200)")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", function(d) { return d.size + "px"; })
            .style("fill", function(d, i) { return fill(i); })
            .attr("text-anchor", "middle")
            .attr("transform", function(d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .text(function(d) { return d.text; });
        }     
    }
});

App.HistogramView = Backbone.View.extend({
    config: {
        margin: {
            top: 10
            , right: 0
            , bottom: 0
            , left: 0
        },
        colors: [
            // Month A colors
            ['#77efff', '#bbf7ff']
            // Month B colors
            , ['#6ce8d8', '#b6f4ec'] 
        ]
    },
    template: _.template($('#tpl-histogram-view').html()),
    initialize: function (options) {
        App.debug('App.HistogramView.initialize()');
        _.bindAll(this, 'dayFillColor');
        this.render();
    },
    render: function () {
        App.debug('App.HistogramView.render()');
        this.$el.html(this.template());
        progress = _.template($('#tpl-progress').html());
        this.$('.panel-body').html(progress());
        // TODO allow for multiple results
        this.collection.resources.on('sync:datecount', this.renderD3, this);
    },
    renderD3: function (datecounts) {
        App.debug('App.HistogramView.renderD3()');
        var that = this;
        // Prepare javascript object and date array
        this.allLayersData = [datecounts.toJSON()];
        this.dayData = _.map(_.pluck(this.allLayersData[0], 'date'), this.toDate);
        // Layout
        this.$('.histogram-view-content')
            .html('')
            .css('padding', '0');
        this.width = this.$('.histogram-view-content').width();
        this.height = 100;
        this.chartWidth = this.width - this.config.margin.left - this.config.margin.right;
        this.chartHeight = this.height - this.config.margin.top - this.config.margin.bottom;
        this.svg = d3.select('.histogram-view-content').append('svg')
            .attr('width', this.width).attr('height', this.height);
        // TODO - for multiple layers call d3.layout.stack
        // Create axes
        this.dayScale = d3.scale.ordinal()
            .domain(this.dayData)
            .rangeBands([0, this.chartWidth], 0, 0);
        this.x = d3.scale.ordinal()
            .domain(_.pluck(this.allLayersData[0], 'date'))
            .rangePoints([this.dayScale.rangeBand()/2.0, this.chartWidth - this.dayScale.rangeBand()/2.0]);
        this.y = d3.scale.linear()
            .domain([0, d3.max(_.pluck(this.allLayersData[0], 'numFound'))])
            .range([this.chartHeight, 0]);
        // Create chart content
        this.chart = this.svg.append('g')
            .classed('chart', true)
            .attr('transform', 'translate(' + this.config.margin.left + ',' + this.config.margin.top + ')');
        this.renderD3Bg();
        // Create line chart
        var path = d3.svg.line()
            .x(function(d) { return that.x(d.date); })
            .y(function(d) { return that.y(d.numFound); });
        this.chart.selectAll('path').data(this.allLayersData)
            .enter().append('path')
                .attr('width', that.chartWidth)
                .attr('d', path)
                .style('stroke', 'red')
                .style('fill', 'none');
    },
    renderD3Bg: function () {
        var that = this;
        // Draw background days
        var days = this.chart.append('g');
        days.selectAll('.day').data(this.dayData)
            .enter()
                .append('rect').classed('day', true)
                    .attr('x', this.dayScale)
                    .attr('width', this.dayScale.rangeBand())
                    .attr('y', 0)
                    .attr('height', this.chartHeight)
                    .attr('fill', this.dayFillColor);
        // Draw background lines for each month
        var dateLines = this.chart.append('g');
        dateLines.selectAll('.date-line').data(this.allLayersData[0])
            .enter()
                .append('line').classed('date-line', true)
                    .attr('x1', function (d) { return Math.round(that.x(d.date)) - 0.5; })
                    .attr('x2', function (d) { return Math.round(that.x(d.date)) - 0.5; })
                    .attr('y1', this.y.range()[0])
                    .attr('y2', this.y.range()[1])
                    .attr('stroke', '#ccc')
                    .attr('opacity', function(d) {
                        return d.date.substring(8,10) == '01' ? '1' : '0'
                    });
        dateLines.selectAll('.date-text').data(this.allLayersData[0])
            .enter()
                .append('text')
                    .text(function (d) { return d.date.substring(0,7); })
                    .attr('text-anchor', 'end')
                    .attr('x', '-2')
                    .attr('y', function (d) { return Math.round(that.x(d.date)) - 0.5 })
                    .attr('dy', 13)
                    .attr('transform', 'rotate(270)')
                    .attr('fill', '#ccc')
                    .attr('opacity', function(d) {
                        return d.date.split('-')[2] == 1 ? 1 : 0
                    });
    },
    dayFillColor: function (date) {
        console.log(date.getTime());
        days = Math.round(date.getTime() / 86400000.0);
        return this.config.colors[date.getUTCMonth() % 2][days % 2];
    },
    toDate: function (dateString) {
        var ymd = dateString.split('-');
        return new Date(Date.UTC(ymd[0], ymd[1]-1, ymd[2]));
    }
});

App.QueryResultView = App.NestedView.extend({
    initialize: function (options) {
        this.histogramView = new App.HistogramView(options);
        // this.wordCountView = new App.WordCountView(options);
        // Use new WordCount view
        this.wordCountView = new App.DebugWordCountView(options);
        this.sentenceView = new App.SentenceView(options);
        this.addSubView(this.histogramView);
        this.addSubView(this.wordCountView);
        this.addSubView(this.sentenceView);
        this.render();
    },
    render: function () {
        // Reset and render views
        this.$el.html('');
        this.$el.append(this.histogramView.$el);
        this.$el.append(this.wordCountView.$el);
        this.$el.append(this.sentenceView.$el);
    }
});
