import './style.css';
import {initGlobeEngine, GlobeEngineAPI} from './globe-engine';
import {
  processTradeCsv,
  getCountryTradeArcs,
  filterCountriesByYear,
  processYearChange,
} from './data-processor';
import {TimelineController} from './timeline-controller';
import {initUIManager} from './ui-manager';
import {
  CountriesMap,
  HsSectionsData,
  CountryGeoJson,
  BilateralTrade,
} from './types';
import {CONFIG} from './config';

// Module-scoped reference for Vite Hot Module Replacement (HMR) cleanup.
let globeEngine: GlobeEngineAPI | null = null;
let timelineController: TimelineController | null = null;

// Application State
const DEFAULT_COUNTRY_ID = '276'; // Germany
const ARC_LIMIT = 10;

let selectedCountryId: string | null = DEFAULT_COUNTRY_ID;
let currentYear: number = CONFIG.START_YEAR;
let currentTradeMap: Map<string, BilateralTrade> = new Map();

// Static datasets cached in memory
let loadedCountries: CountriesMap | null = null;
let loadedHsData: HsSectionsData | null = null;
let loadedGeoJson: CountryGeoJson | null = null;

// Helper to fetch and validate JSON or text assets.
// async function fetchAsset<T>(url: string, type: 'text' | 'json'): Promise<T> {
//   const response = await fetch(url);
//   if (!response.ok) {
//     throw new Error(`Failed to load asset ${url}: ${response.statusText}`);
//   }
//   return (type === 'json' ? response.json() : response.text()) as Promise<T>;
// }
async function fetchAsset<T>(url: string, type: 'text' | 'json'): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to load asset [${url}]: ${response.status} ${response.statusText}`,
    );
  }

  const rawText = await response.text();

  // Strip UTF-8 BOM (Byte Order Mark) if present at start of string
  const cleanText =
    rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;

  if (type === 'text') {
    return cleanText as T;
  }

  try {
    return JSON.parse(cleanText) as T;
  } catch (error) {
    console.error(`JSON parsing failed for asset: ${url}`);
    console.error(
      `First 100 characters received:\n"${cleanText.slice(0, 100)}"`,
    );
    throw error;
  }
}

/**
 * Handles scrubbing/updating the active year:
 * 1. Fetches annual CSV dataset
 * 2. Processes boundaries and trade arcs
 * 3. Updates WebGL texture, polygons, and 3D flow streams
 */
async function handleYearChange(year: number): Promise<void> {
  if (!globeEngine || !loadedCountries || !loadedHsData || !loadedGeoJson) {
    return;
  }

  const BASE = import.meta.env.BASE_URL;
  const csvUrl = `${BASE}data/trade_${year}.csv`;

  try {
    const csvText = await fetchAsset<string>(csvUrl, 'text');

    const {activePolygons, tradeMap, arcs} = processYearChange({
      year,
      csvText,
      hsData: loadedHsData,
      geoJson: loadedGeoJson,
      countries: loadedCountries,
      selectedCountryId,
      arcLimit: ARC_LIMIT,
    });

    // Update active trade matrix reference
    currentTradeMap = tradeMap;

    // Push updates to WebGL globe engine
    globeEngine.updateYear(year);
    globeEngine.updatePolygons(activePolygons);
    globeEngine.updateRoutes(arcs);
  } catch (error) {
    console.error(`Failed to load or process trade data for ${year}:`, error);
  }
}

// Main execution lifecycle managing setup and initialization.
async function bootstrap(): Promise<void> {
  const container = document.getElementById('globe-container');
  if (!container) {
    console.error(
      'Initialization aborted: Core WebGL viewport element missing (#globe-container).',
    );
    return;
  }

  try {
    // Fetch raw dataset files concurrently.
    const BASE = import.meta.env.BASE_URL; // Resolve base path automatically.

    // Fetch initial datasets concurrently (including latest trade year CSV)
    const [csvText, countries, hsData, geoJsonData] = await Promise.all([
      fetchAsset<string>(`${BASE}data/trade_${CONFIG.END_YEAR}.csv`, 'text'),
      fetchAsset<CountriesMap>(`${BASE}data/countries.json`, 'json'),
      fetchAsset<HsSectionsData>(
        `${BASE}data/hs_sections_chapters.json`,
        'json',
      ),
      fetchAsset<CountryGeoJson>(`${BASE}data/countries_110m.geojson`, 'json'),
    ]);

    // Cache static datasets
    loadedCountries = countries;
    loadedHsData = hsData;
    loadedGeoJson = geoJsonData;

    // Initial year data processing
    const {activePolygons, tradeMap, arcs} = processYearChange({
      year: currentYear,
      csvText,
      hsData,
      geoJson: geoJsonData,
      countries,
      selectedCountryId,
      arcLimit: ARC_LIMIT,
    });

    currentTradeMap = tradeMap;

    // Initialize Globe Engine.
    globeEngine = initGlobeEngine(container, arcs, activePolygons);

    // Initialize Timeline Controller
    timelineController = new TimelineController({
      onYearChange: async (newYear: number) => {
        if (newYear === currentYear) return;
        currentYear = newYear;
        await handleYearChange(newYear);
      },
    });

    // Initialize UI Controls & Wire Country Change Listener.
    initUIManager({
      defaultCountryId: DEFAULT_COUNTRY_ID,
      countries,
      onCountrySelect: (countryId: string) => {
        selectedCountryId = countryId;
        if (!globeEngine || !loadedCountries) return;

        const newRoutes = getCountryTradeArcs(
          countryId,
          currentTradeMap,
          loadedCountries,
          ARC_LIMIT,
        );
        globeEngine.updateRoutes(newRoutes);
      },
    });

    console.log(
      'Global Trade Visualizer booted successfully with real 2024 trade streams.',
    );
  } catch (error) {
    console.error('Fatal error during application startup:', error);
  }
}

// Kick off execution lifecycle
bootstrap().catch(console.error);

// Vite Hot Module Replacement (HMR) Lifecycle Guard.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (globeEngine) {
      globeEngine.destroy();
      globeEngine = null;
      console.log('Vite HMR: Disposed stale WebGL state and event listeners.');
    }
  });
}
