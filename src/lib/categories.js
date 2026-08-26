// Category colors map 1:1 onto the five palette colors. Columbia blue is
// pale, so it needs dark text for contrast; the rest are dark/medium enough
// for white text.
export const CATEGORIES = [
  { value: 'breakfast', label: 'Breakfast', cssVar: '--mustard', textColor: '#fff' },
  { value: 'activity-day', label: 'Activity — Day', cssVar: '--teal', textColor: 'var(--black-olive)' },
  { value: 'activity-night', label: 'Activity — Night', cssVar: '--navy', textColor: '#fff' },
  { value: 'dinner', label: 'Dinner', cssVar: '--terracotta', textColor: '#fff' },
  { value: 'drinks', label: 'Drinks', cssVar: '--plum', textColor: '#fff' }
];

export function categoryMeta(value) {
  return CATEGORIES.find((c) => c.value === value) || { label: value, cssVar: '--ink', textColor: '#fff' };
}
