'use strict'

gulp = require('gulp')
del = require('del')
util = require('gulp-util')
es = require('event-stream')
path = require('path')
browserify = require('browserify')
uglify = require('gulp-uglify')
browserifyGlobalShim = require('browserify-global-shim')
buffer = require('vinyl-buffer')
source = require('vinyl-source-stream')
licensify = require('licensify')
webserver = require('gulp-webserver')
aliasify = require('aliasify')
gzip =  require('gulp-gzip')

destinations =
  bundle_js: './examples/js'

gulp.task 'js:app', ->
  unless util.env.mode in ['release', 'debug']
    throw new Error "--mode must be specified. Either " +
                    "'debug' or 'release' can be specified."

  bundle = browserify()
    .require([
      'patroljs'
      'threejs-geometry-hittest'
      'three'
      'hyper3d'
    ])
    .transform(aliasify,
      aliases:
        'progress': './src/progressbar-stub'
      verbose: true
      global: true
    )
    .plugin(licensify)
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(buffer())

  switch util.env.mode
    when 'release'
      bundle
        .pipe(uglify(
          preserveComments: 'license'
        ))
        .pipe(gulp.dest(destinations.bundle_js))
    when 'debug'
      bundle
        .pipe(gulp.dest(destinations.bundle_js))

gulp.task 'js-gzip:app', ['js:app'], ->
  gulp.src("#{destinations.bundle_js}/bundle.js")
    .pipe(gzip())
    .pipe(gulp.dest(destinations.bundle_js))

gulp.task 'build', [
  'js-gzip:app'
]

gulp.task 'clean', ->
  del [
    "#{bundle_js}/bundle.js",
    "#{bundle_js}/bundle.js.gz"
  ], (err, deletedFiles) ->
    if deletedFiles.length
      util.log 'Deleted', util.colors.red(deletedFiles.join(' ,'))
    else
      util.log util.colors.yellow('empty - nothing to delete')
    return
  return

gulp.task 'server', ['build'], ->
  gulp.src('./')
    .pipe(webserver(
      fallback: 'index.html',
      directoryListing: true,
      host: '0.0.0.0'
    ))

gulp.task 'default', [
  'build', 'server'
]
