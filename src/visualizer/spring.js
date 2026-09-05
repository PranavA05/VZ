const SPRING_STIFFNESS = 170;
const SPRING_DAMPING = 14;

export function stepSpring(position, velocity, target, deltaTime, sharpness = 1) {
  const effectiveSharpness = Math.max(sharpness, 0.01);
  const acceleration =
    (target - position) * SPRING_STIFFNESS * effectiveSharpness;
  const nextVelocity =
    (velocity + acceleration * deltaTime) *
    Math.exp(-SPRING_DAMPING * Math.sqrt(effectiveSharpness) * deltaTime);

  return {
    position: position + nextVelocity * deltaTime,
    velocity: nextVelocity,
  };
}
