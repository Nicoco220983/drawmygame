# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DrawMyGame is a web-based game creation platform that allows users to build and play 2D side-scrolling games directly in the browser. The project consists of:
- A visual game builder interface (index.html)
- A multiplayer game runtime (room.html)
- A Node.js WebSocket server for real-time multiplayer
- A custom game engine with physics, graphics, and audio systems

## Build and Development Commands

### Build the project
```bash
npm run build
```
This compiles the source files from `core/` and `catalogs/` to `static/core/` and `static/catalogs/` using Babel. The build system:
- Transpiles `.mjs` files using Babel with decorator support
- Copies non-JS files as-is
- Only rebuilds files that have been modified (based on mtime)
- Copies dependencies like pako.esm.mjs to static/deps/

### Start the server
```bash
npm start
# or
node server.mjs
```
Starts the Express + WebSocket server on port 8080 (configurable via PORT env var).

### Environment variables
- `PORT`: Server port (default: 8080)
- `DRAWMYGAME_ENV=production`: Enables production mode (different caching, room ID generation)
- `DEBUG=1`: Enables debug mode with request logging and additional game debugging

## Architecture

### Directory Structure

- **`core/v1/`**: Source code for the game engine (transpiled to `static/core/v1/`)
  - `game.mjs`: Core game engine classes (Game, Scene, GameObject, GameMap, Catalog system)
  - `builder.mjs`: Visual builder/editor for creating games
  - `physics.mjs`: Physics engine (collision detection, gravity, movement)
  - `graphics.mjs`: Graphics rendering system
  - `audio.mjs`: Audio system
  - `utils.mjs`: Utility functions
  - `catalog.mjs`: Catalog loader that imports game object definitions

- **`catalogs/std/v1/2Dside/`**: Standard library of game objects and behaviors
  - `scenes.mjs`: Scene templates and configurations
  - `objects.mjs`: Game object definitions (player, enemies, items, etc.)
  - `triggers.mjs`: Event trigger definitions
  - `blocks.mjs`: Collision blocks and platforms
  - `assets/`: Images, sounds, and other media files

- **`static/`**: Served static files
  - `index.html`: Game builder interface
  - `room.html`: Multiplayer game interface
  - `core/`, `catalogs/`, `deps/`: Transpiled/copied from source

- **`server.mjs`**: Node.js server with Express + WebSocket handling

### Game Engine Architecture

The engine uses a component-based architecture with these key concepts:

1. **Game/GameCommon**: Main game instance that manages scenes, rendering loop, and player input
2. **Scene hierarchy**:
   - `Scene`: Base scene class with object management and rendering
   - `DefaultScene`: Basic scene implementation
   - `GameScene`: Scene with game logic, physics, and collision detection
   - Scenes can have multiple objects and manage chunks for large maps

3. **GameObject**: Base class for all game entities
   - Uses decorators for defining state properties (@StateNumber, @StateBool, etc.)
   - Supports mixins for reusable behaviors
   - Has graphics props (sprites, animations), physics props (collision, velocity)
   - Can have ObjectLinks for trigger-reaction pairs

4. **State System**: Objects have typed state properties that can be:
   - Synchronized across network in multiplayer
   - Serialized/deserialized for save/load
   - Modified by triggers and reactions
   - Types: StateNumber, StateBool, StateEnum, StateString, StateObjectRef

5. **Catalog System**:
   - `Catalog`: Root container for all game object definitions
   - `ModuleCatalog`: Loads object/scene definitions from ES modules
   - Game objects are registered with keys and can be instantiated by the engine

6. **Physics System**:
   - Collision detection using polygon-based hit detection
   - Gravity, velocity, and acceleration
   - Support for blockers (solid objects) and triggers (event zones)

7. **Multiplayer Architecture**:
   - Server maintains authoritative game state
   - Clients send input states via WebSocket
   - Server broadcasts state updates to all clients
   - Binary protocol using msgpackr for efficient serialization
   - Room-based isolation with client/player management

### Server Architecture

The server (`server.mjs`) implements:
- **GameServer**: Main server class managing rooms and clients
- **Room**: Represents a game session with multiple clients and a shared Game instance
- **Client**: Represents a connected WebSocket client
- Game state is authoritative on server and synced to clients
- Automatic cleanup: disconnected players removed after 10s, empty rooms closed after 60s

### Message Protocol

WebSocket messages use a binary format: `[key_byte][body]`
- MSG_KEY_IDENTIFY_CLIENT: Client identification/reconnection
- MSG_KEY_JOIN_GAME: Player joins with name/color
- MSG_KEY_STATE: Game state updates (server→client or client→server)
- MSG_KEY_GAME_INSTRUCTION: Game controls (start, restart, pause)
- MSG_KEY_PING: Keep-alive ping/pong

### Binary Serialization

- GameMap export/import uses custom binary format with gzip compression
- State updates use msgpackr for efficient serialization
- Maps can be saved on server by mapId and loaded into rooms

## Key Technical Details

- **Babel Configuration**: Uses decorators (2023-05 version), excludes optional chaining and nullish coalescing transforms
- **Browser Compatibility**: Code targets modern browsers with ES modules support
- **FPS**: Game runs at 30 FPS (configurable via FPS constant)
- **Canvas Limits**: Max 800x600 canvas size, maps default to 800x600
- **Touch Support**: Detects touch capability and includes virtual joypad support
- **Mode System**: Engine supports MODE_CLIENT, MODE_SERVER, MODE_REPLAY for different execution contexts

## Working with the Codebase

### Adding New Game Objects

1. Define the object class in `catalogs/std/v1/2Dside/objects.mjs`
2. Extend GameObject or use existing base classes
3. Use decorators to define state properties
4. Register with catalog: `CATALOG.addObjectProto(key, ObjectClass)`
5. Add assets to `catalogs/std/v1/2Dside/assets/`
6. Run `npm run build` to compile to static/

### Modifying Core Engine

1. Edit source files in `core/v1/`
2. Run `npm run build` to compile to `static/core/v1/`
3. Restart server if server-side imports changed
4. Refresh browser for client-side changes

### Debugging

- Set `DEBUG=1` environment variable for server logging
- Use `debug: true` option when creating Game instance
- DebugScene can be enabled to show object bounds and collision info
