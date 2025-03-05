import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Box, Typography, ButtonGroup, Button, FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { 
  createChart, 
  CandlestickData,
  UTCTimestamp,
  CandlestickSeries
} from 'lightweight-charts';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useOHLC } from '../../hooks/useOHLC';
import { TimeFrame } from '../../types/market';

// Debounce function to prevent too many resize events
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout | null = null;
  return function(...args: any[]) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

const Chart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<any>(null);
  const [candleSeries, setCandleSeries] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<TimeFrame>('1h');
  const { currentPair, currentExchange } = useSelector((state: RootState) => state.market);
  const darkMode = useSelector((state: RootState) => state.layout.darkMode);
  const { candles, lastCandle, loading, error } = useOHLC(
    { 
      symbol: currentPair, 
      baseAsset: currentPair.split('/')[0], 
      quoteAsset: currentPair.split('/')[1], 
      exchange: currentExchange 
    }, 
    timeframe
  );
  
  // Keep track of the displayed candles to avoid unnecessary updates
  const [displayedCandleCount, setDisplayedCandleCount] = useState(0);
  const [lastUpdatedCandleTime, setLastUpdatedCandleTime] = useState<number | null>(null);

  // Format candles for the chart lib - convert milliseconds to seconds
  const formattedCandles = useMemo(() => {
    if (!candles.length) return [];
    
    return candles.map(candle => ({
      // Convert milliseconds to seconds for the chart lib
      time: Math.floor(candle.time / 1000) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    })) as CandlestickData[];
  }, [candles]);

  // Format the last candle update
  const formattedLastCandle = useMemo(() => {
    if (!lastCandle) return null;
    
    return {
      time: Math.floor(lastCandle.time / 1000) as UTCTimestamp,
      open: lastCandle.open,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close
    } as CandlestickData;
  }, [lastCandle]);
  
  // Initialize chart
  useEffect(() => {
    if (chartContainerRef.current) {
      try {
        // Create chart
        const chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 500,
          layout: {
            background: { color: darkMode ? '#1e1e1e' : '#ffffff' },
            textColor: darkMode ? '#d9d9d9' : '#191919',
          },
          grid: {
            vertLines: { color: darkMode ? '#2e2e2e' : '#f0f0f0' },
            horzLines: { color: darkMode ? '#2e2e2e' : '#f0f0f0' },
          },
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderVisible: true,
            borderColor: darkMode ? '#444' : '#ddd',
            rightOffset: 5,
            barSpacing: 10,
            minBarSpacing: 5,
          },
        });
        
        // Create candlestick series using correct method for v5
        const series = chart.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
        
        setChartInstance(chart);
        setCandleSeries(series);
        
        console.log('Chart component initialized successfully');
        
        // Handle resize with debounce to prevent too many updates
        const handleResize = debounce(() => {
          if (chartContainerRef.current && chart) {
            const { clientWidth, clientHeight } = chartContainerRef.current;
            
            // Only update if dimensions actually changed
            if (clientWidth > 0 && clientHeight > 0) {
              chart.applyOptions({ 
                width: clientWidth,
                height: clientHeight,
              });
              
              // Fit content after resize
              chart.timeScale().fitContent();
            }
          }
        }, 100); // 100ms debounce
        
        // Initial resize to ensure chart fits container
        setTimeout(handleResize, 0);
        
        // Add resize observer with error handling
        let resizeObserver: ResizeObserver | null = null;
        try {
          resizeObserver = new ResizeObserver(entries => {
            // Check if entries exist and have contentRect
            if (entries && entries[0] && entries[0].contentRect) {
              handleResize();
            }
          });
          
          if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current);
          }
        } catch (err) {
          console.error('ResizeObserver error:', err);
          // Fallback to window resize event only
          window.addEventListener('resize', handleResize);
        }
        
        // Also keep the window resize listener for backup
        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          if (resizeObserver) {
            resizeObserver.disconnect();
          }
          chart.remove();
        };
      } catch (err) {
        console.error('Error initializing chart:', err);
      }
    }
  }, [darkMode]);
  
  // Update chart when historical data is loaded or changes
  useEffect(() => {
    if (!candleSeries || !formattedCandles.length) return;
    
    // Only update if we have new candles or the count has changed
    if (formattedCandles.length === displayedCandleCount) return;
    
    try {
      console.log(`Updating chart with ${formattedCandles.length} candles (previously ${displayedCandleCount})`);
      
      // Update the series
      candleSeries.setData(formattedCandles);
      
      // Keep track of how many candles we've displayed
      setDisplayedCandleCount(formattedCandles.length);
      
      // Fit content to view all data
      chartInstance?.timeScale().fitContent();
      
      // Remember the time of the latest candle
      if (formattedCandles.length > 0) {
        const latestCandle = formattedCandles[formattedCandles.length - 1];
        setLastUpdatedCandleTime(latestCandle.time as number);
      }
    } catch (err) {
      console.error('Error updating chart with historical data:', err);
    }
  }, [formattedCandles, displayedCandleCount, candleSeries, chartInstance]);
  
  // Update last candle in real-time
  useEffect(() => {
    if (!candleSeries || !formattedLastCandle) return;
    
    try {
      // Check if this is an update to an existing candle or a new candle
      const isNewCandle = lastUpdatedCandleTime !== formattedLastCandle.time;
      const logMessage = isNewCandle ? 'Adding new candle' : 'Updating last candle';
      
      console.log(`${logMessage}:`, formattedLastCandle);
      
      // Update the latest candle
      candleSeries.update(formattedLastCandle);
      
      // If this is a new candle, update our tracking
      if (isNewCandle) {
        setLastUpdatedCandleTime(formattedLastCandle.time as number);
        setDisplayedCandleCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error updating last candle:', err);
    }
  }, [formattedLastCandle, lastUpdatedCandleTime, candleSeries]);
  
  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    console.log(`Changing timeframe to ${newTimeframe}`);
    setTimeframe(newTimeframe);
    // Reset tracking when timeframe changes
    setDisplayedCandleCount(0);
    setLastUpdatedCandleTime(null);
  };

  return (
    <Box>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mb: 2,
          pointerEvents: 'auto', // Ensure clicks are captured
          zIndex: 10 // Ensure it's above other elements
        }}
        onClick={(e) => {
          // Stop propagation to prevent drag-and-drop from capturing clicks
          e.stopPropagation();
        }}
      >
        <Typography variant="h6">{currentPair} Chart</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ButtonGroup size="small" aria-label="timeframe selection">
            <Button 
              variant={timeframe === '1m' ? 'contained' : 'outlined'}
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                handleTimeframeChange('1m');
              }}
            >
              1m
            </Button>
            <Button 
              variant={timeframe === '5m' ? 'contained' : 'outlined'}
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                handleTimeframeChange('5m');
              }}
            >
              5m
            </Button>
            <Button 
              variant={timeframe === '15m' ? 'contained' : 'outlined'}
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                handleTimeframeChange('15m');
              }}
            >
              15m
            </Button>
            <Button 
              variant={timeframe === '1h' ? 'contained' : 'outlined'}
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                handleTimeframeChange('1h');
              }}
            >
              1h
            </Button>
            <Button 
              variant={timeframe === '4h' ? 'contained' : 'outlined'}
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                handleTimeframeChange('4h');
              }}
            >
              4h
            </Button>
            <Button 
              variant={timeframe === '1d' ? 'contained' : 'outlined'}
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                handleTimeframeChange('1d');
              }}
            >
              1d
            </Button>
          </ButtonGroup>
          
          <FormControl 
            size="small" 
            sx={{ minWidth: 120 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Select
              value="indicators"
              displayEmpty
              onChange={(e: SelectChangeEvent) => {
                // Handle indicator selection
              }}
            >
              <MenuItem value="indicators" disabled>
                Indicators
              </MenuItem>
              <MenuItem value="ma">Moving Average</MenuItem>
              <MenuItem value="ema">EMA</MenuItem>
              <MenuItem value="rsi">RSI</MenuItem>
              <MenuItem value="macd">MACD</MenuItem>
              <MenuItem value="bb">Bollinger Bands</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <Box ref={chartContainerRef} sx={{ width: '100%', height: '500px', position: 'relative' }}>
        {error && (
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'error.main',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: 2,
            borderRadius: 1,
            zIndex: 10
          }}>
            Error: {error}
          </Box>
        )}
        
        {loading && formattedCandles.length === 0 && (
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: 2,
            borderRadius: 1,
            zIndex: 10
          }}>
            Loading chart data...
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Chart; 