import './style.css';
import {initGlobeEngine} from './globe-engine';
import {dummyTrades} from './data-processor'; // Pull our mock/placeholder data array
import {initUIManager} from './ui-manager';
import {TradeRoute} from './types';

/**
 * Main execution lifecycle hook managing application booting steps.
 */
function bootstrap(): void {
  const container = document.getElementById('globeViz');
  if (!container) {
    console.error(
      'Initialization aborted: Core WebGL viewport element missing.',
    );
    return;
  }

  // Cast dummy data to our unified TradeRoute type if names match,
  // or pass it through if data-processor is already updated.
  const routesData = dummyTrades as unknown as TradeRoute[];

  // Bootstrap downstream components safely, passing our dataset along
  initGlobeEngine(container, routesData);
  initUIManager();

  console.log(
    'Global Trade Visualizer booted successfully with modular flow streams.',
  );
}

document.addEventListener('DOMContentLoaded', bootstrap);
