/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Distributes participants into groups based on target group size.
 * Uses the rules from Step-by-Step section:
 * - Shuffle participants randomly.
 * - If remainder >= 3: create an undersized group.
 * - If remainder < 3: distribute extras across existing groups.
 */
export function distributeIntoGroups(
  participantIds: string[],
  groupSize: number = 6
): string[][] {
  if (participantIds.length === 0) return [];
  if (participantIds.length <= groupSize) return [participantIds];

  // 1. Shuffle participants randomly
  const shuffledIds = shuffle(participantIds);
  const total = shuffledIds.length;

  // 2. Calculate group counts
  const fullGroupsCount = Math.floor(total / groupSize);
  const remainder = total % groupSize;

  const groups: string[][] = [];

  // 3. Populate baseline full groups
  for (let i = 0; i < fullGroupsCount; i++) {
    const start = i * groupSize;
    groups.push(shuffledIds.slice(start, start + groupSize));
  }

  // 4. Handle remainder
  if (remainder > 0) {
    const remainderStart = fullGroupsCount * groupSize;
    const remainderItems = shuffledIds.slice(remainderStart);

    if (remainder >= 3) {
      // Create an undersized group for the remainder
      groups.push(remainderItems);
    } else {
      // Distribute extras one-by-one into the existing groups
      for (let i = 0; i < remainderItems.length; i++) {
        const targetGroupIndex = i % groups.length;
        groups[targetGroupIndex].push(remainderItems[i]);
      }
    }
  }

  return groups;
}
