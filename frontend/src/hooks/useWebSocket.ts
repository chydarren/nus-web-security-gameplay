import { useEffect, useRef, useState } from 'react';

interface UseWebSocketProps {
  playerId: string | null;
  backendUrl: string;
  onGameUpdate: (data: any) => void;
}

export const useWebSocket = ({ playerId, backendUrl, onGameUpdate }: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const onGameUpdateRef = useRef(onGameUpdate);
  const maxReconnectAttempts = 3;

  // Keep the callback ref updated
  onGameUpdateRef.current = onGameUpdate;

  useEffect(() => {
    if (!playerId) {
      console.log('WebSocket: No playerId provided, skipping connection');
      setIsConnected(false);
      return;
    }

    if (!backendUrl) {
      console.log('WebSocket: No backendUrl provided, skipping connection');
      setIsConnected(false);
      return;
    }

    console.log(`WebSocket: Connecting for player ${playerId} to ${backendUrl}`);

    const connectWebSocket = () => {
      // Convert HTTP/HTTPS URL to WebSocket URL
      const wsProtocol = backendUrl.startsWith('https://') ? 'wss://' : 'ws://';
      const wsUrl = backendUrl.replace(/^https?:\/\//, wsProtocol) + `/ws/${playerId}`;
      console.log(`WebSocket: Connecting to ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        console.log(`WebSocket: Connected successfully for player ${playerId}`);
      };

      ws.onmessage = (event) => {
        try {
          console.log('WebSocket: Raw message received:', event.data);
          const data = JSON.parse(event.data);
          console.log('WebSocket: Parsed message data:', data);
          onGameUpdateRef.current(data);
        } catch (error) {
          console.error('WebSocket: Failed to parse message:', error, event.data);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        console.log(`WebSocket: Disconnected for player ${playerId}. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
        
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Don't reconnect if:
        // - It was an intentional close (1000 = normal closure, 1001 = going away)
        // - We've exceeded max attempts
        // - The close was due to server unavailable (1006 = abnormal closure, could be server down)
        if (event.code === 1000 || event.code === 1001) {
          console.log('WebSocket: Clean disconnection, not attempting to reconnect');
          return;
        }
        
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('WebSocket: Max reconnection attempts reached. Please check if the backend server is running and try refreshing the page.');
          return;
        }

        if (event.code === 1006) {
          console.warn('WebSocket: Server connection lost (code 1006). This usually means the backend server is not running or not accessible.');
        }
        
        reconnectAttemptsRef.current += 1;
        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000); // Exponential backoff, max 10s
        console.log(`WebSocket: Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${backoffTime}ms...`);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, backoffTime);
      };

      ws.onerror = (error) => {
        console.error(`WebSocket: Connection error for player ${playerId}:`, error);
        const httpUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws/' + playerId, '');
        console.error(`WebSocket: Make sure the backend server is running at ${httpUrl}`);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting'); // Clean close
      }
    };
  }, [playerId, backendUrl]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Sending message:', message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket: Cannot send message - connection not open. ReadyState:', 
        wsRef.current?.readyState || 'No connection');
    }
  };

  return { isConnected, sendMessage };
};