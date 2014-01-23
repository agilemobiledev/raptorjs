/*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 *
 * @extension Rhino
 *
 */
define.extend('raptor/templating', ['raptor'], function (raptor, require) {
    'use strict';
    var createError = raptor.createError;
    return {
        render: function (templateName, data, context) {
            if (!context) {
                throw createError(new Error('Context is required'));
            }
            var templateFunc = this.templateFunc(templateName);
            templateFunc(data || {}, context);    //Invoke the template rendering function with the required arguments
        }
    };
});