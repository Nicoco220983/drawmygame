const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const modulesDir = path.resolve("node_modules");
const staticDir = path.resolve("static");


function build() {
  compileOrCopyAll(path.resolve("src"), path.resolve("static"))
  copyIfOutdated(
    path.join(modulesDir, "pako/dist/pako.esm.mjs"),
    path.join(staticDir, "deps/pako.mjs"),
  )
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


// function copyAll() {
//   copyIfOutdated(
//     path.join(modulesDir, "pako/dist/pako.esm.mjs"),
//     path.join(staticDir, "deps/pako.mjs"),
//   )
//   for (const distFile of walk(distDir)) {
//     const relativePath = path.relative(distDir, distFile)
//     const staticSrcFile = path.join(staticDir, "src", relativePath)
//     copyIfOutdated(distFile, staticSrcFile)
//   }
// }

build()