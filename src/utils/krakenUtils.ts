import { TradingPair } from '../types/market';
import krakenPairsData from '../data/krakenPairs.json';

// Kraken API URL
const KRAKEN_API_URL = 'https://api.kraken.com/0/public';

/**
 * Get all trading pairs from Kraken API
 * This is a more complete but slower solution
 */
export const fetchKrakenPairsFromAPI = async (): Promise<TradingPair[]> => {
  try {
    const response = await fetch(`${KRAKEN_API_URL}/AssetPairs`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error && data.error.length > 0) {
      throw new Error(data.error[0]);
    }
    
    const result = data.result;
    if (!result) {
      throw new Error('No data returned from Kraken API');
    }
    
    // Transform the result into TradingPair objects
    return transformKrakenPairsData(data);
  } catch (error) {
    console.error('Error fetching Kraken pairs:', error);
    // Fall back to the static JSON file if there's an error
    return getKrakenPairsFromJSON();
  }
};

/**
 * Transform Kraken API response data into TradingPair objects
 */
const transformKrakenPairsData = (data: any): TradingPair[] => {
  const pairs: TradingPair[] = [];
  const result = data.result;
  
  for (const key in result) {
    const pair = result[key];
    // Skip alternate versions or non-standard pairs
    if (key.includes('.') || key.includes('-')) continue;
    
    let baseAsset = pair.base;
    let quoteAsset = pair.quote;
    
    // Remove the X/Z prefix if it exists (Kraken uses X for crypto, Z for fiat)
    if (baseAsset.startsWith('X') && baseAsset !== 'XBT' && baseAsset !== 'XDG' && baseAsset !== 'XRP') {
      baseAsset = baseAsset.substring(1);
    }
    if (quoteAsset.startsWith('Z')) {
      quoteAsset = quoteAsset.substring(1);
    }
    
    // Special case for Bitcoin - Kraken uses XBT but we might want to use BTC
    if (baseAsset === 'XBT' || baseAsset === 'XXBT') baseAsset = 'BTC';
    
    const symbol = pair.altname || `${baseAsset}${quoteAsset}`;
    
    pairs.push({
      exchange: 'kraken',
      baseAsset,
      quoteAsset,
      symbol
    });
  }
  
  return pairs;
};

/**
 * Get all trading pairs from the static JSON file
 * This is faster and doesn't require an API call
 */
export const getKrakenPairsFromJSON = (): TradingPair[] => {
  try {
    // The imported JSON data now has the same format as the API response
    return transformKrakenPairsData(krakenPairsData);
  } catch (error) {
    console.error('Error parsing Kraken pairs from JSON:', error);
    // Return an empty array if there's an error
    return [];
  }
};

/**
 * Format a trading pair for Kraken REST API
 */
export const formatPairForRestAPI = (pairStr: string): string => {
  // Remove the slash and handle special cases for REST API
  const [base, quote] = pairStr.split('/');
  
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