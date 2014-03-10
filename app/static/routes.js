App.Router = Backbone.Router.extend({
    routes: {
        '': 'home'
        , '/': 'home'
        , 'login': 'login'
        , 'query/:keywords/:solr': 'query'
    },
    
    initialize: function (options) {
        var that = this;
        this.vm = App.ViewManager;
        this.vm.initialize();
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
        this.vm.showView(this.loginView);
    },
    
    home: function () {
        App.debug('Route: home');
        if (!this.userModel.get('authenticated')) {
            this.navigate('login', true);
            return;
        }
        this.queryModel = new App.QueryModel();
        this.queryView = this.vm.getView(
            App.QueryView
            , {
                model: this.queryModel
                , mediaSources: this.mediaSources
            }
        );
        this.queryModel.on('execute', this.onQuery, this);
        this.vm.showView(this.queryView);
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
        this.queryView = this.vm.getView(
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
        this.vm.showViews([this.queryView, this.sentenceView]);
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
        this.vm.showViews([this.queryView, sentenceView]);
        // Populate with data
        this.sentences.fetch();
    },
    
})

