export const MARBLE_RADIUS = 18;
export const TRACK_WIDTH = 800;
export const TRACK_HEIGHT = 5200;
export const FINISH_LINE_Y = 4900;

export const POINTS_TABLE: Record<number, number> = {
  1: 10, 2: 7, 3: 5, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2,
};
export const POINTS_FINISHED = 1;
export const POINTS_DNF = 0;

export const MARBLE_COLOURS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#e91e63', '#00bcd4', '#8bc34a',
  '#ff5722', '#607d8b', '#ff9800', '#795548', '#9c27b0',
  '#03a9f4', '#4caf50', '#ffeb3b', '#f44336', '#673ab7',
];

export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
