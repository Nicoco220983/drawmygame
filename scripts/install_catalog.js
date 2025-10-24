const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const packageName = process.argv[2];
if (!packageName) {
  console.error('Please provide a package name.');
  process.exit(1);
}

function main(packageName) {

    console.log(`Installing catalog package: ${packageName}`);

    const npmInstall = spawnSync('npm', ['install', packageName], { stdio: 'inherit' });

    if (npmInstall.status !== 0) {
        console.error(`Failed to install package ${packageName}`);
        process.exit(1);
    }

    const basePackageName = getBasePackageName(packageName)
    const sourceDir = path.join('node_modules', basePackageName, 'static')
    const catalogName = getPackageProp(basePackageName, "catalogname") ?? basePackageName
    const destDir = path.join('static/catalogs', catalogName)

    if (!fs.existsSync(sourceDir)) {
        console.error(`Package ${packageName} does not have a static/ directory.`)
        // Clean up installed package? Maybe not, user can do it manually.
        process.exit(1);
    }

    console.log(`Copying from ${sourceDir} to ${destDir}`)
    copyDirRecursive(sourceDir, destDir)

    console.log('Catalog installed successfully')
}


function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getBasePackageName(specifier) {
  if (!specifier) return null;
  // Remove known prefixes
  let s = specifier.replace(/^(file:|git\+|github:|npm:)/, "");
  // Handle relative or absolute paths
  if (s.startsWith(".") || s.startsWith("/")) {
    return path.basename(s);
  }
  // Handle GitHub shorthand (github:user/repo)
  const githubMatch = s.match(/^[^:]+:[^/]+\/([^#]+)/);
  if (githubMatch) {
    return githubMatch[1];
  }
  // Handle scoped and unscoped packages
  const match = s.match(/^(@[^/]+\/[^@/]+)|^[^@/]+/);
  return match ? match[0] : null;
}

function getPackageProp(pkgName, prop) {
  try {
    const pkgJsonPath = require.resolve(`${pkgName}/package.json`);
    const pkg = require(pkgJsonPath);
    return prop ? pkg[prop] : pkg;
  } catch (err) {
    console.error(`Cannot read ${prop || "package.json"} from ${pkgName}:`, err.message);
    return null;
  }
}

main(packageName)