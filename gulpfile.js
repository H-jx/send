const fs = require('fs');
const { src, dest, series } = require('gulp');
const rimraf = require('rimraf');
const typescript = require('gulp-typescript');
const alias = require('gulp-ts-alias-fix');
const tsProject = typescript.createProject('tsconfig.server.json');
const package = require('./package.json');

function clearServer(next) {
  // rimraf('dist/client', next);
  rimraf('dist/server', next);
}

function compile(next) {
  const compiled = src(['./src/server/**/*.ts'])
    .pipe(alias({ configuration: tsProject.config }))
    .pipe(
      tsProject({
        noImplicitAny: true,
      }),
    );
  return compiled.js.pipe(dest('dist/server'));
}

function compileLib(next) {
  const compiled = src(['./src/lib/*.ts'])
    .pipe(alias({ configuration: tsProject.config }))
    .pipe(tsProject());
  return compiled.js.pipe(dest('dist/lib'));
}
function copy(next) {
  const copyJSON = src(['./src/*.json']).pipe(dest('dist'))
  return copyJSON;
}

/** 
 * 配合构建脚本 http://ops-rider.bilibili.co/Script/build_sh?name=ff-send&page=1&per_page=10 
 * 将package.deploy.json替换成package.json，减少打包体积
 * 前端构建后devDependencies是不需要的。前后端构建后打包体积580+MB， 
 * 删除devDependencies 和 前端的dependencies后的构建体积100+MB
 */
function simplify(next) {
  delete package.devDependencies;
  delete package.dependencies['antd-mobile'];
  delete package.dependencies['antd-mobile-icons'];
  delete package.dependencies['react'];
  delete package.dependencies['react-dom'];
  delete package.dependencies['react-router-dom'];
  delete package.dependencies['qrcode'];
  delete package.dependencies['socket.io-client'];
  delete package.dependencies['spark-md5'];
  delete package.dependencies['core-js'];
  fs.writeFileSync('./package.deploy.json', JSON.stringify(package, '', 2));
  next();
}


exports.build = series(clearServer, compile, compileLib, copy, simplify);

