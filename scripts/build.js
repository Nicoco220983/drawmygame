const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");


// Parse command line arguments for srcDir, destDir, and staticDir
// Usage: node build.js [srcDir] [destDir] [staticDir]
// Defaults: srcDir='src', destDir='dist', staticDir='static'
const args = process.argv.slice(2);
const srcDirArg = args[0] ? path.resolve(args[0]) : path.resolve("src");
const destDirArg = args[1] ? path.resolve(args[1]) : path.resolve("dist");
const staticDirArg = args[2] ? path.resolve(args[2]) : null; // null means no static copy

function build() {
  // Compile/copy source files
  if (fs.existsSync(srcDirArg)) {
    compileOrCopyAll(srcDirArg, destDirArg)
  } else {
    console.log(`Source directory not found: ${srcDirArg}`)
  }
  
  // Copy static files if staticDir exists and is specified
  if (staticDirArg && fs.existsSync(staticDirArg)) {
    console.log(`Copying static files from ${staticDirArg} to ${destDirArg}...`)
    copyDirRecursive(staticDirArg, destDirArg)
  }
}


function compileOrCopyAll(srcDir, destDir) {
  ensureDirectoryExistence(destDir)
  for (const srcFile of walk(srcDir)) {
    const relPath = path.relative(srcDir, srcFile)
    const destFile = path.join(destDir, relPath)
    if (isOutdated(srcFile, destFile)) {
      ensureDirectoryExistence(path.dirname(destFile))
      if(path.extname(srcFile) == ".mjs") {
        if (compileFile(srcFile, destFile)) {
          console.log(`✅ Compiled: ${relPath}`)
        } else {
          console.error(`❌ Failed: ${relPath}`)
        }
      } else {
        fs.copyFileSync(srcFile, destFile)
        console.log(`✅ Copied: ${relPath}`)
      }
    } else {
      console.log(`⏩ Skipped (up-to-date): ${relPath}`);
    }
  }
}


function copyDirRecursive(src, dest) {
  ensureDirectoryExistence(dest)
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      if (isOutdated(srcPath, destPath)) {
        fs.copyFileSync(srcPath, destPath)
        console.log(`✅ Copied: ${path.relative(destDirArg, destPath)}`)
      }
    }
  }
}


function copyIfOutdated(srcFile, destFile) {
  if (isOutdated(srcFile, destFile)) {
    ensureDirectoryExistence(path.dirname(destFile))
    fs.copyFileSync(srcFile, destFile)
    console.log(`✅ Copied: ${srcFile}`)
  } else {
    console.log(`⏩ Skipped (up-to-date): ${srcFile}`);
  }
}


function* walk(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  for (const file of files) {
    const fullPath = path.join(dir, file.name)
    if (file.isDirectory()) {
      yield* walk(fullPath)
    } else if (file.isFile()) {
      yield fullPath
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
      "--extensions", ".mjs",
      "--config-file", path.join(PROJECT_ROOT, ".babelrc")
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


build()

// Export for programmatic use
module.exports = { build, compileOrCopyAll, copyDirRecursive, copyIfOutdated, isOutdated, ensureDirectoryExistence, walk }
