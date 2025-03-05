import { useState, useEffect } from 'react';
import { TradingPair } from '../types/market';

// Mock data - replace with actual API call
const mockPairs: TradingPair[] = [
  { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', exchange: 'binance' },
];

export const usePairs = () => {
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchPairs = async () => {
      try {
        // Replace with actual API call
        // const response = await fetch('api/pairs');
        // const data = await response.json();
        setPairs(mockPairs);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch pairs');
        setLoading(false);
      }
    };

    fetchPairs();
  }, []);

  return { pairs, loading, error };
}; 