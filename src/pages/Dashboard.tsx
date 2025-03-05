import React, { useState, useEffect } from 'react';
import { Box, Paper, Grid } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import PairSelector from '../components/market/PairSelector';
import Chart from '../components/chart/Chart';
import OrderBook from '../components/market/OrderBook';
import RecentTrades from '../components/market/RecentTrades';
import MarketSummary from '../components/market/MarketSummary';
import TradingPanel from '../components/trading/TradingPanel';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { TradingPair } from '../types/market';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { currentPair, currentExchange } = useSelector((state: RootState) => state.market);
  const { layouts, currentLayout } = useSelector((state: RootState) => state.layout);
  
  // Update the currentPairState with all required properties
  const [currentPairState, setCurrentPairState] = useState<TradingPair>({
    exchange: 'binance',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    symbol: 'BTCUSDT'
  });

  // Default layout if none is saved
  const defaultLayout = {
    lg: [
      { i: 'pairSelector', x: 0, y: 0, w: 12, h: 1 },
      { i: 'chart', x: 0, y: 1, w: 8, h: 6 },
      { i: 'orderBook', x: 8, y: 1, w: 4, h: 3 },
      { i: 'recentTrades', x: 8, y: 4, w: 4, h: 3 },
      { i: 'marketSummary', x: 0, y: 7, w: 4, h: 2 },
      { i: 'tradingPanel', x: 4, y: 7, w: 8, h: 2 },
    ],
    md: [
      { i: 'pairSelector', x: 0, y: 0, w: 10, h: 1 },
      { i: 'chart', x: 0, y: 1, w: 6, h: 6 },
      { i: 'orderBook', x: 6, y: 1, w: 4, h: 3 },
      { i: 'recentTrades', x: 6, y: 4, w: 4, h: 3 },
      { i: 'marketSummary', x: 0, y: 7, w: 4, h: 2 },
      { i: 'tradingPanel', x: 4, y: 7, w: 6, h: 2 },
    ],
  };

  const currentLayoutConfig = layouts[currentLayout] || defaultLayout;

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <ResponsiveGridLayout
        className="layout"
        layouts={currentLayoutConfig}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        isDraggable
        isResizable
      >
        <Box key="pairSelector">
          <Paper sx={{ p: 2, height: '100%' }}>
            <PairSelector />
          </Paper>
        </Box>
        
        <Box key="chart">
          <Paper sx={{ p: 2, height: '100%' }}>
            <Chart />
          </Paper>
        </Box>
        
        <Box key="orderBook">
          <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <OrderBook pair={currentPairState} />
          </Paper>
        </Box>
        
        <Box key="recentTrades">
          <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <RecentTrades pair={currentPairState} />
          </Paper>
        </Box>
        
        <Box key="marketSummary">
          <Paper sx={{ p: 2, height: '100%' }}>
            <MarketSummary pair={currentPairState} />
          </Paper>
        </Box>
        
        <Box key="tradingPanel">
          <Paper sx={{ p: 2, height: '100%' }}>
            <TradingPanel pair={currentPairState} />
          </Paper>
        </Box>
      </ResponsiveGridLayout>
    </Box>
  );
};

export default Dashboard; 