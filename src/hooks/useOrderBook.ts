import { useState, useEffect, useRef, useCallback } from 'react';
import { TradingPair, OrderBookEntry } from '../types/market';
import krakenWebSocket from '../services/krakenWebSocket';
import krakenPairsData from '../data/krakenPairs.json';

export const useOrderBook = (pair: TradingPair) => {
  const [orderBook, setOrderBook] = useState<{ asks: OrderBookEntry[], bids: OrderBookEntry[] }>({ asks: [], bids: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsConnectionAttempted = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);

  // Function to fetch the order book via REST API
  const fetchOrderBook = useCallback(async () => {
    try {
      const now = Date.now();
      // Don't refetch more often than every 1 second
      if (now - lastFetchTimeRef.current < 1000) return;
      
      // Convert pair to Kraken format for REST API
      const formatPairForKraken = (krakenWebSocket as any).constructor.formatPairForKraken;
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
        
        // Remove the slash and handle special cases for REST API
        
        // Special mappings for REST API
        const baseMap: Record<string, string> = {
          'XBT': 'XXBT', // BTC is XXBT in REST API
          'BTC': 'XXBT',
          'ETH': 'XETH',
          'LTC': 'XLTC',
          'XRP': 'XXRP',
          'XDG': 'XXDG', // DOGE
          'XLM': 'XXLM',
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
      
      // Convert pair to string and format for REST API
      const pairString = formatPairForKraken(pair);
      const restApiPair = formatPairForRestAPI(pairString);
      
      // Fetch from REST API
      const response = await fetch(`https://api.kraken.com/0/public/Depth?pair=${restApiPair}&count=25`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error && data.error.length > 0) {
        throw new Error(data.error[0]);
      }
      
      // Extract the data for the pair
      const pairData = data.result[Object.keys(data.result)[0]];
      
      if (!pairData) {
        throw new Error('No data found for this pair');
      }
      
      // Process asks and bids
      const asks: OrderBookEntry[] = pairData.asks.map((item: any) => ({
        price: parseFloat(item[0]),
        amount: parseFloat(item[1]),
        total: 0 // Will calculate below
      }));
      
      const bids: OrderBookEntry[] = pairData.bids.map((item: any) => ({
        price: parseFloat(item[0]),
        amount: parseFloat(item[1]),
        total: 0 // Will calculate below
      }));

      // Log for debugging
      console.log('Raw ask from API:', pairData.asks[0]);
      console.log('Processed ask:', asks[0]);
      console.log('Raw bid from API:', pairData.bids[0]);
      console.log('Processed bid:', bids[0]);
      
      // Sort asks ascending and bids descending by price
      asks.sort((a, b) => a.price - b.price);
      bids.sort((a, b) => b.price - a.price);
      
      // Calculate totals for cumulative volume
      let asksTotal = 0;
      asks.forEach(ask => {
        asksTotal += ask.amount;
        ask.total = asksTotal;
      });
      
      let bidsTotal = 0;
      bids.forEach(bid => {
        bidsTotal += bid.amount;
        bid.total = bidsTotal;
      });
      
      // Update state
      setOrderBook({ asks, bids });
      setLoading(false);
      setError(null);
      
      lastFetchTimeRef.current = now;
      
    } catch (err: any) {
      console.error('Error fetching order book:', err);
      // Only set error if we don't have any data
      if (orderBook.asks.length === 0 && orderBook.bids.length === 0) {
        setError(err.message || 'Failed to load order book');
      }
    }
  }, [pair]);

  useEffect(() => {
    // Reset state when pair changes
    setLoading(true);
    setError(null);
    wsConnectionAttempted.current = false;
    lastFetchTimeRef.current = 0;
    
    // First fetch immediately for fast initial data
    fetchOrderBook();
    
    // Set up polling as a fallback (every 2 seconds)
    const pollInterval = setInterval(fetchOrderBook, 2000);
    
    const handleOrderBookUpdate = (data: any) => {
      try {
        // Check if this message is for our pair
        if (Array.isArray(data) && data.length >= 2) {
          const pairInfo = data.find(item => item && typeof item === 'object' && '_pair' in item);
          if (pairInfo) {
            const messagePair = pairInfo._pair;
            
            // Convert the current pair to Kraken format for comparison
            const formatPairForKraken = (krakenWebSocket as any).constructor.formatPairForKraken;
            const currentPairFormatted = formatPairForKraken ? formatPairForKraken(pair) : `${pair.baseAsset}/${pair.quoteAsset}`;
            
            // If this message is not for our pair, ignore it
            if (messagePair !== currentPairFormatted) {
              return;
            }
          }
        }
        
        // Use the static method to format the order book data
        const formatOrderBookData = (krakenWebSocket as any).constructor.formatOrderBookData;
        if (!formatOrderBookData) {
          console.error('formatOrderBookData method not found');
          return;
        }
        
        const formattedData = formatOrderBookData(data);
        if (!formattedData) {
          return;
        }
        
        // Update the order book
        setOrderBook(prevOrderBook => {
          // Merge with existing data to handle partial updates
          const updatedAsks = [...prevOrderBook.asks];
          const updatedBids = [...prevOrderBook.bids];
          
          // Process asks
          formattedData.asks.forEach(newAsk => {
            const existingIndex = updatedAsks.findIndex(ask => ask.price === newAsk.price);
            if (newAsk.amount === 0) {
              // Remove price level if amount is 0
              if (existingIndex !== -1) {
                updatedAsks.splice(existingIndex, 1);
              }
            } else {
              // Update or add
              if (existingIndex !== -1) {
                updatedAsks[existingIndex] = newAsk;
              } else {
                updatedAsks.push(newAsk);
              }
            }
          });
          
          // Process bids
          formattedData.bids.forEach(newBid => {
            const existingIndex = updatedBids.findIndex(bid => bid.price === newBid.price);
            if (newBid.amount === 0) {
              // Remove price level if amount is 0
              if (existingIndex !== -1) {
                updatedBids.splice(existingIndex, 1);
              }
            } else {
              // Update or add
              if (existingIndex !== -1) {
                updatedBids[existingIndex] = newBid;
              } else {
                updatedBids.push(newBid);
              }
            }
          });
          
          // Sort asks ascending and bids descending by price
          updatedAsks.sort((a, b) => a.price - b.price);
          updatedBids.sort((a, b) => b.price - a.price);
          
          // Calculate totals for cumulative volume
          let asksTotal = 0;
          updatedAsks.forEach(ask => {
            asksTotal += ask.amount;
            ask.total = asksTotal;
          });
          
          let bidsTotal = 0;
          updatedBids.forEach(bid => {
            bidsTotal += bid.amount;
            bid.total = bidsTotal;
          });
          
          return { asks: updatedAsks, bids: updatedBids };
        });
        
        // Mark as no longer loading if we have data
        setLoading(false);
        
      } catch (err: any) {
        console.error('Error processing order book update:', err);
      }
    };
    
    // Try to set up WebSocket connection
    const setupWebSocket = async () => {
      if (wsConnectionAttempted.current) return;
      
      wsConnectionAttempted.current = true;
      
      try {
        // Connect to WebSocket
        await krakenWebSocket.connect();
        
        // Register for order book updates
        krakenWebSocket.on('book', handleOrderBookUpdate);
        
        // Get the formatPairForKraken function from the constructor
        const formatPairForKraken = (krakenWebSocket.constructor as any).formatPairForKraken;
        if (!formatPairForKraken) {
          console.error('formatPairForKraken method not found');
          return;
        }
        
        // Subscribe to order book
        const krakenPair = formatPairForKraken(pair);
        const success = krakenWebSocket.subscribeOrderBook([krakenPair], 25);
        
        if (!success) {
          console.warn('Failed to subscribe to order book via WebSocket - using polling fallback');
        }
      } catch (err) {
        console.error('Failed to set up WebSocket for order book:', err);
      }
    };
    
    // Set up WebSocket
    setupWebSocket();
    
    // Clean up on unmount
    return () => {
      clearInterval(pollInterval);
      
      // Get the formatPairForKraken function for clean up
      const formatPairForKraken = (krakenWebSocket.constructor as any).formatPairForKraken;
      if (formatPairForKraken) {
        const krakenPair = formatPairForKraken(pair);
        // Unsubscribe from WebSocket
        krakenWebSocket.off('book', handleOrderBookUpdate);
        krakenWebSocket.unsubscribe('book', [krakenPair]);
      }
    };
  }, [pair, fetchOrderBook]);

  return { orderBook, loading, error };
}; 