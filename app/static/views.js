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

App.QueryView = App.NestedView.extend({
    template: _.template($('#tpl-query-view').html()),
    events: {
        'click button.copy': 'onCopyInput',
        'click button.remove': 'onRemoveInput'
    },
    initialize: function (options) {
        App.debug('App.QueryView.initialize()');
        App.debug(options);
        _.bindAll(this, 'onCopyInput');
        _.bindAll(this, 'onRemoveInput');
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
        this.controlsView = new App.QueryControlsView();
        this.model.on('remove', this.close, this);
        this.addSubView(this.mediaSelectView);
        this.addSubView(this.mediaListView);
        this.addSubView(this.dateRangeView);
        this.addSubView(this.controlsView);
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
            var topRow = $('<div>').addClass('row')
                .append(that.keywordView.el)
                .append(that.dateRangeView.el)
                .append(that.controlsView.el);
            var bottomRow = $('<div>').addClass('row')
                .append(that.mediaSelectView.el)
                .append(that.mediaListView.el);
            that.$('.query-view-content').html('')
                .append(topRow)
                .append(bottomRow);
        });
    },
    onCopyInput: function (evt) {
        App.debug('App.QueryView.onCopyInput()');
        evt.preventDefault();
        var newMedia = this.model.get('params').get('mediaModel');
        var attr = {
            start: this.model.get('params').get('start'),
            end: this.model.get('params').get('end'),
            keywords: this.model.get('params').get('keywords'),
            mediaModel: newMedia.clone()
        };
        var opts = {
            mediaSources: this.mediaSources
            , parse: true
        };
        var newModel = new App.QueryModel(attr, opts);
        this.model.collection.add(newModel);
    },
    onRemoveInput: function (evt) {
        evt.preventDefault();
        this.model.collection.remove(this.model);
    }
});

App.QueryListView = App.NestedView.extend({
    template: _.template($('#tpl-query-list-view').html()),
    events: {
        "click .btn-primary": 'onQuery'
    },
    initialize: function (options) {
        App.debug('App.QueryListView.initialize()');
        _.bindAll(this, 'onAdd');
        this.mediaSources = options.mediaSources;
        this.collection.on('add', this.onAdd, this);
        this.collection.on('remove', this.onRemove, this);
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
                that.onAdd(m, that.collection)
            });
        });
    },
    onQuery: function (ev) {
        ev.preventDefault();
        this.collection.execute();
    },
    onAdd: function (model, collection, options) {
        App.debug('App.QueryListView.onAdd()');
        var queryView = new App.QueryView({
            model: model,
            mediaSources: this.mediaSources
        });
        this.addSubView(queryView);
        this.$('.query-views').append(queryView.$el);
        // TODO this is a hack to only allow two queries, but we can get data
        // for more once the viz can handle it.
        if (collection.length == 1) {
            this.$('.query-views').addClass('one');
            this.$('.query-views').removeClass('two');
        } else {
            this.$('.query-views').addClass('two');
            this.$('.query-views').removeClass('one');
        }
    },
    onRemove: function (model, collection, options) {
        if (collection.length == 1) {
            this.$('.query-views').addClass('one');
            this.$('.query-views').removeClass('two');
        } else {
            this.$('.query-views').addClass('two');
            this.$('.query-views').removeClass('one');
        }
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
                name: 'sets',
                displayKey: 'name',
                source: that.mediaSources.get('sets').getSuggestions().ttAdapter()
            });
            // Listen to custom typeahead events
            that.$('.media-input').bind(
                'typeahead:selected',
                function () { that.onTextEntered(); });
            that.$('.media-input').bind(
                'typeahead:autocompleted',
                function () { that.onTextEntered(); });
        });
    },
    render: function () {
        this.$el.html(this.template());
        var $el = this.$el;
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
    tagName: 'span',
    events: {
        'click .remove': 'onClickRemove'
    },
    initialize: function (options) {
        this.render();
        _.bindAll(this, 'onClickRemove');
    },
    render: function () {
        this.$el.addClass('label');
        this.$el.addClass('label-default');
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
        this.$('.media-list-view-content').append(itemView.el);
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
        var $el = this.$el;
        _.defer(function () {
            $('.keyword-view-keywords', $el).focus();
        });
    },
    contentChanged: function () {
        this.model.get('params').set('keywords', this.$input.val());
    }
});

App.QueryControlsView = App.NestedView.extend({
    template: _.template($('#tpl-query-controls-view').html()),
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
        var that = this;
        App.debug('App.SentenceView.render()');
        this.$el.html(this.template());
        var $el = this.$('.sentence-view .copy');
        progress = _.template($('#tpl-progress').html());
        $el.html(progress());
        // TODO split into two views, one for the QueryColleciton and one for SentenceColleciton
        this.collection.resources.on('sync:sentence', function (sentences) {
            App.debug('App.SentenceView.sentenceCollection: sync');
            // figure out the total sentence count
            totalSentences = sentences.last(1)[0].get('totalSentences');
            that.$('.count').html('(' + totalSentences + ' found)');
            $el.html('');
            // now list some of the sentences
            _.each(sentences.last(10), function (m) {
                var p = $('<p>').html('<em>' + m.media() + '</em> - ' + m.date() + ': ' 
                    + '<a href="' + m.get('storyUrl') + '">' + m.escape('sentence') + '</a>'
                    );
                $el.append(p);
            });
        }, this);
        this.collection.on('execute', function () {
            $el.html(progress());
        });
    }
});

// Wrapper view for single word clouds and comparison word cloud
App.WordCountView = App.NestedView.extend({
    template: _.template($('#tpl-wordcount-view').html()),
    initialize: function (options) {
        this.resultViews = null;
        this.comparisonViews = null;
        this.render();
    },
    render: function () {
        App.debug('App.WordCountView.render()');
        var that = this;
        this.$el.html(this.template());
        var $el = this.$('.panel-body');
        this.$('.wordcount-view .copy').html(_.template($('#tpl-progress').html())());
        // render individual word clouds for each query
        this.listenTo(this.collection.resources, 'sync:wordcount', function (model) {
            if (that.collection.length < 2) {
                that.renderWordCountResults(model);
            }
        });
        // only render comparison when >=2 queries
        this.listenTo(this.collection.resources, 'resource:complete:wordcount', function () {
            that.$('.wordcount-view .copy').hide();
            if (that.collection.length >=2){
                this.renderWordCountComparison(that.collection);
            }
            App.debug('App.WordCountComparisonView() resource:complete ' + that.cid);
            App.debug(that.collection);
        });
        // Reset when the query executes
        this.listenTo(this.collection, 'execute', function () {
            App.debug('App.WordCountView.collection:execute');
            this.$('.wordcount-view .copy').show();
            this.$('.viz').html('');
        }, this);
    },
    
    renderWordCountResults: function (wordcounts) {
        App.debug('App.WordCountView.renderWordCountResults()');
        var wordCountResultView = new App.WordCountResultView(wordcounts);
        this.addSubView(wordCountResultView);
        var $el = this.$('.viz');
        $el.append(wordCountResultView.$el);
    },

    renderWordCountComparison: function (collection) {
        App.debug('App.WordCountView.renderWordCountComparison()');
        var wordCountComparisonView = new App.WordCountComparisonView(collection);
        this.addSubView(wordCountComparisonView);
        var $el = this.$('.viz');
        $el.append(wordCountComparisonView.$el);
    }
});

// Single word cloud view
App.WordCountResultView = Backbone.View.extend({
    config: {
        minSize: 4,
        maxSize: 48
    },
    template: _.template($('#tpl-wordcount-result-view').html()),

    initialize: function (wordcounts) {
        this.render(wordcounts);
    },

    render: function (wordcounts) {
        App.debug('App.WordCountResultView.render()');
        this.$el.html(this.template());
        progress = _.template($('#tpl-progress').html());
        this.$('.wordcount-result-view-content').html(progress());
        var that = this;
        // wait until end to get correct width
        _.defer(function(){that.renderD3(wordcounts);});
    },

    renderD3: function (wordcounts) {
        App.debug('App.WordCountResultView.renderD3()');
        this.$('.wordcount-result-view-content')
            .html('')
            .css('padding', '0');
        var width = this.$('.wordcount-result-view-content').width();
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
            var svg = d3.select('.wordcount-result-view-content').append('svg')
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

// View for comparison word cloud
App.WordCountComparisonView = Backbone.View.extend({
    config: {
        fontSize: {
            minSize: 8
            , maxSize: 48
        }
    },

    template: _.template($('#tpl-wordcount-comparison-view').html()),
    
    initialize: function (collection) {
        this.render(collection);
    },

    render: function (collection) {
        App.debug('App.WordCountComparisonView.render()');
        this.$el.html(this.template());
        progress = _.template($('#tpl-progress').html());
        this.$('.panel-body').html(progress());
        var that = this;
        _.defer(function(){that.renderD3(collection);});
    },

    renderD3: function (collection) {
        App.debug('App.WordCountComparisonView.renderD3()');
        this.$('.wordcount-comparison-view-content')
            .html('')
            .css('padding', '0');
        var width = this.$('.wordcount-comparison-view-content').width();
        var height = 400;
        // supports two queries
        // TODO: Iterate through collections instead
        var query1Words = collection.models[0].get('results').get('wordcounts');
        var query2Words = collection.models[1].get('results').get('wordcounts');

        var topWordsQuery1 = _.first(query1Words.toJSON(), 100);
        var topWordsQuery2 = _.first(query2Words.toJSON(), 100);

        var countsQuery1 = _.pluck(topWordsQuery1, 'count');
        var countsQuery2 = _.pluck(topWordsQuery2, 'count');

        var maxQuery1 = d3.max(countsQuery1);
        var maxQuery2 = d3.max(countsQuery2);

        var maxQuery = d3.max([maxQuery1,maxQuery2]);
        var slope = this.config.fontSize.maxSize / Math.log(maxQuery);

        // get list of all words and sizes
        wordList1 = [];
        wordList2 = [];
        intersectionWordList = [];

        var intersection = _.filter(topWordsQuery1, function(m){
            return _.contains(_.pluck(topWordsQuery2, 'term'), m['term']); 
        });

        _.each(intersection, function (m) {
            intersectionWordList.push({text: m['term'], color: 'black', query1Count: 0, query2Count: 0, size: 0});
        });

        _.each(topWordsQuery1, function (m) {
            // if in the intersection, add to intersectionList
            if (_.contains(_.pluck(intersection, 'term'), m['term'])){
                wordObject = _.findWhere(intersectionWordList, {text: m['term']});
                wordObject.query1Count = m['count'];
                wordObject.size = slope * Math.log(wordObject.query1Count + wordObject.query2Count);
            }
            else{
                // add to wordList1
                wordList1.push({text: m['term'], color: '#e14c11', query1Count: m['count'], query2Count: 0, size: slope * Math.log(m['count'])});
            }
        });

        _.each(topWordsQuery2, function (m) {
            // if in the intersection, add to intersectionList
            if (_.contains(_.pluck(intersection, 'term'), m['term'])){
                wordObject = _.findWhere(intersectionWordList, {text: m['term']});
                wordObject.query2Count = m['count'];
                wordObject.size = slope * Math.log(wordObject.query1Count + wordObject.query2Count);
            }
            else{
                // add to wordList2
                wordList2.push({text: m['term'], color: '#249fc9', query1Count: 0, query2Count: m['count'], size: slope * Math.log(m['count'])});
            }
        });

        wordsList = wordList1.concat(wordList2).concat(intersectionWordList)

        function getColor(d){
            var total = d.query1Count + d.query2Count;
            colorFill = -1*d.query1Count/total + 1*d.query2Count/total;
            return colorFill;
        }

        var fill = d3.scale.linear()
                .domain([-1, 1])
                .range(["orange", "orchid"]);  
        d3.layout.cloud().size([1000, 350])
        .words(wordsList)
        .rotate(function() { return ~~(Math.random() * 1) * 90; })
        .font("Arial")
        .fontSize(function(d) {return d.size; })
        // Gradient color
        // .fontColor(function(d) {return fill(getColor(d)); })
        // Separate colors
        .fontColor(function(d) {return d.color; })
        .on("end", draw)
        .start();

        function draw(words) {
            // var fill = d3.scale.category20();
            var svg = d3.select('.wordcount-comparison-view-content').append('svg')
            .attr('width', width).attr('height', height)    
            .append("g")
            .attr("transform", "translate(575,200)")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", function(d) { return d.size + "px"; })
            .style("font-weight", 'bold')
            .style("fill", function(d) { return d.fontColor; })
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
            top: 0
            , right: 0
            , bottom: 0
            , left: 0
        },
        padding: {
            top: 20
            , bottom: 20
        },
        stripeColors: [
            // Month A colors
            ["#ffffff", "#fafafa"]
            // Month B colors
            , ["#ffffff", "#fafafa"] 
        ],
        yearColor: "#000",
        yearOpacity: 0.33,
        yearSize: 20,
        monthColor: '#000', 
        monthOpacity: 0.33,
        monthSize: 20,
        labelSize: 14,
        labelFill: '#aaa',
        labelStroke: '#fff',
        labelOpacity: 1,
        labelWidth: 30,
        labelPadding: 5,
        axisColor: '#ddd'
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
        this.$('.copy').html(progress());
        this.$('.viz').hide();
        // TODO allow for multiple results
        this.collection.resources.on('resource:complete:datecount', this.renderD3, this);
        this.listenTo(this.collection, 'execute', function () {
            this.$('.copy').html(progress()).show();
            this.$('.viz').html('');
        }, this);
    },
    renderD3: function () {
        App.debug('App.HistogramView.renderD3()');
        var that = this;
        // Prepare javascript object and date array
        this.allLayersData = this.collection.map(function (queryModel) {
            return queryModel.get('results').get('datecounts').toJSON();
        });
        // TODO: move into DateCountCollection
        // Get min/max count/date
        var maxCount = d3.max(this.allLayersData, function (layerData) {
            return d3.max(_.pluck(layerData, 'numFound'));
        });
        var minDate = d3.min(_.map(this.allLayersData, function (layerData) {
            return _.first(layerData).dateObj;
        }));
        var maxDate = d3.max(_.map(this.allLayersData, function (layerData) {
            return _.last(layerData).dateObj;
        }));
        var days = 1 + Math.round((maxDate.getTime() - minDate.getTime()) / (1000*60*60*24));
        this.domain = [this.toDateString(minDate)];
        this.domainDates = [minDate];
        _.each(_.range(days - 1), function () {
            var nextDate = new Date(_.last(that.domainDates));
            nextDate.setUTCDate(nextDate.getUTCDate() + 1);
            that.domainDates.push(nextDate);
            that.domain.push(that.toDateString(nextDate));
        });
        // Layout
        this.$('.copy').hide();
        this.$('.viz')
            .html('')
            .css('padding', '0')
            .show();
        this.width = this.$('.viz').width();
        this.height = 120;
        this.chartWidth = this.width - this.config.margin.left - this.config.margin.right;
        this.chartHeight = this.height - this.config.margin.top - this.config.margin.bottom;
        this.svg = d3.select('.histogram-view .viz').append('svg')
            .attr('width', this.width).attr('height', this.height);
        // Create axes
        this.dayScale = d3.scale.ordinal()
            .domain(this.domain)
            .rangeBands([0, this.chartWidth], 0, 0);
        this.x = d3.scale.ordinal()
            .domain(this.domain)
            .rangePoints([this.dayScale.rangeBand()/2.0, this.chartWidth - this.dayScale.rangeBand()/2.0]);
        this.y = d3.scale.linear()
            .domain([0, maxCount])
            .range([this.chartHeight - this.config.padding.bottom, this.config.padding.top]);
        // Create chart content
        this.chart = this.svg.append('g')
            .classed('chart', true)
            .attr('transform', 'translate(' + this.config.margin.left + ',' + this.config.margin.top + ')');
        this.renderD3Bg();
        this.renderD3Labels();
        // Create line chart
        var path = d3.svg.line()
            .x(function(d) { return that.x(d.date); })
            .y(function(d) { return that.y(d.numFound); });
        this.chart.selectAll('path').data(this.allLayersData)
            .enter().append('path')
                .attr('width', that.chartWidth)
                .attr('d', path)
                .style('stroke', function (d, i) { return App.config.queryColors[i]; })
                .style('fill', 'none');
        this.renderD3MinMax();
    },
    renderD3Bg: function () {
        var that = this;
        // Draw background days
        var days = this.chart.append('g').classed('bg', true);
        days.selectAll('.day').data(this.domain)
            .enter()
                .append('rect').classed('day', true)
                    .attr('x', this.dayScale)
                    .attr('width', this.dayScale.rangeBand())
                    .attr('y', 0)
                    .attr('height', this.chartHeight)
                    .attr('fill', this.dayFillColor);
        // Draw axis
        this.chart.append('line')
            .attr('x1', this.config.margin.left)
            .attr('x2', this.chartWidth + this.config.margin.left)
            .attr('y1', App.halfint(this.config.margin.top + this.chartHeight - this.config.padding.bottom))
            .attr('y2', App.halfint(this.config.margin.top + this.chartHeight - this.config.padding.bottom))
            .attr('stroke', this.config.axisColor);
    },
    renderD3Labels: function () {
        var that = this;
        var labelData = App.dateLabels(this.domainDates);
        var yearLabels = this.chart.append('g').classed('labels-year', true);
        yearLabels.selectAll('.label-year').data(labelData.year)
            .enter()
                .append('text').classed('label-year', true)
                    .text(function (d) { return d.getUTCFullYear(); })
                    .attr('x', this.x)
                    .attr('y', this.chartHeight - this.config.yearSize - 1)
                    .attr('dy', '1em')
                    .attr('font-size', this.config.yearSize)
                    .attr('fill', this.config.yearColor)
                    .attr('fill-opacity', this.config.yearOpacity)
                    .attr('font-weight', 'bold');
        var monthLabels = this.chart.append('g').classed('labels-month', true);
        monthLabels.selectAll('.label-month').data(labelData.month)
            .enter()
                .append('text').classed('label-month', true)
                    .text(function (d) { return App.monthName(d.getUTCMonth()); })
                    .attr('x', function (d) { return that.x(that.toDateString(d)); })
                    .attr('y', this.config.monthSize)
                    .attr('font-size', this.config.monthSize)
                    .attr('fill', this.config.monthColor)
                    .attr('fill-opacity', this.config.monthOpacity)
                    .attr('font-weight', 'bold');
    },
    renderD3MinMax: function () {
        var that = this;
        var extents = _.map(this.allLayersData, function (wordcounts) {
            var counts = _.pluck(wordcounts, 'numFound');
            var maxIndex = _.indexOf(counts, d3.max(counts));
            var minIndex = _.indexOf(counts, d3.min(counts));
            return {
                min: wordcounts[minIndex]
                , max: wordcounts[maxIndex]
            }
        }, this);
        var extrema = this.chart.append('g').classed('extrema', true);
        var layer = extrema.selectAll('layer-extrema').data(extents)
            .enter().append('g').classed('layer-extrema', true);
        // Draw two elements: shadow and text
        layer.append('text').classed('min', true)
            .text(function (d) { return d.min.numFound; })
            .attr('x', function (d) { return that.x(d.min.date) - 1; })
            .attr('y', function (d) {
                if (d.min.numFound != 0) {
                    return App.halfint(that.y(d.min.numFound)) + 1;
                }
                return that.chartHeight - that.config.padding.bottom - that.config.labelSize - 3;
            })
            .attr('dy', '0.8em')
            .attr('text-anchor', function(d) { return that.labelAnchor(d.min); })
            .attr('font-size', this.config.labelSize)
            .attr('font-weight', 'bold')
            .attr('fill', this.config.labelStroke)
            .attr('stroke', this.config.labelStroke)
            .attr('stroke-width', '2')
            .attr('fill-opacity', this.config.labelOpacity);
        layer.append('text').classed('min', true)
            .text(function (d) { return d.min.numFound; })
            .attr('x', function (d) { return that.x(d.min.date); })
            .attr('y', function (d) {
                if (d.min.numFound != 0) {
                    return App.halfint(that.y(d.min.numFound)) + 2;
                }
                return that.chartHeight - that.config.padding.bottom - that.config.labelSize - 2;
            })
            .attr('dy', '0.8em')
            .attr('text-anchor', function(d) { return that.labelAnchor(d.min); })
            .attr('font-size', this.config.labelSize)
            .attr('fill', this.config.labelFill)
            .attr('fill-opacity', this.config.labelOpacity);
        // Draw two elements: shadow and text
        layer.append('text').classed('max', true)
            .text(function (d) { return d.max.numFound; })
            .attr('x', function (d) { return that.x(d.max.date) - 1; })
            .attr('y', function (d) { return App.halfint(that.y(d.max.numFound)) - 3; })
            .attr('text-anchor', function(d) { return that.labelAnchor(d.max); })
            .attr('font-size', this.config.labelSize)
            .attr('font-weight', 'bold')
            .attr('fill', this.config.labelStroke)
            .attr('stroke', this.config.labelStroke)
            .attr('stroke-width', 2)
            .attr('fill-opacity', this.config.labelOpacity);
        layer.append('text').classed('max', true)
            .text(function (d) { return d.max.numFound; })
            .attr('x', function (d) { return that.x(d.max.date); })
            .attr('y', function (d) { return App.halfint(that.y(d.max.numFound)) - 2; })
            .attr('text-anchor', function(d) { return that.labelAnchor(d.max); })
            .attr('font-size', this.config.labelSize)
            .attr('fill', this.config.labelFill)
            .attr('fill-opacity', this.config.labelOpacity);
    },
    dayFillColor: function (date) {
        return this.config.stripeColors[0][date.substr(8,10) % 2]
    },
    toDate: function (dateString) {
        var ymd = dateString.split('-');
        return new Date(Date.UTC(ymd[0], ymd[1]-1, ymd[2]));
    },
    pad: function (s) { return s.length > 1 ? s : '0' + s; },
    toDateString: function (d) {
            return [
                d.getUTCFullYear(),
                this.pad(String(d.getUTCMonth() + 1)),
                this.pad(String(d.getUTCDate()))
            ].join('-');
    },
    minMaxX: function (d) {
        var x = this.x(d.date);
        return x < this.chartWidth / 2.0 ? x : x - this.config.labelWidth;
    },
    labelAnchor: function (d) {
        var x = this.x(d.date);
        return x < this.chartWidth / 2.0 ? 'beginning' : 'end';
    }
});

App.QueryResultView = App.NestedView.extend({
    initialize: function (options) {
        App.debug('App.QueryResultView.initialize():' + this.cid);
        this.histogramView = new App.HistogramView(options);
        this.wordCountView = new App.WordCountView(options);
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
