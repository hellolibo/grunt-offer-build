/*
 * grunt-mbb-build
 * https://github.com/hellolibo/grunt-mbb-build
 *
 * Copyright (c) 2013 shuangzhu
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'index.js'
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    }
  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint']);

};