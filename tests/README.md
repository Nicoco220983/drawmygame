# Tests for DrawMyGame

## Overview

These tests verify the project works correctly before and after the monorepo migration:

1. **Module Import Tests** (`modules.test.mjs`) - Verify core modules can be imported
2. **Server Tests** (`server.test.mjs`) - Verify API endpoints and static file serving

## Prerequisites

Before running tests, ensure the project is built:

```bash
npm run build
```

This transpiles source files from `src/` to `static/`.

## Running Tests

### Run all tests:
```bash
npm test
```

### Run individual test suites:
```bash
# Module import tests only
npm run test:modules

# Server endpoint tests only
npm run test:server
```

## Test Coverage

### Module Tests

Verifies:
- Core module exports (Game, Scene, GameObject, CATALOG, etc.)
- Std catalog registration (if installed)
- CATALOG structure (objects, scenes, register functions)
- Critical file existence

### Server Tests

Verifies:
- Server startup on test port
- Ping endpoint (`/ping`)
- Catalog API endpoints (`/catalog/object/:key`)
- Static file serving (`/static/core/v1/`, `/static/catalogs/std/`)
- HTML page serving (`/`)
- 404 handling

## Expected Results

All tests should pass:
```
✓ All test suites passed!
```

If std catalog is not installed, some tests will be skipped with warnings:
```
⚠ Std catalog not installed - skipping Sword object validation
```

## Troubleshooting

### "Built files not found" error

Run the build first:
```bash
npm run build
```

### Server port in use

The tests use port 18080 by default. If it's in use, kill any hanging processes:
```bash
pkill -f "node server.mjs"
```

### Module import syntax errors

The source files (`src/`) use decorators and other ES features that need Babel. Use the built files in `static/` which are transpiled.
