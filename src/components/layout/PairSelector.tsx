import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  MenuItem,
  Box,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { TradingPair } from '../../types/market';
import { getKrakenPairsFromJSON } from '../../utils/krakenUtils';

// Available exchanges
const exchanges = ['kraken', 'binance', 'coinbase'];

// Fallback common trading pairs (in case JSON loading fails)
const commonPairs = [
  { baseAsset: 'BTC', quoteAsset: 'USD', symbol: 'BTCUSD' },
  { baseAsset: 'ETH', quoteAsset: 'USD', symbol: 'ETHUSD' },
  { baseAsset: 'SOL', quoteAsset: 'USD', symbol: 'SOLUSD' },
  { baseAsset: 'XRP', quoteAsset: 'USD', symbol: 'XRPUSD' },
  { baseAsset: 'ADA', quoteAsset: 'USD', symbol: 'ADAUSD' },
  { baseAsset: 'DOT', quoteAsset: 'USD', symbol: 'DOTUSD' },
  { baseAsset: 'DOGE', quoteAsset: 'USD', symbol: 'DOGEUSD' },
  { baseAsset: 'BTC', quoteAsset: 'EUR', symbol: 'BTCEUR' },
  { baseAsset: 'ETH', quoteAsset: 'EUR', symbol: 'ETHEUR' },
  { baseAsset: 'ETH', quoteAsset: 'BTC', symbol: 'ETHBTC' },
];

interface PairSelectorProps {
  onAddChart: (pair: TradingPair) => void;
}

const PairSelector: React.FC<PairSelectorProps> = ({ onAddChart }) => {
  const [open, setOpen] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState('kraken');
  const [selectedPair, setSelectedPair] = useState<{
    baseAsset: string;
    quoteAsset: string;
    symbol: string;
  } | null>(null);
  const [customBase, setCustomBase] = useState('');
  const [customQuote, setCustomQuote] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [useCustomPair, setUseCustomPair] = useState(false);
  const [krakenPairs, setKrakenPairs] = useState<TradingPair[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Load Kraken pairs when component mounts
  useEffect(() => {
    try {
      const pairs = getKrakenPairsFromJSON();
      setKrakenPairs(pairs);
    } catch (error) {
      console.error('Error loading Kraken pairs:', error);
      // Fall back to common pairs
      setKrakenPairs(commonPairs.map(pair => ({ ...pair, exchange: 'kraken' })));
    }
  }, []);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedExchange('kraken');
    setSelectedPair(null);
    setCustomBase('');
    setCustomQuote('');
    setCustomSymbol('');
    setUseCustomPair(false);
  };

  const handleExchangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedExchange(event.target.value);
  };

  const handlePairChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const pairIndex = parseInt(event.target.value);
    // Use krakenPairs if selected exchange is kraken, otherwise use commonPairs
    const pairsToUse = selectedExchange === 'kraken' && krakenPairs.length > 0 
      ? krakenPairs 
      : commonPairs;
    setSelectedPair(pairsToUse[pairIndex]);
  };

  const handleAddChart = () => {
    let pair: TradingPair;
    
    if (useCustomPair) {
      pair = {
        exchange: selectedExchange,
        baseAsset: customBase.toUpperCase(),
        quoteAsset: customQuote.toUpperCase(),
        symbol: customSymbol || `${customBase.toUpperCase()}${customQuote.toUpperCase()}`
      };
    } else if (selectedPair) {
      pair = {
        exchange: selectedExchange,
        baseAsset: selectedPair.baseAsset,
        quoteAsset: selectedPair.quoteAsset,
        symbol: selectedPair.symbol
      };
    } else {
      // Default to first pair if nothing selected
      const pairsToUse = selectedExchange === 'kraken' && krakenPairs.length > 0 
        ? krakenPairs 
        : commonPairs;
      pair = {
        exchange: selectedExchange,
        baseAsset: pairsToUse[0].baseAsset,
        quoteAsset: pairsToUse[0].quoteAsset,
        symbol: pairsToUse[0].symbol
      };
    }
    
    onAddChart(pair);
    handleClose();
  };

  // Get the pairs to display based on selected exchange
  const getPairsToDisplay = () => {
    if (selectedExchange === 'kraken' && krakenPairs.length > 0) {
      return krakenPairs;
    }
    return commonPairs;
  };

  return (
    <>
      <Tooltip title="Add Chart">
        <IconButton color="primary" onClick={handleOpen}>
          <AddIcon />
        </IconButton>
      </Tooltip>
      
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Add New Chart</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Exchange"
              value={selectedExchange}
              onChange={handleExchangeChange}
              fullWidth
            >
              {exchanges.map((exchange) => (
                <MenuItem key={exchange} value={exchange}>
                  {exchange.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
            
            {!useCustomPair ? (
              loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TextField
                  select
                  label="Trading Pair"
                  value={selectedPair ? getPairsToDisplay().findIndex(p => 
                    p.baseAsset === selectedPair.baseAsset && 
                    p.quoteAsset === selectedPair.quoteAsset
                  ) : '0'}
                  onChange={handlePairChange}
                  fullWidth
                >
                  {getPairsToDisplay().map((pair, index) => (
                    <MenuItem key={index} value={index}>
                      {pair.baseAsset}/{pair.quoteAsset}
                    </MenuItem>
                  ))}
                </TextField>
              )
            ) : (
              <>
                <TextField
                  label="Base Asset"
                  value={customBase}
                  onChange={(e) => setCustomBase(e.target.value)}
                  placeholder="BTC"
                  fullWidth
                />
                <TextField
                  label="Quote Asset"
                  value={customQuote}
                  onChange={(e) => setCustomQuote(e.target.value)}
                  placeholder="USD"
                  fullWidth
                />
                <TextField
                  label="Symbol (Optional)"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value)}
                  placeholder="BTCUSD"
                  fullWidth
                  helperText="Leave empty to auto-generate"
                />
              </>
            )}
            
            <Button 
              variant="text" 
              onClick={() => setUseCustomPair(!useCustomPair)}
            >
              {useCustomPair ? 'Use Common Pair' : 'Use Custom Pair'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleAddChart} 
            variant="contained" 
            disabled={useCustomPair && (!customBase || !customQuote)}
          >
            Add Chart
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PairSelector; 