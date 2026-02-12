const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const pkgSpecifier = process.argv[2];
if (!pkgSpecifier) {
  console.error('Please provide a package name.');
  console.error('Usage: npm run install_catalog <package-name>');
  console.error('Examples:');
  console.error('  npm run install_catalog @drawmygame/std');
  console.error('  npm run install_catalog some-catalog-package');
  process.exit(1);
}

const DRAWMYGAME_DIR = path.resolve(path.join(__dirname, ".."))

function main(pkgSpecifier) {

    console.log(`Installing catalog package: ${pkgSpecifier}`);

    // Determine if local specifier and compute base directory if already installed
    const isLocal = isLocalSpecifier(pkgSpecifier)
    let pkgBaseDir = null
    
    if (isLocal) {
        pkgBaseDir = path.resolve(DRAWMYGAME_DIR, pkgSpecifier)
    } else {
        // Try to resolve the package - if it throws, package is not installed
        try {
            pkgBaseDir = path.dirname(require.resolve(pkgSpecifier))
        } catch (err) {
            pkgBaseDir = null
        }
    }
    
    // Check if package is already installed
    if (pkgBaseDir && fs.existsSync(pkgBaseDir)) {
        console.log(`Package already exists at ${pkgBaseDir}, skipping npm install.`);
    } else {
        console.log(`Installing ${pkgSpecifier}...`);
        const npmInstall = spawnSync('npm', ['install', pkgSpecifier], { stdio: 'inherit' });
        if (npmInstall.status !== 0) {
            console.error(`Failed to install package ${pkgSpecifier}`);
            process.exit(1);
        }
        // Re-compute pkgBaseDir after installation
        pkgBaseDir = isLocal 
            ? path.resolve(DRAWMYGAME_DIR, pkgSpecifier)
            : path.dirname(require.resolve(pkgSpecifier))
    }
    const pkg = require(path.join(pkgBaseDir, 'package.json'));
    const catalogName = pkg.catalogname ?? pkg.name
    const catalogSource = pkg.catalogsource ?? "dist"
    
    const sourceDir = path.join(pkgBaseDir, catalogSource)
    const CORE_DIST = path.resolve('packages/core/dist');
    const CATALOGS_DIR = path.join(CORE_DIST, 'catalogs');
    const destDir = path.join(CATALOGS_DIR, catalogName)

    if (!fs.existsSync(sourceDir)) {
        console.error(`Package ${pkg.name} does not have a "${catalogSource}" directory.`)
        process.exit(1);
    }

    console.log(`Copying catalog from ${sourceDir} to ${destDir}`)
    fs.mkdirSync(CATALOGS_DIR, { recursive: true });
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
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

function isLocalSpecifier(pkgSpecifier) {
  if (typeof pkgSpecifier !== 'string') return false;

  const trimmed = pkgSpecifier.trim();

  return (
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('file:')
  );
}

main(pkgSpecifier)
