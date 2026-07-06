import Globe from 'globe.gl';
import {TradeArc, dummyTrades} from './data-processor';

/**
 * Initializes and manages the 3D WebGL scene environment.
 * @param container The HTML element where the canvas layer will append.
 */
export function initGlobeEngine(container: HTMLElement): void {
  // Build standard abstract layout theme rules
  const tradeGlobe = new Globe(container)
    .backgroundColor('#05050a')
    .showAtmosphere(false)
    .arcsData(dummyTrades)
    .arcStartLat((d: object) => (d as TradeArc).startLat)
    .arcStartLng((d: object) => (d as TradeArc).startLng)
    .arcEndLat((d: object) => (d as TradeArc).endLat)
    .arcEndLng((d: object) => (d as TradeArc).endLng)
    .arcColor((d: object) => (d as TradeArc).color)
    .arcStroke(0.2);

  // Configure analytical user interaction bounds
  const controls = tradeGlobe.controls();
  if (controls) {
    controls.autoRotate = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
  }

  // Inject minimalist vector boundary outlines asynchronously
  fetch(
    'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson',
  )
    .then(res => res.json())
    .then((countries: object) => {
      const geoData = countries as {features: object[]};
      tradeGlobe
        .polygonsData(geoData.features)
        .polygonCapColor(() => 'rgba(21, 32, 54, 0.4)')
        .polygonStrokeColor(() => 'rgba(255, 255, 255, 0.15)')
        .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
        .polygonAltitude(0.002);
    })
    .catch(err => {
      console.error('Failed to stream abstract map vectors:', err);
    });

  console.log('3D Graphic Engine successfully mounted to DOM.');
}
