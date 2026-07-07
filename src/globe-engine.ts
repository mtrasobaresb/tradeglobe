import Globe from 'globe.gl';
import {TradeRoute, GlobeInstance} from './types';
import {tickSimulation} from './route-flow-engine';

export function initGlobeEngine(
  container: HTMLElement,
  routes: TradeRoute[],
): void {
  // --- Initialize Core Globe ---
  const globe = new Globe(container)
    .backgroundColor('#05050a')
    .showAtmosphere(false);

  const controls = globe.controls();
  if (controls) {
    controls.autoRotate = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
  }

  // Inject country outlines
  fetch(
    'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson',
  )
    .then(res => res.json())
    .then((countries: {features: object[]}) => {
      globe
        .polygonsData(countries.features)
        .polygonCapColor(() => 'rgba(21, 32, 54, 0.4)')
        .polygonStrokeColor(() => 'rgba(0, 0, 0, 0.15)')
        .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
        .polygonAltitude(0.002);
    })
    .catch(err => console.error('Failed to stream maps:', err));

  // --- Setup Static Arc Tracks ---
  globe
    .arcsData(routes)
    .arcStartLat('startLat')
    .arcStartLng('startLng')
    .arcEndLat('endLat')
    .arcEndLng('endLng')
    .arcColor('color')
    .arcDashLength(0)
    .arcStroke(0.3)
    .arcAltitude((d: object) => {
      const route = d as TradeRoute;
      return route.volume > 800 ? 0.4 : 0.25;
    });

  const world = globe as GlobeInstance;

  // --- Native Simulation Loop ---
  function tick() {
    // Fire our decoupled simulation algorithm using identical reference updates
    tickSimulation(routes, world);

    requestAnimationFrame(tick);
  }

  // Kick off engine
  tick();

  window.addEventListener('resize', () => {
    globe.width(window.innerWidth).height(window.innerHeight);
  });
}
