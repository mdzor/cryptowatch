import { useState, useEffect } from 'react';
import { TradingPair, MarketSummaryData } from '../types/market';
import krakenWebSocket from '../services/krakenWebSocket';

export const useTicker = (pair: TradingPair) => {
  const [tickerData, setTickerData] = useState<MarketSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const handleTickerUpdate = (data: any) => {
      const formattedData = (krakenWebSocket.constructor as any).formatTickerData(data);
      if (formattedData) {
        setTickerData(formattedData);
        setLoading(false);
      }
    };

    const subscribeToTicker = async () => {
      try {
        // Convert the trading pair to the format expected by Kraken
        const krakenPair = (krakenWebSocket.constructor as any).formatPairForKraken(pair);
        
        // Connect to WebSocket if not already connected
        await krakenWebSocket.connect();
        
        // Register handler for ticker updates
        krakenWebSocket.on('ticker', handleTickerUpdate);
        
        // Subscribe to ticker updates for the pair
        krakenWebSocket.subscribeTicker([krakenPair]);
      } catch (err) {
        console.error('Failed to subscribe to ticker:', err);
        setError('Failed to connect to WebSocket');
        setLoading(false);
      }
    };

    subscribeToTicker();
    
    return () => {
      // Clean up by unsubscribing and removing the handler when the component unmounts
      const krakenPair = (krakenWebSocket.constructor as any).formatPairForKraken(pair);
      krakenWebSocket.unsubscribe('ticker', [krakenPair]);
      krakenWebSocket.off('ticker', handleTickerUpdate);
    };
  }, [pair]);

  return { tickerData, loading, error };
}; 