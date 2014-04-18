/**
 * backbone-resource.js
 * Classe to manage the loading of multiple resources of different types.
 *
 * Version 1.0-beta.2 2014-04-18
 * Copyright (c) 2014 MIT Center for Civic Media
 * All rights reserved.
 * License: BSD 3-clause, see resource.license for more info.
 *
 * Dependencies:
 * _ underscore.js
 * - backbone.js
 *
 * ResourceListener listens to models and/or controllers.  Issues events when
 * all resources of a certain "type" are loaded, etc.  The type of a model
 * or controller is specified by adding a resourceType variable to the class's
 * prototype.
 *
 * Events thrown by ResourceListener
 * request (model_or_collection, request, options)
 *   - A resource has been requested
 * sync (model_or_collection, request, options)
 * sync:<type> (model_or_collection, request, options)
 *   - Triggered when a single resource is loaded
 * error (model_or_collection, request, options)
 *   - The resource failed to load
 * resource:complete:<type>
 *   - Triggered when all requested resources of the given type have been loaded.
 * resource:allComplete
 *   - Triggered when all requested resources are loaded.
 */

ResourceListener = function (options) { this.initialize(options); };
_.extend(ResourceListener.prototype, Backbone.Events);
_.extend(ResourceListener.prototype, {
    initialize: function (options) {
        this.subjects = {};
        this.pending = {};
        this.errored = {};
        this.synced = {};
    },
    listen: function (model_or_collection) {
        this.subjects[this.getId(model_or_collection)] = model_or_collection;
        model_or_collection.on('request', this.onRequest, this);
        model_or_collection.on('sync', this.onSync, this);
        model_or_collection.on('error', this.onError, this);
    },
    unlisten: function (model_or_collection) {
        var type = model_or_collection.resourceType || 'resource';;
        var rid = this.getId(model_or_collection);
        var wasCopmlete = this.isComplete(type);
        model_or_collection.off('request', this.onRequest, this);
        model_or_collection.off('sync', this.onSync, this);
        model_or_collection.off('error', this.onError, this);
        delete this.subjects[rid];
        delete this.pending[type][rid];
        delete this.errored[type][rid];
        delete this.synced[type][rid];
        // This might have been the last request, check if others are complete
        if (!wasCopmlete) {
            checkComplete(type);
            checkAllComplete();
        }
    },
    onRequest: function (model_or_collection, request, options) {
        var type = model_or_collection.resourceType || 'resource';
        var rid = this.getId(model_or_collection);
        this.pending[type] = this.pending[type] || {};
        this.pending[type][rid] = model_or_collection;
        this.checkAllComplete();
        this.trigger('request', model_or_collection, request, options);
    },
    onError: function (model_or_collection, request, options) {
        var type = model_or_collection.resourceType || 'resource';;
        var rid = this.getId(model_or_collection);
        delete this.pending[type][rid];
        this.errored[type] = this.errored[type] || {}
        this.errored[type][rid] = model_or_collection;
        this.trigger('error', model_or_collection, request, options);
        this.checkAllComplete();
    },
    onSync: function (model_or_collection, request, options) {
        var type = model_or_collection.resourceType || 'resource';;
        var rid = this.getId(model_or_collection);
        delete this.pending[type][rid];
        this.synced[type] = this.synced[type] || {}
        this.synced[type][rid] = model_or_collection;
        this.trigger('sync', model_or_collection, request, options);
        this.trigger('sync:' + type, model_or_collection, request, options);
        this.checkComplete(type);
        this.checkAllComplete();
    },
    isComplete: function (type) {
        result = true;
        _.each(this.pending[type], function (rid, resource) {
            result = false;
        });
        return result;
    },
    isAllComplete: function () {
        // Default true
        var result = true;
        // But if we have any model of any type, return false
        _.each(this.pending, function (resources, type) {
            _.each(resources, function (resource, rid) {
                result = false;
            });
        });
        return result;
    },
    checkComplete: function (type) {
        if (this.isComplete(type)) {
            this.trigger('resource:complete:' + type);
        }
    },
    checkAllComplete: function () {
        if (this.isAllComplete()) {
            this.trigger('resource:allComplete');
        }
    },
    getId: function (model_or_collection) {
        if (!model_or_collection.rid) {
            model_or_collection.rid = _.uniqueId('Resource');
        }
        return model_or_collection.rid;
    }
});
