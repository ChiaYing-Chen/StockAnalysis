export interface WaveInputs {
  p0: number | ''; // Start of Wave 1
  p1: number | ''; // End of Wave 1
  p2: number | ''; // End of Wave 2
  p3: number | ''; // End of Wave 3 (Optional, for precise W4 calculation)
  current: number | ''; // Current Price
}

export interface CalculationResult {
  isValid: boolean;
  error?: string;
  w1Height: number;
  w2RetracementPct: number; // Percentage of W1 retraced by W2
  w3Min: number;   // 1.0 extension
  w3Gold: number;  // 1.618 extension
  w4Target: number; // Dynamic retracement of W3 based on selected ratio
  w5Target: number; // W1 height projected from W4
  selectedRatio: number; // The ratio used for W4
  usingManualP3: boolean; // Flag to indicate if we are using manual P3
}

export interface Point {
  x: number;
  y: number;
  label: string;
  value: number;
  type: 'solid' | 'dashed' | 'current';
}

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartPoint {
  index: number;
  price: number;
  date: string;
  type: 'p0' | 'p1' | 'p2';
}

export interface StockInfo {
  code: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
}