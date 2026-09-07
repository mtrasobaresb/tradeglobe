export interface TextureEpoch {
  min: number;
  max: number;
  path: string;
}

// Vite glob scanner to auto-discover textures in /public/textures/
const textureModules = import.meta.glob(
  '/src/assets/textures/world_base_*.png',
  {eager: true, query: '?url', import: 'default'},
);
const regex = /world_base_(\d{4})_(\d{4})\.png$/i;

export const TEXTURE_EPOCHS: TextureEpoch[] = Object.entries(textureModules)
  .map(([filePath, resolvedUrl]) => {
    const match = filePath.match(regex);
    if (!match) return null;

    return {
      min: parseInt(match[1], 10),
      max: parseInt(match[2], 10),
      path: resolvedUrl, // Resolved browser asset URL from Vite
    };
  })
  .filter((epoch): epoch is TextureEpoch => epoch !== null)
  .sort((a, b) => a.min - b.min);

/**
 * Resolves the texture path matching a given year.
 */
export function getTextureForYear(year: number): string {
  if (TEXTURE_EPOCHS.length === 0) {
    return 'textures/world_base_2012_2024.png'; // Safe fallback
  }

  const match = TEXTURE_EPOCHS.find(e => year >= e.min && year <= e.max);
  if (match) return match.path;

  // Fallbacks for years outside explicit ranges
  return year < TEXTURE_EPOCHS[0].min
    ? TEXTURE_EPOCHS[0].path
    : TEXTURE_EPOCHS[TEXTURE_EPOCHS.length - 1].path;
}

/**
 * Pre-caches all epoch textures in browser memory upon initialization.
 */
export function preloadTextures(): void {
  TEXTURE_EPOCHS.forEach(({path}) => {
    const img = new Image();
    img.src = path;
  });
}
