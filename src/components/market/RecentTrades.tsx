import React from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper 
} from '@mui/material';
import { TradingPair } from '../../types/market';
import { useRecentTrades } from '../../hooks/useRecentTrades';

interface RecentTradesProps {
  pair: TradingPair;
}

const RecentTrades: React.FC<RecentTradesProps> = ({ pair }) => {
  const { trades, loading, error } = useRecentTrades(pair);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  if (loading) {
    return <Box p={2}><Typography>Loading trades...</Typography></Box>;
  }

  if (error) {
    return <Box p={2}><Typography color="error">Error loading trades</Typography></Box>;
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflow: 'hidden',
      borderLeft: 1,
      borderColor: 'divider'
    }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1 }}>
        <Typography variant="subtitle1">Recent Trades</Typography>
      </Box>
      
      <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades?.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell component="th" scope="row">
                  {formatTime(trade.timestamp)}
                </TableCell>
                <TableCell 
                  align="right"
                  sx={{ color: trade.side === 'buy' ? 'success.main' : 'error.main' }}
                >
                  {trade.price.toFixed(2)}
                </TableCell>
                <TableCell align="right">{trade.amount.toFixed(6)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default RecentTrades; 