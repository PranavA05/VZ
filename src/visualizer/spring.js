const SPRING_STIFFNESS = 170;
const SPRING_DAMPING = 14;

export function stepSpring(position, velocity, target, deltaTime) {
  const acceleration = (target - position) * SPRING_STIFFNESS;
  const nextVelocity =
    (velocity + acceleration * deltaTime) *
    Math.exp(-SPRING_DAMPING * deltaTime);

  return {
    position: position + nextVelocity * deltaTime,
    velocity: nextVelocity,
  };
}
