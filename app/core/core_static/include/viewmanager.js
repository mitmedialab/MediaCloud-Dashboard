/**
 * ViewManager - A class to manage creation and destruction of views in single
 * page applicaitons.
 *
 * Dependencies:
 *   - jQuery
 *   - underscore.js
 *
 * The main methods are:
 *
 * initialize() - Always call before using other functions.
 *
 * getView(type, options) - The first time this is called for View constructor
 * `type`, a new object is created, passing `options` to the constructor.
 * Subsequent calls return the previously created View, unless it has been
 * closed.
 *
 * showViews(views) - Show the Views given by the `views` array.  Those that
 * were previously visible will remain visible and retain their state.  Those
 * that were not, will be created.  Previously visible Views not in `views`
 * will be closed.
 *
 * addView(view) - Add a single view to the end of the content, without closing
 * any.
 *
 */

App.ViewManager = function (options) {
    this.initialize(options);
};
App.ViewManager.prototype = {
    options: {
        selector: '.content'
    },
    initialize: function (options) {
        this.views = [];
        this.viewMap = {};
        this.options = _.clone(App.ViewManager.prototype.options);
        this.options = _.extend(this.options, options);
    },
    closeView: function (view) {
        App.debug('Cleaning up view: ' + view.cid);
        if (view.close) {
            view.close();
        }
        view.remove();
        delete this.viewsByType[view.viewLookupKey];
        delete this.viewMap[view.cid];
    },
    /*
     * Given a view constructor and options, get the instance of that view
     * constructor or create one if none exists.
     */
    getView: function (type, options, reuse) {
        App.debug('App.ViewManager.getView()');
        // Ensure the view lookup exits 
        if (!this.viewsByType) {
            this.viewsByType = {}
        }
        // Ensure the type has a unique lookup key
        if (!type.prototype.viewLookupKey) {
            type.prototype.viewLookupKey = _.uniqueId()
        }
        if (this.viewsByType[type.prototype.viewLookupKey]) {
            if (reuse) {
                v = this.viewsByType[type.prototype.viewLookupKey];
                App.debug('  returning existing view '+this._viewId(v));
                return v;
            } else {
                v = this.viewsByType[type.prototype.viewLookupKey];
                App.debug('  closing old view '+this._viewId(v));
                this.closeView(v);
            }
        }
        // Create a new view
        v = new type(options);
        App.debug('  created new view '+this._viewId(v));
        this.viewsByType[v.viewLookupKey] = v;
        return v;
    },
    showViews: function (viewsToShow) {
        App.debug('App.ViewManager.showViews() with '+viewsToShow.length);
        var views = _.reject(viewsToShow, function(v){return (typeof v==="undefined");});
        var that = this;
        newIds = _.pluck(views, 'cid');
        newIdNames = _.pluck(views, 'name');
        oldIds = _.pluck(this.views, 'cid');
        oldIdNames = _.pluck(this.views, 'name');
        App.debug('New view ids:');
        App.debug(newIds);
        App.debug(newIdNames);
        App.debug('Old view ids:');
        App.debug(oldIds);
        App.debug(oldIdNames);
        // Determine whether to close old views
        _.each(this.views, function (oldView) {
            if (!_.contains(newIds, oldView.cid)) {
                that.closeView(oldView);
            }
        });
        // Add new views that doen't already exist
        _.each(views, function (newView) {
            if (!_.contains(oldIds, newView.cid)) {
                App.debug('Attaching view: ' + that._viewId(newView) );
                that.viewMap[newView.cid] = newView;
            }
        });
        // Replace active view list
        $(this.options.selector).html();
        this.views = views;
        that = this;
        _.each(this.views, function (v) {
            $(that.options.selector).append(v.el);
        }, this);
    },
    showView: function (view) {
        App.debug('Showing view: ' + this._viewId(view) )
        this.showViews([view]);
    },
    addView: function (view) {
        App.debug('Adding view: ' + this._viewId(view) );
        if (!this.viewMap[view.cid]) {
            this.views.push(view);
            this.viewMap[view.cid] = view;
        }
        $(this.options.selector).append(view.el);
    },
    _viewId: function(view) {
        // return a human-readable name of the view for debugging purposes
        return view.cid + ' (' + view.name + ')';
    }
};
