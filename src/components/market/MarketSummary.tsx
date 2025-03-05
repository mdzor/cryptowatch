import React from 'react';
import { Box, Typography, Grid, Chip } from '@mui/material';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { TradingPair } from '../../types/market';
import { useMarketSummary } from '../../hooks/useMarketSummary';

interface MarketSummaryProps {
  pair: TradingPair;
}

const MarketSummary: React.FC<MarketSummaryProps> = ({ pair }) => {
  const { summary, loading, error } = useMarketSummary(pair);

  if (loading) {
    return <Box p={1}><Typography>Loading market data...</Typography></Box>;
  }

  if (error) {
    return <Box p={1}><Typography color="error">Error loading market data</Typography></Box>;
  }

  if (!summary) {
    return null;
  }

  const priceChangeColor = summary.priceChange24h >= 0 ? 'success.main' : 'error.main';
  const priceChangeIcon = summary.priceChange24h >= 0 ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />;

  return (
    <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Typography variant="h6">
            {pair.baseAsset}/{pair.quoteAsset}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {pair.exchange.toUpperCase()}
          </Typography>
        </Grid>
        
        <Grid item>
          <Typography variant="h6">
            {summary.lastPrice.toFixed(2)}
          </Typography>
        </Grid>
        
        <Grid item>
          <Chip
            icon={priceChangeIcon}
            label={`${summary.priceChangePercent24h.toFixed(2)}%`}
            size="small"
            sx={{ 
              backgroundColor: `${priceChangeColor}`,
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Grid>
        
        <Grid item sx={{ ml: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">24h High</Typography>
              <Typography variant="body2">{summary.high24h.toFixed(2)}</Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">24h Low</Typography>
              <Typography variant="body2">{summary.low24h.toFixed(2)}</Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">24h Volume</Typography>
              <Typography variant="body2">
                {summary.volume24h.toFixed(2)} {pair.baseAsset}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">24h Quote Volume</Typography>
              <Typography variant="body2">
                {summary.quoteVolume24h.toFixed(2)} {pair.quoteAsset}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MarketSummary; 