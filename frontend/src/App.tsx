import React, { useState, useCallback, useEffect } from 'react';
import { GameState, Player, VisibleState } from './types/game';
import { apiService } from './services/api';
import { useWebSocket } from './hooks/useWebSocket';
import { GameBoard } from './components/Game/GameBoard';
import { Button } from './components/UI/Button';
import { Card } from './components/UI/Card';
import { ToastContainer } from './components/UI/Toast';
import { useToast } from './hooks/useToast';
import { ConfigProvider, useConfig } from './contexts/ConfigContext';
import './index.css';

function AppContent() {
  const { backendUrl, setBackendUrl } = useConfig();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [visibleState, setVisibleState] = useState<VisibleState | null>(null);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [actionStatus, setActionStatus] = useState<Record<string, boolean>>({});
  const [serverAddress, setServerAddress] = useState(backendUrl);
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, removeToast, showSuccess, showError } = useToast();

  // Generate a unique session ID for this browser tab to avoid ID conflicts
  const [tabSessionId] = useState(() => {
    let sessionId = sessionStorage.getItem('tabSessionId');
    if (!sessionId) {
      sessionId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('tabSessionId', sessionId);
      console.log('Generated new tab session ID:', sessionId);
    }
    return sessionId;
  });

  // Helper function to get/set player ID specific to this tab session
  const getStoredPlayerId = () => {
    return sessionStorage.getItem(`currentPlayerId_${tabSessionId}`);
  };

  const setStoredPlayerId = (playerId: string) => {
    sessionStorage.setItem(`currentPlayerId_${tabSessionId}`, playerId);
    console.log(`Stored player ID ${playerId} for tab ${tabSessionId}`);
  };

  const handleGameUpdate = useCallback((data: any) => {
    console.log('Game update received:', data);
    
    // Backend now controls what events are sent, so we can add all events to history
    // Only skip ACTION_COUNT_UPDATE events which are just for internal status tracking
    if (data.type !== 'ACTION_COUNT_UPDATE') {
      setGameHistory(prev => [...prev, {
        ...data, // Preserve all original data
        type: data.type,
        message: data.message || JSON.stringify(data),
        timestamp: new Date().toISOString()
      }]);
    }

    if (data.type === 'GAME_STARTED' || data.type === 'ROUND_STARTED') {
      if (data.visible_state) {
        setVisibleState(data.visible_state);
      }
      if (data.available_actions) {
        setAvailableActions(data.available_actions);
      }
      if (data.game_state) {
        setGameState(data.game_state);
      }
    }

    // Handle ACTION_COUNT_UPDATE events to refresh state from server
    if (data.type === 'ACTION_COUNT_UPDATE') {
      console.log('ACTION_COUNT_UPDATE event:', {
        player_id: data.player_id,
        actions_received: data.actions_received,
        actions_needed: data.actions_needed,
        currentPlayerId: currentPlayer?.player_id
      });
      // Refresh player state to get updated action status from server
      const currentPlayerId = getStoredPlayerId();
      if (currentPlayerId) {
        setTimeout(() => {
          refreshPlayerState();
        }, 100); // Small delay to ensure backend has processed the change
      }
    }

    if (data.type === 'ROUND_COMPLETED') {
      // Add revealed actions to game history with more robust data structure
      if (data.round_result?.actions) {
        const actionEvents = data.round_result.actions.map((actionInfo: [string, string]) => ({
          type: 'ACTION_SUBMITTED',
          player_name: actionInfo[0],
          action: actionInfo[1],
          revealed: true,
          round_number: data.round_number,
          timestamp: new Date().toISOString(),
          data: {
            action: actionInfo[1],
            player_name: actionInfo[0],
            revealed: true
          }
        }));
        setGameHistory(prev => [...prev, ...actionEvents]);
      }
      
      // Set a flag to refresh player state after round completion
      // This avoids circular dependencies
      setTimeout(() => {
        // Use the current player ID directly instead of depending on currentPlayer state
        const currentPlayerId = data.player_id || getStoredPlayerId();
        if (currentPlayerId) {
          apiService.getPlayerState(currentPlayerId).then(response => {
            if (response.success && response.data) {
              // Add description from gameInfo to gameState
              const gameStateWithDescription = {
                ...response.data.game_state,
                description: gameInfo?.config?.description || ''
              };
              setGameState(gameStateWithDescription);
              setVisibleState(response.data.visible_state);
              setAvailableActions(response.data.available_actions);
              setCurrentPlayer(response.data.player);
              if (response.data.player?.player_id) {
                setStoredPlayerId(response.data.player.player_id);
              }
            }
          });
        }
      }, 100);
    }
  }, [tabSessionId]);

    const { isConnected } = useWebSocket({
    playerId: currentPlayer?.player_id || null,
    onGameUpdate: handleGameUpdate,
    backendUrl
  });
  
  // Refresh state when WebSocket reconnects to get latest server data
  useEffect(() => {
    if (isConnected && currentPlayer?.player_id) {
      console.log('WebSocket reconnected, refreshing player state');
      refreshPlayerState();
    }
  }, [isConnected, currentPlayer?.player_id]);

  // Update API service backend URL when config changes
  useEffect(() => {
    apiService.setBackendUrl(backendUrl);
  }, [backendUrl]);



    const refreshPlayerState = useCallback(async () => {
    const playerId = getStoredPlayerId();
    if (!playerId) return;
    
    try {
      console.log(`Refreshing player state for ${playerId}`);
      const response = await apiService.getPlayerState(playerId);
      console.log('Player state received:', response);
      if (response.success && response.data) {
        setGameState(response.data.game_state);
        setVisibleState(response.data.visible_state);
        setAvailableActions(response.data.available_actions);
        setCurrentPlayer(response.data.player);
        
        // Merge server-provided game history with client-maintained revealed actions
        if (response.data?.game_history && Array.isArray(response.data.game_history)) {
          console.log('Merging game history from server:', response.data.game_history.length, 'events');
          // Filter out ACTION_RECEIVED events from server history
          const serverHistory = response.data.game_history.filter((event: any) => 
            event.type !== 'ACTION_RECEIVED' && event.event_type !== 'action_received'
          );
          setGameHistory(prev => {
            // Keep client-side revealed action events that might not be in server history yet
            const revealedActions = prev.filter(event => 
              event.type === 'ACTION_SUBMITTED' && event.revealed === true
            );
            
            // Combine filtered server history with revealed actions, removing duplicates
            const combined = [...serverHistory];
            
            // Add revealed actions that aren't already in server history
            revealedActions.forEach(revealedEvent => {
              const exists = combined.some(serverEvent => 
                serverEvent.type === 'ACTION_SUBMITTED' && 
                serverEvent.player_name === revealedEvent.player_name &&
                serverEvent.action === revealedEvent.action &&
                Math.abs(new Date(serverEvent.timestamp).getTime() - new Date(revealedEvent.timestamp).getTime()) < 5000
              );
              if (!exists) {
                combined.push(revealedEvent);
              }
            });
            
            // Sort by timestamp to maintain chronological order
            return combined.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
        }
        
        // Use server-provided action status
        if (response.data.action_status) {
          console.log('Setting action status from server:', response.data.action_status);
          setActionStatus(response.data.action_status);
        }
        
        if (response.data.player?.player_id) {
          setStoredPlayerId(response.data.player.player_id);
        }
      } else {
        console.error('Failed to refresh player state:', response.message);
        setError('Failed to refresh player state: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to refresh player state:', error);
      setError('Failed to refresh player state: ' + (error as Error).message);
    }
  }, []);

  const testConnection = async () => {
    if (!serverAddress.trim()) {
      setError('Please enter a server address');
      return;
    }

    // Validate server address format
    try {
      const url = new URL(serverAddress);
      if (!['http:', 'https:'].includes(url.protocol)) {
        setError('Server address must start with http:// or https://');
        return;
      }
    } catch {
      setError('Invalid server address format. Please use http://hostname:port or https://hostname:port');
      return;
    }

    setIsTestingConnection(true);
    setError(null);
    
    try {
      // Update the backend URL
      if (serverAddress !== backendUrl) {
        console.log(`Updating backend URL from ${backendUrl} to ${serverAddress}`);
        setBackendUrl(serverAddress);
        apiService.setBackendUrl(serverAddress);
      }
      
      // Test basic connection
      const testUrl = serverAddress.endsWith('/') ? serverAddress.slice(0, -1) : serverAddress;
      const healthResponse = await fetch(`${testUrl}/health`);
      if (!healthResponse.ok) {
        setError(`❌ Server health check failed with status ${healthResponse.status}`);
        return;
      }
      
      // Fetch game information
      console.log('Fetching game information...');
      const gameInfoResponse = await apiService.getGameInfo();
      console.log('Game info received:', gameInfoResponse);
      
      if (gameInfoResponse.success && gameInfoResponse.data) {
        setGameInfo(gameInfoResponse.data);
        
        if (gameInfoResponse.data.exists && gameInfoResponse.data.config?.available_roles) {
          setAvailableRoles(gameInfoResponse.data.config.available_roles);
          // Set default role to first available role
          if (gameInfoResponse.data.config.available_roles.length > 0) {
            setSelectedRole(gameInfoResponse.data.config.available_roles[0]);
          }
        } else {
          // No game exists, but connection is working
          setAvailableRoles(['defender']); // Default fallback
          setSelectedRole('defender');
        }
        
        setError(null);
      } else {
        setError('❌ Failed to get game information: ' + (gameInfoResponse.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setError(`❌ Cannot connect to server: ${(error as Error).message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const joinGame = async () => {
    if (!playerName.trim() && !playerId.trim()) {
      setError('Please enter either a player name (for new player) or player ID (to reconnect)');
      return;
    }

    if (!serverAddress.trim()) {
      setError('Please enter a server address');
      return;
    }

    // Test connection first if not already done
    if (!gameInfo) {
      console.log('Testing connection before joining...');
      await testConnection();
      
      // If connection test failed, gameInfo will still be null
      if (!gameInfo) {
        return; // testConnection will have set the appropriate error
      }
    }

    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    // Validate server address format
    try {
      const url = new URL(serverAddress);
      if (!['http:', 'https:'].includes(url.protocol)) {
        setError('Server address must start with http:// or https://');
        return;
      }
    } catch {
      setError('Invalid server address format. Please use http://hostname:port or https://hostname:port');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // Update the backend URL if it changed
    if (serverAddress !== backendUrl) {
      console.log(`Updating backend URL from ${backendUrl} to ${serverAddress}`);
      setBackendUrl(serverAddress);
      // Update the API service
      apiService.setBackendUrl(serverAddress);
    }
    
    try {
      if (playerId.trim()) {
        // Reconnect with existing Player ID
        console.log(`Reconnecting with Player ID: ${playerId} (tab: ${tabSessionId})`);
        const response = await apiService.getPlayerState(playerId);
        if (response.success && response.data) {
          // Create a player object from the response
          setCurrentPlayer(response.data.player);
          // Store player ID for WebSocket reconnection
          if (response.data.player?.player_id) {
            setStoredPlayerId(response.data.player.player_id);
          }
          // Add description from gameInfo to gameState
          const gameStateWithDescription = {
            ...response.data.game_state,
            description: gameInfo?.config?.description || ''
          };
          setGameState(gameStateWithDescription);
          setVisibleState(response.data.visible_state);
          setAvailableActions(response.data.available_actions || []);
        } else {
          setError('Failed to reconnect with Player ID: ' + (response.message || 'Player not found'));
        }
      } else {
        // Join as new player
        console.log(`Joining as new player: ${playerName} (tab: ${tabSessionId})`);
        const response = await apiService.joinGame({
          player_name: playerName,
          role: selectedRole
        });
        
        console.log('Join game response:', response);
        if (response.success && response.data) {
          setCurrentPlayer(response.data.player);
          if (response.data.player?.player_id) {
            setStoredPlayerId(response.data.player.player_id);
            console.log(`Player ID ${response.data.player.player_id} stored for tab ${tabSessionId}`);
          }
          // Add description from gameInfo to gameState
          const gameStateWithDescription = {
            ...response.data.game_state,
            description: gameInfo?.config?.description || ''
          };
          setGameState(gameStateWithDescription);
          // Set the playerId field to show the generated Player ID
          setPlayerId(response.data.player.player_id);
          
          // Immediately refresh state to get full server data (history, action status, etc.)
          setTimeout(() => {
            refreshPlayerState();
          }, 500);
        } else {
          setError('Failed to join game: ' + (response.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      setError('Failed to join game: ' + (error as Error).message);
    }
    setIsLoading(false);
  };

  // AI agents are now added automatically based on game configuration

  const startGame = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.startGame();
      console.log('Start game response:', response);
      if (!response.success) {
        setError('Failed to start game: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      setError('Failed to start game: ' + (error as Error).message);
    }
    setIsLoading(false);
  };

  const submitAction = async (action: string, actionData?: Record<string, any>) => {
    if (!currentPlayer) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.submitAction(currentPlayer.player_id, {
        action,
        action_data: actionData
      });
      
      console.log('Submit action response:', response);
      if (response.success) {
        showSuccess(`Action "${action.replace('_', ' ').toUpperCase()}" submitted successfully!`);
      } else {
        const errorMsg = 'Failed to submit action: ' + (response.message || 'Unknown error');
        setError(errorMsg);
        showError(errorMsg);
      }
    } catch (error) {
      console.error('Failed to submit action:', error);
      const errorMsg = 'Failed to submit action: ' + (error as Error).message;
      setError(errorMsg);
      showError(errorMsg);
    }
    setIsLoading(false);
  };



  // Initial refresh on mount only
  useEffect(() => {
    if (currentPlayer?.player_id) {
      refreshPlayerState();
      
      // Set up periodic refresh every 5 seconds instead of on every state change
      const interval = setInterval(() => {
        refreshPlayerState();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [currentPlayer?.player_id]); // Only depend on player ID, not refreshPlayerState

  // Sync server address with backend URL changes
  useEffect(() => {
    setServerAddress(backendUrl);
    apiService.setBackendUrl(backendUrl);
  }, [backendUrl]);



  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card title="Join Game" className="w-96">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server Address
            </label>
            <input
              type="text"
              value={serverAddress}
              onChange={(e) => setServerAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter server address (e.g., http://localhost:8000)"
            />
            <div className="text-xs text-gray-500 mt-1">
              The backend server URL where the game is hosted. Change this to connect to a different server.
            </div>
            <Button
              onClick={testConnection}
              disabled={!serverAddress.trim() || isLoading}
              variant="secondary"
              className="mt-2 w-full"
            >
              {isLoading ? 'Testing...' : 'Connect to Server'}
            </Button>
            {isConnected && gameInfo && (
              <div className="text-xs text-green-600 mt-1">
                ✅ Connected! Found {gameInfo.exists ? 'existing' : 'new'} game with {availableRoles.length} role(s)
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Player ID
            </label>
            <input
              type="text"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter player ID (optional - leave blank for new player)"
            />
            <div className="text-xs text-gray-500 mt-1">
              Use existing Player ID to reconnect to your game session
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Player Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
            />
          </div>            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={!gameInfo || availableRoles.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  {!gameInfo ? 'Enter server address and join to connect' : 'Select a role'}
                </option>
                {availableRoles.map(role => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}
            
            <div className="flex space-x-2">
              <Button
                onClick={joinGame}
                disabled={isLoading || isTestingConnection || (!gameInfo && serverAddress.trim()) || (!selectedRole && gameInfo)}
                className="w-full"
              >
                {isTestingConnection ? 'Testing Connection...' : isLoading ? 'Joining...' : (playerId ? 'Reconnect' : 'Join Game')}
              </Button>
            </div>
            
            {gameState && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-sm">
                  Players: {Object.keys(gameState.players).length} / {gameState.phase === 'waiting_for_players' ? '3' : '3'}
                </p>
                {Object.keys(gameState.players).length >= 3 && (
                  <Button
                    onClick={startGame}
                    disabled={isLoading}
                    className="w-full mt-2"
                  >
                    {isLoading ? 'Starting...' : 'Start Game'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (!gameState || !visibleState) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card title="Loading Game" className="w-96">
          <div className="text-center">
            <div className="text-gray-600">Loading game state...</div>
            {currentPlayer && (
              <div className="text-sm mt-2">
                <div className={isConnected ? 'text-green-600' : 'text-orange-600'}>
                  WebSocket: {isConnected ? '🟢 Connected' : '� Reconnecting...'}
                </div>
                {!isConnected && (
                  <div className="text-orange-500 text-xs mt-1">
                    If this persists, check if backend server is running at {backendUrl}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with Connection Status */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold text-gray-900">
              Game Theory Platform
            </h1>
            <div className="flex items-center gap-4 text-sm">
              <div className={isConnected ? 'text-green-600' : 'text-orange-600'}>
                {isConnected ? '🟢 Connected' : '🟡 Reconnecting...'}
              </div>
              <div>Status: {isLoading ? 'Loading...' : 'Ready'}</div>
              <div className="flex items-center gap-2 text-gray-500">
                <span>Player: {currentPlayer.player_id}</span>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(currentPlayer.player_id);
                      showSuccess('Player ID copied to clipboard!');
                    } catch (error) {
                      showError('Failed to copy Player ID');
                    }
                  }}
                  className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
                  title="Copy Player ID"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Backend: {backendUrl}
            </span>
          </div>
        </div>
        {!isConnected && (
          <div className="mt-2 text-xs text-orange-500">
            ⚠️ Connection issue - check if backend server is running at {backendUrl}
          </div>
        )}
      </header>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 mx-4 mt-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            ×
          </button>
        </div>
      )}
      
      <GameBoard
        gameState={gameState}
        currentPlayer={currentPlayer}
        visibleState={visibleState}
        availableActions={availableActions}
        gameHistory={gameHistory}
        actionStatus={actionStatus}
        onSubmitAction={submitAction}
        isConnected={isConnected}
        isLoading={isLoading}
        backendUrl={backendUrl}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

function App() {
  return (
    <ConfigProvider>
      <AppContent />
    </ConfigProvider>
  );
}

export default App;