import {CountriesMap} from './types';

export interface UIManagerOptions {
  defaultCountryId?: string;
  countries?: CountriesMap;
  onCountrySelect?: (countryId: string) => void;
}

// Configures DOM interaction listeners and updates the sidebar/timeline HUD components.
export function initUIManager(options?: UIManagerOptions): void {
  console.log(
    `UI Dashboard attached. Default country focus: ${
      options?.defaultCountryId ?? 'None'
    }`,
  );
}
