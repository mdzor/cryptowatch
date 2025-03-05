import React, { useState, useEffect } from 'react';
import { Box, CssBaseline, Typography, Button, AppBar, Toolbar } from '@mui/material';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import Header from './components/layout/Header';
import ChartWidget from './components/chart/ChartWidget';
import PairSelector from './components/layout/PairSelector';
import WebSocketTester from './components/debug/WebSocketTester';
import DebugWebSocket from './pages/DebugWebSocket';
import { TradingPair } from './types/market';
import subscriptionManager from './services/SubscriptionManager';

// Create a responsive grid layout
const ResponsiveGridLayout = WidthProvider(Responsive);

// Initial trading pairs
const initialPairs: TradingPair[] = [
  { exchange: 'kraken', baseAsset: 'BTC', quoteAsset: 'USD', symbol: 'BTCUSD' },
  { exchange: 'kraken', baseAsset: 'ETH', quoteAsset: 'USD', symbol: 'ETHUSD' },
  { exchange: 'kraken', baseAsset: 'MSOL', quoteAsset: 'USD', symbol: 'MSOLUSD' },
  { exchange: 'kraken', baseAsset: 'AAVE', quoteAsset: 'USD', symbol: 'AAVEUSD' },
  { exchange: 'kraken', baseAsset: 'COW', quoteAsset: 'USD', symbol: 'COWUSD' },
];

// Define a type for valid timeframes
type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

// Initial layout configuration
const initialLayouts = {
  lg: [
    { i: 'chart-0', x: 0, y: 0, w: 4, h: 8 },
    { i: 'chart-1', x: 4, y: 0, w: 4, h: 8 },
    { i: 'chart-2', x: 8, y: 0, w: 4, h: 8 },
    { i: 'chart-3', x: 0, y: 8, w: 6, h: 10 },
    { i: 'chart-4', x: 6, y: 8, w: 6, h: 10 },
  ],
};

const App: React.FC = () => {
  // State for charts and their layouts
  const [pairs, setPairs] = useState<TradingPair[]>(initialPairs);
  const [layouts, setLayouts] = useState(initialLayouts);
  const [showOrderbook, setShowOrderbook] = useState<Record<string, boolean>>({
    'chart-0': false,
    'chart-1': false,
    'chart-2': false,
    'chart-3': false,
    'chart-4': false,
  });
  const [showDebugTools, setShowDebugTools] = useState(false);
  const [showAdvancedDebug, setShowAdvancedDebug] = useState(false);
  // Define default timeframes for each chart with proper typing
  const [chartTimeframes, setChartTimeframes] = useState<Record<string, TimeFrame>>({
    'chart-0': '1h',
    'chart-1': '1h',
    'chart-2': '1h',
    'chart-3': '15m',
    'chart-4': '15m',
  });
  
  // Adjust throttle settings based on number of charts
  useEffect(() => {
    // More charts = more aggressive throttling
    const baseThrottleInterval = 100 + (pairs.length * 25); // 100ms base + 25ms per chart
    const maxThrottleInterval = 300 + (pairs.length * 50);  // 300ms base + 50ms per chart
    
    // Configure the subscription manager
    subscriptionManager.setBaseThrottleInterval(baseThrottleInterval);
    subscriptionManager.setMaxThrottleInterval(maxThrottleInterval);
    
    console.log(`Configured throttling: base=${baseThrottleInterval}ms, max=${maxThrottleInterval}ms for ${pairs.length} charts`);
  }, [pairs.length]);

  // Handle layout changes
  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
  };

  // Add a new chart
  const handleAddChart = (pair: TradingPair) => {
    const newPairIndex = pairs.length;
    const newChartId = `chart-${newPairIndex}`;
    
    setPairs([...pairs, pair]);
    
    // Add new chart to layout
    const newLayouts = { ...layouts };
    if (newLayouts.lg) {
      newLayouts.lg = [
        ...newLayouts.lg,
        { i: newChartId, x: 0, y: Infinity, w: 4, h: 8 }
      ];
    }
    
    setLayouts(newLayouts);
    setShowOrderbook({ ...showOrderbook, [newChartId]: false });
  };

  // Remove a chart
  const handleRemoveChart = (chartId: string) => {
    const index = parseInt(chartId.split('-')[1]);
    
    // Get the current chart's layout info
    const chartToRemove = layouts.lg ? layouts.lg.find(item => item.i === chartId) : null;
    
    // Remove the pair
    const newPairs = [...pairs];
    newPairs.splice(index, 1);
    
    // Create updated chart IDs that will reflect the new indices
    const updatedChartIds = newPairs.map((_, idx) => `chart-${idx}`);
    
    // Create a mapping from old to new IDs for charts after the removed one
    const idMapping: Record<string, string> = {};
    for (let i = index; i < pairs.length - 1; i++) {
      idMapping[`chart-${i+1}`] = `chart-${i}`;
    }

    // Update the pairs first
    setPairs(newPairs);
    
    // Then update layouts with the new IDs while preserving positions and sizes
    const newLayouts = { ...layouts };
    if (newLayouts.lg) {
      // Filter out the removed chart and update IDs for remaining charts
      newLayouts.lg = newLayouts.lg
        .filter(item => item.i !== chartId)
        .map(item => {
          if (idMapping[item.i]) {
            // If this chart needs to be renamed, do so while preserving its w/h/x/y
            return { ...item, i: idMapping[item.i] };
          }
          return item;
        });
    }
    
    setLayouts(newLayouts);
    
    // Update showOrderbook state
    const newShowOrderbook: Record<string, boolean> = {};
    // Create new showOrderbook state with updated IDs
    Object.entries(showOrderbook).forEach(([id, value]) => {
      if (id !== chartId) {
        const newId = idMapping[id] || id;
        newShowOrderbook[newId] = value;
      }
    });
    
    setShowOrderbook(newShowOrderbook);
  };

  // Toggle orderbook visibility for a specific chart
  const toggleOrderbook = (chartId: string) => {
    setShowOrderbook(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

  // Toggle debug tools visibility
  const toggleDebugTools = () => {
    setShowDebugTools(!showDebugTools);
    if (!showDebugTools) {
      setShowAdvancedDebug(false);
    }
  };

  // Toggle advanced debug visibility
  const toggleAdvancedDebug = () => {
    setShowAdvancedDebug(!showAdvancedDebug);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header 
        onToggleDebugTools={toggleDebugTools}
        onToggleAdvancedDebug={toggleAdvancedDebug}
        showDebugTools={showDebugTools}
        showAdvancedDebug={showAdvancedDebug}
      >
        <PairSelector onAddChart={handleAddChart} />
      </Header>
      
      {/* Debug Panel - Only shown when enabled via settings */}
      {showDebugTools && (
        <Box sx={{ bgcolor: 'rgba(0,0,0,0.2)', px: 2, py: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" color="error">
              Debug Tools
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button 
                size="small" 
                color="error"
                variant={showAdvancedDebug ? "contained" : "outlined"}
                onClick={toggleAdvancedDebug} 
                sx={{ mr: 2, fontSize: '0.7rem' }}
              >
                {showAdvancedDebug ? "Hide Advanced" : "Advanced Debug"}
              </Button>
            </Box>
          </Box>
          {showAdvancedDebug ? <DebugWebSocket /> : <WebSocketTester />}
        </Box>
      )}
      
      {/* Rest of the app */}
      {!showAdvancedDebug && (
        <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={30}
            onLayoutChange={handleLayoutChange}
            isDraggable
            isResizable
            draggableHandle=".drag-handle"
            resizeHandles={['se']}
            resizeHandle={
              <div 
                style={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  right: 0, 
                  width: '20px', 
                  height: '20px', 
                  cursor: 'se-resize',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
                  borderTopLeftRadius: '4px'
                }}
              />
            }
          >
            {pairs.map((pair, index) => {
              const chartId = `chart-${index}`;
              return (
                <div key={chartId}>
                  <ChartWidget
                    pair={pair}
                    showOrderbook={showOrderbook[chartId]}
                    onToggleOrderbook={() => toggleOrderbook(chartId)}
                    onRemove={() => handleRemoveChart(chartId)}
                    timeFrame={chartTimeframes[chartId]}
                  />
                </div>
              );
            })}
          </ResponsiveGridLayout>
        </Box>
      )}
    </Box>
  );
};

export default App; 