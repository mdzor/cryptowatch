import { useState, useEffect, useRef, useCallback } from 'react';
import { TradingPair, ChartData, TimeFrame } from '../types/market';
import krakenWebSocket from '../services/krakenWebSocket';
import krakenPairsData from '../data/krakenPairs.json';

// Define types for OHLC data
interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  count: number;
}

// Original type that other components expect
interface OHLCHookResult {
  candles: ChartData[];
  lastCandle: ChartData | null;
  loading: boolean;
  error: string | null;
  socketSubscribed?: boolean; // Optional for backward compatibility
}

// Kraken API URL
const KRAKEN_API_URL = 'https://api.kraken.com/0/public';

// Map timeframes to intervals
const timeFrameToInterval: Record<string, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240,
  '1d': 1440,
  '1w': 10080
};

// Add a function to format pairs for REST API (different from WebSocket format)
const formatPairForRestAPI = (pairStr: string): string => {
  // First try to use the krakenPairs.json data
  const [base, quote] = pairStr.split('/');
  const key = `${base}${quote}`;
  
  // Look for the pair in our database
  const krakenPair = (krakenPairsData as any).result[key];
  
  // If we found the pair, extract the information we need
  if (krakenPair) {
    console.log(`Found pair ${key} in krakenPairs.json`);
    return key;
  }
  
  console.log(`Pair ${pairStr} not found in database, using fallback method`);
  
  // Fallback to the original method
  // Remove the slash and handle special cases for REST API
  // Kraken REST API uses format like "XXBTZUSD" for BTC/USD
  
  // Special mappings for REST API
  const baseMap: Record<string, string> = {
    'XBT': 'XXBT', // BTC is XXBT in REST API
    'BTC': 'XXBT',
    'ETH': 'XETH',
    'LTC': 'XLTC',
    'XRP': 'XXRP',
    'XDG': 'XXDG', // DOGE
    'XLM': 'XXLM',
    'ADA': 'ADA',
    'DOT': 'DOT',
    'SOL': 'SOL'
  };
  
  const quoteMap: Record<string, string> = {
    'USD': 'ZUSD',
    'EUR': 'ZEUR',
    'GBP': 'ZGBP',
    'JPY': 'ZJPY',
    'CAD': 'ZCAD',
    'AUD': 'ZAUD'
  };
  
  // Use mapped values if they exist, otherwise use the original
  const formattedBase = baseMap[base] || (base.length <= 3 ? 'X' + base : base);
  const formattedQuote = quoteMap[quote] || (quote.length <= 3 ? 'Z' + quote : quote);
  
  return formattedBase + formattedQuote;
};

// Export the hook with its original interface
export const useOHLC = (
  pair: TradingPair | string,
  timeFrameOrInterval: TimeFrame | number | string = '1h',
  enabled = true
): OHLCHookResult => {
  const [candles, setCandles] = useState<ChartData[]>([]);
  const [lastCandle, setLastCandle] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [socketSubscribed, setSocketSubscribed] = useState<boolean>(false);
  const debugCountRef = useRef<number>(0);
  const initialFetchCompletedRef = useRef<boolean>(false);
  const lastPollTimeRef = useRef<number>(0);
  
  // Process the pair parameter to get the string format
  const pairString = typeof pair === 'string' 
    ? pair 
    : (krakenWebSocket.constructor as any).formatPairForKraken(pair);
  
  // Process the interval parameter
  const interval = typeof timeFrameOrInterval === 'number' 
    ? timeFrameOrInterval 
    : timeFrameToInterval[timeFrameOrInterval as string] || 60;

  // Fetch historical data from REST API
  const fetchHistoricalData = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    
    try {
      // Format pair for REST API (different from WebSocket format)
      const restApiPair = formatPairForRestAPI(pairString);
      
      console.log(`Fetching historical OHLC data for ${pairString} (REST API format: ${restApiPair}) at interval ${interval}...`);
      
      // Use AbortController to handle timeouts and cancellations
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Make sure we're using the proper URL
      const url = `${KRAKEN_API_URL}/OHLC?pair=${restApiPair}&interval=${interval}`;
      console.log(`Fetching from URL: ${url}`);
      
      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
      }
      
      const jsonData = await response.json();
      
      if (jsonData.error && jsonData.error.length > 0) {
        throw new Error(jsonData.error[0]);
      }
      
      const result = jsonData.result;
      if (!result) {
        throw new Error('No data returned from Kraken API');
      }
      
      // Extract the data for this pair (key might be different from what we sent)
      const keys = Object.keys(result).filter(key => key !== 'last');
      if (keys.length === 0) {
        throw new Error('No pair data found in API response');
      }
      
      console.log('Available keys in result:', keys);
      
      const pairKey = keys[0]; // Use the first key that's not 'last'
      const pairData = result[pairKey];
      
      if (!pairData || !Array.isArray(pairData)) {
        console.error('Invalid data format:', result);
        throw new Error('Invalid data format returned from Kraken API');
      }
      
      console.log(`Got ${pairData.length} raw candles from Kraken API`);
      
      // Process the data more efficiently
      const formattedData = pairData.map((item: any) => ({
        time: parseInt(item[0]) * 1000, // Convert to milliseconds and ensure it's a number
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[6])
      }));
      
      // Ensure data is sorted by time
      formattedData.sort((a, b) => a.time - b.time);
      
      console.log(`Processed ${formattedData.length} historical OHLC candles for ${pairString}`);
      console.log('First candle:', formattedData[0]);
      console.log('Last candle:', formattedData[formattedData.length - 1]);
      
      // Set candles and lastCandle
      setError(null); // Clear any previous errors
      setCandles(formattedData);
      if (formattedData.length > 0) {
        setLastCandle(formattedData[formattedData.length - 1]);
      }
      
    } catch (err: any) {
      console.error('Error fetching OHLC data:', err);
      
      // Don't clear candles on error if we already have data
      if (candles.length === 0) {
        setCandles([]);
        setLastCandle(null);
      }
      
      // Only set error if it's not an abort error (which happens on unmount)
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch OHLC data');
      }
    } finally {
      setLoading(false);
    }
  }, [pairString, interval, enabled, candles.length]);
  
  // Immediately fetch historical data on mount
  useEffect(() => {
    if (enabled) {
      console.log('Immediately fetching historical data on component mount');
      fetchHistoricalData();
    }
  }, [fetchHistoricalData, enabled]);
  
  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!enabled) return;
    
    console.log('Setting up WebSocket connection for OHLC data...');
    
    // Add a timeout for periodic resubscription to ensure fresh data
    const refreshTimerId = window.setInterval(() => {
      // Check if we need to refresh the subscription (every 2 minutes)
      if (socketSubscribed) {
        console.log(`[useOHLC] Refreshing OHLC subscription for ${pairString}`);
        krakenWebSocket.resubscribeChannel('ohlc', pairString, interval);
      }
    }, 120000); // 2 minutes
    
    // Also set up periodic polling as a fallback (every 30 seconds)
    const pollingTimerId = window.setInterval(() => {
      console.log('Polling for historical data as fallback');
      fetchHistoricalData();
    }, 30000);
    
    // Handler for OHLC updates
    const handleOHLCUpdate = (message: any) => {
      console.log('[useOHLC] WebSocket OHLC update received:', message);
      debugCountRef.current += 1;
      
      if (!Array.isArray(message) || message.length < 2) {
        console.error('[useOHLC] Invalid message format:', message);
        return;
      }
      
      try {
        // First, check if this message is meant for our pair
        let messagePair: string | null = null;
        
        // Check if pair info was added to the message in a special property
        if (message.length > 3) {
          const lastItem = message[message.length - 1];
          if (typeof lastItem === 'object' && lastItem !== null && '_pair' in lastItem) {
            messagePair = lastItem._pair;
          } else if (typeof message[3] === 'string') {
            messagePair = message[3]; // Pair info as string in standard position
          }
        }
        
        // Validate that this message is for our subscribed pair
        if (messagePair && messagePair !== pairString) {
          console.log(`[useOHLC] Ignoring message for different pair: ${messagePair} (we want ${pairString})`);
          return;
        }
        
        const ohlcData = message[1];
        
        // Validate that the message is OHLC data
        if (!Array.isArray(ohlcData) || ohlcData.length < 8) {
          console.error('[useOHLC] Invalid OHLC data format:', ohlcData);
          return;
        }
        
        const updatedCandle: ChartData = {
          time: ohlcData[0] * 1000, // Convert to milliseconds
          open: parseFloat(ohlcData[1]),
          high: parseFloat(ohlcData[2]),
          low: parseFloat(ohlcData[3]),
          close: parseFloat(ohlcData[4]),
          volume: parseFloat(ohlcData[6])
        };
        
        console.log('[useOHLC] Processed OHLC update for pair', pairString, ':', updatedCandle);
        
        // Update lastCandle
        setLastCandle(updatedCandle);
        lastPollTimeRef.current = Date.now(); // Mark that we got fresh data
        
        setCandles(prevCandles => {
          // Check if we already have this candle (based on timestamp)
          const existingIndex = prevCandles.findIndex(
            candle => candle.time === updatedCandle.time
          );
          
          // Create a new array for immutability
          const newCandles = [...prevCandles];
          
          if (existingIndex >= 0) {
            // Update existing candle
            console.log(`[useOHLC] Updating existing candle at index ${existingIndex}`);
            newCandles[existingIndex] = updatedCandle;
          } else {
            // Add new candle
            console.log('[useOHLC] Adding new candle to the data array');
            newCandles.push(updatedCandle);
            // Sort by time to ensure correct order
            newCandles.sort((a, b) => a.time - b.time);
          }
          
          console.log(`[useOHLC] Data array now has ${newCandles.length} candles`);
          return newCandles;
        });
      } catch (err: any) {
        console.error('[useOHLC] Error processing OHLC update:', err);
      }
    };
    
    // Try to subscribe to OHLC updates via WebSocket
    const subscribeToOHLC = async () => {
      try {
        console.log(`[useOHLC] Subscribing to OHLC updates for ${pairString} at interval ${interval}`);
        
        await krakenWebSocket.connect();
        krakenWebSocket.on('ohlc', handleOHLCUpdate);
        const success = krakenWebSocket.subscribeOHLC([pairString], interval);
        
        if (success) {
          console.log('[useOHLC] Successfully subscribed to OHLC WebSocket');
          setSocketSubscribed(true);
        } else {
          console.warn('[useOHLC] Failed to subscribe to OHLC WebSocket - using polling fallback');
        }
      } catch (err: any) {
        console.error('[useOHLC] Failed to subscribe to OHLC WebSocket:', err);
        console.log('[useOHLC] Using polling fallback for updates');
      }
    };
    
    // Try WebSocket first, then fall back to polling
    subscribeToOHLC();
    
    // Cleanup function
    return () => {
      console.log(`[useOHLC] Cleaning up OHLC data connection for ${pairString}`);
      
      // Clean up WebSocket
      if (socketSubscribed) {
        krakenWebSocket.unsubscribe('ohlc', [pairString]);
      }
      krakenWebSocket.off('ohlc', handleOHLCUpdate);
      
      // Clean up polling
      window.clearInterval(refreshTimerId);
      window.clearInterval(pollingTimerId);
    };
  }, [pairString, interval, fetchHistoricalData, enabled]);

  return { 
    candles,
    lastCandle,
    loading, 
    error,
    socketSubscribed
  };
}; 