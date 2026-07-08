import {TradeRoute} from './types';

export const dummyTrades: TradeRoute[] = [
  {
    // id: 'route-electronics-ny-lon',
    startLat: 40.7128, // New York
    startLng: -74.006,
    endLat: 51.5074, // London
    endLng: -0.1278,
    color: '#ff4757', // Vibrant Coral/Red
    sector: 'Electronics',
    volume: 1000, // High Volume: Fast spawn rate, larger spheres
  },
  {
    // id: 'route-auto-tok-la',
    startLat: 35.6762, // Tokyo
    startLng: 139.6503,
    endLat: 34.0522, // Los Angeles
    endLng: -118.2437,
    color: '#ffa502', // Neon Orange
    sector: 'Automotive',
    volume: 2000, // Medium-High Volume
  },
  {
    // id: 'route-agri-hk-syd',
    startLat: 22.3193, // Hong Kong
    startLng: 114.1694,
    endLat: -33.8688, // Sydney
    endLng: 151.2093,
    color: '#2ed573', // Emerald Green
    sector: 'Agriculture',
    volume: 1000, // Low Volume: Infrequent stray particles, smaller size
  },
  {
    // sid: 'route-pharma-sing-ber',
    startLat: 1.3521, // Singapore
    startLng: 103.8198,
    endLat: 52.52, // Berlin
    endLng: 13.405,
    color: '#1e90ff', // Electric Blue
    sector: 'Pharmaceuticals',
    volume: 100, // Critical Heavy Lane: Dense stream of glowing cargo
  },
];
