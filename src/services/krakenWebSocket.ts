import { TradingPair, OrderBookEntry, Trade, ChartData } from '../types/market';
import krakenPairsData from '../data/krakenPairs.json';

// WebSocket connection URL for Kraken
const KRAKEN_WS_URL = 'wss://ws.kraken.com';

// Types for WebSocket response messages
interface KrakenTickerUpdate {
  c: string[]; // Last trade closed info: price, lot volume
  v: string[]; // Volume info: today, last 24 hours
  p: string[]; // Volume weighted average price: today, last 24 hours
  t: string[]; // Number of trades: today, last 24 hours
  l: string[]; // Low price: today, last 24 hours
  h: string[]; // High price: today, last 24 hours
  o: string[]; // Open price: today, last 24 hours
}

interface KrakenBookUpdate {
  as?: string[][]; // asks array of [price, volume, timestamp]
  bs?: string[][]; // bids array of [price, volume, timestamp]
  a?: string[][]; // ask updates
  b?: string[][]; // bid updates
}

interface KrakenTradeUpdate {
  0: string; // price
  1: string; // volume
  2: number; // timestamp
  3: string; // side: 'b' for buy, 's' for sell
  4: string; // orderType: 'l' or 'm' for limit or market
  5: string; // misc
  6: string; // trade id
}

interface KrakenOHLCUpdate {
  0: number; // candle start time
  1: string; // open price
  2: string; // high price
  3: string; // low price
  4: string; // close price
  5: string; // vwap price
  6: string; // volume
  7: number; // count
}

// Type for subscription message
interface SubscriptionMessage {
  event: string;
  pair: string[];
  subscription: {
    name: string;
    depth?: number;
    interval?: number;
  };
}

// Type for subscription status
interface SubscriptionStatus {
  status: string;
  channelName: string;
  pair: string;
  channelID: number;
  subscription: {
    name: string;
  };
}

// Type for WebSocket message handlers
type MessageHandler = (data: any) => void;

// Add these lines at the beginning of the file, before class KrakenWebSocketService
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Class for managing the WebSocket connection
class KrakenWebSocketService {
  private socket: WebSocket | null = null;
  private subscriptions = new Map<string, number>();
  private messageHandlers = new Map<string, MessageHandler[]>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private reconnectTimeoutId: number | null = null;
  private heartbeatInterval: number | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  
  // Initialize the WebSocket connection
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // If already connected, resolve immediately
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        this.connectionState = ConnectionState.CONNECTED;
        resolve();
        return;
      }
      
      // If currently connecting, wait for it
      if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
        console.log('WebSocket connection in progress, waiting...');
        
        const checkConnection = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection);
            this.connectionState = ConnectionState.CONNECTED;
            resolve();
          } else if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
            clearInterval(checkConnection);
            this.initializeConnection(resolve, reject);
          }
        }, 100);
        
        return;
      }
      
      // Initialize new connection
      this.initializeConnection(resolve, reject);
    });
  }
  
  // Send heartbeat to keep connection alive
  private startHeartbeat() {
    this.clearHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      this.send({ event: 'ping' });
    }, 30000) as unknown as number;
  }
  
  // Clear heartbeat interval
  private clearHeartbeat() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  // Handle reconnection logic
  private handleReconnect() {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      this.connectionState = ConnectionState.RECONNECTING;
      
      this.reconnectTimeoutId = window.setTimeout(() => {
        this.connect().then(() => {
          // Resubscribe to all previously subscribed channels
          this.resubscribe();
        }).catch(error => {
          console.error('Failed to reconnect:', error);
          this.connectionState = ConnectionState.ERROR;
        });
      }, delay) as unknown as number;
    } else {
      console.error('Maximum reconnection attempts reached');
      this.connectionState = ConnectionState.ERROR;
    }
  }
  
  // Send message to the WebSocket server
  public send(message: any): boolean {
    if (!this.socket) {
      console.error('Cannot send message, WebSocket is null');
      return false;
    }
    
    if (this.socket.readyState !== WebSocket.OPEN) {
      console.error(`Cannot send message, WebSocket state is ${this.getReadyStateString(this.socket.readyState)}`);
      return false;
    }
    
    console.log('Sending message to WebSocket:', message);
    this.socket.send(JSON.stringify(message));
    return true;
  }
  
  // Handle incoming WebSocket messages
  private handleMessage(data: any): void {
    // If data is already parsed, use it directly
    let message: any;
    
    try {
      // Try to parse as JSON if it's a string
      if (typeof data === 'string') {
        message = JSON.parse(data);
      } else {
        message = data;
      }
      
      // Handle heartbeat response
      if (message.event === 'pong') {
        console.log('Pong received (keep-alive)');
        return;
      }
      
      // Handle subscription status message
      if (message.event === 'subscriptionStatus') {
        console.log('Handling subscription status message:', message);
        this.handleSubscriptionStatus(message);
        return;
      }
      
      // Handle data updates (arrays) - this is the most important part
      if (Array.isArray(message)) {
        const channelID = message[0];
        
        console.log(`Processing array message with channelID ${channelID}:`, {
          channelID,
          messageLength: message.length,
          messageType: typeof message[1],
          isArray: Array.isArray(message[1])
        });
        
        // First try to get channel info based on stored channelID
        let channelInfo = this.getChannelInfoById(channelID);
        let channelName: string | null = null;
        let pairName: string | null = null;
        
        // If we have channel info from our subscriptions map, use it
        if (channelInfo) {
          channelName = channelInfo.name;
          pairName = channelInfo.pair;
          console.log(`Found channel info from ID: name=${channelName}, pair=${pairName}`);
        } 
        // Otherwise try to extract the channel info from the message itself
        else if (message.length >= 4 && typeof message[2] === 'string') {
          channelName = message[2];
          pairName = typeof message[3] === 'string' ? message[3] : null;
          console.log(`Extracted channel info from message: name=${channelName}, pair=${pairName}`);
        }
        
        // If we have a channel name, look for handlers
        if (channelName) {
          const handlers = this.messageHandlers.get(channelName) || [];
          console.log(`Found ${handlers.length} handlers for channel '${channelName}'`);
          
          if (handlers.length > 0) {
            // Add pair information directly to the message data object for filtering
            const augmentedMessage = [...message];
            if (pairName) {
              // Add a special property to the last item if it's an object, or add a new item
              if (message.length > 3 && typeof message[message.length - 1] === 'object') {
                augmentedMessage[message.length - 1] = {
                  ...message[message.length - 1],
                  _pair: pairName
                };
              } else {
                augmentedMessage.push({ _pair: pairName });
              }
            }
            
            // Call each handler with the message and additional metadata
            handlers.forEach((handler, index) => {
              try {
                console.log(`Calling handler ${index} for channel '${channelName}' with pair '${pairName}'`);
                // Pass the augmented message with pair info
                handler(augmentedMessage);
              } catch (error) {
                console.error(`Error in handler ${index} for channel '${channelName}':`, error);
              }
            });
          } else {
            console.warn(`No handlers registered for channel '${channelName}'`);
          }
        } else {
          console.warn(`Could not determine channel for message with channelID ${channelID}`);
        }
      } else {
        // Non-array, non-subscription status message
        console.log('Received non-standard message:', message);
      }
    } catch (error) {
      console.error('Error handling message:', error, data);
    }
  }
  
  // Handle subscription status messages
  private handleSubscriptionStatus(message: SubscriptionStatus) {
    console.log('Subscription status:', message);
    
    if (message.status === 'subscribed') {
      const { channelName, pair, channelID, subscription } = message;
      const subKey = `${subscription.name}:${pair}`;
      
      console.log(`Successfully subscribed to ${subKey} with channel ID ${channelID}`);
      this.subscriptions.set(subKey, channelID);
    } else if (message.status === 'unsubscribed') {
      const { channelName, pair, subscription } = message;
      const subKey = `${subscription.name}:${pair}`;
      
      console.log(`Successfully unsubscribed from ${subKey}`);
      this.subscriptions.delete(subKey);
    } else if (message.status === 'error') {
      console.error(`Subscription error:`, message);
    }
  }
  
  // Get channel info (name and pair) by channel ID
  private getChannelInfoById(channelID: number): { name: string, pair: string } | null {
    for (const entry of Array.from(this.subscriptions.entries())) {
      const [key, id] = entry;
      if (id === channelID) {
        const [name, pair] = key.split(':');
        return { name, pair };
      }
    }
    return null;
  }
  
  // Get channel name by channel ID (for backward compatibility)
  private getChannelNameById(channelID: number): string | null {
    const channelInfo = this.getChannelInfoById(channelID);
    return channelInfo ? channelInfo.name : null;
  }
  
  // Resubscribe to all channels after reconnect
  private resubscribe() {
    const subscriptions = new Map(this.subscriptions);
    this.subscriptions.clear();
    
    for (const entry of Array.from(subscriptions.entries())) {
      const [key, _] = entry;
      const [name, pair] = key.split(':');
      
      if (name === 'ticker') {
        this.subscribeTicker([pair]);
      } else if (name === 'book') {
        this.subscribeOrderBook([pair]);
      } else if (name === 'ohlc') {
        // Assumes default interval of 1
        this.subscribeOHLC([pair], 1);
      } else if (name === 'trade') {
        this.subscribeTrades([pair]);
      }
    }
  }
  
  // Subscribe to ticker updates
  public subscribeTicker(pairs: string[]): boolean {
    return this.subscribe({
      event: 'subscribe',
      pair: pairs,
      subscription: {
        name: 'ticker'
      }
    });
  }
  
  // Subscribe to order book updates
  public subscribeOrderBook(pairs: string[], depth: number = 10): boolean {
    return this.subscribe({
      event: 'subscribe',
      pair: pairs,
      subscription: {
        name: 'book',
        depth: depth
      }
    });
  }
  
  // Subscribe to trade updates
  public subscribeTrades(pairs: string[]): boolean {
    return this.subscribe({
      event: 'subscribe',
      pair: pairs,
      subscription: {
        name: 'trade'
      }
    });
  }
  
  // Subscribe to OHLC updates
  public subscribeOHLC(pairs: string[], interval: number = 1): boolean {
    console.log(`⚠️ SUBSCRIBING TO OHLC with pairs: [${pairs.join(', ')}], interval: ${interval}`);
    
    // Ensure pair format is correct (should be like "ETH/USD")
    const formattedPairs = pairs.map(pair => {
      // Check if pair already has the correct format with a slash
      if (pair.includes('/')) {
        return pair;
      }
      
      // If it's a simple string without a slash, try to parse base and quote
      if (pair.length >= 6) { // Simple check to ensure we have enough characters
        // Assume the format might be something like "ETHUSD"
        const base = pair.substring(0, 3);
        const quote = pair.substring(3);
        return `${base}/${quote}`;
      }
      
      return pair; // Return as-is if we can't determine the format
    });
    
    console.log(`🔄 Formatted pairs for OHLC subscription: [${formattedPairs.join(', ')}]`);
    
    return this.subscribe({
      event: 'subscribe',
      pair: formattedPairs,
      subscription: {
        name: 'ohlc',
        interval: interval
      }
    });
  }
  
  // Generic subscription method
  private subscribe(message: SubscriptionMessage): boolean {
    if (!this.socket) {
      console.warn('Cannot subscribe, WebSocket not connected');
      return false;
    }

    try {
      console.log('📤 SENDING SUBSCRIPTION:', JSON.stringify(message, null, 2));
      return this.send(message);
    } catch (error) {
      console.error('Error subscribing:', error);
      return false;
    }
  }
  
  // Unsubscribe from a channel
  public unsubscribe(channelName: string, pairs: string[]): boolean {
    return this.send({
      event: 'unsubscribe',
      pair: pairs,
      subscription: {
        name: channelName
      }
    });
  }
  
  // Register a message handler for a specific channel
  public on(channelName: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(channelName) || [];
    handlers.push(handler);
    this.messageHandlers.set(channelName, handlers);
  }
  
  // Remove a message handler
  public off(channelName: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(channelName) || [];
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
      this.messageHandlers.set(channelName, handlers);
    }
  }
  
  // Close the WebSocket connection
  public disconnect(): void {
    this.clearHeartbeat();
    
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.socket) {
      this.socket.onclose = null; // Prevent auto-reconnect
      this.socket.close();
      this.socket = null;
    }
    
    this.subscriptions.clear();
  }
  
  // Convert Kraken ticker data to our application format
  public static formatTickerData(data: any): any {
    if (!Array.isArray(data) || data.length < 2) {
      return null;
    }
    
    const ticker = data[1] as KrakenTickerUpdate;
    
    return {
      lastPrice: parseFloat(ticker.c[0]),
      volume24h: parseFloat(ticker.v[1]),
      high24h: parseFloat(ticker.h[1]),
      low24h: parseFloat(ticker.l[1]),
      priceChange24h: parseFloat(ticker.c[0]) - parseFloat(ticker.o[1]),
      priceChangePercent24h: ((parseFloat(ticker.c[0]) - parseFloat(ticker.o[1])) / parseFloat(ticker.o[1])) * 100
    };
  }
  
  // Convert Kraken order book data to our application format
  public static formatOrderBookData(data: any): { asks: OrderBookEntry[], bids: OrderBookEntry[] } | null {
    if (!Array.isArray(data) || data.length < 2) {
      return null;
    }
    
    const bookData = data[1] as KrakenBookUpdate;
    const asks: OrderBookEntry[] = [];
    const bids: OrderBookEntry[] = [];
    
    // Process initial snapshot
    if (bookData.as) {
      bookData.as.forEach(ask => {
        asks.push({
          price: parseFloat(ask[0]),
          amount: parseFloat(ask[1]),
          total: 0 // Will be calculated later
        });
      });
    }
    
    if (bookData.bs) {
      bookData.bs.forEach(bid => {
        bids.push({
          price: parseFloat(bid[0]),
          amount: parseFloat(bid[1]),
          total: 0 // Will be calculated later
        });
      });
    }
    
    // Process updates
    if (bookData.a) {
      bookData.a.forEach(ask => {
        // Volume of 0 means remove the price level
        if (parseFloat(ask[1]) === 0) {
          const index = asks.findIndex(a => a.price === parseFloat(ask[0]));
          if (index !== -1) {
            asks.splice(index, 1);
          }
        } else {
          const index = asks.findIndex(a => a.price === parseFloat(ask[0]));
          if (index !== -1) {
            asks[index].amount = parseFloat(ask[1]);
          } else {
            asks.push({
              price: parseFloat(ask[0]),
              amount: parseFloat(ask[1]),
              total: 0
            });
          }
        }
      });
    }
    
    if (bookData.b) {
      bookData.b.forEach(bid => {
        // Volume of 0 means remove the price level
        if (parseFloat(bid[1]) === 0) {
          const index = bids.findIndex(b => b.price === parseFloat(bid[0]));
          if (index !== -1) {
            bids.splice(index, 1);
          }
        } else {
          const index = bids.findIndex(b => b.price === parseFloat(bid[0]));
          if (index !== -1) {
            bids[index].amount = parseFloat(bid[1]);
          } else {
            bids.push({
              price: parseFloat(bid[0]),
              amount: parseFloat(bid[1]),
              total: 0
            });
          }
        }
      });
    }
    
    // Sort and calculate totals
    asks.sort((a, b) => a.price - b.price);
    bids.sort((a, b) => b.price - a.price);
    
    let askTotal = 0;
    asks.forEach(ask => {
      askTotal += ask.amount;
      ask.total = askTotal;
    });
    
    let bidTotal = 0;
    bids.forEach(bid => {
      bidTotal += bid.amount;
      bid.total = bidTotal;
    });
    
    return { asks, bids };
  }
  
  // Convert Kraken trade data to our application format
  public static formatTradeData(data: any): Trade[] | null {
    if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
      return null;
    }
    
    const trades: Trade[] = [];
    const tradeData = data[1] as KrakenTradeUpdate[];
    
    tradeData.forEach(trade => {
      trades.push({
        id: trade[6],
        price: parseFloat(trade[0]),
        amount: parseFloat(trade[1]),
        timestamp: trade[2] * 1000, // Convert to milliseconds
        side: trade[3] === 'b' ? 'buy' : 'sell'
      });
    });
    
    return trades;
  }
  
  // Convert Kraken OHLC data to our application format
  public static formatOHLCData(data: any): ChartData | null {
    if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
      return null;
    }
    
    const ohlcData = data[1] as unknown as KrakenOHLCUpdate;
    
    return {
      time: ohlcData[0] * 1000, // Convert to milliseconds
      open: parseFloat(ohlcData[1]),
      high: parseFloat(ohlcData[2]),
      low: parseFloat(ohlcData[3]),
      close: parseFloat(ohlcData[4]),
      volume: parseFloat(ohlcData[6])
    };
  }
  
  // Convert trading pair to Kraken format
  public static formatPairForKraken(pair: TradingPair): string {
    // First try to find the pair in our krakenPairs.json database
    const key = `${pair.baseAsset}${pair.quoteAsset}`;
    const krakenPair = (krakenPairsData as any).result[key];
    
    // If we found the pair in our database, use the wsname (WebSocket name) from it
    if (krakenPair && krakenPair.wsname) {
      console.log(`Found wsname ${krakenPair.wsname} for pair ${key} in database`);
      return krakenPair.wsname;
    }
    
    // Fallback to our old method if the pair wasn't found in the database
    console.log(`Pair ${key} not found in database, using fallback method`);

    // Common mappings
    const assetMap: Record<string, string> = {
      'BTC': 'XBT', // Note: Kraken uses XBT instead of BTC
      'ETH': 'ETH',
      'USD': 'USD',
      'EUR': 'EUR',
      'GBP': 'GBP',
      'JPY': 'JPY',
      'CAD': 'CAD',
      'AUD': 'AUD'
    };
    
    // Use mapped values if they exist, otherwise use the original
    const base = assetMap[pair.baseAsset] || pair.baseAsset;
    const quote = assetMap[pair.quoteAsset] || pair.quoteAsset;
    
    // Return in ISO 4217-A3 format with slash
    return `${base}/${quote}`;
  }
  
  // Test connection with a known working symbol
  public testConnection(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Starting test connection...');
        await this.connect();
        
        console.log('Testing connection with BTC/USD pair (XBT/USD in Kraken)');
        
        let messageReceived = false;
        
        const handler = (data: any) => {
          console.log('Test connection received data:', data);
          messageReceived = true;
          this.off('ticker', handler);
          this.unsubscribe('ticker', ['XBT/USD']);
          resolve();
        };
        
        this.on('ticker', handler);
        
        // Create subscription message directly
        const subscriptionMessage = {
          event: 'subscribe',
          pair: ['XBT/USD'],
          subscription: {
            name: 'ticker'
          }
        };
        
        console.log('Sending subscription message:', subscriptionMessage);
        const success = this.send(subscriptionMessage);
        
        if (!success) {
          throw new Error('Failed to send subscription message');
        }
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (!messageReceived) {
            this.off('ticker', handler);
            
            // Try to unsubscribe cleanly even though we timed out
            try {
              this.unsubscribe('ticker', ['XBT/USD']);
            } catch (e) {
              console.error('Error unsubscribing after timeout:', e);
            }
            
            console.error('Test connection timed out - no response received from Kraken');
            reject(new Error('Test connection timed out'));
          }
        }, 10000);
      } catch (error) {
        console.error('Test connection error:', error);
        reject(error);
      }
    });
  }
  
  // Add this new method for connection initialization
  private initializeConnection(resolve: () => void, reject: (reason?: any) => void): void {
    console.log(`Connecting to Kraken WebSocket at ${KRAKEN_WS_URL}`);
    this.connectionState = ConnectionState.CONNECTING;
    
    try {
      // Close existing socket if it exists
      if (this.socket) {
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.close();
      }
      
      this.socket = new WebSocket(KRAKEN_WS_URL);
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timeout');
          this.connectionState = ConnectionState.ERROR;
          
          if (this.socket) {
            this.socket.onclose = null;
            this.socket.close();
          }
          
          reject(new Error('WebSocket connection timeout after 10 seconds'));
        }
      }, 10000);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection opened successfully');
        clearTimeout(connectionTimeout);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.connectionState = ConnectionState.CONNECTED;
        resolve();
      };
      
      this.socket.onclose = (event) => {
        console.log(`WebSocket connection closed: code=${event.code}, reason=${event.reason || 'No reason provided'}, wasClean=${event.wasClean}`);
        clearTimeout(connectionTimeout);
        this.clearHeartbeat();
        this.connectionState = ConnectionState.DISCONNECTED;
        this.handleReconnect();
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionState = ConnectionState.ERROR;
        // Don't reject here, let onclose handle it
      };
      
      this.socket.onmessage = (event) => {
        console.log('💬 RAW WS MESSAGE:', event.data);
        
        try {
          let data = event.data;
          // Try to parse as JSON
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch (e) {
              console.log('Non-JSON WebSocket message received:', data);
            }
          }
          
          console.log('WebSocket received [DETAILED DEBUG]:', data);
          
          // Add more detailed debugging for different message types
          if (Array.isArray(data)) {
            console.log('ARRAY DATA RECEIVED:', {
              channelID: data[0],
              dataType: typeof data[1],
              dataLength: data.length,
              fullData: JSON.stringify(data),
              pairInfo: data.length > 2 ? data[data.length-1] : 'unknown',
              timestamp: new Date().toISOString()
            });
            
            // Check specifically for OHLC data format
            if (data.length >= 4 && typeof data[0] === 'number' && Array.isArray(data[1]) && data[1].length >= 8) {
              console.log('🕯️ OHLC DATA DETECTED:', {
                channelID: data[0],
                ohlcData: data[1],
                channelName: data[2],
                pair: data[3],
                parsedOHLC: {
                  time: data[1][0] * 1000,
                  open: parseFloat(data[1][1]),
                  high: parseFloat(data[1][2]),
                  low: parseFloat(data[1][3]),
                  close: parseFloat(data[1][4]),
                  volume: parseFloat(data[1][6])
                }
              });
            }
          } else if (data.event === 'heartbeat') {
            console.log('Heartbeat received at', new Date().toISOString());
          } else if (data.event === 'subscriptionStatus') {
            console.log('SUBSCRIPTION STATUS:', data);
            // Check if the subscription was successful
            if (data.status === 'subscribed') {
              console.log('✅ SUCCESSFULLY SUBSCRIBED TO:', {
                channelName: data.channelName,
                pair: data.pair,
                channelID: data.channelID
              });
            } else if (data.status === 'error') {
              console.error('❌ SUBSCRIPTION ERROR:', data.errorMessage);
            }
          }
          
          this.handleMessage(event.data);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.connectionState = ConnectionState.ERROR;
      reject(error);
    }
  }
  
  // Add this helper method for readable WebSocket states
  private getReadyStateString(state: number): string {
    switch (state) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return `UNKNOWN (${state})`;
    }
  }
  
  // Add this getter method
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }
  
  // Add a method to force reconnection of the WebSocket
  public forceReconnect(): Promise<void> {
    console.log('🔄 Force reconnecting WebSocket...');
    
    // First disconnect
    this.disconnect();
    
    // Reset connection state and attempts
    this.connectionState = ConnectionState.DISCONNECTED;
    this.reconnectAttempts = 0;
    
    // Connect again
    return this.connect().then(() => {
      console.log('✅ Force reconnect successful');
    }).catch(error => {
      console.error('❌ Force reconnect failed:', error);
      throw error;
    });
  }
  
  // Add a method to resubscribe to a specific channel
  public resubscribeChannel(channelName: string, pair: string, interval?: number): boolean {
    // First unsubscribe
    console.log(`Resubscribing to ${channelName} for ${pair}...`);
    this.unsubscribe(channelName, [pair]);
    
    // Then subscribe again
    if (channelName === 'ohlc') {
      return this.subscribeOHLC([pair], interval || 1);
    } else if (channelName === 'ticker') {
      return this.subscribeTicker([pair]);
    } else if (channelName === 'book') {
      return this.subscribeOrderBook([pair]);
    } else if (channelName === 'trade') {
      return this.subscribeTrades([pair]);
    }
    
    return false;
  }
}

// Create a singleton instance
const krakenWebSocket = new KrakenWebSocketService();

export default krakenWebSocket; 