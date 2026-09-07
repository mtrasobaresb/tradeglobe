export interface DatasetMetadata {
  minVolume: number;
  maxVolume: number;
}

/**
 * Scans one or more raw CSV contents to establish absolute global dataset bounds.
 */
export function calculateGlobalBounds(csvTexts: string[]): DatasetMetadata {
  let minVolume = Infinity;
  let maxVolume = -Infinity;

  const CUTOFF_MIN = 100_000; // Ignore micro-trades below $100k USD

  for (const csvText of csvTexts) {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) continue;

    for (let k = 1; k < lines.length; k++) {
      const row = lines[k].trim();
      if (!row) continue;

      const parts = row.split(',');
      const volume = parseFloat(parts[3]) || 0;

      if (volume >= CUTOFF_MIN) {
        if (volume < minVolume) minVolume = volume;
        if (volume > maxVolume) maxVolume = volume;
      }
    }
  }

  return {
    minVolume: minVolume === Infinity ? 100_000 : minVolume,
    maxVolume: maxVolume === -Infinity ? 100_000_000_000 : maxVolume,
  };
}
