import type { Rank } from '@/api/types';

// Thresholds mirror public.rank_for_points in the database.
export const ranks: { id: Rank; name: string; points: number }[] = [
  { id: 'new_flame', name: 'New Flame', points: 0 },
  { id: 'sweethearts', name: 'Sweethearts', points: 500 },
  { id: 'ride_or_die', name: 'Ride or Die', points: 2000 },
  { id: 'power_couple', name: 'Power Couple', points: 5000 },
  { id: 'soulmates', name: 'Soulmates', points: 15000 },
];

export function rankName(id: Rank | null | undefined) {
  return ranks.find((r) => r.id === id)?.name ?? 'New Flame';
}

/** 0..1 progress from the current rank's floor to the next rank. */
export function rankProgress(points: number, floor: number, next: number | null) {
  if (next == null) return 1;
  return Math.max(0, Math.min(1, (points - floor) / (next - floor)));
}
