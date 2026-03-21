import gulp from "gulp";
import * as akSass from "sass";
import gulpSass from "gulp-sass";
import autoprefixer from "gulp-autoprefixer";
import sourcemaps from "gulp-sourcemaps";
import uglify from "gulp-uglify";
import browserSync from "browser-sync";
import webp from "gulp-webp";
import svgmin from "gulp-svgmin";
import plumber from "gulp-plumber";
import del from "del";

const sass = gulpSass(akSass);
const bs = browserSync.create();

// distフォルダのクリーンアップ
export function clean() {
  return del(["dist"]);
}

// SCSS
export function styles() {
  return gulp.src("src/scss/style.scss")
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: "compressed" }).on("error", sass.logError))
    .pipe(autoprefixer())
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("dist/assets/css"));
}

// HTML
export function html() {
  return gulp.src("src/**/*.html").pipe(gulp.dest("dist"));
}

// JS
export function scripts() {
  return gulp.src("src/js/**/*.js")
    .pipe(plumber())
    .pipe(uglify())
    .pipe(gulp.dest("dist/assets/js"));
}

// WebP
export function images() {
  return gulp.src("src/images/**/*.{png,jpg,jpeg}", { encoding: false })
    .pipe(plumber())
    .pipe(webp())
    .pipe(gulp.dest("dist/assets/images"));
}

// SVG
export function svg() {
  return gulp.src("src/images/**/*.svg", { encoding: false })
    .pipe(svgmin())
    .pipe(gulp.dest("dist/assets/images"));
}

// サーバー起動
export function serve() {
  bs.init({
    server: {
      baseDir: "dist",
    },
    // ブラウザ起動時に自動で日本語版を表示させる設定
    startPath: "/ja/index.html" 
  });
}

// リロード
export function reload(done) {
  bs.reload();
  done();
}

// 監視
export function watchFiles() {
  gulp.watch("src/scss/**/*.scss", gulp.series(styles, reload));
  gulp.watch("src/js/**/*.js", gulp.series(scripts, reload));
  gulp.watch("src/**/*.html", gulp.series(html, reload));
  gulp.watch("src/images/**/*.{png,jpg,jpeg,svg}", gulp.series(gulp.parallel(images, svg), reload));
}

// デフォルトタスク
const mainTasks = gulp.parallel(styles, scripts, html, images, svg);
export default gulp.series(clean, mainTasks, gulp.parallel(serve, watchFiles));
