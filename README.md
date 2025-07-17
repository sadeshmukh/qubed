QUBED

physics simulations in a 2d world - edit main.ts to get started

Collisions are managed in `src/simulation/World.ts`, with the Collidable interface in `src/core/Collidable.ts`.

Collision resolution is done by applying impulses to the objects, and also applying a correction to the objects to prevent them from getting stuck in each other.

Enable debug mode by calling `setDebugMode(true)` on an instance of RigidBody, which draws velocity, angular velocity, collision points, and bounding boxes.

## oops explanation

essentially, I messed up all the collision resolution stuff, which took ~2-3 hours - had to reset to previous commit.
