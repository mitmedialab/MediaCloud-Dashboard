App.Router = Backbone.Router.extend({
    routes: {
        '': 'home'
        , '/': 'home'
        , 'login': 'login'
        , 'query/:keywords/:solr': 'query'
    },
    
    initialize: function (options) {
        var that = this;
        this.initViews();
        this.userModel = options.userModel;
        this.mediaSources = options.mediaSources;
        App.debug('App.Router.initialize()');
        // Create application-level views
        this.controlsView = new App.ControlsView({ userModel: this.userModel });
        $('.controls').append(this.controlsView.el);
    },
    
    login: function () {
        App.debug('Route: login');
        this.loginView = new App.LoginView({ model: this.userModel });
        this.showView(this.loginView);
    },
    
    home: function () {
        App.debug('Route: home');
        if (!this.userModel.get('authenticated')) {
            this.navigate('login', true);
            return;
        }
        this.queryModel = new App.QueryModel();
        this.queryView = this.getView(
            App.QueryView
            , {
                model: this.queryModel
                , mediaSources: this.mediaSources
            }
        );
        this.queryModel.on('execute', this.onQuery, this);
        this.showView(this.queryView);
    },
    
    query: function (keywords, solr) {
        App.debug('Route: query');
        App.debug(keywords);
        App.debug(solr);
        if (!this.userModel.get('authenticated')) {
            this.navigate('login', true);
            return;
        }
        this.queryModel = new App.QueryModel();
        this.queryView = this.getView(
            App.QueryView
            , {
                model: this.queryModel
                , mediaSources: this.mediaSources
            }
        );
        this.queryModel.on('execute', this.onQuery, this);
        this.sentences = new App.SentenceCollection({
            keywords: keywords
            , solr: solr
        });
        this.sentenceView = new App.SentenceView({
            collection: this.sentences
        });
        this.sentences.fetch();
        this.showView(this.queryView);
        this.addView(this.sentenceView);
    },
    
    defaultRoute: function (routeId) {
        App.debug('Default route');
    },
    
    onQuery: function (qm) {
        this.navigate('query/' + qm.get('keywords') + '/' + qm.solr());
        this.sentences = new App.SentenceCollection({
            keywords: qm.get('keywords')
            , solr: qm.solr()
        });
        // Create new sentence view, replace old one if necessary
        var sentenceView = new App.SentenceView({
            collection: this.sentences
        });
        this.showViews([this.queryView, sentenceView]);
        // Populate with data
        this.sentences.fetch();
    },
    
    /*
     * Given a view constructor and options, get the instance of that view
     * constructor or create one if none exists.
     */
    getView: function (type, options) {
        // Ensure the view lookup exits 
        if (!this.viewsByType) {
            this.viewsByType = {}
        }
        // Ensure the type has a unique lookup key
        if (!type.prototype.viewLookupKey) {
            type.prototype.viewLookupKey = _.uniqueId()
        }
        if (this.viewsByType[type.prototype.viewLookupKey]) {
            return this.viewsByType[type.prototype.viewLookupKey];
        }
        v = new type(options);
        this.viewsByType[v.viewLookupKey] = v;
        return v;
    },

    initViews: function () {
        this.views = [];
        this.viewMap = {};
    },
    closeView: function (view) {
    },
    showViews: function (views) {
        var that = this;
        newIds = _.pluck(views, 'cid');
        oldIds = _.pluck(this.views, 'cid');
        App.debug('New view ids:');
        App.debug(newIds);
        App.debug('Old view ids:');
        App.debug(oldIds);
        newViews = [];
        // Determine whether to keep old views
        _.each(this.views, function (oldView) {
            if (_.contains(newIds, oldView.cid)) {
                // Keep the view
                newViews.push(oldView);
            } else {
                // Remove the view
                App.debug('Cleaning up view: ' + oldView.cid);
                if (oldView.close) {
                    oldView.close();
                }
                oldView.remove();
                delete that.viewMap[oldView.cid];
            }
        });
        // Add new views that doen't already exist
        _.each(views, function (newView) {
            if (!_.contains(oldIds, newView.cid)) {
                App.debug('Attaching view: ' + newView.cid);
                newViews.push(newView);
                that.viewMap[newView.cid] = newView;
            }
        });
        // Replace active view list
        $('.content').html();
        this.views = newViews;
        _.each(this.views, function (v) {
            $('.content').append(v.el);
        })
    },
    showView: function (view) {
        App.debug('Showing view: ' + view.cid)
        this.showViews([view]);
    },
    addView: function (view) {
        App.debug('Adding view: ' + view.cid);
        if (!this.viewMap[view.cid]) {
            this.views.push(view);
            this.viewMap[view.cid] = view;
        }
        $('.content').append(view.el);
    }

})
