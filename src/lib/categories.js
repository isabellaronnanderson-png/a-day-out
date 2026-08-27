// Category colors map 1:1 onto the five palette colors. Text color per
// swatch is chosen for contrast — the pastel/light ones (day activity,
// night activity, drinks) get dark ink text; the deeper ones (breakfast
// green, dinner navy) stay white.
export const CATEGORIES = [
  { value: 'breakfast', label: 'Breakfast', cssVar: '--mustard', textColor: '#fff' },
  { value: 'activity-day', label: 'Activity — Day', cssVar: '--teal', textColor: 'var(--deep-blue)' },
  { value: 'activity-night', label: 'Activity — Night', cssVar: '--navy', textColor: 'var(--deep-blue)' },
  { value: 'dinner', label: 'Dinner', cssVar: '--terracotta', textColor: '#fff' },
  { value: 'drinks', label: 'Drinks', cssVar: '--plum', textColor: 'var(--deep-blue)' }
];

export function categoryMeta(value) {
  return CATEGORIES.find((c) => c.value === value) || { label: value, cssVar: '--ink', textColor: '#fff' };
}
