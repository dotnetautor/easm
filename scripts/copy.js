/**
 * This file only purpose is to copy files before npm publish and strip churn/security sensitive metadata from package.json
 *
 * **NOTE:**
 * 👉 This file should not use any 3rd party dependency
 */
const { writeFileSync, copyFileSync, statSync, readFileSync, openSync, writeSync, close } = require('fs')
const { resolve, basename } = require('path')
const projectRoot = process.cwd();
const packageJson = require(resolve(projectRoot,'package.json'))

main()

function main() {
  const distPath = resolve(projectRoot, 'dist');
  const distPackageJson = createDistPackageJson(packageJson);

  const cpFiles = ['../../README.md', '../../LICENSE', '../../.npmignore'].map(
    (file) => resolve(projectRoot, file)
  );

  cp(cpFiles, distPath);

  if (packageJson.main) {
    prependCopyRight(resolve(projectRoot, packageJson.main));
  }
  if (packageJson.module) {
    prependCopyRight(resolve(projectRoot, packageJson.module));
  }
  if (packageJson.es2015) {
    prependCopyRight(resolve(projectRoot, packageJson.es2015));
  }

  writeFileSync(resolve(distPath, 'package.json'), distPackageJson)
}

/**
 *
 * @param {string[]|string} source
 * @param {string} target
 */
function cp(source, target) {
  const isDir = statSync(target).isDirectory()

  if (isDir) {
    if (!Array.isArray(source)) {
      throw new Error(
        'if <target> is directory you need to provide source as an array'
      )
    }

    source.forEach((file) =>
      copyFileSync(file, resolve(target, basename(file)))
    )

    return
  }

  copyFileSync(/** @type {string} */(source), target)
}

/**
 * @param {typeof packageJson} packageConfig
 * @return {string}
 */
function createDistPackageJson(packageConfig) {
  const {
    devDependencies,
    scripts,
    engines,
    config,
    husky,
    'lint-staged': lintStaged,
    ...distPackageJson
  } = packageConfig;

  // move all path properties from ./dist/ to ./
  const finalDistPackageJson = Object.keys(distPackageJson).reduce((acc, cur) => {
    const val = distPackageJson[cur];
    acc[cur] = (typeof val === "string") ? val.replace(/^\.\/dist\//, "./") : val;
    return acc;
  }, {});

  return JSON.stringify(finalDistPackageJson, null, 2)
}

function prependCopyRight(filePath) {
  const data = readFileSync(filePath);
  const fd = openSync(filePath, 'w+')
  const insert = readFileSync(resolve(projectRoot,'../../BANNER'));
  writeSync(fd, insert, 0, insert.length, 0)
  writeSync(fd, data, 0, data.length, insert.length)
  close(fd, (err) => {
    if (err) throw err;
  });
}