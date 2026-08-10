import './style.css';
import {initGlobeEngine, GlobeEngineAPI} from './globe-engine';
import {processTradeCsv, getCountryTradeArcs} from './data-processor';
import {initUIManager} from './ui-manager';
import {CountriesMap, HsSectionsData} from './types';

// Module-scoped reference for Vite Hot Module Replacement (HMR) cleanup.
let globeEngine: GlobeEngineAPI | null = null;

// Helper to fetch and validate JSON or text assets.
async function fetchAsset<T>(url: string, type: 'text' | 'json'): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load asset ${url}: ${response.statusText}`);
  }
  return (type === 'json' ? response.json() : response.text()) as Promise<T>;
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

    const [csvText, countries, hsData] = await Promise.all([
      fetchAsset<string>(`${BASE}data/trade_2024.csv`, 'text'),
      fetchAsset<CountriesMap>(`${BASE}data/countries.json`, 'json'),
      fetchAsset<HsSectionsData>(
        `${BASE}data/hs_sections_chapters.json`,
        'json',
      ),
    ]);

    // Process trade matrix.
    const processedTradeData = processTradeCsv(csvText, hsData);

    // Extract Germany ("276") arcs for default starting view.
    const DEFAULT_COUNTRY_ID = '276';
    const limit = 10; // Limit to top 10 trade partners for initial view.
    const initialRoutes = getCountryTradeArcs(
      DEFAULT_COUNTRY_ID,
      processedTradeData,
      countries,
      limit,
    );

    console.log(
      `Trade data processed. Total bilateral pairs: ${processedTradeData.size}. Initial routes for country ${DEFAULT_COUNTRY_ID}: ${initialRoutes.length}`,
    );

    // Initialize Globe Engine.
    globeEngine = initGlobeEngine(container, initialRoutes);

    // Initialize UI Controls & Wire Country Change Listener.
    initUIManager({
      defaultCountryId: DEFAULT_COUNTRY_ID,
      countries,
      onCountrySelect: (countryId: string) => {
        if (!globeEngine) return;
        const newRoutes = getCountryTradeArcs(
          countryId,
          processedTradeData,
          countries,
          limit,
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
