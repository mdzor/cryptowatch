import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { Button, ButtonGroup } from '@mui/material';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData,
  LineStyle,
  ColorType,
  UTCTimestamp,
  CrosshairMode,
  SeriesType,
  CandlestickSeries,
  TimeFormatterFn,
  TickMarkType,
  Time
} from 'lightweight-charts';
import { TradingPair } from '../../types/market';
import { useOHLC } from '../../hooks/useOHLC';
import { useCombinedMarketData } from '../../hooks/useCombinedMarketData';

// Debounce function to prevent too many resize events
const debounce = (func: Function, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

interface TradingViewChartProps {
  pair: TradingPair;
  timeFrame?: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
}

interface OHLCVData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Candlestick type for the chart
interface FormattedCandle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ pair, timeFrame = '1h' }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [chartInitialized, setChartInitialized] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(timeFrame);
  const updateTimerRef = useRef<number | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const userInteractedRef = useRef(false);
  const isDisposingRef = useRef(false);
  
  // Use the combined market data hook
  const { 
    candles, 
    lastCandle, 
    currentPrice, 
    priceDirection: _, 
    loading, 
    error,
    orderBook
  } = useCombinedMarketData(pair, selectedTimeFrame);
  
  // Keep track of the displayed candles to avoid unnecessary updates
  const [displayedCandleCount, setDisplayedCandleCount] = useState(0);
  const [lastUpdatedCandleTime, setLastUpdatedCandleTime] = useState<number | null>(null);
  
  // Format candles for the chart - fix timestamp handling
  const formattedCandles: FormattedCandle[] = useMemo(() => {
    return candles.map(candle => {
      // Make sure we have the correct timestamp format for the chart
      // The library expects timestamps in seconds for UTCTimestamp
      const timestamp = Math.floor(candle.time / 1000) as UTCTimestamp;
      
      return {
        time: timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      };
    });
  }, [candles]);
  
  // Format last candle with useMemo to prevent dependency issues
  const formattedLastCandle = useMemo(() => {
    if (!lastCandle) return null;
    
    // Ensure consistent timestamp handling for the last candle too
    const timestamp = Math.floor(lastCandle.time / 1000) as UTCTimestamp;
    
    return {
      time: timestamp,
      open: lastCandle.open,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close,
      volume: lastCandle.volume
    };
  }, [lastCandle]);
  
  // Add a forcedUpdateRef to ensure we always update the price
  const lastForcedUpdateRef = useRef<number>(Date.now());
  
  // Add a ref to track timeframe switching status
  const timeframeSwitchingRef = useRef(false);
  
  // Handle timeframe change
  const handleTimeFrameChange = (newTimeFrame: string) => {
    console.log(`Changing timeframe from ${selectedTimeFrame} to ${newTimeFrame}`);
    
    // Set the switching flag to true
    timeframeSwitchingRef.current = true;
    
    // First, clear the chart data to prevent errors when switching
    if (candleSeriesRef.current) {
      try {
        // Clear the data before switching timeframes
        candleSeriesRef.current.setData([]);
      } catch (err) {
        console.error('Error clearing chart data:', err);
      }
    }
    
    // Now update state
    setSelectedTimeFrame(newTimeFrame as any);
    setDisplayedCandleCount(0);
    setLastUpdatedCandleTime(null);
    
    // Re-enable auto-scroll when changing timeframe
    setAutoScroll(true);
    userInteractedRef.current = false;
    
    // Reset the switching flag after a short delay to allow data to reload
    setTimeout(() => {
      timeframeSwitchingRef.current = false;
      
      // After switching is complete and data is loaded, apply the appropriate zoom
      if (chartRef.current && candleSeriesRef.current) {
        setTimeout(() => {
          if (chartRef.current) {
            // Apply different zoom levels based on timeframe
            const timeScale = chartRef.current.timeScale();
            
            // First, fit all content to make sure everything is visible
            timeScale.fitContent();
            
            // For short timeframes, zoom in more
            if (newTimeFrame === '1m' || newTimeFrame === '5m') {
              // Show approximately 100 candles for minute timeframes
              const visibleBars = 100;
              timeScale.setVisibleLogicalRange({
                from: 0,
                to: visibleBars
              });
            } else if (newTimeFrame === '15m' || newTimeFrame === '30m') {
              // Show approximately 80 candles for 15m/30m timeframes
              const visibleBars = 80;
              timeScale.setVisibleLogicalRange({
                from: 0,
                to: visibleBars
              });
            } else if (newTimeFrame === '1h') {
              // Show approximately 60 candles for 1h timeframe
              const visibleBars = 60;
              timeScale.setVisibleLogicalRange({
                from: 0,
                to: visibleBars
              });
            } else if (newTimeFrame === '4h') {
              // Show approximately 40 candles for 4h timeframe
              const visibleBars = 40;
              timeScale.setVisibleLogicalRange({
                from: 0,
                to: visibleBars
              });
            } else {
              // For daily and weekly, keep fitContent
              timeScale.fitContent();
            }
            
            // Ensure we scroll to the most recent candle
            timeScale.scrollToRealTime();
          }
        }, 300); // Give a bit more time for data to load
      }
    }, 500);
  };

  // Safely destroy chart to prevent "Object is disposed" errors
  const safelyDestroyChart = useCallback(() => {
    try {
      // Mark that we're in the process of disposing the chart
      isDisposingRef.current = true;
      
      // Clear all intervals first to prevent any further updates
      if (updateTimerRef.current) {
        window.clearInterval(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      
      // First remove any series to avoid errors
      if (candleSeriesRef.current) {
        candleSeriesRef.current = null;
      }
      
      // Then remove the chart
      if (chartRef.current) {
        // Sometimes the chart might already be in the process of being disposed
        // So we wrap this in a try-catch
        try {
          chartRef.current.remove();
        } catch (err) {
          console.log('Chart was already disposed:', err);
        } finally {
          chartRef.current = null;
        }
      }
      
      // Reset initialization state
      setChartInitialized(false);
    } catch (err) {
      console.error('Error during chart cleanup:', err);
    } finally {
      isDisposingRef.current = false;
    }
  }, []);

  // Get the current price directly from the order book
  const getCurrentPrice = useCallback(() => {
    if (orderBook.asks.length > 0 && orderBook.bids.length > 0) {
      const lowestAsk = orderBook.asks[0].price;
      const highestBid = orderBook.bids[0].price;
      return (lowestAsk + highestBid) / 2;
    }
    return currentPrice; // Fall back to the hook's price if order book is empty
  }, [orderBook, currentPrice]);
  
  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || chartInitialized || isDisposingRef.current) return;
    
    try {
      console.log('Initializing chart for', pair.symbol);
      
      // Create chart
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
          horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
        },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        timeScale: {
          timeVisible: true,
          secondsVisible: true,
          borderVisible: true,
          borderColor: 'rgba(197, 203, 206, 0.8)',
          rightOffset: 2,
          barSpacing: 10,
          tickMarkFormatter: (time: number, tickMarkType: any, locale: string) => {
            // Properly format the time for display based on tickMarkType
            const date = new Date(time * 1000); // Convert seconds to milliseconds
            
            // Format based on the selected timeframe
            const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
            const month = date.toLocaleString('default', { month: 'short' });
            const day = date.getDate();
            const hours = pad(date.getHours());
            const minutes = pad(date.getMinutes());
            const year = date.getFullYear();
            
            // Return different formats based on the timeframe
            if (selectedTimeFrame === '1d' || selectedTimeFrame === '1w') {
              return `${day} ${month} ${year}`;
            } else if (selectedTimeFrame === '1h' || selectedTimeFrame === '4h') {
              return `${day} ${month}, ${hours}:${minutes}`;
            } else {
              return `${hours}:${minutes}`; // For minute-based timeframes
            }
          },
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
      });
      
      // Create candlestick series using the lightweight-charts v5 API
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      
      // Save references
      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      setChartInitialized(true);
      
      // Add user interaction handlers to detect when user is navigating history
      chart.timeScale().subscribeVisibleTimeRangeChange(() => {
        userInteractedRef.current = true;
        setAutoScroll(false);
      });
      
      // Re-enable auto-scroll when user clicks "go to last bar"
      chart.timeScale().subscribeSizeChange(() => {
        if (chart.timeScale().scrollPosition() === 1) {
          userInteractedRef.current = false;
          setAutoScroll(true);
        }
      });
      
      console.log('Chart initialized successfully');
      
      // If we already have data, set it immediately
      if (formattedCandles.length > 0) {
        console.log(`Setting initial ${formattedCandles.length} candles immediately after initialization`);
        candleSeries.setData(formattedCandles);
        setDisplayedCandleCount(formattedCandles.length);
        
        // Apply the last candle if available
        if (formattedLastCandle) {
          console.log('Setting initial last candle:', formattedLastCandle);
          candleSeries.update(formattedLastCandle);
          setLastUpdatedCandleTime(formattedLastCandle.time);
        }
        
        // Fit content after setting data
        setTimeout(() => {
          if (chartRef.current) {
            console.log('Fitting chart content to view');
            chartRef.current.timeScale().fitContent();
          }
        }, 50);
      } else {
        console.log('No candle data available during initialization - will request data');
        // Force a data refresh after a small delay to ensure WebSocket has time to connect
        setTimeout(() => {
          if (candleSeriesRef.current) {
            console.log('Requesting historical data for newly created chart');
            // This will trigger the useEffect that updates chart data
            setDisplayedCandleCount(0);
          }
        }, 500);
      }
      
    } catch (err) {
      console.error('Error initializing chart:', err);
    }
  }, [chartInitialized, isDisposingRef, formattedCandles, formattedLastCandle, selectedTimeFrame, pair.symbol]);
  
  // Create a function to explicitly refresh data if needed
  const refreshData = useCallback(() => {
    if (chartInitialized && candleSeriesRef.current) {
      console.log('[TradingViewChart] Manually refreshing chart data');
      
      // Force reload all data
      if (formattedCandles.length > 0) {
        try {
          candleSeriesRef.current.setData(formattedCandles);
          setDisplayedCandleCount(formattedCandles.length);
          
          // Apply the last candle if available
          if (formattedLastCandle) {
            candleSeriesRef.current.update(formattedLastCandle);
            setLastUpdatedCandleTime(formattedLastCandle.time);
          }
          
          // Auto-scroll to most recent candle
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        } catch (err) {
          console.error('Error refreshing chart data:', err);
        }
      }
    }
  }, [chartInitialized, formattedCandles, formattedLastCandle]);

  // Add an effect to handle pair changes and ensure data refreshes
  useEffect(() => {
    // When the pair changes, we need to ensure data is refreshed
    if (chartInitialized) {
      console.log('Pair changed to', pair.symbol, '- refreshing data');
      // Set a small timeout to allow for WebSocket connection to establish
      setTimeout(refreshData, 100);
    }
  }, [pair.symbol, chartInitialized, refreshData]);

  // Update chart candles from data
  useEffect(() => {
    if (!chartInitialized || !candleSeriesRef.current) {
      return;
    }
    
    // Skip updates if we're in the process of switching timeframes
    if (timeframeSwitchingRef.current) {
      console.log('Skipping chart update during timeframe switch');
      return;
    }
    
    // Don't wait for loading to complete to show initial data
    if (formattedCandles.length > 0) {
      console.log(`[TradingViewChart] Got ${formattedCandles.length} candles, last update: ${new Date().toISOString()}`);
      
      if (formattedCandles.length > 0 && displayedCandleCount === 0) {
        console.log('[TradingViewChart] First-time candle data load!');
        console.log('First candle:', formattedCandles[0]);
        console.log('Last candle:', formattedCandles[formattedCandles.length - 1]);
      }
      
      // Only update if we have new data
      if (formattedCandles.length !== displayedCandleCount) {
        console.log(`[TradingViewChart] Updating candles - previous count: ${displayedCandleCount}, new count: ${formattedCandles.length}`);
        
        try {
          candleSeriesRef.current.setData(formattedCandles);
          setDisplayedCandleCount(formattedCandles.length);
          
          // Auto-scroll to most recent candle after new data is loaded
          if (chartRef.current && autoScroll) {
            setTimeout(() => {
              if (chartRef.current) {
                console.log('[TradingViewChart] Fitting content after data update');
                chartRef.current.timeScale().fitContent();
              }
            }, 50);
          }
        } catch (err) {
          console.error('Error setting chart data:', err);
        }
      }
    }
    
    // Update last candle if it's newer than what we have
    if (formattedLastCandle && 
        (!lastUpdatedCandleTime || formattedLastCandle.time !== lastUpdatedCandleTime)) {
      console.log(`[TradingViewChart] Updating last candle: ${JSON.stringify(formattedLastCandle)}`);
      
      try {
        candleSeriesRef.current.update(formattedLastCandle);
        setLastUpdatedCandleTime(formattedLastCandle.time);
      } catch (err) {
        console.error('Error updating last candle:', err);
        // If we get "Cannot update oldest data" error, clear and reload all data
        if (String(err).includes('update oldest data')) {
          console.log('Got "Cannot update oldest data" error, attempting to reload chart data');
          try {
            candleSeriesRef.current.setData(formattedCandles);
          } catch (innerErr) {
            console.error('Error reloading chart data:', innerErr);
          }
        }
      }
    }
    
    // Track the last price for price line
    if (currentPrice !== null && lastPriceRef.current !== currentPrice) {
      console.log(`[TradingViewChart] Price updated: ${lastPriceRef.current} -> ${currentPrice}`);
      lastPriceRef.current = currentPrice;
    }
    
    // Auto-scroll to the most recent candle if enabled
    if (autoScroll && chartRef.current && !userInteractedRef.current) {
      const timeScale = chartRef.current.timeScale();
      // Check if the chart is not at the rightmost position
      const visibleRange = timeScale.getVisibleRange();
      const logicalRange = timeScale.getVisibleLogicalRange();
      
      if (visibleRange && logicalRange && formattedCandles.length > 0) {
        console.log(`[TradingViewChart] Auto-scrolling to latest candle`);
        timeScale.scrollToPosition(0, false);
      }
    }
  }, [chartInitialized, formattedCandles, formattedLastCandle, displayedCandleCount, lastUpdatedCandleTime, autoScroll, currentPrice]);
  
  // Modify the update function to force updates every second
  useEffect(() => {
    if (!chartInitialized || !candleSeriesRef.current || isDisposingRef.current) return;
    
    // Clear any existing interval
    if (updateTimerRef.current) {
      window.clearInterval(updateTimerRef.current);
      updateTimerRef.current = null;
    }
    
    // Function to update the last candle with the latest price
    const updateLastCandle = () => {
      // Skip updates if we're in the process of disposing or switching timeframes
      if (isDisposingRef.current || timeframeSwitchingRef.current) return;
      
      try {
        // Get the current price directly from the order book
        const directPrice = getCurrentPrice();
        
        // Only proceed if we have candles and a current price
        if (!formattedLastCandle || !directPrice || !candleSeriesRef.current) return;
        
        // Create updated candle with current price
        const updatedCandle = {
          time: formattedLastCandle.time, // Already properly formatted as seconds
          open: formattedLastCandle.open,
          high: Math.max(formattedLastCandle.high, directPrice),
          low: Math.min(formattedLastCandle.low, directPrice),
          close: directPrice, // Use direct price from order book
        };
        
        // Always update every second regardless of price change
        try {
          candleSeriesRef.current.update(updatedCandle);
          
          // Update the last forced update timestamp
          lastForcedUpdateRef.current = Date.now();
          
          // Only auto-scroll if user hasn't interacted with the chart
          if (autoScroll && !userInteractedRef.current && chartRef.current) {
            // Use a less aggressive approach by just ensuring the last bar is visible
            if (chartRef.current.timeScale().scrollPosition() < 0.9) {
              chartRef.current.timeScale().scrollToPosition(0, false);
            }
          }
        } catch (err) {
          console.error('Error updating candle series:', err);
          // Series might be disposed, so we clear our reference
          if (String(err).includes('disposed')) {
            candleSeriesRef.current = null;
          }
        }
      } catch (err) {
        console.error('Error updating last candle:', err);
      }
    };
    
    // Run immediately once
    updateLastCandle();
    
    // Set up interval to run every 1000ms (1 time per second)
    updateTimerRef.current = window.setInterval(updateLastCandle, 1000);
    
    // Clean up on unmount
    return () => {
      if (updateTimerRef.current) {
        window.clearInterval(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, [chartInitialized, formattedLastCandle, getCurrentPrice, autoScroll, isDisposingRef]);
  
  // Handle resize with debounce
  const handleResize = useCallback(debounce(() => {
    if (chartContainerRef.current && chartRef.current && !isDisposingRef.current) {
      const { clientWidth, clientHeight } = chartContainerRef.current;
      
      // Only update if dimensions actually changed
      if (clientWidth > 0 && clientHeight > 0) {
        try {
          chartRef.current.applyOptions({
            width: clientWidth,
            height: clientHeight,
          });
          
          // Only fit content if auto scroll is enabled
          if (autoScroll) {
            chartRef.current.timeScale().fitContent();
          }
        } catch (err) {
          console.error('Error during resize:', err);
          // Chart might be disposed, so we clear our reference
          if (String(err).includes('disposed')) {
            chartRef.current = null;
          }
        }
      }
    }
  }, 100), [autoScroll, isDisposingRef]);
  
  // Set up resize observer
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    let resizeObserver: ResizeObserver | null = null;
    
    try {
      resizeObserver = new ResizeObserver((entries) => {
        if (entries.length === 0 || !entries[0].target || isDisposingRef.current) return;
        handleResize();
      });
      
      resizeObserver.observe(chartContainerRef.current);
      
      // Also keep the window resize listener for backup
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        
        // Safely destroy chart
        safelyDestroyChart();
      };
    } catch (error) {
      // ResizeObserver might not be supported
      console.error('ResizeObserver error:', error);
      
      // Fallback to window resize
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        
        // Safely destroy chart 
        safelyDestroyChart();
      };
    }
  }, [handleResize, safelyDestroyChart]);
  
  // Clean up chart when component will unmount
  useEffect(() => {
    return () => {
      safelyDestroyChart();
    };
  }, [safelyDestroyChart]);
  
  // Add a button in the UI to manually refresh data if needed
  const renderControls = () => {
    return (
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        {/* Existing buttons */}
        <ButtonGroup size="small" variant="outlined" aria-label="Chart controls">
          <Button
            size="small"
            onClick={refreshData}
            sx={{ 
              fontSize: '0.7rem', 
              py: 0.25, 
              color: 'text.secondary',
              borderColor: 'rgba(255,255,255,0.2)',
              '&:hover': { 
                borderColor: 'rgba(255,255,255,0.5)',
                backgroundColor: 'rgba(255,255,255,0.05)'
              }
            }}
          >
            Refresh
          </Button>
        </ButtonGroup>
      </Box>
    );
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Timeframe selector */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'flex-start', 
          mb: 1, 
          pl: 1,
          pt: 1,
          pointerEvents: 'auto', // Ensure clicks are captured
          zIndex: 10 // Ensure it's above other elements
        }}
        onClick={(e) => {
          // Stop propagation to prevent drag-and-drop from capturing clicks
          e.stopPropagation();
        }}
      >
        <ButtonGroup 
          size="small" 
          aria-label="timeframe selection"
        >
          <Button 
            variant={selectedTimeFrame === '1m' ? 'contained' : 'outlined'}
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              handleTimeFrameChange('1m');
            }}
          >
            1m
          </Button>
          <Button 
            variant={selectedTimeFrame === '5m' ? 'contained' : 'outlined'}
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              handleTimeFrameChange('5m');
            }}
          >
            5m
          </Button>
          <Button 
            variant={selectedTimeFrame === '15m' ? 'contained' : 'outlined'}
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              handleTimeFrameChange('15m');
            }}
          >
            15m
          </Button>
          <Button 
            variant={selectedTimeFrame === '1h' ? 'contained' : 'outlined'}
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              handleTimeFrameChange('1h');
            }}
          >
            1h
          </Button>
          <Button 
            variant={selectedTimeFrame === '4h' ? 'contained' : 'outlined'}
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              handleTimeFrameChange('4h');
            }}
          >
            4h
          </Button>
          <Button 
            variant={selectedTimeFrame === '1d' ? 'contained' : 'outlined'}
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              handleTimeFrameChange('1d');
            }}
          >
            1d
          </Button>
        </ButtonGroup>
      </Box>
      
      {/* Chart container */}
      <Box
        ref={chartContainerRef}
        sx={{
          flexGrow: 1,
          width: '100%',
          position: 'relative',
        }}
      >
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
      
      {renderControls()}
    </Box>
  );
};

export default TradingViewChart; 