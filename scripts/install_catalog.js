const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const pkgSpecifier = process.argv[2];
if (!pkgSpecifier) {
  console.error('Please provide a package name.');
  process.exit(1);
}

function main(pkgSpecifier) {

    console.log(`Installing catalog package: ${pkgSpecifier}`);

    const npmInstall = spawnSync('npm', ['install', pkgSpecifier], { stdio: 'inherit' });

    if (npmInstall.status !== 0) {
        console.error(`Failed to install package ${pkgSpecifier}`);
        process.exit(1);
    }

    const pkgName = getPackageName(pkgSpecifier)
    console.log("Package name:", pkgName)
    const sourceDir = path.join('node_modules', pkgName, 'static')
    const catalogName = getPackageProp(pkgName, "catalogname") ?? pkgName
    const destDir = path.join('static/catalogs', catalogName)

    if (!fs.existsSync(sourceDir)) {
        console.error(`Package ${pkgName} does not have a static/ directory.`)
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

function getPackageName(specifier) {
  if (!specifier) return null;

  // Remove npm alias prefix
  let s = specifier.replace(/^npm:/, "");

  // Handle git URLs (HTTPS, SSH, GitHub)
  const gitUrlMatch = s.match(
    /^(?:git\+)?https?:\/\/[^/]+\/([^/]+)\/([^/#]+)(?:[#/]?.*)?$/
  );
  if (gitUrlMatch) {
    return gitUrlMatch[2].replace(/\.git$/, ""); // extract repo name
  }

  // Handle GitHub shorthand: github:user/repo[#ref]
  const githubMatch = s.match(/^github:[^/]+\/([^#]+)/);
  if (githubMatch) {
    return githubMatch[1].replace(/\.git$/, "");
  }

  // Handle file:, relative, or absolute paths
  if (s.startsWith("file:") || s.startsWith(".") || s.startsWith("/")) {
    return path.basename(s.replace(/^file:/, ""));
  }

  // Handle scoped and unscoped npm package specs
  const npmMatch = s.match(/^(@[^/]+\/[^@/]+)|^[^@/]+/);
  if (npmMatch) {
    return npmMatch[0];
  }

  return null;
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

main(pkgSpecifier)