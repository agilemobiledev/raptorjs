define.Class('raptor/resources/RhinoResourceAdapter', 'raptor/resources/Resource', ['raptor'], function (raptor, require) {
    'use strict';
    var Watcher = function (javaWatcher) {
        this.javaWatcher = javaWatcher;
    };
    Watcher.prototype = {
        closeWatcher: function () {
            this.javaWatcher.closeWatcher();
        }
    };
    var RhinoResourceAdapter = function (javaResource) {
        var javaSearchPathEntry = javaResource.getSearchPathEntry();
        var RhinoSearchPathEntryAdapter = require('raptor/resources/RhinoSearchPathEntryAdapter');
        var searchPathEntry = new RhinoSearchPathEntryAdapter(javaSearchPathEntry);
        RhinoResourceAdapter.superclass.constructor.call(this, searchPathEntry, javaResource.getPath());
        this.javaResource = javaResource;
    };
    RhinoResourceAdapter.prototype = {
        isFileResource: function () {
            return this.javaResource.fileResource === true;
        },
        getURL: function () {
            return this.javaResource.getURL();
        },
        readAsString: function (encoding) {
            if (!encoding) {
                encoding = 'UTF-8';
            }
            return this.javaResource.readAsString(encoding);
        },
        getFilePath: function () {
            return this.javaResource.getFilePath();
        },
        isDirectory: function () {
            return this.javaResource.isDirectory();
        },
        isFile: function () {
            return this.javaResource.isFile();
        },
        resolve: function (relPath) {
            var resolvedJavaResource = this.javaResource.resolve(relPath);
            if (resolvedJavaResource == null) {
                return null;
            }
            return new RhinoResourceAdapter(resolvedJavaResource);
        },
        watch: function (callback, thisObj) {
            var javaWatchListener = __rhinoHelpers.getResources().createWatchListener(function () {
                    callback.call(thisObj);
                }, null);
            var javaWatcher = this.javaResource.watch(javaWatchListener);
            return new Watcher(javaWatcher);
        },
        lastModified: function () {
            return this.javaResource.lastModified();
        }
    };
    return RhinoResourceAdapter;
});