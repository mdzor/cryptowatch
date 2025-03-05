import React, { useState, useRef, useCallback } from 'react';
import { Box, Card, CardContent, CardHeader, IconButton, Typography, Switch, FormControlLabel } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { TradingPair } from '../../types/market';
import TradingViewChart from './TradingViewChart';
import OrderBook from '../market/OrderBook';

interface ChartWidgetProps {
  pair: TradingPair;
  showOrderbook: boolean;
  onToggleOrderbook: () => void;
  onRemove: () => void;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({
  pair,
  showOrderbook,
  onToggleOrderbook,
  onRemove
}) => {
  // State for the orderbook width (default 30%)
  const [orderbookWidth, setOrderbookWidth] = useState(30);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  
  // Handle resize divider drag
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = moveEvent.clientX - containerRect.left;
      
      // Calculate percentage width (with min and max limits)
      let newWidth = (mouseX / containerWidth) * 100;
      newWidth = Math.min(Math.max(newWidth, 15), 65); // Min 15%, max 65%
      
      setOrderbookWidth(newWidth);
    };
    
    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };
  
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <CardHeader
        avatar={
          <Box 
            className="drag-handle" 
            sx={{ 
              cursor: 'move',
              display: 'flex',
              alignItems: 'center',
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary'
              }
            }}
          >
            <DragIndicatorIcon />
          </Box>
        }
        title={
          <Typography variant="h6" component="div">
            {pair.baseAsset}/{pair.quoteAsset}
          </Typography>
        }
        subheader={pair.exchange.toUpperCase()}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showOrderbook}
                  onChange={onToggleOrderbook}
                />
              }
              label="Orderbook"
              labelPlacement="start"
            />
            <IconButton onClick={onRemove} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        }
        sx={{ 
          p: 1, 
          '& .MuiCardHeader-action': { 
            margin: 0,
            alignSelf: 'center'
          },
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      />
      <CardContent 
        ref={containerRef}
        sx={{ 
          flexGrow: 1, 
          p: 0, 
          display: 'flex', 
          overflow: 'hidden',
          '&:last-child': { pb: 0 },
          width: '100%',
          height: 'calc(100% - 56px)',
          position: 'relative',
        }}
      >
        {showOrderbook && (
          <>
            {/* Order book */}
            <Box 
              sx={{ 
                width: `${orderbookWidth}%`, 
                height: '100%',
                transition: isDraggingRef.current ? 'none' : 'width 0.1s ease',
              }}
            >
              <OrderBook pair={pair} isVisible={showOrderbook} />
            </Box>
            
            {/* Resize divider */}
            <Box
              sx={{
                position: 'relative',
                width: '6px',
                height: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                cursor: 'col-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                },
                '&:active': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }
              }}
              onMouseDown={handleDividerMouseDown}
            >
              <DragHandleIcon 
                sx={{ 
                  fontSize: 16, 
                  color: 'text.secondary',
                  transform: 'rotate(90deg)',
                  opacity: 0.7,
                  '&:hover': { opacity: 1 }
                }} 
              />
            </Box>
          </>
        )}
        
        {/* Chart */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            height: '100%',
            width: showOrderbook ? `calc(100% - ${orderbookWidth}% - 6px)` : '100%',
            transition: isDraggingRef.current ? 'none' : 'width 0.1s ease',
          }}
        >
          <TradingViewChart pair={pair} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ChartWidget; 