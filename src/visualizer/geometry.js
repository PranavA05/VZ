export const BASE_INNER_RADIUS = 90;
export const BASE_MIN_BAR_HEIGHT = 10;
export const BASE_MAX_BAR_HEIGHT = 90;
export const BASE_BAR_LINE_WIDTH = 5;

const BASE_OUTER_RADIUS = BASE_INNER_RADIUS + BASE_MAX_BAR_HEIGHT;
const MAX_VISUAL_MARGIN = 20;
const RESPONSIVE_MARGIN_RATIO = 0.05;

export function calculateVisualizerGeometry(width, height) {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const smallerDimension = Math.min(safeWidth, safeHeight);
  const visualMargin = Math.min(
    MAX_VISUAL_MARGIN,
    smallerDimension * RESPONSIVE_MARGIN_RATIO,
  );
  const availableRadius = Math.max(smallerDimension / 2 - visualMargin, 1);
  const scale = Math.min(availableRadius / BASE_OUTER_RADIUS, 1);

  return {
    width: safeWidth,
    height: safeHeight,
    centerX: safeWidth / 2,
    centerY: safeHeight / 2,
    innerRadius: BASE_INNER_RADIUS * scale,
    minBarHeight: BASE_MIN_BAR_HEIGHT * scale,
    maxBarHeight: BASE_MAX_BAR_HEIGHT * scale,
    barLineWidth: Math.max(BASE_BAR_LINE_WIDTH * scale, 1),
  };
}
