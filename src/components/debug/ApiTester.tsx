import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Divider, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import krakenPairsData from '../../data/krakenPairs.json';

// Kraken API URL
const KRAKEN_API_URL = 'https://api.kraken.com/0/public';

// Format pair for REST API (same as in useOHLC.ts)
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
  
  // Fallback to original method
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

// API Tester component
const ApiTester: React.FC = () => {
  const [pair, setPair] = useState('ETH/USD');
  const [interval, setInterval] = useState(60);
  const [endpoint, setEndpoint] = useState('OHLC');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formattedPair, setFormattedPair] = useState('');
  
  // Format the pair when it changes
  React.useEffect(() => {
    if (pair.includes('/')) {
      const formatted = formatPairForRestAPI(pair);
      setFormattedPair(formatted);
    } else {
      setFormattedPair(pair);
    }
  }, [pair]);
  
  // Test the API
  const testApi = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      let url = '';
      
      if (endpoint === 'OHLC') {
        url = `${KRAKEN_API_URL}/OHLC?pair=${formattedPair}&interval=${interval}`;
      } else if (endpoint === 'Ticker') {
        url = `${KRAKEN_API_URL}/Ticker?pair=${formattedPair}`;
      } else if (endpoint === 'Trades') {
        url = `${KRAKEN_API_URL}/Trades?pair=${formattedPair}`;
      } else if (endpoint === 'Depth') {
        url = `${KRAKEN_API_URL}/Depth?pair=${formattedPair}&count=10`;
      } else if (endpoint === 'AssetPairs') {
        url = `${KRAKEN_API_URL}/AssetPairs${formattedPair ? `?pair=${formattedPair}` : ''}`;
      }
      
      console.log(`Testing API: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.error && data.error.length > 0) {
        throw new Error(data.error[0]);
      }
      
      setResponse(data);
    } catch (err: any) {
      console.error('API Test Error:', err);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        m: 2, 
        maxWidth: '100%',
        backgroundColor: '#1e1e2d',
        color: '#e0e0e0'
      }}
    >
      <Typography variant="h5" gutterBottom>
        Kraken REST API Tester
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>API Endpoint</InputLabel>
          <Select
            value={endpoint}
            label="API Endpoint"
            onChange={(e) => setEndpoint(e.target.value)}
            size="small"
          >
            <MenuItem value="OHLC">OHLC</MenuItem>
            <MenuItem value="Ticker">Ticker</MenuItem>
            <MenuItem value="Trades">Trades</MenuItem>
            <MenuItem value="Depth">Order Book</MenuItem>
            <MenuItem value="AssetPairs">Asset Pairs</MenuItem>
          </Select>
        </FormControl>
        
        <TextField
          label="Trading Pair"
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          helperText={`REST API format: ${formattedPair}`}
          size="small"
          sx={{ minWidth: 150 }}
        />
        
        {endpoint === 'OHLC' && (
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Interval</InputLabel>
            <Select
              value={interval}
              label="Interval"
              onChange={(e) => setInterval(Number(e.target.value))}
              size="small"
            >
              <MenuItem value={1}>1 minute</MenuItem>
              <MenuItem value={5}>5 minutes</MenuItem>
              <MenuItem value={15}>15 minutes</MenuItem>
              <MenuItem value={30}>30 minutes</MenuItem>
              <MenuItem value={60}>1 hour</MenuItem>
              <MenuItem value={240}>4 hours</MenuItem>
              <MenuItem value={1440}>1 day</MenuItem>
            </Select>
          </FormControl>
        )}
        
        <Button 
          variant="contained" 
          color="primary"
          onClick={testApi}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test API'}
        </Button>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {error && (
        <Box sx={{ mb: 2, p: 1, borderRadius: 1, bgcolor: 'rgba(255, 0, 0, 0.1)', color: '#ff6b6b' }}>
          <Typography variant="body1" color="error">
            Error: {error}
          </Typography>
        </Box>
      )}
      
      {response && (
        <Box>
          <Typography variant="h6" gutterBottom>
            API Response:
          </Typography>
          
          <Box 
            sx={{ 
              p: 1, 
              borderRadius: 1, 
              bgcolor: '#121212', 
              maxHeight: '500px', 
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#1e1e1e',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#555',
                borderRadius: '4px',
              },
            }}
          >
            <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(response, null, 2)}
            </pre>
          </Box>
          
          {response?.result && endpoint === 'OHLC' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="success.main">
                {Object.keys(response.result).filter(k => k !== 'last').map(key => {
                  const count = Array.isArray(response.result[key]) ? response.result[key].length : 0;
                  return `Found ${count} candles for ${key}`;
                })}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ApiTester; 