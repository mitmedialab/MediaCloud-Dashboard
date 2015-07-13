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
        this.listenTo(this.collection.resources, 'resource:complete:sentence', function () {
            $el.html('');
            var queryCount = that.collection.length;
            var query1Sentences = that.collection.at(0).get('results').get('sentences');
            if (queryCount >= 2) {
                for (i = 0; i < queryCount; i++) {
                    $view = $('<div>');
                    $view.addClass('query-sentences').appendTo($el);
                    querySentences = that.collection.at(i).get('results').get('sentences');
                    var totalSentences = 0;
                    if (querySentences.length > 0) {
                        totalSentences = querySentences.last().get('totalSentences');
                    }
                    var $title = $('<h3 id=' + that.collection.at(i).getName() + '>')
                        .text(that.collection.at(i).getName()
                              + ' (' + that.formatNumber(totalSentences) + ' found)')
                        .css('color', that.collection.at(i).getColor());
                    $view.append($title);
                    that.addSentences(querySentences.last(10), that.sentenceTemplate, $view);
                }
                that.$('.count').html('');
            } else {
                // figure out the total sentence count
                totalSentences = query1Sentences.last(1)[0].get('totalSentences');
                that.$('.count').html('(' + that.formatNumber(totalSentences) + ' found)');
                // now list some of the sentences
                that.addSentences(query1Sentences.last(10),that.sentenceTemplate,$el);                
            }
            // now that the query collection is filled in, add the download data links
            var downloadInfo = that.collection.map(function(m) { 
                return {
                    'url':m.get('results').get('sentences').csvUrl(),
                    'name':m.getName()
                };
            });
            // clean up and prep for display
            that.addDownloadMenuItems(downloadInfo);
            that.delegateEvents();
            that.showActionMenu();
        });
        this.collection.on('execute', function () {
            $el.html(progress());
        });
        this.delegateEvents();
        this.listenTo(this.collection, 'mm:colorchange', function(model) {
            $('h3#'+ model.getName()).css('color', model.getColor());
        });
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
            var downloadInfo = that.collection.map(function(m) { 
                return {
                    'url':m.get('results').get('stories').csvUrl(),
                    'name':m.getName()
                };
            });
            that.addDownloadMenuItems(downloadInfo);
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
                that.renderWordCountResults(that.collection.at(0));
            }
            // add in data download links
            App.debug("!!!");
            App.debug(that.collection);
            var downloadInfo = that.collection.map(function(m) { 
                return {
                    'url':m.get('results').get('wordcounts').csvUrl(),
                    'name':m.getName()
                };
            });
            that.addDownloadMenuItems(downloadInfo);
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
    
    renderWordCountResults: function (queryModel) {
        App.debug('App.WordCountView.renderWordCountResults()');
        var wordCountResultView = new App.WordCountOrderedView({'model':queryModel,refine:this.collection.refine});
        this.addSubView(wordCountResultView);
        var $el = this.$('.viz');
        $el.append(wordCountResultView.$el);
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

App.WordCountOrderedView = Backbone.View.extend({
    name: 'WordCountOrderedView',
    config: {
        // Use sizeRange() to read, might be dynamic in the future
        sizeRange: { min: 10, max: 64 }
        , height: 400
        , padding: 10
        , linkColor: "#428bca"
        , labelSize: 16
    },

    template: _.template($('#tpl-wordcount-ordered-view').html()),
    
    initialize: function (options) {
        this.refine = options.refine;
        _.bindAll(this,'refineBothQueries');
        this.render();
    },
    updateStats: function () {
        this.all = this.model.get('results').get('wordcounts').toJSON();
        var countSel = function (d) { return d.count };
        var allSum = d3.sum(this.all, countSel);
        this.center = _.first(this.all, 100);
        // Normalize
        _.each(this.center, function (d) {
            d.tfnorm = d.count / allSum;
        });
        this.fullExtent = d3.extent(this.all, function (d) { return d.tfnorm; })
    },
    render: function () {
        var that = this;
        console.log(this.model.getColor());
        this.updateStats();
        this.$el.html(this.template());
        this.$('.content-text').hide();
        _.defer(function () { 
            that.renderSvg();
        });
        this.listenTo(this.model, 'mm:colorchange', function() {
           $('g.intersect-group circle').attr('fill', this.model.getColor());
            d3.selectAll('.word')
                .attr('fill', this.model.getColor());
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
    renderSvg: function () {
        var that = this;
        var container = d3.select(this.el).select('.content-viz');
        var width = this.$('.content-viz').width();
        var innerWidth = width - 2*this.config.padding;
        var svg = container.append('svg')
            .attr('height', this.config.height)
            .attr('width', width);
        var intersectGroup = svg.append('g').classed('intersect-group', true)
            .attr('transform', 'translate('+(this.config.padding)+')');
        var sizeRange = this.sizeRange();
        var intersectWords;
        var label = intersectGroup.append('text')
            .text(this.model.getName())
            .attr('font-size', this.config.labelSize)
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('x', innerWidth/2.0 + this.config.labelSize/2.0)
            .attr('y', this.config.padding + this.config.labelSize);
        var legendXoff = -this.config.labelSize/2.0 - label[0][0].getBBox().width/2.0;
        var legendYoff = (1 + 0.25)*this.config.labelSize/2.0
        intersectGroup.append('circle')
            .attr('r', 0.7*this.config.labelSize/2.0)
            .attr('cy', this.config.padding + legendYoff)
            .attr('cx', innerWidth/2.0 + legendXoff)
            .attr('fill', this.model.getColor());
        var y = this.config.height;
        var wordListHeight = this.config.height - 1.5*this.config.labelSize - 2*this.config.padding;
        var wordList = intersectGroup.append('g')
            .attr('transform', 'translate(0,' + (1.5*this.config.labelSize) + ')');
        while (y >= wordListHeight && sizeRange.max > sizeRange.min) {
            // Create words
            intersectWords = wordList.selectAll('.word')
                .data(this.center, function (d) { return d.stem; });
            intersectWords.enter()
                .append('text').classed('word', true).classed('intersect', true);
            intersectWords
                .attr('font-size', function (d) {
                    return that.fontSize(d, that.fullExtent, sizeRange); });
            d3.selectAll('.word')
                .text(function (d) { return d.term; })
                .attr('font-weight', 'bold')
                .attr('fill', this.model.getColor());
                //.attr('fill', App.config.queryColors[0]);
            // Layout
            y = 0;
            intersectHeight = this.listCloudLayout(intersectWords, innerWidth, this.fullExtent, sizeRange);
            y = Math.max(y, intersectHeight);
            sizeRange.max = sizeRange.max - 1;
        }
        if (y < this.config.height) {
            svg.attr('height', y + 1.5*this.config.labelSize);
        }
        d3.selectAll('.word')
            .on('mouseover', function () {
                d3.select(this).attr('fill', that.config.linkColor)
                .attr('cursor','pointer');
            })
            .on('mouseout', function () {
                var color = that.model.getColor();
                d3.select(this).attr('fill', color)
                .attr('cursor','default');
            });
        d3.selectAll('.intersect.word')
            .on('click', this.refineBothQueries);
    },
    refineBothQueries: function(d){
        this.refine.trigger('mm:refine',{term:d.term});
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
        var y = -0.5 * that.fontSize(that.center[0], extent, sizeRange);
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

// View for comparison word cloud
App.WordCountComparisonView = Backbone.View.extend({
    name: 'WordCountComparisonView',
    config: {
        // Use sizeRange() to read, might be dynamic in the future
        sizeRange: { min: 10, max: 24 }
        , height: 400
        , padding: 10
        , linkColor: "#428bca"
        , labelSize: 16
    },

    template: _.template($('#tpl-wordcount-comparison-view').html()),
    
    events: {'change select#left-select' :'changeQuery', 'change select#right-select' :'changeQuery'},

    initialize: function () {
        _.bindAll(this,'refineBothQueries');
        this.leftQuery = 0;
        this.rightQuery = 1;
        this.leftModel = this.collection.at(0);
        this.rightModel = this.collection.at(1);
        this.render();
    },
    updateStats: function () {
        var allLeft = this.collection.at(this.leftQuery).get('results').get('wordcounts').toJSON();
        var allRight = this.collection.at(this.rightQuery).get('results').get('wordcounts').toJSON();
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
        this.all = this.all.concat(this.center);
        this.fullExtent = d3.extent(this.all, function (d) { return d.tfnorm; })
    },
    render: function () {
        var that = this;
        this.updateStats();
        this.$el.html(this.template());
        this.$('.content-text').hide();
        _.defer(function () {
            if (that.collection.length < 3) {
                that.$('.query-select').hide();
            } else {
                that.$('.query-select').show();
            }
            //query-dropdown
            var queryNumber = -1;
            that.collection.each(function(queryModel){
                queryNumber++;
                if (queryNumber === that.leftQuery){
                    that.$('.dropdown-left #left-select').append("<option class=selection selected='selected' id="+ queryNumber+" value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                else {
                    that.$('.dropdown-left #left-select').append("<option class=selection id="+ queryNumber+" value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                if (queryNumber === that.rightQuery){
                    that.$('.dropdown-right #right-select').append("<option class=selection selected='selected' id=" + queryNumber + " value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                else{
                    that.$('.dropdown-right #right-select').append("<option class=selection id=" + queryNumber + " value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                });
            that.renderSvg();
        });
        this.listenTo(this.collection, 'mm:colorchange', function() {
           $('g.left-group circle').attr('fill', this.leftModel.getColor());
           $('g.right-group circle').attr('fill', this.rightModel.getColor());
            d3.selectAll('.left.word')
                .attr('fill', this.leftModel.getColor());
            d3.selectAll('.right.word')
                .attr('fill', this.rightModel.getColor());
       });
    },
    changeQuery: function(ev) {
        var currentValue = parseInt($(ev.currentTarget).val());
        if ($(ev.currentTarget).attr('id') === "left-select") {
            this.leftQuery = currentValue;
            this.leftModel = this.collection.at(this.leftQuery);
        } else {
            this.rightQuery = currentValue;
            this.rightModel = this.collection.at(this.rightQuery);
        }
        this.updateStats();
        this.$el.html(this.template());
        this.$('.content-text').hide();
        var that = this;
        _.defer(function(){
            //query-dropdown
            var queryNumber = -1;
            that.collection.each(function(queryModel){
                queryNumber++;
                if (queryNumber === that.leftQuery){
                    that.$('.dropdown-left #left-select').append("<option class=selection selected='selected' id="+ queryNumber+" value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                else {
                    that.$('.dropdown-left #left-select').append("<option class=selection id="+ queryNumber+" value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                if (queryNumber === that.rightQuery){
                    that.$('.dropdown-right #right-select').append("<option class=selection selected='selected' id=" + queryNumber + " value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
                else{
                    that.$('.dropdown-right #right-select').append("<option class=selection id=" + queryNumber + " value='" + queryNumber + "'>"+queryModel.getName() + "</option>");
                }
            });
            that.renderSvg();
        })
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
        var innerWidth = (width - 8*this.config.padding)/3.0;
        var svg = container.append('svg')
            .attr('height', this.config.height)
            .attr('width', width);
        var leftGroup = svg.append('g').classed('left-group', true)
            .attr('transform', 'translate('+2*this.config.padding+')');
        var intersectGroup = svg.append('g').classed('intersect-group', true)
            .attr('transform', 'translate('+(innerWidth+4*this.config.padding)+')');
        var rightGroup = svg.append('g').classed('right-group', true)
            .attr('transform', 'translate('+(2.0*innerWidth+6*this.config.padding)+')');
        var y = this.config.height;
        var sizeRange = this.sizeRange();
        var leftWords, rightWords, intersectWords;
        var label = intersectGroup.append('text')
            .text('Both')
            .attr('font-size', this.config.labelSize)
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('x', innerWidth/2.0 + this.config.labelSize/2.0)
            .attr('y', this.config.padding + this.config.labelSize);
        var legendXoff = -this.config.labelSize/2.0 - label[0][0].getBBox().width/2.0;
        var legendYoff = (1 + 0.25)*this.config.labelSize/2.0
        intersectGroup.append('circle')
            .attr('r', 0.7*this.config.labelSize/2.0)
            .attr('cy', this.config.padding + legendYoff)
            .attr('cx', innerWidth/2.0 + legendXoff)
            .attr('fill', '#000000');
        label = leftGroup.append('text')
            .text(this.collection.at(this.leftQuery).getName())
            .attr('font-size', this.config.labelSize)
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('x', innerWidth/2.0 + this.config.labelSize/2.0)
            .attr('y', this.config.padding + this.config.labelSize);
        var legendXoff = -this.config.labelSize/2.0 - label[0][0].getBBox().width/2.0;
        var legendYoff = (1 + 0.25)*this.config.labelSize/2.0
        leftGroup.append('circle')
            .attr('r', 0.7*this.config.labelSize/2.0)
            .attr('cy', this.config.padding + legendYoff)
            .attr('cx', innerWidth/2.0 + legendXoff)
            .attr('fill', this.leftModel.getColor());
        var label = rightGroup.append('text')
            .text(this.collection.at(this.rightQuery).getName())
            .attr('font-size', this.config.labelSize)
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('x', innerWidth/2.0 + this.config.labelSize/2.0)
            .attr('y', this.config.padding + this.config.labelSize);
        var legendXoff = -this.config.labelSize/2.0 - label[0][0].getBBox().width/2.0;
        var legendYoff = (1 + 0.25)*this.config.labelSize/2.0
        rightGroup.append('circle')
            .attr('r', 0.7*this.config.labelSize/2.0)
            .attr('cy', this.config.padding + legendYoff)
            .attr('cx', innerWidth/2.0 + legendXoff)
            .attr('fill', this.rightModel.getColor());
        var wordListHeight = this.config.height - 1.5*this.config.labelSize - 2*this.config.padding;
        var intersectList = intersectGroup.append('g')
            .attr('transform', 'translate(0,' + (2*this.config.labelSize) + ')');
        var leftList = leftGroup.append('g')
            .attr('transform', 'translate(0,' + (2*this.config.labelSize) + ')');
        var rightList = rightGroup.append('g')
            .attr('transform', 'translate(0,' + (2*this.config.labelSize) + ')');
        while (y >= wordListHeight && sizeRange.max > sizeRange.min) {
            // Create words
            if (this.left.length > 0) {
                leftWords = leftList.selectAll('.word')
                    .data(this.left, function (d) { return d.stem; });
                leftWords.enter()
                    .append('text').classed('word', true).classed('left', true);
                leftWords
                    .attr('font-size', function (d) {
                        return that.fontSize(d, that.fullExtent, sizeRange); });
            }
            if (this.right.length > 0) {
                rightWords = rightList.selectAll('.word')
                    .data(this.right, function (d) { return d.stem; });
                rightWords.enter()
                    .append('text').classed('word', true).classed('right', true);
                rightWords
                    .attr('font-size', function (d) {
                        return that.fontSize(d, that.fullExtent, sizeRange); });
            }
            if (this.center.length > 0) {
                intersectWords = intersectList.selectAll('.word')
                    .data(this.center, function (d) { return d.stem; });
                intersectWords.enter()
                    .append('text').classed('word', true).classed('intersect', true);
                intersectWords
                    .attr('font-size', function (d) {
                        return that.fontSize(d, that.fullExtent, sizeRange); });
            }
            d3.selectAll('.word')
                .text(function (d) { return d.term; })
                .attr('font-weight', 'bold');
            d3.selectAll('.left.word')
                .attr('fill', this.leftModel.getColor());
            d3.selectAll('.right.word')
                .attr('fill', this.rightModel.getColor());
            // Layout
            y = 0;
            leftHeight = this.listCloudLayout(leftWords, innerWidth, this.fullExtent, sizeRange);
            intersectHeight = this.listCloudLayout(intersectWords, innerWidth, this.fullExtent, sizeRange);
            rightHeight = this.listCloudLayout(rightWords, innerWidth, this.fullExtent, sizeRange);
            y = Math.max(y, leftHeight);
            y = Math.max(y, intersectHeight);
            y = Math.max(y, rightHeight);
            sizeRange.max = sizeRange.max - 1;
        }
        if (y < this.config.height) {
            svg.attr('height', y + 2*this.config.labelSize);
        }
        d3.selectAll('.word')
            .on('mouseover', function () {
                d3.select(this).attr('fill', that.config.linkColor)
                .attr('cursor','pointer');
            })
            .on('mouseout', function () {
                var color = '#000';
                if (d3.select(this).classed('left')) {
                    color = that.leftModel.getColor();
                }
                if (d3.select(this).classed('right')) {
                    color = that.rightModel.getColor();
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
        this.collection.refine.trigger('mm:refine', {term: d.term} );
    },
    listCloudLayout: function (words, width, extent, sizeRange) {
        App.debug('App.WordCountComparisonView()');
        //App.debug(extent); App.debug(sizeRange); App.debug(words);
        var that = this;
        var x = 0;
        if (typeof(words) === 'undefined') {
            return 0;
        }
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
        var y = -0.5 * sizeRange.max;
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
        this.listenTo(this.collection, 'mm:colorchange', this.renderViz);
    },
    renderViz: function () {
        App.debug('App.HistogramView.renderViz');
        // draw the chart
        this.renderHighChart();
        // now that the query collection is filled in, add the download data links
        var downloadInfo = this.collection.map(function(m) { 
            return {
                'url':m.get('results').get('datecounts').csvUrl(),
                'name':m.getName()
            };
        });
        this.addDownloadMenuItems(downloadInfo);
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
            var intervalMs = item[1].dateObj.getTime() - item[0].dateObj.getTime();
            var intervalDays = intervalMs / (1000 * 60 * 60 * 24);
            allSeries.push({
                id: idx, 
                name: that.collection.at(idx).getName(),
                color: that.collection.at(idx).getColor(),
                data: _.map(item, function(d){ return d.numFound / intervalDays; }),
                pointStart: item[0].dateObj.getTime(),
                pointInterval: intervalMs
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
                    text: 'Sentences/day'
                }
            },
            series: allSeries
        });
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

App.CountryMapView = App.NestedView.extend({
    name: 'CountryMapView',
    template: _.template($('#tpl-country-map-view').html()),
    progressTemplate: _.template($('#tpl-progress').html()),
    initialize: function (options) {
        this.render();
        this.mapInfo = {};
    },
    render: function () {
        App.debug("CountryMapView render");
        var that = this;
        this.$el.html(this.template());
        this.hideActionMenu();
        this.$el.find('.loading').html(this.progressTemplate());
        this.$('.loading').show();
        this.$('.viz').hide();
        this.$('.unsupported').hide();
        this.collection.on('execute', function () {
            that.$el.find('.loading').html(that.progressTemplate());
            that.$el.find('.loading').show();
            that.$('.unsupported').hide();
            that.$('.viz').hide();
        });
        this.collection.resources.on('resource:complete:tagcount', this.renderResults, this);
    },
    renderResults: function() {
        if(this.collection.isGeoTagged()){
            this.renderMaps();
        } else {
            this.renderNoMaps();
        }
    },
    renderNoMaps: function(){
        this.$('.viz').html("").hide();
        this.$('.loading').hide();
        this.$('.unsupported').show();
    },
    renderMaps: function() {
        this.$('.viz').html("");
        App.debug("CountryMapView renderViz");
        var that = this;
        // init share map config into the this.mapInfo object
        this.mapInfo.width = 400;
        this.mapInfo.height = this.mapInfo.width / 2.19;
        this.mapInfo.scale = this.mapInfo.width / 5.18;
        this.mapInfo.offset = [this.mapInfo.width/1.96, this.mapInfo.height / 1.73];
        this.mapInfo.projection = d3.geo.kavrayskiy7()
                    .scale(this.mapInfo.scale)
                    .translate([this.mapInfo.offset[0], this.mapInfo.offset[1]])
                    .precision(.1);
        this.mapInfo.path = d3.geo.path()
                    .projection(this.mapInfo.projection);
        this.mapInfo.colors = ['rgb(241,233,187)', 'rgb(207,97,35)'];
        this.mapInfo.disabledColor = 'rgb(220,220,200)';
        // note: right now this normalizes to max of ALL queries
        var maxCounts = this.collection.map(function(queryModel){
            var tagCountModels = queryModel.get('results').get('tagcounts').models;
            return d3.max(tagCountModels, function (tagCountModel) { return tagCountModel.get('count') });
        });
        this.mapInfo.maxCount = d3.max(maxCounts);
        this.mapInfo.colorScale = d3.scale.linear()
                .range(this.mapInfo.colors)
                .domain([0, this.mapInfo.maxCount]);
        this.mapInfo.countryPaths = topojson.feature(App.worldMap, App.worldMap.objects.countries).features;
        this.mapInfo.countryAlpha3ToPath = {};
        $.each(this.mapInfo.countryPaths, function (i, element) {
            if(element.id>0){
                that.mapInfo.countryAlpha3ToPath[ISO3166.getAlpha3FromId(element.id)] = element;
            }
        });
        // add one map for each query
        this.collection.map(function(queryModel) {
            // create map wrapper
            var models = queryModel.get('results').get('tagcounts').models;
            var svgMap = d3.select(that.$el.find('.viz')[0]).append("svg")
                .attr("width", that.mapInfo.width)
                .attr("height", that.mapInfo.height);
            svgMap.append('g').attr('id', 'background');
            svgMap.append('g').attr('id', 'tagcounts');
            svgMap.append('g').attr('id', 'labels');
            // create the map outlines
            var country = svgMap.select('#background').selectAll(".country").data(that.mapInfo.countryPaths);
            country.enter().append("path")
                .attr("class", 'country')
                .attr("stroke-width", "1")
                .attr("stroke", "rgb(255,255,255)")
                .attr("fill", 'rgb(204,204,204)')
                .attr("data-id",function(d){ return d.id })
                .on("click", function (d) { return that.handleInvalidCountryClick(d); })
                .attr("d", that.mapInfo.path);
            // render the country data
            var g = svgMap.select('#tagcounts')
                .selectAll('country')
                .data(models, function (tagCountModel) { return tagCountModel.get('id'); });
            g.enter()
                .append("path")
                .attr("class", "country")
                .attr("fill", that.mapInfo.disabledColor)
                .attr("id", function(tagCountModel,i) {return "country"+tagCountModel.get('id')})
                .attr("data-id", function(tagCountModel,i) {return tagCountModel.get('id')})
                .attr("data-tags-id", function(tagCountModel,i) {return tagCountModel.get('tags-id')})
                .attr("data-alpha3", function(tagCountModel,i) {return tagCountModel.get('alpha3')})
                .attr("data-count", function(tagCountModel,i) {return tagCountModel.get('count')})
                .attr("d", function (tagCountModel) { 
                    var countryOutline = that.mapInfo.countryAlpha3ToPath[tagCountModel.get('alpha3').toLowerCase()];
                    return that.mapInfo.path(countryOutline);
                })
                .on("click", function (tagCountModel) { return that.handleCountryClick(tagCountModel); });
            g.attr("stroke-width", "1")
                .attr("stroke", "rgb(255,255,255)")
            g.transition()
                .attr("fill", function(tagCountModel) { return that.mapInfo.colorScale(tagCountModel.get('count'));} )
                .attr("stroke", "rgb(255,255,255)")
                .style("opacity", "1");
            // Render country names
            var t = svgMap.select('#labels')
                .selectAll('text')
                .data(models, function(tagCountModel) {return tagCountModel.get('id');} );
            t.enter()
                .append("text")
                .attr("class", "country-name")
                .attr("visibility","hidden")
                .attr("text-anchor", "middle")
                .attr("id", function(tagCountModel,i){ return 'country-name'+tagCountModel.get('id')})
                .attr("x",function(tagCountModel){return that.mapInfo.projection(tagCountModel.get('centroid'))[0];})
                .attr("y",function(tagCountModel){return that.mapInfo.projection(tagCountModel.get('centroid'))[1];})
                .text( function(tagCountModel) {return tagCountModel.get('label')})
                .attr("font-family","sans-serif")
                .attr("font-size", "16px")
                .attr("font-weight", "bold")
                .attr("fill","rgb(92,72,58)");
        });
        this.$el.find('.loading').hide();
        this.$el.find('.viz').show();
        // clean up and prep for display
        var downloadInfo = this.collection.map(function(tagCountModel) { 
            return {
                'url':tagCountModel.get('results').get('tagcounts').csvUrl(),
                'name':tagCountModel.getName()
            };
        });
        this.addDownloadMenuItems(downloadInfo);
        this.delegateEvents();
        this.showActionMenu();
    },
    handleInvalidCountryClick: function(tagCountModel){
        App.debug("Clicked on invalid country!");
        App.debug(c);
    },
    handleCountryClick: function(tagCountModel){
        App.debug("Clicked on country!");
        this.collection.refine.trigger('mm:refine',{ term: "(tags_id_story_sentences:"+tagCountModel.get('tags_id')+")" });
    }
});
App.CountryMapView = App.CountryMapView.extend(App.ActionedViewMixin);

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
        this.countryMapView = new App.CountryMapView(options);
        this.addSubView(this.histogramView);
        this.addSubView(this.wordCountView);
        this.addSubView(this.mentionsView);
        this.addSubView(this.countryMapView);
        this.render();
    },
    render: function () {
        // Reset and render views
        this.$el.html('');
        this.$el.append(this.histogramView.$el);
        this.$el.append(this.wordCountView.$el);
        this.$el.append(this.mentionsView.$el);
        this.$el.append(this.countryMapView.$el);
    }
});
