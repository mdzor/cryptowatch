import { useState, useEffect } from 'react';
import { TradingPair } from '../types/market';

interface MarketSummary {
  lastPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

export const useMarketSummary = (pair: TradingPair) => {
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchSummary = async () => {
      try {
        // In a real app, you would fetch from an API using the pair
        // const response = await fetch(`api/summary/${pair.exchange}/${pair.symbol}`);
        // const data = await response.json();
        
        // Using mock data for now
        const basePrice = 50000 + Math.random() * 1000;
        const priceChange = Math.random() > 0.5 ? Math.random() * 500 : -Math.random() * 500;
        const percentChange = (priceChange / basePrice) * 100;
        
        setSummary({
          lastPrice: basePrice,
          priceChange24h: priceChange,
          priceChangePercent24h: percentChange,
          high24h: basePrice + Math.random() * 1000,
          low24h: basePrice - Math.random() * 1000,
          volume24h: Math.random() * 10000,
          quoteVolume24h: Math.random() * 500000000
        });
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch market summary');
        setLoading(false);
      }
    };

    fetchSummary();
    
    // Set up interval for updates
    const intervalId = setInterval(fetchSummary, 10000);
    
    return () => clearInterval(intervalId);
  }, [pair]);

  return { summary, loading, error };
}; 