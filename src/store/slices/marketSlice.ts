import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MarketState {
  currentPair: string;
  currentExchange: string;
  favorites: string[];
  recentTrades: any[];
  orderBook: {
    asks: [number, number][];
    bids: [number, number][];
  };
  ticker: {
    last: number;
    high: number;
    low: number;
    volume: number;
    change24h: number;
  };
}

const initialState: MarketState = {
  currentPair: 'BTC/USD',
  currentExchange: 'binance',
  favorites: [],
  recentTrades: [],
  orderBook: {
    asks: [],
    bids: [],
  },
  ticker: {
    last: 0,
    high: 0,
    low: 0,
    volume: 0,
    change24h: 0,
  },
};

export const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    setCurrentPair: (state, action: PayloadAction<string>) => {
      state.currentPair = action.payload;
    },
    setCurrentExchange: (state, action: PayloadAction<string>) => {
      state.currentExchange = action.payload;
    },
    addToFavorites: (state, action: PayloadAction<string>) => {
      if (!state.favorites.includes(action.payload)) {
        state.favorites.push(action.payload);
      }
    },
    removeFromFavorites: (state, action: PayloadAction<string>) => {
      state.favorites = state.favorites.filter(fav => fav !== action.payload);
    },
    updateRecentTrades: (state, action: PayloadAction<any[]>) => {
      state.recentTrades = action.payload;
    },
    updateOrderBook: (state, action: PayloadAction<{ asks: [number, number][]; bids: [number, number][] }>) => {
      state.orderBook = action.payload;
    },
    updateTicker: (state, action: PayloadAction<Partial<MarketState['ticker']>>) => {
      state.ticker = { ...state.ticker, ...action.payload };
    },
  },
});

export const {
  setCurrentPair,
  setCurrentExchange,
  addToFavorites,
  removeFromFavorites,
  updateRecentTrades,
  updateOrderBook,
  updateTicker,
} = marketSlice.actions;

export default marketSlice.reducer; 