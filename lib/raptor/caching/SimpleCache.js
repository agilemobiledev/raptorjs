define(
    'raptor/caching/SimpleCache',
    'raptor/caching/BaseCache',
    function(require) {
        var SimpleCache = function() {
            SimpleCache.superclass.constructor.call(this);
            this.cacheMap = {};
        };
        
        SimpleCache.prototype = {
            doPut: function(key, value) {
                this.cacheMap[key] = value;
            },
            
            doGet: function(key) {
                return this.cacheMap[key];
            }
        };
        
        return SimpleCache;
    });