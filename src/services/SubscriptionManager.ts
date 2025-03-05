import krakenWebSocket from './krakenWebSocket';

// Callback function type for subscription updates
type SubscriptionCallback = (data: any) => void;

/**
 * Subscription manager singleton to optimize WebSocket subscriptions
 * This ensures only one subscription exists per pair/channel, even if
 * multiple components are displaying the same data
 */
class SubscriptionManager {
  // Map to track active subscriptions: channel:pair -> Set of callbacks
  private activeSubscriptions = new Map<string, Set<SubscriptionCallback>>();
  // Map to track reference counts for each subscription
  private subscriptionCounts = new Map<string, number>();
  // Map to track last update time for throttling
  private lastUpdateTime = new Map<string, number>();
  // Map to track pending updates during throttling
  private pendingUpdates = new Map<string, any>();
  // Map to track throttling timeouts
  private throttleTimers = new Map<string, NodeJS.Timeout>();
  // Base throttle interval in ms (will scale with subscription count)
  private baseThrottleInterval = 100; 
  // Maximum throttle interval regardless of subscription count
  private maxThrottleInterval = 500;

  /**
   * Subscribe to a channel for a specific pair
   * @param channel The channel name (book, ohlc, ticker, etc.)
   * @param pair The trading pair
   * @param callback The callback function to handle data updates
   * @param depth Optional depth parameter for order book subscriptions
   * @param interval Optional interval parameter for OHLC subscriptions
   * @returns True if subscription was successful
   */
  subscribe(
    channel: string, 
    pair: string, 
    callback: SubscriptionCallback, 
    depth: number = 25, 
    interval: number = 1
  ): boolean {
    const key = `${channel}:${pair}`;
    
    // If we already have callbacks for this subscription
    if (this.activeSubscriptions.has(key)) {
      // Add this callback to the set
      this.activeSubscriptions.get(key)!.add(callback);
      
      // Increment reference count
      const count = this.subscriptionCounts.get(key) || 0;
      this.subscriptionCounts.set(key, count + 1);
      
      console.log(`Added callback to existing subscription ${key}. Count: ${count + 1}`);
      return true;
    }
    
    // First subscription for this channel/pair
    console.log(`Creating new subscription for ${key}`);
    
    // Create a new set to hold callbacks
    this.activeSubscriptions.set(key, new Set([callback]));
    this.subscriptionCounts.set(key, 1);
    this.lastUpdateTime.set(key, 0);
    
    // Subscribe based on channel type
    let success = false;
    if (channel === 'book') {
      // Register event handler for this channel
      krakenWebSocket.on(channel, this.createChannelHandler(channel, pair));
      
      // Subscribe to the WebSocket channel
      success = krakenWebSocket.subscribeOrderBook([pair], depth);
    } else if (channel === 'ohlc') {
      krakenWebSocket.on(channel, this.createChannelHandler(channel, pair));
      success = krakenWebSocket.subscribeOHLC([pair], interval);
    } else if (channel === 'ticker') {
      krakenWebSocket.on(channel, this.createChannelHandler(channel, pair));
      success = krakenWebSocket.subscribeTicker([pair]);
    } else if (channel === 'trade') {
      krakenWebSocket.on(channel, this.createChannelHandler(channel, pair));
      success = krakenWebSocket.subscribeTrades([pair]);
    }
    
    // If subscription failed, clean up
    if (!success) {
      this.activeSubscriptions.delete(key);
      this.subscriptionCounts.delete(key);
      this.lastUpdateTime.delete(key);
      console.warn(`Failed to subscribe to ${key}`);
    }
    
    return success;
  }

  /**
   * Unsubscribe a callback from a channel/pair
   * @param channel The channel name
   * @param pair The trading pair
   * @param callback The callback to remove
   * @returns True if successful
   */
  unsubscribe(channel: string, pair: string, callback: SubscriptionCallback): boolean {
    const key = `${channel}:${pair}`;
    
    // If we don't have this subscription, nothing to do
    if (!this.activeSubscriptions.has(key)) {
      return true;
    }
    
    // Get the set of callbacks
    const callbacks = this.activeSubscriptions.get(key)!;
    callbacks.delete(callback);
    
    // Decrement reference count
    const count = this.subscriptionCounts.get(key) || 0;
    if (count > 1) {
      this.subscriptionCounts.set(key, count - 1);
      console.log(`Removed callback from ${key}. Count: ${count - 1}`);
      return true;
    }
    
    // Last subscriber unsubscribed, clean up the WebSocket subscription
    console.log(`Last subscriber unsubscribed from ${key}, removing WebSocket subscription`);
    this.activeSubscriptions.delete(key);
    this.subscriptionCounts.delete(key);
    this.lastUpdateTime.delete(key);
    
    // Clear any pending throttled updates
    if (this.throttleTimers.has(key)) {
      clearTimeout(this.throttleTimers.get(key)!);
      this.throttleTimers.delete(key);
    }
    this.pendingUpdates.delete(key);
    
    // Remove event handler
    krakenWebSocket.off(channel, this.createChannelHandler(channel, pair));
    
    // Unsubscribe from the WebSocket
    return krakenWebSocket.unsubscribe(channel, [pair]);
  }

  /**
   * Create a handler for a specific channel and pair
   * @param channel The channel name
   * @param pair The pair
   * @returns A handler function for the WebSocket event
   */
  private createChannelHandler(channel: string, pair: string) {
    const key = `${channel}:${pair}`;
    
    return (data: any) => {
      // Check if this message is for our pair
      if (Array.isArray(data) && data.length >= 2) {
        const pairInfo = data.find(item => item && typeof item === 'object' && '_pair' in item);
        if (pairInfo) {
          const messagePair = pairInfo._pair;
          
          // If this message is not for our pair, ignore it
          if (messagePair !== pair) {
            return;
          }
        }
      }
      
      // Get all callbacks for this subscription
      const callbacks = this.activeSubscriptions.get(key);
      if (!callbacks || callbacks.size === 0) return;
      
      // Store this update as the pending update
      this.pendingUpdates.set(key, data);
      
      // Get the throttle interval based on subscriber count
      const subscriberCount = this.subscriptionCounts.get(key) || 1;
      
      // Calculate throttle interval - scales with number of subscribers
      // More subscribers = higher throttle interval
      const throttleInterval = Math.min(
        this.baseThrottleInterval * subscriberCount,
        this.maxThrottleInterval
      );
      
      // Check if we're within throttle interval
      const now = Date.now();
      const lastUpdate = this.lastUpdateTime.get(key) || 0;
      const timeElapsed = now - lastUpdate;
      
      // If a timer is already running or we're within throttle period, don't create a new one
      if (this.throttleTimers.has(key) || timeElapsed < throttleInterval) {
        return;
      }
      
      // Create a timer to process the update after throttle interval
      const timerId = setTimeout(() => {
        // Get the latest pending update
        const pendingData = this.pendingUpdates.get(key);
        if (!pendingData) return;
        
        // Update last update time
        this.lastUpdateTime.set(key, Date.now());
        
        // Clear the timer and pending update
        this.throttleTimers.delete(key);
        this.pendingUpdates.delete(key);
        
        // Get current callbacks (may have changed since timeout was set)
        const currentCallbacks = this.activeSubscriptions.get(key);
        if (!currentCallbacks || currentCallbacks.size === 0) return;
        
        // Call each callback with the data
        currentCallbacks.forEach(callback => {
          try {
            callback(pendingData);
          } catch (err) {
            console.error(`Error in subscription callback for ${key}:`, err);
          }
        });
      }, throttleInterval);
      
      // Store the timer
      this.throttleTimers.set(key, timerId);
    };
  }
  
  /**
   * Get the number of active subscriptions for a channel/pair
   * @param channel The channel name
   * @param pair The trading pair
   * @returns The number of active subscriptions
   */
  getSubscriptionCount(channel: string, pair: string): number {
    const key = `${channel}:${pair}`;
    return this.subscriptionCounts.get(key) || 0;
  }
  
  /**
   * Set the base throttle interval in milliseconds
   * @param interval The new base throttle interval
   */
  setBaseThrottleInterval(interval: number): void {
    this.baseThrottleInterval = Math.max(50, interval); // Minimum 50ms
  }
  
  /**
   * Set the maximum throttle interval in milliseconds
   * @param interval The new maximum throttle interval
   */
  setMaxThrottleInterval(interval: number): void {
    this.maxThrottleInterval = Math.max(100, interval); // Minimum 100ms
  }
  
  /**
   * Debug method to log all active subscriptions
   */
  debugSubscriptions(): void {
    console.log("Active subscriptions:");
    this.activeSubscriptions.forEach((callbacks, key) => {
      console.log(`${key}: ${callbacks.size} callbacks, count: ${this.subscriptionCounts.get(key)}`);
    });
  }
}

// Export as singleton
export default new SubscriptionManager(); 