
App.MentionsResultListView = Backbone.View.extend({
    initialize: function (options) {
        this.render();
    },
    render: function () {
        App.debug('App.MentionsResultListView.render()');
        this.$el.html('');
        this.collection.each(function (m) {
            var view = new App.MentionsResultView({model:m})
            this.$el.append(view.el);
        }, this);
    }
});

App.MentionsResultView = Backbone.View.extend({
    template: _.template($('#tpl-mentions-result-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        App.debug('MenionResultView.render()');
        this.$el.html(this.template());
        this.$('.progress').html(
            _.template($('#tpl-progress').html())()
        ).show();
        this.listenTo(this.model.collection.resources, 'sync:sentence', function (sentences) {
            App.debug('App.MentionsResultView.collection: sync');
            this.$('.progress').hide();
            // figure out the total sentence count
            totalSentences = sentences.last(1)[0].get('totalSentences');
            this.$('.count').html('(' + totalSentences + ' found)');
            this.$('.query-name').html(this.model.get('name'));
            this.$('mentions-result-view-content').html('');
            // now list some of the sentences
            _.each(sentences.last(10), function (m) {
                var p = $('<p>').html('<em>' + m.media() + '</em> - ' + m.date() + ': ' 
                    + '<a href="' + m.get('url') + '">' + m.escape('sentence') + '</a>'
                    );
                this.$('.mentions-result-view-content').append(p);
            }, this);
        });
    }
});
