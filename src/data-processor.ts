/** Represents a simplified bilateral trade flow between two points. */
export interface TradeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  label: string;
}

/** Static placeholder dataset mapping initial geographical trades. */
export const dummyTrades: TradeArc[] = [
  {
    startLat: 37.0902,
    startLng: -95.7129,
    endLat: 35.8617,
    endLng: 104.1954,
    color: '#ff4d4d',
    label: 'US → China',
  },
  {
    startLat: 35.8617,
    startLng: 104.1954,
    endLat: 51.1657,
    endLng: 10.4515,
    color: '#4da6ff',
    label: 'China → Germany',
  },
  {
    startLat: 51.1657,
    startLng: 10.4515,
    endLat: 37.0902,
    endLng: -95.7129,
    color: '#33cc33',
    label: 'Germany → US',
  },
];
