var gulp = require('gulp'),
    browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    notify = require('gulp-notify'),
    del = require('del'),
    tsify = require("tsify");

gulp.task('lint', function() {
     return gulp.src('gallerygrid.js')
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('default'));
});

gulp.task('dist', function() {
    var b = browserify('gallerygrid.ts', { standalone: 'GalleryGrid' })
        .exclude('jquery').plugin(tsify);

    return b.bundle()
        .pipe(source('gallerygrid.js'))
        .pipe(buffer())
        .pipe(gulp.dest('dist'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest('dist'))
        .pipe(notify({ message: 'dist compiled!' }));
});

gulp.task('clean', function() {
  return del(['dist']);
});

gulp.task('default', ['lint', 'dist']);
