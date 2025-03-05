export interface ChartTheme {
  name: string;
  layout: {
    background: string;
    textColor: string;
  };
  grid: {
    vertLines: string;
    horzLines: string;
  };
  timeScale: {
    borderColor: string;
  };
  candles: {
    upColor: string;
    downColor: string;
    wickUpColor: string;
    wickDownColor: string;
  };
}

export interface ChartThemes {
  [key: string]: ChartTheme;
} 