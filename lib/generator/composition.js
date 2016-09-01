var path = require('path');
var nijs = require('nijs');

function mustPrefix(target) {
    if(path.isAbsolute(target) || target.substring(0, 2) == "./" || target.substring(0, 3) == "../")
        return false;
    else
        return true;
}

/**
 * Generates a composition expression that can be used by the Nix package manager
 * to compose and build NPM packages.
 *
 * @param {String} nodeEnvExpr Path to the node environment expression providing the build functionality
 * @param {String} nodePackage Name of the Node.js package to use from Nixpkgs
 * @param {String} packagesExpr Path to the package expression that defines how packages are built from source and their dependencies
 * @return {NixFunction} Nix function that composes the NPM packages
 */
 
function generateCompositionExpr(nodeEnvNix, nodePackage, packagesNix) {
    /* Prefix relative paths if needed */
    var nodeEnvNixPath;
    var packagesNixPath;
    
    if(mustPrefix(nodeEnvNix)) {
        nodeEnvNixPath = "./" + nodeEnvNix;
    } else {
        nodeEnvNixPath = nodeEnvNix;
    }
    
    if(mustPrefix(packagesNix)) {
        packagesNixPath = "./" + packagesNix;
    } else {
        packagesNixPath = packagesNix;
    }
    
    /* Generate composition Nix expression */
    return new nijs.NixFunction({
        argSpec: {
            pkgs: new nijs.NixFunInvocation({
                funExpr: new nijs.NixImport(new nijs.NixExpression("<nixpkgs>")),
                paramExpr: {
                    system: new nijs.NixInherit()
                }
            }),
            system: new nijs.NixAttrReference({
                attrSetExpr: new nijs.NixExpression("builtins"),
                refExpr: new nijs.NixExpression("currentSystem")
            }),
            nodejs: new nijs.NixAttrReference({
                attrSetExpr: new nijs.NixExpression("pkgs"),
                refExpr: nodePackage
            })
        },
        body: new nijs.NixLet({
            value: {
                nodeEnv: new nijs.NixFunInvocation({
                    funExpr: new nijs.NixImport(new nijs.NixFile({ value: nodeEnvNixPath })),
                    paramExpr: {
                        stdenv: new nijs.NixInherit("pkgs"),
                        python: new nijs.NixInherit("pkgs"),
                        utillinux: new nijs.NixInherit("pkgs"),
                        runCommand: new nijs.NixInherit("pkgs"),
                        writeTextFile: new nijs.NixInherit("pkgs"),
                        nodejs: new nijs.NixInherit()
                    }
                })
            },
            body: new nijs.NixFunInvocation({
                funExpr: new nijs.NixImport(new nijs.NixFile({ value: packagesNixPath })),
                paramExpr: {
                    fetchurl: new nijs.NixInherit("pkgs"),
                    fetchgit: new nijs.NixInherit("pkgs"),
                    nodeEnv: new nijs.NixInherit()
                }
            })
        })
    });
}

exports.generateCompositionExpr = generateCompositionExpr;