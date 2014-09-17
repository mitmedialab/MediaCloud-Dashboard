App.SentenceView = Backbone.View.extend({
    name: 'SentenceView',
    template: _.template($('#tpl-sentence-view').html()),
    sentenceTemplate: _.template($('#tpl-one-sentence-view').html()),
    events: {
        'click li.action-about > a': 'clickAbout'
    },
    initialize: function (options) {
        this.render();
    },
    formatNumber: function(num){
        var parts = num.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    },
    render: function () {
        var that = this;
        App.debug('App.SentenceView.render()');
        this.$el.html(this.template());
        this.hideActionMenu();
        var $el = this.$('.sentence-view .copy');
        progress = _.template($('#tpl-progress').html());
        $el.html(progress());
        // only render both when >=2 queries
        this.listenTo(this.collection.resources, 'resource:complete:sentence', function () {
            $el.html('');
            var query1Sentences = that.collection.at(0).get('results').get('sentences');
            if (that.collection.length >= 2) {
                q1TotalSentences = query1Sentences.last(1)[0].get('totalSentences');
                $el.append('<h3 class="first-query">'+that.collection.at(0).get('params').get('keywords')+' ('+that.formatNumber(q1TotalSentences)+' found)</h3>');
                that.addSentences(query1Sentences.last(10),that.sentenceTemplate,$el);
                var query2Sentences = that.collection.models[1].get('results').get('sentences');
                q2TotalSentences = query2Sentences.last(1)[0].get('totalSentences');
                $el.append('<h3 class="second-query">'+that.collection.at(1).get('params').get('keywords')+' ('+that.formatNumber(q2TotalSentences)+' found)</h3>');
                that.addSentences(query2Sentences.last(10),that.sentenceTemplate,$el);
                that.$('.count').html('');
            } else {
                // figure out the total sentence count
                totalSentences = query1Sentences.last(1)[0].get('totalSentences');
                that.$('.count').html('(' + that.formatNumber(totalSentences) + ' found)');
                // now list some of the sentences
                that.addSentences(query1Sentences.last(10),that.sentenceTemplate,$el);                
            }
            // now that the query collection is filled in, add the download data links
            var downloadUrls = that.collection.map(function(m) { 
                return m.get('results').get('sentences').csvUrl();
            });
            // clean up and prep for display
            that.addDownloadMenuItems(downloadUrls);
            that.delegateEvents();
            that.showActionMenu();
        });
        this.collection.on('execute', function () {
            $el.html(progress());
        });
        this.delegateEvents();
    },
    addSentences: function(sentences,template,element){
        _.each(sentences, function (m) {
            element.append( template({'sentence':m}) );
        }, this);
    },
    clickAbout: function (evt) {
        evt.preventDefault();
        this.aboutView = new App.AboutView({
            template: '#tpl-about-sentences-view'
        });
        $('body').append(this.aboutView.el);
    }
});
App.SentenceView = App.SentenceView.extend(App.ActionedViewMixin);

App.StoryView = Backbone.View.extend({
    name: 'StoryView',
    storyTemplate: _.template($('#tpl-one-story-view').html()),
    template: _.template($('#tpl-story-view').html()),
    events: {
        'click li.action-about > a': 'clickAbout'
    },
    initialize: function (options) {
        this.render();
    },
    render: function () {
        var that = this;
        App.debug('App.StoryView.render()');
        this.$el.html(this.template());
        this.hideActionMenu();
        var $el = this.$('.story-view .copy');
        progress = _.template($('#tpl-progress').html());
        $el.html(progress());
        // render one of two lists
        this.listenTo(this.collection.resources, 'resource:complete:story', function () {
            $el.html('');
            var query1Stories = that.collection.models[0].get('results').get('stories');
            if (that.collection.length >= 2) {
                // had main and comparison queries
                $el.append('<h3 class="first-query">'+that.collection.at(0).get('params').get('keywords')+'</h3>');
                that.addStories(query1Stories.last(10),that.storyTemplate,$el);
                $el.append('<h3 class="second-query">'+that.collection.at(1).get('params').get('keywords')+'</h3>');
                var query2Stories = that.collection.models[1].get('results').get('stories');
                that.addStories(query2Stories.last(10),that.storyTemplate,$el);
            } else {
                // had just a main query
                that.addStories(query1Stories.last(10),that.storyTemplate,$el);
            }
            // now that the query collection is filled in, add the download data links
            var downloadUrls = that.collection.map(function(m) { 
                return m.get('results').get('stories').csvUrl();
            });
            that.addDownloadMenuItems(downloadUrls);
            // clean up and prep for display
            that.delegateEvents();
            that.showActionMenu();
        });
        this.collection.on('execute', function () {
            $el.html(progress());
        });
        this.delegateEvents();
    },
    addStories: function(stories,template,element){
        _.each(stories, function (m) {
            element.append( template({'story':m}) );
        }, this);
    },
    clickAbout: function (evt) {
        evt.preventDefault();
        this.aboutView = new App.AboutView({
            template: '#tpl-about-stories-view'
        });
        $('body').append(this.aboutView.el);
    }
});
App.StoryView = App.StoryView.extend(App.ActionedViewMixin);

// Wrapper view for single word clouds and comparison word cloud
App.WordCountView = App.NestedView.extend({
    name: 'WordCountView',
    template: _.template($('#tpl-wordcount-view').html()),
    events: {
        'click li.action-about > a': 'clickAbout',
    },
    initialize: function (options) {
        this.resultViews = null;
        this.comparisonViews = null;
        _.bindAll(this, 'clickSvg');
        this.render();
    },
    render: function () {
        App.debug('App.WordCountView.render()');
        var that = this;
        this.$el.html(this.template());
        this.hideActionMenu();
        var $el = this.$('.panel-body');
        this.$('.wordcount-view .copy').html(_.template($('#tpl-progress').html())());
        // and render the right subview
        this.listenTo(this.collection.resources, 'resource:complete:wordcount', function () {
            that.$('.wordcount-view .copy').hide();
            if (that.collection.length >=2){
                // only render comparison when >=2 queries
                that.renderWordCountComparison(that.collection);
            } else {
                // render individual word clouds for each query
                that.renderWordCountResults(that.collection.models[0].get('results').get('wordcounts'));
            }
            // add in data download links
            var downloadUrls = that.collection.map(function(m) { 
                return m.get('results').get('wordcounts').csvUrl();
            });
            that.addDownloadMenuItems(downloadUrls);
            // Add download SVG option
            that.addDownloadMenuItems([''], 'Download as SVG', 'svg-download');
            that.$('a.svg-download').on('click', that.clickSvg);
            // and clean up and prep the UI
            that.delegateEvents();
            that.showActionMenu();
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
        var wordCountResultView = new App.WordCountResultView({'collection':wordcounts});
        this.addSubView(wordCountResultView);
        var $el = this.$('.viz');
        $el.append(wordCountResultView.$el);
        this.listenTo(wordCountResultView, 'mm:refine', function (options) {
            var model = this.collection.models[0];
            model.refine.trigger('mm:refine', {
                term: options.term
                , queryCid: model.cid
            });
        });
    },

    renderWordCountComparison: function (collection) {
        App.debug('App.WordCountView.renderWordCountComparison()');
        var wordCountComparisonView = new App.WordCountComparisonView({'collection':collection});
        this.addSubView(wordCountComparisonView);
        var $el = this.$('.viz');
        $el.append(wordCountComparisonView.$el);
    },

    clickAbout: function (evt) {
        evt.preventDefault();
        this.aboutView = new App.AboutView({
            template: '#tpl-about-wordcount-view'
        });
        $('body').append(this.aboutView.el);
    },

    clickSvg: function (evt) {
        evt.preventDefault();
        var s = new XMLSerializer();
        var data = s.serializeToString(this.$('svg').get(0));
        this.$('.svg-download input[name="content"]').val(data);
        this.$('.svg-download').submit();
    }
    
});
App.WordCountView = App.WordCountView.extend(App.ActionedViewMixin);

// View for comparison word cloud
App.WordCountComparisonView = Backbone.View.extend({
    name: 'WordCountComparisonView',
    config: {
        // Use sizeRange() to read, might be dynamic in the future
        sizeRange: { min: 10, max: 24 }
        , height: 400
        , padding: 10
        , linkColor: "#428bca"
    },

    template: _.template($('#tpl-wordcount-comparison-view').html()),
    
    initialize: function () {
        _.bindAll(this,'refineBothQueries');
        this.render();
    },
    updateStats: function () {
        var allLeft = this.collection.at(0).get('results').get('wordcounts').toJSON();
        var allRight = this.collection.at(1).get('results').get('wordcounts').toJSON();
        var countSel = function (d) { return d.count };
        var leftSum = d3.sum(allLeft, countSel);
        var rightSum = d3.sum(allRight, countSel);
        var topLeft = _.first(allLeft, 100);
        var topRight = _.first(allRight, 100);
        // Normalize
        _.each(topLeft, function (d) {
            d.tfnorm = d.count / leftSum;
        });
        _.each(topRight, function (d) {
            d.tfnorm = d.count / rightSum;
        })
        // Find L - R, L int R, R - L
        var terms = {}
        _.each(topLeft, function (d) {
            terms[d.stem] = d;
            terms[d.stem].left = true;
        });
        _.each(topRight, function (d) {
            if (!terms[d.stem]) {
                terms[d.stem] = d;
            } else {
                terms[d.stem].tfnorm = (terms[d.stem].count + d.count) / (leftSum + rightSum);
            }
            terms[d.stem].right = true;
        });
        this.left = _.filter(terms, function (d) { return d.left && !d.right; });
        this.right = _.filter(terms, function (d) { return d.right && !d.left; });
        this.center = _.filter(terms, function (d) { return d.left && d.right; });
        this.center.sort(function (a, b) {
            return b.tfnorm - a.tfnorm;
        });
        this.all = this.left.concat(this.right);
        this.fullExtent = d3.extent(this.all, function (d) { return d.tfnorm; })
    },
    render: function () {
        var that = this;
        this.updateStats();
        this.$el.html(this.template());
        this.$('.content-text').hide();
        _.defer(function () { 
            that.renderSvg();
        });
    },
    sizeRange: function () {
        return _.clone(this.config.sizeRange);
    },
    fontSize: function (term, extent, sizeRange) {
        if (typeof(sizeRange) === 'undefined') {
            sizeRange = this.sizeRange();
        }
        var size = sizeRange.min
            + (sizeRange.max - sizeRange.min)
                * ( Math.log(term.tfnorm) - Math.log(extent[0]) ) / ( Math.log(extent[1]) - Math.log(extent[0]) );
        return size;
    },
    termText: function(d){
        return d.term + d.count + ' ';
    },
    renderHtml: function () {
        var that = this;
        var container = d3.select(this.el).select('.content-text');
        container.append('h3').text('Main');
        container.append('div').selectAll('.left')
            .data(this.left, function (d) { return d.stem; })
            .enter()
                .append('span').classed('left', true)
                .style('font-size', function (d) {
                    return that.fontSize(d, that.fullExtent) + 'px';
                })
                .style('font-weight', 'bold')
                .text(this.termText);
        container.append('h3').text('Intersection');
        container.append('div').selectAll('.intersection')
            .data(this.center, function (d) { return d.stem; })
            .enter()
                .append('span').classed('intersection', true)
                .style('font-size', function (d) {
                    return that.fontSize(d, that.fullExtent) + 'px';
                })
                .style('font-weight', 'bold')
                .text(this.termText);
        container.append('h3').text('Comparison');
        container.append('div').selectAll('.right')
            .data(this.right, function (d) { return d.stem; })
            .enter()
                .append('span').classed('right', true)
                .style('font-size', function (d) {
                    return that.fontSize(d, that.fullExtent) + 'px';
                })
                .style('font-weight', 'bold')
                .text(this.termText);
    },
    renderSvg: function () {
        var that = this;
        var container = d3.select(this.el).select('.content-viz');
        var width = this.$('.content-viz').width();
        var innerWidth = width/3.0 - 2*this.config.padding;
        var svg = container.append('svg')
            .attr('height', this.config.height)
            .attr('width', width);
        var leftGroup = svg.append('g').classed('left-group', true)
            .attr('transform', 'translate('+this.config.padding+')');
        var intersectGroup = svg.append('g').classed('intersect-group', true)
            .attr('transform', 'translate('+(innerWidth+this.config.padding)+')');
        var rightGroup = svg.append('g').classed('right-group', true)
            .attr('transform', 'translate('+(2.0*innerWidth+this.config.padding)+')');
        var y = this.config.height;
        var sizeRange = this.sizeRange();
        var leftWords, rightWords, intersectWords;
        while (y >= this.config.height && sizeRange.max > sizeRange.min) {
            // Create words
            leftWords = leftGroup.selectAll('.word')
                .data(this.left, function (d) { return d.stem; });
            leftWords.enter()
                .append('text').classed('word', true).classed('left', true)
                .attr('font-size', function (d) {
                    return that.fontSize(d, that.fullExtent, sizeRange); });
            rightWords = rightGroup.selectAll('.word')
                .data(this.right, function (d) { return d.stem; });
            rightWords.enter()
                .append('text').classed('word', true).classed('right', true)
                .attr('font-size', function (d) {
                    return that.fontSize(d, that.fullExtent, sizeRange); });
            intersectWords = intersectGroup.selectAll('.word')
                .data(this.center, function (d) { return d.stem; });
            intersectWords.enter()
                .append('text').classed('word', true).classed('intersect', true)
                .attr('font-size', function (d) {
                    return that.fontSize(d, that.fullExtent, sizeRange); });
            d3.selectAll('.word')
                .text(function (d) { return d.term; })
                .attr('font-weight', 'bold');
            d3.selectAll('.left.word')
                .attr('fill', App.config.queryColors[0]);
            d3.selectAll('.right.word')
                .attr('fill', App.config.queryColors[1]);
            // Layout
            y = 0;
            y = Math.max(y, this.listCloudLayout(leftWords, innerWidth, this.fullExtent, sizeRange));
            y = Math.max(y, this.listCloudLayout(intersectWords, innerWidth, this.fullExtent, sizeRange));
            y = Math.max(y, this.listCloudLayout(rightWords, innerWidth, this.fullExtent, sizeRange));
            sizeRange.max = sizeRange.max - 1;
        }
        d3.selectAll('.word')
            .on('mouseover', function () {
                d3.select(this).attr('fill', that.config.linkColor)
                .attr('cursor','pointer');
            })
            .on('mouseout', function () {
                var color = '#000';
                if (d3.select(this).classed('left')) {
                    color = App.config.queryColors[0];
                }
                if (d3.select(this).classed('right')) {
                    color = App.config.queryColors[1];
                }
                d3.select(this).attr('fill', color)
                .attr('cursor','default');
            });
        d3.selectAll('.left.word')
            .on('click', this.refineBothQueries);
        d3.selectAll('.right.word')
            .on('click', this.refineBothQueries);
        d3.selectAll('.intersect.word')
            .on('click', this.refineBothQueries);
    },
    refineBothQueries: function(d){
        this.collection.refine.trigger('mm:refine', [
            {term: d.term, query: 0},{term: d.term, query: 1}
        ]);
    },
    listCloudLayout: function (words, width, extent, sizeRange) {
        var that = this;
        var x = 0;
        words.attr('x', function (d) {
            var textLength = this.getComputedTextLength();
            var fs = that.fontSize(d, extent, sizeRange);
            var lastX = x;
            if (x + textLength + that.config.padding > width) {
                lastX = 0;
            }
            x = lastX + textLength + 0.3*fs;
            return lastX;
        });
        var y = 0;
        var lastAdded = 0;
        words.attr('y', function (d) {
            if (d3.select(this).attr('x') == 0) {
                y += 1.5 * that.fontSize(d, extent, sizeRange);
                lastAdded = 1.5 * that.fontSize(d, extent, sizeRange);
            }
            return y;
        });
        return y + lastAdded;
    }
});

App.HistogramView = Backbone.View.extend({
    name: 'HistogramView',
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
    events: {
        'click li.action-about > a' : 'clickAbout'
    },
    initialize: function (options) {
        App.debug('App.HistogramView.initialize()');
        this.render();
        _.bindAll(this, 'dayFillColor');
    },
    render: function () {
        App.debug('App.HistogramView.render()');
        this.$el.html(this.template());
        this.hideActionMenu();
        progress = _.template($('#tpl-progress').html());
        this.$('.copy').html(progress());
        this.$('.viz').hide();
        // TODO allow for multiple results
        //this.collection.resources.on('resource:complete:datecount', this.renderD3, this);
        this.collection.resources.on('resource:complete:datecount', this.renderViz, this);
        this.listenTo(this.collection, 'execute', function () {
            this.$('.copy').html(progress()).show();
            this.$('.viz').html('');
        }, this);
        this.listenTo(
            this.collection.subqueryResources,
            'resource:complete:wordcount',
            this.onSubqueryWordcounts
        );
    },
    renderViz: function () {
        App.debug('App.HistogramView.renderViz');
        // draw the chart
        this.renderHighChart();
        // now that the query collection is filled in, add the download data links
        var downloadUrls = this.collection.map(function(m) { 
            return m.get('results').get('datecounts').csvUrl();
        });
        this.addDownloadMenuItems(downloadUrls);
        // register an about click handler
        this.delegateEvents();  // gotta run this to register the events again
        this.showActionMenu();
    },
    renderHighChart: function() {
        App.debug('App.HistogramView.renderHighChart');
        var that = this;
        var datasets = this.collection.map(function (queryModel) {
            return queryModel.get('results').get('datecounts').toJSON();
        });
        // set up the html container
        this.$('.copy').hide();
        this.$('.viz')
            .html('')
            .css('padding', '0')
            .show();
        // figure out the xAxis labels
        var dates = _.map(datasets[0], function(item){ return item.dateObj; });
        // generate the series
        var allSeries = [];
        _.each(datasets, function(item,idx){
            allSeries.push({
                id: idx,
                name: that.collection.at(idx).get('params').get('keywords'),
                color: App.config.queryColors[idx],
                data: _.map(item, function(d){ return d.numFound; }),
                pointStart: item[0].dateObj.getTime(),
                pointInterval: item[1].dateObj.getTime() - item[0].dateObj.getTime()
            });
        });
        var showLineMarkers = (allSeries[0].data.length < 30);   // don't show dots on line if more than N data points
        // set it all up 
        this.$('.viz').highcharts({
            title: {
                text: ''
            },
            chart: {
                type: 'spline',
                height: '180',
                zoomType: 'x'
            },
            plotOptions: {
                series: {
                    marker: {
                        enabled: showLineMarkers
                    },
                    point: {
                        events: {
                            click: function (event) {
                                var date =Highcharts.dateFormat(
                                    '%Y-%m-%d'
                                    , this.x
                                );
                                var result = that.collection.at(this.series._i);
                                var attributes = {
                                    start: date
                                    , end: date
                                };
                                result.subqueryListener.trigger('mm:subquery', {
                                    queryCid: result.cid
                                    , attributes: attributes
                                });
                            }
                        }
                    }
                }
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    millisecond: '%m/%e/%y',
                    second: '%m/%e/%y',
                    minute: '%m/%e/%y',
                    hour: '%m/%e/%y',
                    day: '%m/%e/%y',
                    week: '%m/%e/%y',
                    month: '%m/%y',
                    year: '%Y'
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Sentences'
                }
            },
            series: allSeries
        });
    },
    renderD3: function () {
        App.debug('App.HistogramView.renderD3()');
        // register an about click handler
        this.delegateEvents();  // gotta run this to register the events again
        this.showActionMenu();
        // now that the query collection is filled in, add the download data links
        var downloadUrls = this.collection.map(function(m) { 
            return m.get('results').get('datecounts').csvUrl();
        });
        this.addDownloadMenuItems(downloadUrls);
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
                    .attr('x', function (d) { return that.x(that.toDateString(d)); })
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
    },
    clickAbout: function (evt) {
        evt.preventDefault();
        this.aboutView = new App.AboutView({
            template: '#tpl-about-histogram-view'
        });
        $('body').append(this.aboutView.el);
    },
    onSubqueryWordcounts: function () {
        this.$('.viz .subquery').remove();
        wordcounts = this.collection.subquery.get('results').get('wordcounts');
        subqueryView = new App.WordCountResultView({collection:wordcounts});
        subqueryView.$el.addClass('subquery').appendTo(this.$('.viz'));
    }
});
App.HistogramView = App.HistogramView.extend(App.ActionedViewMixin);

App.QueryResultView = App.NestedView.extend({
    name: 'QueryResultView',
    tagName: 'div',
    id: 'query-results',
    initialize: function (options) {
        App.debug('App.QueryResultView.initialize():' + this.cid);
        this.histogramView = new App.HistogramView(options);
        this.wordCountView = new App.WordCountView(options);
        if(App.con.userModel.canListSentences()){
            this.mentionsView = new App.SentenceView(options);
        } else {
            this.mentionsView = new App.StoryView(options);
        }
        this.addSubView(this.histogramView);
        this.addSubView(this.wordCountView);
        this.addSubView(this.mentionsView);
        this.render();
    },
    render: function () {
        // Reset and render views
        this.$el.html('');
        this.$el.append(this.histogramView.$el);
        this.$el.append(this.wordCountView.$el);
        this.$el.append(this.mentionsView.$el);
    }
});
