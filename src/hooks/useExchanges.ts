import { useState, useEffect } from 'react';
import { TradingPair } from '../types/market';

// Mock data - replace with actual API call
const mockExchanges = [
  {
    id: 'binance',
    name: 'Binance',
    pairs: [
      { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', exchange: 'binance' },
      { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', exchange: 'binance' },
      { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', exchange: 'binance' },
    ]
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    pairs: [
      { symbol: 'BTC-USD', baseAsset: 'BTC', quoteAsset: 'USD', exchange: 'coinbase' },
      { symbol: 'ETH-USD', baseAsset: 'ETH', quoteAsset: 'USD', exchange: 'coinbase' },
    ]
  },
  {
    id: 'kraken',
    name: 'Kraken',
    pairs: [
      { symbol: 'XXBTZUSD', baseAsset: 'BTC', quoteAsset: 'USD', exchange: 'kraken' },
      { symbol: 'XETHZUSD', baseAsset: 'ETH', quoteAsset: 'USD', exchange: 'kraken' },
    ]
  }
];

export const useExchanges = () => {
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchExchanges = async () => {
      try {
        // Replace with actual API call
        // const response = await fetch('api/exchanges');
        // const data = await response.json();
        setExchanges(mockExchanges);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch exchanges');
        setLoading(false);
      }
    };

    fetchExchanges();
  }, []);

  return { exchanges, loading, error };
}; 