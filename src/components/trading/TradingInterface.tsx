import React, { useState } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  TextField, 
  Button, 
  Typography, 
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  SelectChangeEvent
} from '@mui/material';
import { TradingPair } from '../../types/market';

interface TradingInterfaceProps {
  pair: TradingPair;
}

const TradingInterface: React.FC<TradingInterfaceProps> = ({ pair }) => {
  const [tabValue, setTabValue] = useState(0);
  const [orderType, setOrderType] = useState('limit');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOrderTypeChange = (event: SelectChangeEvent) => {
    setOrderType(event.target.value as string);
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setSliderValue(newValue as number);
    // Calculate amount based on slider value
    // This is just a placeholder calculation
    setAmount((newValue as number / 100 * 1000).toFixed(8));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // Handle order submission
    console.log({
      type: tabValue === 0 ? 'buy' : 'sell',
      orderType,
      price,
      amount,
      pair
    });
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            label="Buy" 
            sx={{ 
              color: tabValue === 0 ? 'success.main' : 'text.primary',
              fontWeight: 'bold'
            }} 
          />
          <Tab 
            label="Sell" 
            sx={{ 
              color: tabValue === 1 ? 'error.main' : 'text.primary',
              fontWeight: 'bold'
            }} 
          />
        </Tabs>
      </Box>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Order Type</InputLabel>
          <Select
            value={orderType}
            onChange={handleOrderTypeChange}
            label="Order Type"
          >
            <MenuItem value="limit">Limit</MenuItem>
            <MenuItem value="market">Market</MenuItem>
            <MenuItem value="stop">Stop</MenuItem>
            <MenuItem value="stop_limit">Stop Limit</MenuItem>
          </Select>
        </FormControl>
        
        {orderType !== 'market' && (
          <TextField
            fullWidth
            label="Price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            InputProps={{
              endAdornment: <Typography variant="body2">{pair.quoteAsset}</Typography>
            }}
            margin="normal"
          />
        )}
        
        <TextField
          fullWidth
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          InputProps={{
            endAdornment: <Typography variant="body2">{pair.baseAsset}</Typography>
          }}
          margin="normal"
        />
        
        <Typography gutterBottom>
          Amount
        </Typography>
        <Slider
          value={sliderValue}
          onChange={handleSliderChange}
          valueLabelDisplay="auto"
          step={25}
          marks
          min={0}
          max={100}
        />
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography>
            Total: {price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(2) : '0.00'} {pair.quoteAsset}
          </Typography>
        </Box>
        
        <Button 
          type="submit" 
          fullWidth 
          variant="contained" 
          color={tabValue === 0 ? "success" : "error"}
          sx={{ mt: 2 }}
        >
          {tabValue === 0 ? `Buy ${pair.baseAsset}` : `Sell ${pair.baseAsset}`}
        </Button>
      </Box>
    </Paper>
  );
};

export default TradingInterface; 