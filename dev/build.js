const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const srcDir = path.resolve("src");
const distDir = path.resolve("dist");
const modulesDir = path.resolve("node_modules");
const staticDir = path.resolve("static");

function* walk(dir, kwargs) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      yield* walk(fullPath, kwargs);
    } else if (file.isFile()) {
      if(kwargs?.extension && !file.name.endsWith(kwargs.extension)) continue
      yield fullPath;
    }
  }
}

function isOutdated(srcFile, distFile) {
  if (!fs.existsSync(distFile)) return true;
  const srcStat = fs.statSync(srcFile);
  const distStat = fs.statSync(distFile);
  return srcStat.mtime > distStat.mtime;
}

function ensureDirectoryExistence(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function compileFile(srcFile, distFile) {
  try {
    ensureDirectoryExistence(path.dirname(distFile))

    const result = spawnSync("npx", [
      "babel",
      srcFile,
      "--out-file",
      distFile,
      "--extensions", ".mjs"
    ], { shell: true, encoding: "utf-8", stdio: "pipe" }); // <-- IMPORTANT : pas 'inherit'

    if (result.error) {
      console.error(`❌ Error executing Babel for ${srcFile}:\n`, result.error.message);
      return false;
    }

    if (result.status !== 0) {
      console.error(`❌ Compilation failed for ${srcFile} (exit code ${result.status})`);
      if (result.stderr) console.error(`stderr:\n${result.stderr}`);
      if (result.stdout) console.error(`stdout:\n${result.stdout}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`❌ Exception while compiling ${srcFile}:\n`, err.stack || err.message);
    return false;
  }
}

function build() {
  compileAll()
  copyAll()
}


function compileAll() {
  ensureDirectoryExistence(distDir)
  for (const srcFile of walk(srcDir, { extension: ".mjs" })) {
    const relativePath = path.relative(srcDir, srcFile);
    const distFile = path.join(distDir, relativePath);

    if (isOutdated(srcFile, distFile)) {
      if (compileFile(srcFile, distFile)) {
        console.log(`✅ Compiled: ${relativePath}`);
      } else {
        console.error(`❌ Failed: ${relativePath}`);
      }
    } else {
      console.log(`⏩ Skipped (up-to-date): ${relativePath}`);
    }
  }
}


function copyAll() {
  copyIfOutdated(
    path.join(modulesDir, "pako/dist/pako.esm.mjs"),
    path.join(staticDir, "deps/pako.mjs"),
  )
  for (const distFile of walk(distDir)) {
    const relativePath = path.relative(distDir, distFile)
    const staticSrcFile = path.join(staticDir, "src", relativePath)
    copyIfOutdated(distFile, staticSrcFile)
  }
}

function copyIfOutdated(srcFile, destFile) {
  if (isOutdated(srcFile, destFile)) {
    ensureDirectoryExistence(path.dirname(destFile))
    fs.copyFileSync(srcFile, destFile)
  }
}

build()