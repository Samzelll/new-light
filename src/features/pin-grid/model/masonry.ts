// src/features/pin-grid/model/masonry.ts
import type { PinItem, ColumnAssignment } from './types';

export const FOOTER_RATIO = 0.35; // Reserve aspect-ratio units for card title, badges & metadata
export const DEFAULT_ASPECT_RATIO = 1.25; // 4/5 width:height -> height/width = 1.25

/**
 * Calculates estimated height in aspect-ratio units without DOM measurements.
 */
export function estimateAspectRatioUnits(pin: PinItem): number {
  if (pin.width && pin.height && pin.width > 0 && pin.height > 0) {
    return pin.height / pin.width + FOOTER_RATIO;
  }
  return DEFAULT_ASPECT_RATIO + FOOTER_RATIO;
}

/**
 * Masonry column assignment without DOM measurement.
 * Places each incoming pin into the currently shortest column (in aspect-ratio units).
 * Guarantees existing pins are NEVER reassigned or shifted.
 */
export function assign(
  pins: PinItem[],
  numColumns: number = 2,
  existingAssignment?: ColumnAssignment | null
): ColumnAssignment {
  const safeColumns = Math.max(1, numColumns);

  // If column count matches and assignment exists, continue incrementally
  let assignment: ColumnAssignment;
  if (existingAssignment && existingAssignment.columns.length === safeColumns) {
    // Clone column arrays and set to maintain immutability
    assignment = {
      columns: existingAssignment.columns.map((col) => [...col]),
      assignedIds: new Set(existingAssignment.assignedIds),
      columnHeights: [...existingAssignment.columnHeights],
    };
  } else {
    // Reinitialize columns (e.g. on initial render or responsive breakpoint change)
    assignment = {
      columns: Array.from({ length: safeColumns }, () => []),
      assignedIds: new Set<string>(),
      columnHeights: new Array(safeColumns).fill(0),
    };
  }

  for (const pin of pins) {
    if (!pin || !pin.id || assignment.assignedIds.has(pin.id)) {
      continue;
    }

    // Find the currently shortest column
    let shortestIndex = 0;
    let minHeight = assignment.columnHeights[0];

    for (let i = 1; i < safeColumns; i++) {
      if (assignment.columnHeights[i] < minHeight) {
        minHeight = assignment.columnHeights[i];
        shortestIndex = i;
      }
    }

    // Place pin and update column height
    const unitHeight = estimateAspectRatioUnits(pin);
    assignment.columns[shortestIndex].push(pin);
    assignment.columnHeights[shortestIndex] += unitHeight;
    assignment.assignedIds.add(pin.id);
  }

  return assignment;
}
