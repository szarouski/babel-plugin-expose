'use strict';

module.exports = function (babel) {
    var t = babel.types;
    var globalNamespace = {};

    /**
     * @param {{context: Object, declaration: Object}} params
     * @constructor
     */
    function ExportManager(params) {
        this.declaration = params.declaration;
        this.filename = ExportManager.getFilenameFromContext(params.context);
    }

    /**
     * @param {{exportName: String, [declaration]: Object}} params
     * @returns {Object}
     */
    ExportManager.prototype.getExport = function (params) {
        var exportName = params.exportName;
        this.checkThatNotInGlobalNamespace(exportName);
        var declaration = params.declaration || this.declaration;
        //noinspection JSUnresolvedFunction
        return t.expressionStatement(t.assignmentExpression('=', t.identifier('this.' + exportName), declaration));
    };
    /**
     * @returns {String}
     */
    ExportManager.prototype.getExportName = function getExportName() {
        var declaration = this.declaration;
        var name = declaration.name || declaration.id.name;
        if (!name) {
            throw new Error('can\'t get name for ' + this.filename + ':' + declaration.loc.start.line);
        }
        if (declaration.type === 'Literal') {
            throw new Error(
                'We need help to determine how to expose this Literal in global namespace - ' +
                this.filename + ':' + this.declaration.loc.start.line +
                '\nPlease assign it to a variable and it will be accessible through this variable in global namespace.'
            );
        }
        return name;
    };
    ExportManager.prototype.checkThatNotInGlobalNamespace = function checkThatNotInGlobalNamespace(name) {
        var line = -1;
        var declaration = this.declaration;
        if (declaration.loc) {
            line = declaration.loc.start.line;
        }

        if (name in globalNamespace) {
            throw new Error (name + ' is already defined, please change name for ' + this.filename + ':' + line);
        }
        globalNamespace[name] = true;
    };
    ExportManager.getFilenameFromContext = function getFilenameFromContext(context) {
        return context.state.opts.filename;
    };

    //noinspection UnnecessaryLocalVariableJS,JSUnusedGlobalSymbols
    var exposeTransformer = new babel.Transformer('expose', {
        Program: function (node) {
            var contents = node.body;
            var hasImportOrExport = false;
            node.body.forEach(function (subNode) {
                hasImportOrExport = hasImportOrExport || /(Import|Export).*Declaration/.test(subNode.type);
            });
            if (hasImportOrExport) {
                //noinspection JSUnresolvedFunction
                node.body = [
                    t.expressionStatement(
                        t.callExpression(
                            t.memberExpression(
                                t.functionExpression(null, [], t.blockStatement(contents)),
                                t.identifier('call'),
                                false
                            ),
                            [t.identifier('this')]
                        )
                    )
                ];
            }
            return node;
        },

        ImportDeclaration: function () {
            return [];
        },
        ExportAllDeclaration: function () {
            throw new Error('export all declaration is not currently supported. PR is welcome.');
        },
        ExportDefaultDeclaration: function (node) {
            var exportManager = new ExportManager({
                context: this,
                declaration: node.declaration
            });
            var exportName = exportManager.getExportName();
            return [exportManager.getExport({exportName: exportName})];
        },

        /**
         * Replaces named export declarations with assignments to global variables.
         * @param {ExportNamedDeclaration} node
         */
        ExportNamedDeclaration: function (node) {
            var replacements = [];
            //noinspection JSUnresolvedVariable
            var declaration = node.declaration;
            var context = this;

            function addNamedDeclarationExportReplacement(declaration) {
                var exportManager = new ExportManager({
                    context: context,
                    declaration: declaration
                });
                var exportName = exportManager.getExportName();
                replacements.push(exportManager.getExport({
                    exportName: exportName, declaration: t.identifier(exportName)
                }));
            }

            if (declaration) {
                replacements.push(declaration);
                //noinspection JSUnresolvedFunction
                if (t.isVariableDeclaration(declaration)) {
                    declaration.declarations.forEach(function (node) {
                        addNamedDeclarationExportReplacement(node);
                    });
                } else {
                    addNamedDeclarationExportReplacement(declaration);
                }
            }

            return replacements;
        }
    });

    return exposeTransformer;
};