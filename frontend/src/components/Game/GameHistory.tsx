import React, { useState } from 'react';
import { Player } from '../../types/game';

interface GameHistoryProps {
  history: any[];
  currentPlayer: Player;
  gameState?: any;
  actionStatus?: Record<string, boolean>;
}

// Component for displaying round scores with toggle
const RoundScoreDisplay: React.FC<{
  summary: string;
  detail: string | null;
  roundData: any;
  gameState?: any;
}> = ({ summary, detail, roundData, gameState }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div>
      <div className="font-medium text-sm">{summary}</div>
      {detail && (
        <div className="text-xs opacity-75 mt-1">{detail}</div>
      )}
      
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-blue-600 hover:text-blue-800 mt-1 underline"
      >
        {isExpanded ? '🔼 Hide' : '🔽 Show'} Round Details
      </button>
      
      {isExpanded && (
        <div className="mt-2 text-xs bg-white bg-opacity-60 rounded p-2 border">
          <div className="space-y-2">
            {/* Round Scores Table */}
            {Object.keys(roundData.roundScores || {}).length > 0 && (
              <div>
                <div className="font-semibold mb-1">🎯 Round Scores:</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-1 py-0.5 text-left">Player</th>
                        <th className="border px-1 py-0.5 text-right">Round Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(roundData.roundScores).map(([playerId, score]) => {
                        const player = gameState?.players?.[playerId];
                        return (
                          <tr key={playerId}>
                            <td className="border px-1 py-0.5">
                              {player?.player_name || playerId}
                            </td>
                            <td className="border px-1 py-0.5 text-right font-mono">
                              {typeof score === 'number' ? score.toFixed(1) : String(score)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Total Scores Table */}
            {Object.keys(roundData.playerScores || {}).length > 0 && (
              <div>
                <div className="font-semibold mb-1">🏆 Total Scores:</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-1 py-0.5 text-left">Player</th>
                        <th className="border px-1 py-0.5 text-right">Total Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(roundData.playerScores)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .map(([playerId, score]) => {
                        const player = gameState?.players?.[playerId];
                        return (
                          <tr key={playerId}>
                            <td className="border px-1 py-0.5">
                              {player?.player_name || playerId}
                            </td>
                            <td className="border px-1 py-0.5 text-right font-mono font-bold">
                              {typeof score === 'number' ? score.toFixed(1) : String(score)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Player Actions */}
            {roundData.actions && roundData.actions.length > 0 && (
              <div>
                <div className="font-semibold mb-1">🎯 Player Actions:</div>
                <div className="text-xs space-y-1">
                  {roundData.actions.map(([playerName, action]: [string, string], index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="font-medium">{playerName}:</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-mono">
                        {action.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Round Summary */}
            {Object.keys(roundData.roundSummary || {}).length > 0 && (
              <div>
                <div className="font-semibold mb-1">📊 Round Summary:</div>
                <div className="text-xs space-y-1">
                  {Object.entries(roundData.roundSummary).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                      </span>
                      <span>{typeof value === 'boolean' ? (value ? '✅' : '❌') : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const GameHistory: React.FC<GameHistoryProps> = ({ history, currentPlayer, gameState, actionStatus }) => {
  const formatEventForDisplay = (event: any) => {
    // Log full event details to console for debugging
    // console.log('Full game event:', event);
    // console.log('Event keys:', Object.keys(event));
    if (event.type === 'ACTION_SUBMITTED') {
      console.log('ACTION_SUBMITTED event details:', {
        player_name: event.player_name,
        player_id: event.player_id,
        action: event.action,
        action_type: event.action_type,
        message: event.message,
        data: event.data
      });
    }
    
    // Return simplified display based on event type
    const eventTime = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '';
    
    // Extract more details from the event data
    // Try multiple possible locations for player and action data
    let playerName = event.player_name || event.data?.player_name || event.player?.player_name || event.player?.name;
    let actionName = event.action || event.data?.action || event.action_type || event.type;
    let roundNum = event.round || event.data?.round || event.round_number || (gameState?.current_round);
    
    // If we still don't have player name, try to get it from player_id
    if (!playerName && event.player_id && gameState?.players) {
      const player = gameState.players[event.player_id];
      if (player) {
        playerName = player.player_name || player.name;
      }
    }
    
    // Fallback to 'Unknown Player' if still not found
    playerName = playerName || 'Unknown Player';
    
    // Clean up action names
    if (actionName && actionName !== 'Unknown Action') {
      actionName = actionName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().toUpperCase();
    }
    
    switch (event.type) {
      case 'GAME_STARTED':
        return { 
          summary: '🎮 Game Started', 
          detail: `${Object.keys(gameState?.players || {}).length} players joined`, 
          time: eventTime,
          color: 'bg-green-50 border-green-400 text-green-800'
        };
      case 'ROUND_STARTED':
        const startMessage = event.data?.message || `Round ${roundNum} Started`;
        return { 
          summary: `🎯 ${startMessage}`, 
          detail: gameState?.phase ? `Phase: ${gameState.phase.replace('_', ' ').toUpperCase()}` : null, 
          time: eventTime,
          color: 'bg-blue-50 border-blue-400 text-blue-800'
        };
      case 'ROUND_COMPLETED':
        const completedMessage = event.data?.message || `Round ${roundNum} Completed`;
        return { 
          summary: `✅ ${completedMessage}`, 
          detail: event.winner ? `Winner: ${event.winner}` : 'Round finished', 
          time: eventTime,
          color: 'bg-purple-50 border-purple-400 text-purple-800',
          isRoundCompleted: true,
          roundData: {
            roundScores: event.data?.payoffs || event.round_result?.payoffs || {},
            playerScores: event.data?.player_scores || event.round_result?.player_scores || {},
            roundSummary: event.data?.round_summary || event.round_result?.round_summary || {},
            actions: event.data?.actions || event.round_result?.actions || []
          }
        };
      case 'PLAYER_JOINED':
        return { 
          summary: '👤 Player Joined', 
          detail: `${playerName} joined as ${event.role || 'Unknown Role'}`, 
          time: eventTime,
          color: 'bg-indigo-50 border-indigo-400 text-indigo-800'
        };
      case 'ACTION_RECEIVED':
        // Backend should not send these anymore, but just in case
        return null;
      case 'ACTION_SUBMITTED':
        // Backend now only sends revealed actions with proper formatting
        if (event.data?.revealed || event.revealed) {
          const displayAction = event.data?.action || event.action || actionName;
          const displayPlayerName = event.data?.player_name || event.player_name || playerName;
          const roundNumber = event.round_number || event.data?.round_number;
          
          return { 
            summary: event.message || `Round ${roundNumber}: ${displayPlayerName} chose "${displayAction?.replace('_', ' ').toUpperCase()}"`,
            detail: null,
            time: eventTime,
            color: 'bg-green-50 border-green-400 text-green-800',
            isActionEvent: true,
            actionDetail: {
              player: displayPlayerName,
              action: displayAction?.replace('_', ' ').toUpperCase(),
              round: roundNumber
            }
          };
        } else {
          // Should not happen with new backend logic
          return null;
        }
      case 'GAME_ENDED':
        return { 
          summary: '🏁 Game Ended', 
          detail: event.winner ? `🏆 Winner: ${event.winner}` : 'Game completed', 
          time: eventTime,
          color: 'bg-yellow-50 border-yellow-400 text-yellow-800'
        };
      case 'WAITING_FOR_ACTIONS':
        return {
          summary: '⏳ Waiting for Actions',
          detail: 'Players need to submit their actions',
          time: eventTime,
          color: 'bg-yellow-50 border-yellow-400 text-yellow-800'
        };
      default:
        // For unknown events, try to extract meaningful info
        const displayText = event.message ? 
          (event.message.length > 60 ? event.message.slice(0, 60) + '...' : event.message) 
          : event.type.replace('_', ' ').toUpperCase();
        return { 
          summary: displayText, 
          detail: playerName !== 'Unknown Player' ? `by ${playerName}` : null, 
          time: eventTime,
          color: 'bg-gray-50 border-gray-400 text-gray-800'
        };
    }
  };

  // Convert server-provided action status to UI format
  const getPlayerActionStatus = () => {
    if (!gameState || gameState.phase !== 'awaiting_actions' || !actionStatus) {
      return {};
    }

    const playerStatus: Record<string, 'waiting' | 'completed'> = {};
    
    // Use server-provided action status
    Object.keys(gameState.players || {}).forEach(playerId => {
      const player = gameState.players[playerId];
      if (player && !player.is_ai_agent) {
        playerStatus[playerId] = actionStatus[playerId] ? 'completed' : 'waiting';
      }
    });

    // console.log('GameHistory - Server action status:', actionStatus);
    // console.log('GameHistory - UI player status:', playerStatus);
    return playerStatus;
  };

  const playerActionStatus = getPlayerActionStatus();

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Game Events</h2>
      
      {/* Current Round Action Status */}
      {gameState && gameState.phase === 'awaiting_actions' && Object.keys(playerActionStatus).length > 0 && (
        <div className="flex-shrink-0 mb-3 p-3 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">📝 Current Round - Player Actions</h3>
          <div className="space-y-1">
            {Object.entries(playerActionStatus).map(([playerId, status]) => {
              const player = gameState.players[playerId];
              if (!player) return null;
              
              return (
                <div key={playerId} className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                  status === 'waiting' 
                    ? 'bg-yellow-100 border border-yellow-300 text-yellow-800' 
                    : 'bg-green-100 border border-green-300 text-green-800'
                }`}>
                  <span className="font-medium">{player.player_name} ({player.role})</span>
                  <span className="text-xs">
                    {status === 'waiting' ? '⏳ Waiting...' : '✅ Ready'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Event History */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {history.length === 0 ? (
          <p className="text-gray-500">No events yet</p>
        ) : (
          [...history].reverse().map((event, index) => {
            const formatted = formatEventForDisplay(event);
            if (!formatted) return null; // Skip null events
            return (
              <div key={index} className={`p-2 rounded-lg border-l-4 ${formatted.color}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {formatted.isActionEvent ? (
                      <div className="text-sm">
                        <span>Player </span>
                        <span className="font-bold text-blue-700">{formatted.actionDetail.player}</span>
                        <span> chose to "</span>
                        <span className="font-bold text-green-700 bg-green-100 px-1 rounded">{formatted.actionDetail.action}</span>
                        <span>"</span>
                      </div>
                    ) : formatted.isRoundCompleted ? (
                      <RoundScoreDisplay 
                        summary={formatted.summary}
                        detail={formatted.detail}
                        roundData={formatted.roundData}
                        gameState={gameState}
                      />
                    ) : (
                      <>
                        <div className="font-medium text-sm">{formatted.summary}</div>
                        {formatted.detail && typeof formatted.detail === 'string' && (
                          <div className="text-xs opacity-75 mt-1">{formatted.detail}</div>
                        )}
                      </>
                    )}
                  </div>
                  {formatted.time && (
                    <div className="text-xs opacity-60 ml-2">
                      {formatted.time}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};