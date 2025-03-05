import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { TradingPair } from '../../types/market';
import { useOrderBook } from '../../hooks/useOrderBook';

interface OrderBookProps {
  pair: TradingPair;
  // Option to enable price grouping
  priceGrouping?: boolean;
  // Flag to indicate if the orderbook is visible
  isVisible?: boolean;
}

// Track executed orders for visual effects
interface ExecutedOrder {
  price: number;
  amount: number;
  type: 'ask' | 'bid';
  timestamp: number;
}

// Grouped order type
interface GroupedOrder {
  price: number;
  amount: number;
  total: number;
  count: number; // Number of orders in this group
  percentage: number; // For visualization
}

const OrderBook: React.FC<OrderBookProps> = ({ pair, priceGrouping = true, isVisible = true }) => {
  const { orderBook, loading, error } = useOrderBook(pair, isVisible);
  const { asks, bids } = orderBook;
  const [executedOrders, setExecutedOrders] = useState<ExecutedOrder[]>([]);
  const prevAsksRef = useRef<any[]>([]);
  const prevBidsRef = useRef<any[]>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  
  // Number of visible price levels on each side
  const visibleLevels = 15;

  // Format numbers for display
  const formatNumber = useCallback((num: number) => {
    if (num >= 1000) {
      return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    
    if (num >= 1) {
      return num.toFixed(2);
    }
    
    return num.toFixed(4);
  }, []);

  // Calculate the price grouping factor based on the current price range
  const calculateGroupingFactor = useCallback((data: any[], defaultFactor = 0.1) => {
    if (!data || data.length < 2) return defaultFactor;
    
    // Get the price range
    const prices = data.map(item => item.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    
    // More aggressive grouping (removing decimals for higher price ranges)
    if (range < 1) return 0.01;  // Small range - fine granularity
    if (range < 10) return 0.5;  // Medium range - half point increments
    if (range < 100) return 1;   // Larger range - whole points
    if (range < 1000) return 10; // Very large range - ten point increments
    return 100;                  // Extreme range - hundred point increments
  }, []);

  // Group orders by price levels
  const groupOrders = useCallback((orders: any[], groupingFactor: number, isAsk: boolean): GroupedOrder[] => {
    if (!orders || orders.length === 0) return [];
    
    const grouped: Record<string, GroupedOrder> = {};
    
    orders.forEach(order => {
      // Ensure order has the correct structure
      if (typeof order.price !== 'number' || typeof order.amount !== 'number') {
        console.error('Invalid order data:', order);
        return;
      }
      
      // Round the price to the nearest grouping factor
      const groupedPrice = Math.floor(order.price / groupingFactor) * groupingFactor;
      const priceKey = groupedPrice.toString();
      
      if (!grouped[priceKey]) {
        grouped[priceKey] = {
          price: groupedPrice,
          amount: 0,
          total: 0,
          count: 0,
          percentage: 0
        };
      }
      
      grouped[priceKey].amount += order.amount;
      grouped[priceKey].total += order.amount; // Sum up the totals
      grouped[priceKey].count += 1;
    });
    
    // Convert to array and sort
    let result = Object.values(grouped);
    result = isAsk 
      ? result.sort((a, b) => a.price - b.price) // Ascending for asks
      : result.sort((a, b) => b.price - a.price); // Descending for bids
    
    // Take only the visible levels
    result = result.slice(0, visibleLevels);
    
    // Calculate cumulative totals if needed
    let runningTotal = 0;
    result.forEach(item => {
      runningTotal += item.amount;
      item.total = runningTotal;
    });
    
    // Find the maximum amount for percentage calculation
    const maxAmount = Math.max(...result.map(item => item.amount), 0.000001);
    
    // Calculate percentage for visualization
    result.forEach(item => {
      item.percentage = (item.amount / maxAmount) * 100;
    });
    
    return result;
  }, [visibleLevels]);

  // Throttle rendering to prevent too many updates
  const shouldRender = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastRenderTimeRef.current;
    
    // Calculate render throttle based on the size of updates and device performance
    // More intense data = lower frequency updates
    const itemCount = (asks?.length || 0) + (bids?.length || 0);
    
    // Base throttle of 100ms
    let throttleTime = 100;
    
    // Increase throttle for larger datasets
    if (itemCount > 200) throttleTime = 250;
    if (itemCount > 500) throttleTime = 500;
    
    // If we're within throttle period, skip this render
    if (elapsed < throttleTime) {
      return false;
    }
    
    // Update last render time
    lastRenderTimeRef.current = now;
    renderCountRef.current++;
    
    // If not visible, render less frequently (every 5th update)
    if (!isVisible && renderCountRef.current % 5 !== 0) {
      return false;
    }
    
    return true;
  }, [asks, bids, isVisible]);

  // Process and group the order book data with throttling
  const processedOrderBook = useMemo(() => {
    // Skip processing if we shouldn't render
    if (!shouldRender()) {
      // Return the previous result
      return {
        groupedAsks: prevAsksRef.current || [],
        groupedBids: prevBidsRef.current || []
      };
    }
    
    // Calculate grouping factors
    const askGroupingFactor = priceGrouping ? calculateGroupingFactor(asks) : 0;
    const bidGroupingFactor = priceGrouping ? calculateGroupingFactor(bids) : 0;
    
    // Group orders if grouping is enabled
    const groupedAsks = priceGrouping 
      ? groupOrders(asks, askGroupingFactor, true)
      : asks.slice(0, visibleLevels).map((ask, i) => ({
          ...ask,
          count: 1,
          percentage: 0 // Will be calculated below
        }));
    
    const groupedBids = priceGrouping
      ? groupOrders(bids, bidGroupingFactor, false)
      : bids.slice(0, visibleLevels).map((bid, i) => ({
          ...bid,
          count: 1,
          percentage: 0 // Will be calculated below
        }));
    
    // If not using price grouping, calculate percentages for visualization
    if (!priceGrouping) {
      // Find max amounts
      const maxAskAmount = Math.max(...groupedAsks.map(ask => ask.amount), 0.000001);
      const maxBidAmount = Math.max(...groupedBids.map(bid => bid.amount), 0.000001);
      
      // Calculate percentages
      groupedAsks.forEach(ask => {
        ask.percentage = (ask.amount / maxAskAmount) * 100;
      });
      
      groupedBids.forEach(bid => {
        bid.percentage = (bid.amount / maxBidAmount) * 100;
      });
    }
    
    // Reverse the groupedAsks so lower prices are at the top (highest prices at bottom)
    const reversedAsks = [...groupedAsks].reverse();
    
    // Store the current result for next time
    prevAsksRef.current = reversedAsks;
    prevBidsRef.current = groupedBids;
    
    return { groupedAsks: reversedAsks, groupedBids };
  }, [asks, bids, priceGrouping, visibleLevels, groupOrders, calculateGroupingFactor, shouldRender]);
  
  // Track order changes to show execution effects
  useEffect(() => {
    if (asks.length === 0 || prevAsksRef.current.length === 0) {
      prevAsksRef.current = [...asks];
      return;
    }

    // Check for removed or decreased asks (sell orders being taken)
    const newExecuted: ExecutedOrder[] = [];
    
    prevAsksRef.current.forEach(prevAsk => {
      const currentAsk = asks.find(ask => ask.price === prevAsk.price);
      
      // Ask was removed or decreased in size (executed)
      if (!currentAsk || currentAsk.amount < prevAsk.amount) {
        const executedAmount = currentAsk ? prevAsk.amount - currentAsk.amount : prevAsk.amount;
        newExecuted.push({
          price: prevAsk.price,
          amount: executedAmount,
          type: 'ask',
          timestamp: Date.now()
        });
      }
    });
    
    if (newExecuted.length > 0) {
      setExecutedOrders(prev => [...prev, ...newExecuted]);
    }
    
    prevAsksRef.current = [...asks];
  }, [asks]);
  
  // Similar effect for bids
  useEffect(() => {
    if (bids.length === 0 || prevBidsRef.current.length === 0) {
      prevBidsRef.current = [...bids];
      return;
    }

    // Check for removed or decreased bids (buy orders being taken)
    const newExecuted: ExecutedOrder[] = [];
    
    prevBidsRef.current.forEach(prevBid => {
      const currentBid = bids.find(bid => bid.price === prevBid.price);
      
      // Bid was removed or decreased in size (executed)
      if (!currentBid || currentBid.amount < prevBid.amount) {
        const executedAmount = currentBid ? prevBid.amount - currentBid.amount : prevBid.amount;
        newExecuted.push({
          price: prevBid.price,
          amount: executedAmount,
          type: 'bid',
          timestamp: Date.now()
        });
      }
    });
    
    if (newExecuted.length > 0) {
      setExecutedOrders(prev => [...prev, ...newExecuted]);
    }
    
    prevBidsRef.current = [...bids];
  }, [bids]);
  
  // Clean up old executed orders after animation
  useEffect(() => {
    if (executedOrders.length === 0) return;
    
    const timer = setTimeout(() => {
      // Remove orders older than 1 second
      const now = Date.now();
      setExecutedOrders(prev => prev.filter(order => now - order.timestamp < 1000));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [executedOrders]);

  // Instead of scrolling, we'll use a fixed layout with two scrollable sections
  const topContainerRef = useRef<HTMLDivElement>(null);
  const bottomContainerRef = useRef<HTMLDivElement>(null);

  // Calculate spread
  const spreadData = useMemo(() => {
    if (asks.length > 0 && bids.length > 0) {
      const bestAsk = asks[0].price;
      const bestBid = bids[0].price;
      const spread = bestAsk - bestBid;
      const spreadPercentage = ((spread / bestBid) * 100).toFixed(2);
      return {
        spread: formatNumber(spread),
        percentage: spreadPercentage
      };
    }
    return null;
  }, [asks, bids, formatNumber]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle2" sx={{ p: 0.5, textAlign: 'center', fontSize: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
        Order Book - {pair.baseAsset}/{pair.quoteAsset}
      </Typography>
      
      {error && (
        <Box sx={{ p: 1, textAlign: 'center', color: 'error.main', fontSize: '0.75rem' }}>
          {error}
        </Box>
      )}
      
      {loading && asks.length === 0 && bids.length === 0 ? (
        <Box sx={{ p: 1, textAlign: 'center', fontSize: '0.75rem' }}>
          Loading order book data...
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Top section - Asks (sell orders) - Now with reversed order */}
          <Box 
            ref={topContainerRef}
            sx={{ 
              flex: 1, 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column', // Changed from column-reverse to column since we reversed the data
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
              }
            }}
          >
            <Table size="small" sx={{ tableLayout: "fixed" }}>

              <TableBody>
                {processedOrderBook.groupedAsks.map((ask, index) => {
                  // Check if this order was just executed
                  const wasExecuted = executedOrders.some(order => 
                    order.type === 'ask' && Math.abs(order.price - ask.price) < 0.5
                  );
                  
                  // Simplify price display based on the size
                  let formattedPrice = formatNumber(ask.price);
                  if (ask.price >= 1000) {
                    formattedPrice = ask.price.toLocaleString('en-US', { maximumFractionDigits: 1 });
                  } else if (ask.price >= 100) {
                    formattedPrice = ask.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
                  }
                  
                  // Format amount and total
                  const formattedAmount = formatNumber(ask.amount);
                  const formattedTotal = formatNumber(ask.total);
                  
                  return (
                    <TableRow 
                      key={`ask-${index}`}
                      sx={{
                        height: '18px', // Compact row height
                        position: 'relative',
                        bgcolor: wasExecuted ? 'rgba(255, 82, 82, 0.15)' : 'transparent',
                        transition: 'background-color 0.5s ease',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          height: '100%',
                          width: `${ask.percentage}%`,
                          backgroundColor: 'rgba(255, 82, 82, 0.15)',
                          zIndex: 0,
                        }
                      }}
                    >
                      <TableCell 
                        align="right" 
                        width="33%"
                        sx={{ 
                          color: 'error.main',  // Red color for sell prices
                          py: 0.25,
                          px: 0.5,
                          fontSize: '0.7rem',
                          fontWeight: index === 0 ? 'bold' : 'normal', // Highlight best ask
                          position: 'relative',
                          zIndex: 1,
                          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {formattedPrice}{ask.count > 1 && <Typography component="span" sx={{ fontSize: '0.6rem', ml: 0.3, opacity: 0.7 }}>{ask.count}</Typography>}
                      </TableCell>
                      <TableCell 
                        align="right" 
                        width="33%"
                        sx={{ 
                          py: 0.25, 
                          px: 0.5, 
                          fontSize: '0.7rem',
                          position: 'relative',
                          zIndex: 1,
                          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                          color: 'text.primary',  // Default color for amounts
                        }}
                      >
                        {formattedAmount}
                      </TableCell>
                      <TableCell 
                        align="right" 
                        width="33%"
                        sx={{ 
                          py: 0.25, 
                          px: 0.5, 
                          fontSize: '0.7rem',
                          position: 'relative',
                          zIndex: 1,
                          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {formattedTotal}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          
          {/* Middle section - Spread */}
          {spreadData && (
            <Box sx={{ 
              borderTop: '1px solid rgba(255, 255, 255, 0.12)', 
              borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              py: 0.5,
              textAlign: 'center',
            }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>
                Spread: {spreadData.spread} ({spreadData.percentage}%)
              </Typography>
            </Box>
          )}
          
          {/* Bottom section - Bids */}
          <Box 
            ref={bottomContainerRef}
            sx={{ 
              flex: 1,
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
              }
            }}
          >
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableBody>
                {processedOrderBook.groupedBids.map((bid, index) => {
                  // Check if this order was just executed
                  const wasExecuted = executedOrders.some(order => 
                    order.type === 'bid' && Math.abs(order.price - bid.price) < 0.5
                  );
                  
                  // Simplify price display based on the size
                  let formattedPrice = formatNumber(bid.price);
                  if (bid.price >= 1000) {
                    formattedPrice = bid.price.toLocaleString('en-US', { maximumFractionDigits: 1 });
                  } else if (bid.price >= 100) {
                    formattedPrice = bid.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
                  }
                  
                  // Format amount and total
                  const formattedAmount = formatNumber(bid.amount);
                  const formattedTotal = formatNumber(bid.total);
                  
                  return (
                    <TableRow 
                      key={`bid-${index}`}
                      sx={{ 
                        height: '18px', // Compact row height
                        position: 'relative',
                        bgcolor: wasExecuted ? 'rgba(38, 166, 154, 0.15)' : 'transparent',
                        transition: 'background-color 0.5s ease',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: `${bid.percentage}%`,
                          backgroundColor: 'rgba(38, 166, 154, 0.15)',
                          zIndex: 0,
                        }
                      }}
                    >
                      <TableCell 
                        align="right" 
                        width="33%"
                        sx={{ 
                          color: 'success.main',  // Green color for buy prices
                          py: 0.25,
                          px: 0.5,
                          fontSize: '0.7rem',
                          fontWeight: index === 0 ? 'bold' : 'normal', // Highlight best bid
                          position: 'relative',
                          zIndex: 1,
                          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {formattedPrice}{bid.count > 1 && <Typography component="span" sx={{ fontSize: '0.6rem', ml: 0.3, opacity: 0.7 }}>{bid.count}</Typography>}
                      </TableCell>
                      <TableCell 
                        align="right" 
                        width="33%"
                        sx={{ 
                          py: 0.25, 
                          px: 0.5, 
                          fontSize: '0.7rem',
                          position: 'relative',
                          zIndex: 1,
                          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                          color: 'text.primary',  // Default color for amounts
                        }}
                      >
                        {formattedAmount}
                      </TableCell>
                      <TableCell 
                        align="right" 
                        width="33%"
                        sx={{ 
                          py: 0.25, 
                          px: 0.5, 
                          fontSize: '0.7rem',
                          position: 'relative',
                          zIndex: 1,
                          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {formattedTotal}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default OrderBook; 