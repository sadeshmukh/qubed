# Qubed

A 2D physics simulation built with TypeScript. Simulates rigid body dynamics with collision detection and response for boxes, <10-sided polygons, and walls.

WARNING: It is very buggy, especially at high velocities, and especially so with lots of objects (> 20). Otherwise, it should work mostly alright.
note for future me: if node isn't working, update tool-versions (removed for cloudflare)

## Architecture

The engine is organized into several core modules:

- **Core**: Foundation classes for physics objects

  - `RigidBody`: Handles mass, velocity, and angular motion
  - `Vector`: 2D vector math operations
  - `Object`: Base class for all physics objects

- **Shapes**: Geometric primitives

  - `Box`: Rectangular rigid bodies
  - `NGon`: N-sided polygon shapes (triangles, pentagons, hexagons, etc.)
  - `Wall`: Static boundaries

- **Collision**: Physics calculations

  - `CollisionSystem`: Detects intersections between objects
  - `CollisionInfo`: Stores collision data for resolution

- **Simulation**: Core engine

  - `World`: Manages objects, handles updates, and renders the simulation

- **Rendering**: Visual output
  - `DrawingUtils`: Canvas drawing utilities

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start development server:

   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

Edit `src/main.ts` to customize the simulation. Enable debug visualization by calling `setDebugMode(true)` on any RigidBody instance, or toggle all through the UI.
