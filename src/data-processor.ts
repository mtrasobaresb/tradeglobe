import {CONFIG} from './config';
import {CountriesMap, HsSectionsData, BilateralTrade, TradeArc} from './types';

/** Brand colors for single-country mode */
export const TRADE_COLORS = {
  EXPORT: '#FF6B35', // Warm Coral/Orange for Outbound
  IMPORT: '#00B4D8', // Cool Cyan/Blue for Inbound
} as const;

/**
 * Builds an O(1) map from Chapter ID (e.g., "08", "33") to Section ID (e.g., "I", "VI").
 */
export function buildChapterToSectionMap(
  hsData: HsSectionsData,
): Map<string, string> {
  const chapterToSection = new Map<string, string>();
  for (const section of hsData.sections) {
    for (const chapter of section.chapters) {
      // Normalize chapter IDs to 2-digit padded strings ("8" -> "08")
      const normalizedChapterId = chapter.id.padStart(2, '0');
      chapterToSection.set(normalizedChapterId, section.section_id);
    }
  }
  return chapterToSection;
}

/**
 * Parses raw CSV text and aggregates volume by directional pair (exporter -> importer).
 */
export function processTradeCsv(
  csvText: string,
  hsData: HsSectionsData,
): Map<string, BilateralTrade> {
  const chapterToSection = buildChapterToSectionMap(hsData);
  const tradeMap = new Map<string, BilateralTrade>();

  const lines = csvText.trim().split('\n');
  if (lines.length <= 1) return tradeMap;

  // Assuming CSV header: i, j, chapter, v
  const rows = lines.slice(1);

  for (const row of rows) {
    if (!row.trim()) continue;
    const [i, j, chapterRaw, vRaw] = row.split(',').map(s => s.trim());

    const exporterId = String(i);
    const importerId = String(j);
    const chapterId = chapterRaw.padStart(2, '0');
    const volume = parseFloat(vRaw) || 0;

    if (volume <= 0) continue;

    const pairKey = `${exporterId}->${importerId}`;
    const sectionId = chapterToSection.get(chapterId) || 'UNKNOWN';

    let trade = tradeMap.get(pairKey);
    if (!trade) {
      trade = {
        exporterId,
        importerId,
        totalVolume: 0,
        sectionVolumes: {},
        chapterVolumes: {},
      };
      tradeMap.set(pairKey, trade);
    }

    trade.totalVolume += volume;
    trade.sectionVolumes[sectionId] =
      (trade.sectionVolumes[sectionId] || 0) + volume;
    trade.chapterVolumes[chapterId] =
      (trade.chapterVolumes[chapterId] || 0) + volume;
  }

  return tradeMap;
}

/**
 * Calculates arc altitude based on Great-Circle distance.
 * Nearby routes (0 rad) -> minimum altitude.
 * Antipodal routes (π rad) -> maximum altitude.
 */
export function calculateArcAltitude(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // 0 to π radians
  const normalizedDistance = angularDistance / Math.PI; // 0.0 to 1.0

  return (
    CONFIG.MIN_ARC_ALTITUDE +
    normalizedDistance * (CONFIG.MAX_ARC_ALTITUDE - CONFIG.MIN_ARC_ALTITUDE)
  );
}

/**
 * Filters trade links for a selected country and converts them to globe.gl Arcs.
 */
export function getCountryTradeArcs(
  selectedCountryId: string,
  tradeMap: Map<string, BilateralTrade>,
  countries: CountriesMap,
  limit?: number,
): TradeArc[] {
  const targetCountry = countries[selectedCountryId];
  if (!targetCountry) return [];

  const arcs: TradeArc[] = [];

  for (const trade of tradeMap.values()) {
    const isExport = trade.exporterId === selectedCountryId;
    const isImport = trade.importerId === selectedCountryId;

    if (!isExport && !isImport) continue;

    const partnerId = isExport ? trade.importerId : trade.exporterId;
    const partnerCountry = countries[partnerId];

    if (!partnerCountry) continue; // Skip if coordinates are missing

    // Logarithmic visual stroke width scaling.
    //const strokeWidth = Math.max(0.5, Math.log10(trade.totalVolume + 1) * 0.8);

    arcs.push({
      id: `${trade.exporterId}-${trade.importerId}`,
      startLat: isExport ? targetCountry.lat : partnerCountry.lat,
      startLng: isExport ? targetCountry.lng : partnerCountry.lng,
      endLat: isExport ? partnerCountry.lat : targetCountry.lat,
      endLng: isExport ? partnerCountry.lng : targetCountry.lng,
      color: isExport ? TRADE_COLORS.EXPORT : TRADE_COLORS.IMPORT,
      //stroke: strokeWidth
      altitude: calculateArcAltitude(
        targetCountry.lat,
        targetCountry.lng,
        partnerCountry.lat,
        partnerCountry.lng,
      ),
      type: isExport ? 'export' : 'import',
      partnerName: partnerCountry.name,
      volume: trade.totalVolume,
    });
  }

  // Sort descending by volume so top trade partners take priority
  arcs.sort((a, b) => b.volume - a.volume);

  // 2. Slice top N items if limit is specified
  return limit ? arcs.slice(0, limit) : arcs;
}
