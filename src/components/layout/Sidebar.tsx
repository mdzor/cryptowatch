import React, { useState } from 'react';
import { 
  Box, List, ListItem, ListItemButton, ListItemText, 
  Collapse, Typography, Divider, TextField, InputAdornment 
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { TradingPair } from '../../types/market';
import { useExchanges } from '../../hooks/useExchanges';

interface SidebarProps {
  selectedPair: TradingPair;
  onSelectPair: (pair: TradingPair) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedPair, onSelectPair }) => {
  const { exchanges, loading } = useExchanges();
  const [openExchanges, setOpenExchanges] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<TradingPair[]>([]);

  const toggleExchange = (exchangeId: string) => {
    setOpenExchanges(prev => ({
      ...prev,
      [exchangeId]: !prev[exchangeId]
    }));
  };

  const toggleFavorite = (pair: TradingPair, event: React.MouseEvent) => {
    event.stopPropagation();
    const isFavorite = favorites.some(
      fav => fav.exchange === pair.exchange && fav.symbol === pair.symbol
    );
    
    if (isFavorite) {
      setFavorites(favorites.filter(
        fav => !(fav.exchange === pair.exchange && fav.symbol === pair.symbol)
      ));
    } else {
      setFavorites([...favorites, pair]);
    }
  };

  const isPairFavorite = (pair: TradingPair) => {
    return favorites.some(
      fav => fav.exchange === pair.exchange && fav.symbol === pair.symbol
    );
  };

  const filteredExchanges = exchanges?.map(exchange => ({
    ...exchange,
    pairs: exchange.pairs.filter(pair => 
      pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${pair.baseAsset}/${pair.quoteAsset}`.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(exchange => exchange.pairs.length > 0);

  return (
    <Box sx={{ 
      width: 240, 
      flexShrink: 0, 
      borderRight: 1, 
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      <Box sx={{ p: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search pairs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      <Divider />
      
      {favorites.length > 0 && (
        <>
          <List component="nav" dense>
            <ListItem>
              <Typography variant="subtitle2" color="primary">Favorites</Typography>
            </ListItem>
            {favorites.map((pair) => (
              <ListItem key={`fav-${pair.exchange}-${pair.symbol}`} disablePadding>
                <ListItemButton 
                  selected={selectedPair.exchange === pair.exchange && selectedPair.symbol === pair.symbol}
                  onClick={() => onSelectPair(pair)}
                >
                  <ListItemText 
                    primary={`${pair.baseAsset}/${pair.quoteAsset}`} 
                    secondary={pair.exchange}
                  />
                  <StarIcon 
                    fontSize="small" 
                    color="primary" 
                    onClick={(e) => toggleFavorite(pair, e)}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
        </>
      )}
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List component="nav" dense>
          {loading ? (
            <ListItem>
              <Typography>Loading exchanges...</Typography>
            </ListItem>
          ) : (
            filteredExchanges?.map((exchange) => (
              <React.Fragment key={exchange.id}>
                <ListItemButton onClick={() => toggleExchange(exchange.id)}>
                  <ListItemText primary={exchange.name} />
                  {openExchanges[exchange.id] ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={openExchanges[exchange.id]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding dense>
                    {exchange.pairs.map((pair) => (
                      <ListItemButton 
                        key={pair.symbol}
                        sx={{ pl: 4 }}
                        selected={selectedPair.exchange === exchange.id && selectedPair.symbol === pair.symbol}
                        onClick={() => onSelectPair({...pair, exchange: exchange.id})}
                      >
                        <ListItemText primary={`${pair.baseAsset}/${pair.quoteAsset}`} />
                        {isPairFavorite({...pair, exchange: exchange.id}) ? (
                          <StarIcon 
                            fontSize="small" 
                            color="primary" 
                            onClick={(e) => toggleFavorite({...pair, exchange: exchange.id}, e)}
                          />
                        ) : (
                          <StarBorderIcon 
                            fontSize="small" 
                            onClick={(e) => toggleFavorite({...pair, exchange: exchange.id}, e)}
                          />
                        )}
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            ))
          )}
        </List>
      </Box>
    </Box>
  );
};

export default Sidebar; 