/*
 * grunt-offer-build
 * https://github.com/hellolibo/grunt-offer-build
 *
 * Copyright (c) 2013 shuangzhu
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path');
var crypto = require('crypto');

function initConfig(grunt) {

    var pkg = grunt.file.readJSON('package.json');

    var config = distConfig(grunt, pkg);

    var replaceTask = grunt.util._.map(grunt.util._.keys(config.replace), function (task) {
        return "replace:" + task;
    });

    grunt.util._.merge(config, grunt.config.data);
    grunt.config.data = config;
    grunt.config.data.pkg = pkg;

    grunt.registerTask('replace-css', replaceTask);

    grunt.registerTask('newline', function () {
        grunt.file.recurse('dist', function (f) {
            var extname = path.extname(f);
            if (extname === '.js' || extname === '.css') {
                var text = grunt.file.read(f);
                if (!/\n$/.test(text)) {
                    grunt.file.write(f, text + '\n');
                }
            }
        });
    });


}


function initCSSPicReplace(grunt, pkg) {
    var replace = {};
    grunt.file.recurse('src', function (abspath, rootdir, subdir, filename) {
        var extname = path.extname(abspath);
        if (extname === '.css') {
            var text = grunt.file.read(abspath);
            var matchs = text.match(/url\(['"]?[^)'"]+['"]?\)/ig);
            if (matchs) {
                var r = replace[abspath] = {
                    src: [".build/" + abspath, ".build/" + abspath.replace(".css", "-debug.css")],
                    overwrite: true,
                    replacements: []
                };
                var replacements = r.replacements;
                matchs.forEach(function (url) {
                    if (!/^url\(['"]?(http|https|data):/i.test(url)) {
                        var picMD5 = crypto.createHash('md5').update(text).digest('hex').substr(-6);
                        replacements.push({
                            from: url,
                            to: url.replace(/^url\(['"]?([^)'"]+)['"]?\)$/, function ($0, $1) {
                                return 'url("http://cca.mbaobao.com/static/mod/<%=pkg.family%>/<%=pkg.name%>/<%=pkg.version%>/' + path.join(subdir ? subdir : '', $1).replace("\\", "/") + '?'+ picMD5 +'")';
                            })
                        });
                    }
                });

            }
        }
    });

    return replace;
}

function distConfig(grunt, pkg) {

    if (!pkg.spm) {
        process.emit('log.warn', 'missing `spm` in package.json');
        process.emit('log.info', 'read the docs at http://docs.spmjs.org/en/package');
        pkg.spm = {};
    }

    var transport = require('grunt-cmd-transport');
    var style = transport.style.init(grunt);
    var text = transport.text.init(grunt);
    var script = transport.script.init(grunt);
    var template = transport.template.init(grunt);

    var output = pkg.spm.output || {};
    var alias = pkg.spm.alias || [];

    var jsconcats = {};
    var jsmins = [];
    var cssmins = [];
    var copies = [];

    var replaceCSSPic = initCSSPicReplace(grunt, pkg);

    if (Array.isArray(output)) {
        var ret = {};
        output.forEach(function (name) {
            ret[name] = [name];
        });
        output = ret;
    }

    Object.keys(output).forEach(function (name) {
        if (name.indexOf("*") === -1) {

            if (/\.css$/.test(name)) {
                cssmins.push({
                    dest: 'dist/' + name,
                    src: output[name].map(function (key) {
                        return '.build/dist/' + key;
                    })
                })

                name = name.replace(/\.css$/, '-debug.css');
                copies.push({
                    cwd: '.build/dist',
                    src: name,
                    expand: true,
                    dest: 'dist'
                });

            } else if (/\.js$/.test(name)) {
                jsconcats['.build/dist/' + name] = output[name].map(function (key) {
                    return '.build/src/' + key;
                });

                jsmins.push({
                    src: ['.build/dist/' + name],
                    dest: 'dist/' + name
                });

                jsconcats['dist/' + name.replace(/\.js$/, '-debug.js')] = output[name].map(function (key) {
                    return '.build/src/' + key.replace(/\.js$/, '-debug.js');
                });
            } else {
                copies.push({
                    cwd: '.build/src',
                    src: name,
                    expand: true,
                    dest: 'dist'
                });
            }

        } else {
            copies.push({
                cwd: '.build/src',
                src: name,
                filter: function (src) {
                    if (/-debug\.(js|css)$/.test(src)) {
                        return true;
                    };
                    if (/\.(js|css)$/.test(src)) {
                        return false;
                    }
                    return true;
                },
                expand: true,
                dest: 'dist'
            });

            jsmins.push({
                cwd: '.build/src',
                src: name,
                filter: function (src) {
                    if (/-debug.js$/.test(src)) {
                        return false;
                    };
                    if (/\.js$/.test(src)) {
                        return true;
                    }
                    return false;
                },
                expand: true,
                dest: 'dist'
            });

            cssmins.push({
                cwd: '.build/src',
                src: name,
                filter: function (src) {
                    if (/-debug.css$/.test(src)) {
                        return false;
                    };
                    if (/\.css$/.test(src)) {
                        return true;
                    }
                    return false;
                },
                expand: true,
                dest: 'dist'
            });
        }
    });

    return {
        concat: {
            options: {
                paths: ["."],
                include: "relative",
                banner: '/*! <%= pkg.name %> <%= pkg.version %> pub <%= grunt.template.today("yyyy-mm-dd HH:MM")%> by <%= pkg.author.name %> */\n'
            },
            css: {
                files: [{
                    cwd: '.build/src/',
                    src: '**/*.css',
                    expand: true,
                    dest: '.build/dist'
                }]
            },
            spm: {
                files: jsconcats
            }
        },
        cssmin: {
            options: {
                banner: '/*! <%= pkg.name %> <%= pkg.version %> pub <%= grunt.template.today("yyyy-mm-dd HH:MM")%> by <%= pkg.author.name %> */\n',
                keepSpecialComments: 0
            },
            mbb: {
                files: cssmins
            }
        },
        uglify: {
            js: {
                options: {
                    banner: '/*! <%= pkg.name %> <%= pkg.version %> pub <%= grunt.template.today("yyyy-mm-dd HH:MM")%> by <%= pkg.author.name %> */\n',
                    beautify: {
                        ascii_only: true
                    }
                },
                files: jsmins
            }
        },
        replace: replaceCSSPic,
        copy: {
            spm: {
                files: copies
            }
        },
        clean: {
            spm: ['.build'],
            dist: ['dist']
        },
        transport: {
            options: {
                paths: ["."],
                alias: '<%= pkg.spm.alias %>',
                idleading: "<%=pkg.family%>/<%=pkg.name%>/<%=pkg.version%>/",
                debug: true,
                handlebars: {
                    id: 'handlebars'
                }
            },
            js: {
                files: [{
                    cwd: 'src',
                    src: '**/*',
                    filter: 'isFile',
                    dest: '.build/src'
                }]
            },
            css: {
                options: {
                    parsers: {
                        '.js': [script.jsParser],
                        '.css': [style.css2jsParser],
                        '.html': [text.html2jsParser],
                        '.handlebars': [template.handlebarsParser]
                    }
                },
                files: [{
                    cwd: '.build/dist',
                    src: '**/*.css',
                    filter: 'isFile',
                    dest: '.build/src'
                }]
            },
            hbs: {
                options: {
                    debug: false
                },
                files: [{
                    cwd: 'src',
                    src: '**/*.handlebars',
                    filter: 'isFile',
                    dest: 'src/'
                }]
            }
        }
    };
}

exports.init = function (grunt) {

    initConfig(grunt);

    grunt.registerTask("offer-build", [
        "clean:dist", // delete dist direcotry

        "transport:js", // src/* -> .build/src/* 
        "replace-css", // relative path  -> absolute path
        "concat:css", //.build/src/*.css -> .build/dist/*.css

        "transport:css", // .build/dist/*.css -> .build/src/*.css 
        "concat:spm", // .build/src/* -> .build/dist/*

        "copy:spm", // src/**/* (no spm) -> .build/dist/**/*

        "cssmin:mbb", // dist/*-debug.css -> dist/*.css

        "uglify:js", // dist/*-debug.js -. dist/*.js

        "clean:spm", // rm .build
        'newline'
    ]);

    grunt.registerTask("hbs", ["transport:hbs"]);

};