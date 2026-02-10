# KIMI.md - DrawMyGame Project Guide

Guidance for Kimi AI when working with the DrawMyGame codebase.

## Project Overview

**DrawMyGame** is a web-based platform for creating 2D side-scrolling games via a WYSIWYG visual builder, with single/multiplayer play. Core philosophy: **extensibility** - anyone can contribute game objects, scenes, and behaviors via NPM packages.

### Key Features

- **Visual Game Builder**: Browser-based editor for placing objects and designing levels
- **Multiplayer**: Real-time multiplayer via WebSocket with authoritative server
- **Smartphone Joypad**: Phones as controllers for single-screen multiplayer
- **Extensible Catalog System**: Third-party NPM packages can add game content
- **Standard Catalog**: Rich set of pre-built objects/scenes

---

## Architecture

### Directory Structure

```
drawmygame/
├── server.mjs                 # Main server entry point (Express + WebSocket)
├── packages/                  # Monorepo packages
│   ├── core/                  # Core game engine package (@drawmygame/core)
│   │   ├── src/v1/            # Source code (ES modules)
│   │   │   ├── index.mjs      # Package exports
│   │   │   ├── game.mjs       # Game engine, loops, networking
│   │   │   ├── builder.mjs    # Visual builder/editor logic
│   │   │   ├── catalog.mjs    # Catalog registration system
│   │   │   ├── graphics.mjs   # Rendering, canvas, sprites
│   │   │   ├── physics.mjs    # Physics engine, collisions
│   │   │   ├── audio.mjs      # Audio system
│   │   │   ├── stateproperty.mjs  # State decorators for networking
│   │   │   └── utils.mjs      # Utility functions
│   │   ├── static/            # Static web assets
│   │   |   ├── index.html     # Landing page
│   │   |   ├── room.html      # Game room page
│   │   |   ├── test.html      # Test page
│   │   |   ├── test_pixi.html # PixiJS test page
│   │   |   └── deps/          # Runtime dependencies
│   │   └── dist/              # Central distribution folder (served by server)
│   │       ├── core/          # Core engine transpiled output
│   │       └── catalogs/      # Catalog packages copied here post-build (e.g., std/)
│   │
│   └── std/                   # Standard catalog (@drawmygame/std)
│       ├── src/v1/            # Source code
│       │   ├── index.mjs      # Package exports
│       │   ├── joypad.mjs     # Smartphone controller scenes
│       │   ├── mixins.mjs     # Shared behavior mixins
│       │   └── 2Dside/        # 2D side-scrolling perspective
│       │       ├── heros.mjs  # Playable characters
│       │       ├── objects.mjs # Game objects (enemies, items, etc.)
│       │       ├── blocks.mjs # Terrain blocks/platforms
│       │       ├── scenes.mjs # Pre-built scenes
│       │       ├── triggers.mjs # Event triggers
│       │       └── mixins.mjs # Perspective-specific mixins
│       ├── static/v1/         # Static assets
│       │   └── 2Dside/assets/ # Sprites, images, sounds
│       └── dist/v1/           # Compiled output
│
├── scripts/                   # Build and utility scripts
│   ├── build.js               # Babel transpilation script
│   └── install_catalog.js     # Catalog installation script
│
└── tests/                     # Test suite
    ├── README.md              # Test documentation
    ├── run-all.mjs            # Test runner
    ├── modules.test.mjs       # Module import tests
    └── server.test.mjs        # Server endpoint tests
```

### Catalog System (Plugin Architecture)

The **Catalog** enables extensibility. Register objects/scenes from any NPM package:

```javascript
@CATALOG.registerObject({
    perspective: '2Dside',
    version: 'v1',
    label: 'My Enemy',
    icon: myIcon,
})
class MyEnemy extends GameObject {
    static CATEGORY = '/enemy/flying/'
}
```

**Key concepts:**
- **Namespace**: Package ID (e.g., `std`) - auto-detected from path
- **Perspective**: Game type (e.g., `2Dside`)
- **Version**: Catalog version (e.g., `v1`)
- **Full Key**: `{perspective}:{namespace}:{version}:{className}` (e.g., `2Dside:std:v1:Sword`)

Server auto-loads all catalogs from `static/catalogs/` at startup.

### Standard Catalog

The Standard Catalog provides many game objects te ease the creations of games.

- **Location**: `packages/std`

Provides: Heroes, objects, scenes, blocks, triggers, joypad scenes.

---

## Build & Development

```bash
npm install      # Install dependencies
npm run build    # Transpile src/ → dist/ via Babel + copy catalogs
npm start        # Start server on port 8080
npm test         # Run all tests
```

### Build Process

The build process:
1. Transpiles all `packages/*/src/` → `packages/*/dist/` via Babel
2. Copies workspace catalogs to `packages/core/dist/catalogs/` using `install_catalog.js`

This creates a central distribution in `packages/core/dist/` that the server serves, with all catalogs available at runtime.

### Tests

Run tests to verify everything works:

```bash
npm test                 # Run all tests
npm run test:modules     # Module import tests only  
npm run test:server      # Server endpoint tests only
```

See `tests/README.md` for more details.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 8080) |
| `DRAWMYGAME_ENV=production` | Production mode |
| `DEBUG=1` | Debug logging & game debugging |

### Installing External Catalogs

```bash
npm install <catalog-package>
npm run install_catalog <package-name>
```

Catalog packages can define these properties in their `package.json`:
- `catalogname`: The name for the catalog folder (defaults to package name)
- `catalogsource`: The subdirectory to copy from (defaults to `"dist"`)

---

## Game Engine

### Core Classes

| Class | Purpose |
|-------|---------|
| `Game` | Main loop, player management, networking |
| `Scene` | Object container, rendering context |
| `GameScene` | Scene with physics, collision, game logic |
| `GameObject` | Base class for all entities |
| `GameMap` | Map serialization/deserialization |

### State System

Objects use decorators for synchronized state:

```javascript
@StateNumber.define("health", { default: 100, showInBuilder: true })
@StateBool.define("isInvincible", { default: false, showInBuilder: true })
@StateEnum.define("state", { 
    default: "idle", 
    options: { idle: "Idle", walk: "Walk", jump: "Jump" },
    showInBuilder: true 
})
class Player extends GameObject {
    ...
}
```

State is auto-synchronized across network and serialized for save/load.

States allows also to add input fields in builder.

### Physics

- Polygon-based collision detection
- Gravity, velocity, acceleration
- Blockers (solid) and triggers (event zones)

### Execution Modes

- `MODE_LOCAL` (0): Single-player
- `MODE_CLIENT` (2): Multiplayer client
- `MODE_SERVER` (1): Authoritative server

---

## Multiplayer

### Architecture (Authoritative Server)

```
Client Input → WebSocket → Server Game Loop → State Updates → All Clients
```

- Server runs at 30 FPS
- Clients send input only
- State updates via `msgpackr` binary protocol
- Format: `[key_byte][body]`

### Message Types

| Key | Purpose |
|-----|---------|
| `MSG_KEY_IDENTIFY_CLIENT` | Client identification |
| `MSG_KEY_JOIN_GAME` | Player join |
| `MSG_KEY_STATE` | State updates |
| `MSG_KEY_GAME_INSTRUCTION` | Start/restart/pause |
| `MSG_KEY_PING` | Keep-alive |

### Room Lifecycle

1. Create: `POST /newroom` → get `roomId`
2. Upload: `POST /room/{roomId}/map/{mapId}`
3. Join: WebSocket to `/client`
4. Auto-close: 60s if empty, 10s to remove disconnected players

---

## Smartphone Joypad

Players use phones as controllers for single-screen multiplayer:

1. **Host** opens game room on main screen
2. **Players** scan QR code on their phones
3. **Phones** display virtual joypad
4. **Input** sent via WebSocket to host

Joypad scenes (e.g., `std:SimpleJoypad`) are in the standard catalog under `joypad.mjs`.

## Technical Details

| Aspect | Value |
|--------|-------|
| FPS | 30 |
| Canvas | Max 800x600 |
| Serialization | `msgpackr` (state), `pako` (maps) |
| Networking | WebSocket via `express-ws` |
| Babel | Decorators 2023-05, ES modules |
| Room IDs | 1-999 (prod), sequential (dev) |

