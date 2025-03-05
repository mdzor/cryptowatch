import { useState, useEffect, useRef } from 'react';
import { TradingPair, ChartData } from '../types/market';
import { useOHLC } from './useOHLC';
import { useOrderBook } from './useOrderBook';

// Global shared state for each trading pair to ensure consistency across components
const sharedPriceState = new Map<string, {
  currentPrice: number | null;
  lastUpdate: number;
  subscribers: Array<(price: number | null) => void>;
}>();

// Function to get pair key for shared state
const getPairKey = (pair: TradingPair): string => {
  return `${pair.exchange}:${pair.baseAsset}/${pair.quoteAsset}`;
}

// Register for price updates and clean up on component unmount
const useSharedPrice = (pair: TradingPair): number | null => {
  const [price, setPrice] = useState<number | null>(null);
  const pairKey = getPairKey(pair);
  
  useEffect(() => {
    // Initialize shared state for this pair if it doesn't exist
    if (!sharedPriceState.has(pairKey)) {
      sharedPriceState.set(pairKey, {
        currentPrice: null,
        lastUpdate: 0,
        subscribers: []
      });
    }
    
    // Get shared state
    const shared = sharedPriceState.get(pairKey)!;
    
    // Set initial price if available
    if (shared.currentPrice !== null) {
      setPrice(shared.currentPrice);
    }
    
    // Register as subscriber
    const subscriber = (newPrice: number | null) => setPrice(newPrice);
    shared.subscribers.push(subscriber);
    
    // Clean up on unmount
    return () => {
      const shared = sharedPriceState.get(pairKey);
      if (shared) {
        shared.subscribers = shared.subscribers.filter(sub => sub !== subscriber);
      }
    };
  }, [pairKey]);
  
  return price;
};

// Update shared price for a pair
const updateSharedPrice = (pair: TradingPair, price: number) => {
  const pairKey = getPairKey(pair);
  
  // Get or create shared state
  if (!sharedPriceState.has(pairKey)) {
    sharedPriceState.set(pairKey, {
      currentPrice: null,
      lastUpdate: 0,
      subscribers: []
    });
  }
  
  const shared = sharedPriceState.get(pairKey)!;
  
  // Update price and timestamp
  shared.currentPrice = price;
  shared.lastUpdate = Date.now();
  
  // Notify all subscribers
  shared.subscribers.forEach(subscriber => subscriber(price));
};

// Helper to safely extract the price from orderbook
const getPriceFromOrderBook = (orderBook: { asks: any[], bids: any[] }) => {
  if (!orderBook || !orderBook.asks || !orderBook.bids || 
      orderBook.asks.length === 0 || orderBook.bids.length === 0) {
    return null;
  }
  
  const lowestAsk = orderBook.asks[0].price;
  const highestBid = orderBook.bids[0].price;
  
  // Return the mid-price
  return (lowestAsk + highestBid) / 2;
};

// Type for the combined market data
export interface CombinedMarketData {
  candles: ChartData[];
  lastCandle: ChartData | null;
  currentPrice: number | null;
  priceDirection: 'up' | 'down' | 'neutral';
  loading: boolean;
  error: string | null;
  orderBook: { asks: any[], bids: any[] };
}

export const useCombinedMarketData = (pair: TradingPair, timeFrame: string = '1h') => {
  // Get data from existing hooks
  const { candles: ohlcCandles, lastCandle: ohlcLastCandle, loading: ohlcLoading, error: ohlcError } = useOHLC(pair, timeFrame as any);
  const { orderBook, loading: orderBookLoading, error: orderBookError } = useOrderBook(pair);
  
  // Use shared price state
  const sharedPrice = useSharedPrice(pair);
  
  // Additional state for combined data
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const previousPriceRef = useRef<number | null>(null);
  
  // Create a modified version of the candles array with the last candle updated
  const [candles, setCandles] = useState<ChartData[]>([]);
  const [lastCandle, setLastCandle] = useState<ChartData | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  
  // Initialize data from OHLC hook immediately when available
  useEffect(() => {
    if (ohlcCandles.length > 0) {
      console.log(`[useCombinedMarketData] Received ${ohlcCandles.length} candles from OHLC hook`);
      console.log('[useCombinedMarketData] First candle:', ohlcCandles[0]);
      console.log('[useCombinedMarketData] Last candle:', ohlcCandles[ohlcCandles.length - 1]);
      
      setCandles(ohlcCandles);
    }
    
    if (ohlcLastCandle) {
      console.log('[useCombinedMarketData] Received last candle from OHLC hook:', ohlcLastCandle);
      setLastCandle(ohlcLastCandle);
    }
  }, [ohlcCandles, ohlcLastCandle]);
  
  // Extract price from order book and update every 1 second
  useEffect(() => {
    // First update - try to get price from orderbook immediately
    const extractPrice = () => {
      const price = getPriceFromOrderBook(orderBook);
      if (price !== null) {
        setCurrentPrice(price);
        
        // Determine price direction
        if (previousPriceRef.current !== null) {
          if (price > previousPriceRef.current) {
            setPriceDirection('up');
          } else if (price < previousPriceRef.current) {
            setPriceDirection('down');
          } else {
            setPriceDirection('neutral');
          }
        }
        
        previousPriceRef.current = price;
        
        // Update shared price across all components using this pair
        updateSharedPrice(pair, price);
      }
    };
    
    // Run immediately
    extractPrice();
    
    // Set up interval to extract price every second
    const intervalId = setInterval(extractPrice, 1000);
    
    return () => clearInterval(intervalId);
  }, [orderBook, pair]);
  
  // Update candles when OHLC data changes or shared price updates
  useEffect(() => {
    // Only update if we have recent price data and a last candle to update
    if (ohlcLastCandle && (currentPrice !== null || sharedPrice !== null)) {
      // Prefer current price from orderbook, then shared price, then original lastCandle
      const updatedPrice = currentPrice !== null ? currentPrice : 
                          (sharedPrice !== null ? sharedPrice : ohlcLastCandle.close);
      
      const updatedLastCandle = {
        ...ohlcLastCandle,
        close: updatedPrice,
        high: Math.max(ohlcLastCandle.high, updatedPrice),
        low: Math.min(ohlcLastCandle.low, updatedPrice)
      };
      
      // Update the last candle with the latest price
      setLastCandle(updatedLastCandle);
      
      // Also update the last candle in the candles array to keep it consistent
      if (candles.length > 0) {
        const updatedCandles = [...candles];
        const lastIndex = updatedCandles.length - 1;
        
        if (updatedCandles[lastIndex].time === updatedLastCandle.time) {
          updatedCandles[lastIndex] = updatedLastCandle;
          setCandles(updatedCandles);
        }
      }
    }
  }, [ohlcLastCandle, currentPrice, sharedPrice, candles]);
  
  // Reset price direction to neutral after a short delay
  useEffect(() => {
    if (priceDirection !== 'neutral') {
      const timer = setTimeout(() => {
        setPriceDirection('neutral');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [priceDirection]);
  
  // Combine error messages
  const error = ohlcError || orderBookError || null;
  
  // Determine loading state
  const loading = ohlcLoading || orderBookLoading;
  
  return {
    candles,
    lastCandle,
    currentPrice,
    priceDirection,
    loading,
    error,
    orderBook
  };
}; 