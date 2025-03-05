import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Autocomplete, 
  Typography, 
  Chip, 
  IconButton, 
  Grid,
  Tabs,
  Tab,
  MenuItem,
  Button,
  CircularProgress
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setCurrentPair, setCurrentExchange, addToFavorites, removeFromFavorites } from '../../store/slices/marketSlice';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { getKrakenPairsFromJSON, fetchKrakenPairsFromAPI } from '../../utils/krakenUtils';

// Mock data - would be fetched from API in a real app
const exchanges = ['Binance', 'Coinbase', 'Kraken', 'FTX', 'Huobi'];

const PairSelector: React.FC = () => {
  const dispatch = useDispatch();
  const { currentPair, currentExchange, favorites } = useSelector((state: RootState) => state.market);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [krakenPairs, setKrakenPairs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Kraken pairs from JSON file (fast) on initial load
  useEffect(() => {
    try {
      // First load the static JSON data (faster)
      const pairs = getKrakenPairsFromJSON();
      const pairStrings = pairs.map(pair => `${pair.baseAsset}/${pair.quoteAsset}`);
      setKrakenPairs(pairStrings);
      setLoading(false);

      // Then attempt to fetch the most up-to-date list from the API
      const fetchLatestPairs = async () => {
        try {
          const apiPairs = await fetchKrakenPairsFromAPI();
          const apiPairStrings = apiPairs.map(pair => `${pair.baseAsset}/${pair.quoteAsset}`);
          setKrakenPairs(apiPairStrings);
        } catch (apiError) {
          console.error('Failed to fetch latest pairs from API:', apiError);
          // Already using JSON data, so no need to show error
        }
      };
      
      fetchLatestPairs();
    } catch (error) {
      console.error('Error loading Kraken pairs:', error);
      setError('Failed to load pairs');
      setLoading(false);
    }
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePairSelect = (pair: string) => {
    // Parse the pair string
    const [baseAsset, quoteAsset] = pair.split('/');
    const exchange = exchanges[activeTab].toLowerCase();
    
    // Create a TradingPair object
    const tradingPair = {
      baseAsset,
      quoteAsset,
      symbol: `${baseAsset}${quoteAsset}`,
      exchange
    };
    
    // Update Redux state
    dispatch(setCurrentPair(tradingPair as any));
    dispatch(setCurrentExchange(exchange));
  };

  const toggleFavorite = (pair: string) => {
    const isFavorite = favorites.includes(pair);
    
    if (isFavorite) {
      dispatch(removeFromFavorites(pair));
    } else {
      dispatch(addToFavorites(pair));
    }
  };

  // Filter pairs based on search term
  const filteredPairs = krakenPairs.filter(pair => 
    pair.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="exchange tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          {exchanges.map((exchange, index) => (
            <Tab key={index} label={exchange} />
          ))}
        </Tabs>
      </Box>

      {/* Search Box */}
      <Box sx={{ py: 1 }}>
        <TextField
          fullWidth
          placeholder="Search pairs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          variant="outlined"
        />
      </Box>

      {/* Pair List */}
      <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        ) : (
          <Grid container spacing={1} sx={{ p: 1 }}>
            {/* Favorite Pairs */}
            {favorites.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Favorites
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {favorites.map(pair => (
                    <Chip
                      key={pair}
                      label={pair}
                      onClick={() => handlePairSelect(pair)}
                      onDelete={() => toggleFavorite(pair)}
                      deleteIcon={<StarIcon />}
                      color="primary"
                    />
                  ))}
                </Box>
              </Grid>
            )}

            {/* All Pairs */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ my: 1 }}>
                {activeTab === 2 ? 'Kraken Pairs' : `${exchanges[activeTab]} Pairs`}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {filteredPairs.length > 0 ? (
                  filteredPairs.map(pair => {
                    const isFavorite = favorites.includes(pair);
                    return (
                      <Chip
                        key={pair}
                        label={pair}
                        onClick={() => handlePairSelect(pair)}
                        onDelete={() => toggleFavorite(pair)}
                        deleteIcon={isFavorite ? <StarIcon /> : <StarBorderIcon />}
                        variant={isFavorite ? 'filled' : 'outlined'}
                        color={isFavorite ? 'primary' : 'default'}
                      />
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No pairs match your search
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default PairSelector; 