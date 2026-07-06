import './style.css';
import {initGlobeEngine} from './globe-engine';
import {initUIManager} from './ui-manager';

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

  // Bootstrap downstream components safely
  initGlobeEngine(container);
  initUIManager();

  console.log('Global Trade Visualizer booted successfully.');
}

document.addEventListener('DOMContentLoaded', bootstrap);
