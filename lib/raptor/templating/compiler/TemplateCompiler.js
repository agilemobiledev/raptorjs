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
define.Class('raptor/templating/compiler/TemplateCompiler', ['raptor'], function (raptor, require, exports, module) {
    'use strict';
    var TemplateBuilder = require('raptor/templating/compiler/TemplateBuilder'), ParseTreeBuilder = require('raptor/templating/compiler/ParseTreeBuilder'), Expression = require('raptor/templating/compiler/Expression'), minifier = require.exists('raptor/js-minifier') ? require('raptor/js-minifier') : null, TypeConverter = require('raptor/templating/compiler/TypeConverter'), logger = module.logger();
    /**
     * @param taglibs {raptor/templating/compiler/TaglibCollection} The collection of taglibs that are available to the compiler
     * @param options {object} The options for the compiler.
     */
    var TemplateCompiler = function (taglibs, options) {
        this.taglibs = taglibs;
        this.options = options || {};
        this.workDir = this.options.workDir || require('raptor/templating/compiler').workDir || require('raptor/temp').workDir;
        this.errors = [];
    };
    TemplateCompiler.prototype = {
        transformTree: function (rootNode, templateBuilder) {
            if (!templateBuilder) {
                throw raptor.createError(new Error('The templateBuilder argument is required'));
            }
            var transformTreeHelper = function (node) {
                try {
                    this.taglibs.forEachNodeTransformer(node, function (transformer) {
                        if (!node.isTransformerApplied(transformer)) {
                            //Check to make sure a transformer of a certain type is only applied once to a node
                            node.setTransformerApplied(transformer);
                            //Mark the node as have been transformed by the current transformer
                            this._transformerApplied = true;
                            //Set the flag to indicate that a node was transformed
                            node.compiler = this;
                            transformer.getInstance().process(node, this, templateBuilder);    //Have the transformer process the node (NOTE: Just because a node is being processed by the transformer doesn't mean that it has to modify the parse tree)
                        }
                    }, this);
                } catch (e) {
                    throw raptor.createError(new Error('Unable to compile template at path "' + templateBuilder.filePath + '. Error: ' + e.message), e);
                }
                /*
                 * Now process the child nodes by looping over the child nodes
                 * and transforming the subtree recursively 
                 * 
                 * NOTE: The length of the childNodes array might change as the tree is being performed.
                 *       The checks to prevent transformers from being applied multiple times makes
                 *       sure that this is not a problem.
                 */
                node.forEachChild(function (childNode) {
                    if (!childNode.parentNode) {
                        return;    //The child node might have been removed from the tree
                    }
                    transformTreeHelper.call(this, childNode);
                }, this);
            };
            /*
             * The tree is continuously transformed until we go through an entire pass where 
             * there were no new nodes that needed to be transformed. This loop makes sure that
             * nodes added by transformers are also transformed.
             */
            do {
                this._transformerApplied = false;
                //Reset the flag to indicate that no transforms were yet applied to any of the nodes for this pass
                transformTreeHelper.call(this, rootNode);    //Run the transforms on the tree                 
            } while (this._transformerApplied);
        },
        compile: function (xmlSrc, resource, callback, thisObj) {
            var _this = this, rootNode, templateBuilder, handleErrors = function () {
                    var message = 'Errors in template:\n', errors = _this.getErrors();
                    for (var i = 0, len = errors.length; i < len; i++) {
                        message += i + 1 + ') ' + (errors[i].pos ? '[' + errors[i].pos + '] ' : '') + errors[i].message + '\n';
                    }
                    var error = new Error(message);
                    error.errors = _this.getErrors();
                    throw error;
                };
            var filePath;
            if (require('raptor/resources').isResource(resource)) {
                filePath = resource.getURL();
            } else if (typeof resource === 'string') {
                filePath = resource;
            }
            try {
                /*
                 * First build the parse tree for the tempate
                 */
                rootNode = ParseTreeBuilder.parse(xmlSrc, filePath, this.taglibs);
                //Build a parse tree from the input XML
                templateBuilder = new TemplateBuilder(this, resource, rootNode);
                //The templateBuilder object is need to manage the compiled JavaScript output              
                this.transformTree(rootNode, templateBuilder);
            } catch (e) {
                throw raptor.createError(new Error('An error occurred while trying to compile template at path "' + filePath + '". Exception: ' + e), e);
            }
            try {
                /*
                 * The tree has been transformed and we can now generate
                 */
                rootNode.generateCode(templateBuilder);    //Generate the code and have all output be managed by the TemplateBuilder
            } catch (e) {
                throw raptor.createError(new Error('An error occurred while trying to compile template at path "' + filePath + '". Exception: ' + e), e);
            }
            if (this.hasErrors()) {
                handleErrors();
            }
            var output = templateBuilder.getOutput();
            //Get the compiled output from the template builder
            //console.error('COMPILED TEMPLATE (' + filePath + ')\n', '\n' + output, '\n------------------');
            if (minifier && this.options.minify === true) {
                output = minifier.minify(output);
            }
            if (callback) {
                callback.call(thisObj, {
                    source: output,
                    templateName: templateBuilder.getTemplateName()
                });
            }
            var options = this.options;
            if (options && options.nameCallback) {
                options.nameCallback(templateBuilder.getTemplateName());
            }
            return output;
        },
        compileAndLoad: function (xmlSrc, resource) {
            var compiledSrc = this.compile(xmlSrc, resource, function (result) {
                    //Get the compiled output for the template
                    require('raptor/templating').unload(result.templateName);    //Unload any existing template with the same name
                });
            try {
                //console.log('compileAndLoad: ' + (resource ? resource.getURL() : '(no resource') + ': ' + compiledSrc);
                this._eval(compiledSrc, resource);    //Evaluate the compiled code and register the template
            } catch (e) {
                var filePath;
                if (typeof resource === 'string') {
                    filePath = resource;
                } else if (require('raptor/resources').isResource(resource)) {
                    filePath = resource.getURL();
                }
                logger.error('Unable to load compiled template: ' + compiledSrc, e);
                throw raptor.createError(new Error('Unable to load template at path "' + filePath + '". Exception: ' + e.message), e);
            }
        },
        _eval: function (compiledSrc, resource) {
            eval(compiledSrc);
        },
        isExpression: function (expression) {
            return expression instanceof Expression;
        },
        createTagHandlerNode: function (uri, localName) {
            var TagHandlerNode = require('raptor/templating/taglibs/core/TagHandlerNode');
            var tag = this.taglibs.getTag(uri, localName);
            var tagHandlerNode = new TagHandlerNode(tag);
            return tagHandlerNode;
        },
        convertType: function (value, type, allowExpressions) {
            return TypeConverter.convert(value, type, allowExpressions);
        },
        addError: function (message, pos) {
            this.errors.push({
                message: message,
                pos: pos
            });
        },
        hasErrors: function () {
            return this.errors.length !== 0;
        },
        getErrors: function () {
            return this.errors;
        },
        getNodeClass: function (uri, localName) {
            var tag = this.taglibs.getTag(uri, localName);
            if (tag && tag.nodeClass) {
                return require(tag.nodeClass);
            }
            throw raptor.createError(new Error('Node class not found for uri "' + uri + '" and localName "' + localName + '"'));
        },
        createTag: function () {
            var Taglib = require('raptor/templating/compiler/Taglib');
            return new Taglib.Tag();
        }
    };
    return TemplateCompiler;
});