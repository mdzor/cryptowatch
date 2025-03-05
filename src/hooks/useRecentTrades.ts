import { useState, useEffect } from 'react';
import { TradingPair, Trade } from '../types/market';
import krakenWebSocket from '../services/krakenWebSocket';

export const useRecentTrades = (pair: TradingPair) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const handleTradeUpdate = (data: any) => {
      const formattedData = (krakenWebSocket.constructor as any).formatTradeData(data);
      if (formattedData && formattedData.length > 0) {
        // Prepend new trades to the existing ones and limit to 20
        setTrades(prev => {
          const combined = [...formattedData, ...prev];
          const unique = Array.from(new Map(combined.map(trade => [trade.id, trade])).values());
          return unique.slice(0, 20);
        });
        setLoading(false);
      }
    };

    const subscribeToTrades = async () => {
      try {
        // Convert the trading pair to the format expected by Kraken
        const krakenPair = (krakenWebSocket.constructor as any).formatPairForKraken(pair);
        
        // Connect to WebSocket if not already connected
        await krakenWebSocket.connect();
        
        // Register handler for trade updates
        krakenWebSocket.on('trade', handleTradeUpdate);
        
        // Subscribe to trade updates for the pair
        krakenWebSocket.subscribeTrades([krakenPair]);
      } catch (err) {
        console.error('Failed to subscribe to trades:', err);
        setError('Failed to connect to WebSocket');
        setLoading(false);
      }
    };

    subscribeToTrades();
    
    return () => {
      // Clean up by unsubscribing and removing the handler when the component unmounts
      const krakenPair = (krakenWebSocket.constructor as any).formatPairForKraken(pair);
      krakenWebSocket.unsubscribe('trade', [krakenPair]);
      krakenWebSocket.off('trade', handleTradeUpdate);
    };
  }, [pair]);

  return { trades, loading, error };
}; 