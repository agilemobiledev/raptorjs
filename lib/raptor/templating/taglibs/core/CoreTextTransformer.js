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

define.Class(
    "raptor/templating/taglibs/core/CoreTextTransformer",
    ['raptor'],
    function(raptor, require) {
        'use strict';
        
        var ExpressionParser = require('raptor/templating/compiler/ExpressionParser'),
            TextNode = require('raptor/templating/compiler/TextNode'),
            WriteNode = require('raptor/templating/taglibs/core/WriteNode'),
            ScriptletNode = require('raptor/templating/taglibs/core/ScriptletNode');
        
        return {
            
            process: function(node, compiler) {
                
                if (node.parentNode && node.parentNode.parseBodyText === false) {
                    return; //Don't try to parse expressions
                }
                
                var parts = [];
                ExpressionParser.parse(
                    node.text, 
                    {
                        text: function(text, escapeXml) {
                            parts.push({text: text, escapeXml: escapeXml});
                        },
                        
                        expression: function(expression, escapeXml) {
                            parts.push({expression: expression, escapeXml: escapeXml});
                        },
                        
                        scriptlet: function(scriptlet) {
                            parts.push({scriptlet: scriptlet});
                        },
                        error: function(message) {
                            node.addError(message);
                        }
                    }, 
                    this);

                if (parts.length > 0) {
                    var startIndex = 0;
                    
                    if (parts[0].text) {
                        node.setText(parts[0].text); //Update this text node to match first text part and we'll add the remaining
                        node.setEscapeXml(parts[0].escapeXml !== false);
                        startIndex = 1;
                    }
                    else {
                        node.text = ''; //The first part is an expression so we'll just zero out this text node
                        startIndex = 0;
                    }

                    
                    var newNodes = [];
                    
                    for (var i=startIndex, part, newNode; i<parts.length; i++) {
                        part = parts[i];
                        newNode = null;
                        
                        
                        if (part.hasOwnProperty('text')) {
                            newNode = new TextNode(part.text, part.escapeXml !== false);
                            newNode.setTransformerApplied(this); //We shouldn't reprocess the new text node
                        }
                        else if (part.hasOwnProperty('expression')) {
                            newNode = new WriteNode({expression: part.expression, escapeXml: part.escapeXml !== false});
                        }
                        else if (part.hasOwnProperty('scriptlet')) {
                            newNode = new ScriptletNode(part.scriptlet);
                        }
                        
                        if (newNode) {
                            newNode.setPosition(node.getPosition());
                            newNodes.push(newNode);
                        }
                    }
                    if (newNodes.length) {
                        node.parentNode.insertAfter(newNodes, node);    
                    }
                    
                    
                }
            }
        };
    });