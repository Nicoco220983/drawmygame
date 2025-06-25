const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const srcDir = path.resolve("src");
const distDir = path.resolve("dist");

function* walk(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      yield* walk(fullPath);
    } else if (file.isFile() && file.name.endsWith(".mjs")) {
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

function ensureDirectoryExistence(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function compileFile(srcFile, distFile) {
  try {
    ensureDirectoryExistence(distFile);

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
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

  for (const srcFile of walk(srcDir)) {
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

build()