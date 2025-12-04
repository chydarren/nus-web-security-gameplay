import React from 'react';
import { Player } from '../../types/game';

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  gameState?: any;
  gameHistory?: any[];
  actionStatus?: Record<string, boolean>;
}

export const PlayerList: React.FC<PlayerListProps> = ({ 
  players, 
  currentPlayerId, 
  gameState, 
  gameHistory = [], 
  actionStatus = {} 
}) => {
  // Use server-provided action status directly
  const serverActionStatus = actionStatus;
  const isAwaitingActions = gameState?.phase === 'awaiting_actions';
  const playersStillWaiting = players.filter(p => !p.is_ai_agent && !serverActionStatus[p.player_id]).length;

  console.log('PlayerList DEBUG:', {
    isAwaitingActions,
    totalPlayers: players.length,
    serverActionStatus,
    playersStillWaiting
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Players</h2>
      
      {/* Action Status Summary */}
      {isAwaitingActions && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 flex-shrink-0">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">⏳ Waiting for Actions</h3>
          <div className="text-xs text-yellow-700">
            {playersStillWaiting > 0 
              ? `${playersStillWaiting} players still need to act`
              : 'All players have submitted their actions'
            }
          </div>
        </div>
      )}
      
      <div className="space-y-3 flex-1 overflow-y-auto">
        {players
          .sort((a, b) => b.total_score - a.total_score) // Sort by score, highest first
          .map((player, index) => {
            const rank = index + 1;
          const isCurrentPlayer = player.player_id === currentPlayerId;
          const hasSubmittedAction = serverActionStatus[player.player_id];
          const needsToAct = isAwaitingActions && !player.is_ai_agent && !hasSubmittedAction;
          
          return (
            <div
              key={player.player_id}
              className={`p-3 rounded-lg border ${
                isCurrentPlayer
                  ? 'border-blue-500 bg-blue-50'
                  : needsToAct
                  ? 'border-yellow-400 bg-yellow-50'
                  : hasSubmittedAction && isAwaitingActions
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  {/* Ranking Number */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    rank === 1 ? 'bg-yellow-200 text-yellow-800' : 
                    rank === 2 ? 'bg-gray-200 text-gray-700' : 
                    rank === 3 ? 'bg-orange-200 text-orange-700' : 
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {rank}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                    <span className={`font-medium ${
                      isCurrentPlayer ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {player.player_name}
                    </span>
                    {isCurrentPlayer && (
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                        You
                      </span>
                    )}
                    {player.is_ai_agent && (
                      <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                        AI
                      </span>
                    )}
                    {/* Action Status Indicator */}
                    {isAwaitingActions && !player.is_ai_agent && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        hasSubmittedAction 
                          ? 'bg-green-200 text-green-800' 
                          : 'bg-yellow-200 text-yellow-800'
                      }`}>
                        {hasSubmittedAction ? '✓ Ready' : '⏳ Thinking...'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    Role: {player.role}
                  </div>
                  <div className="text-xs text-gray-400">
                    ID: {player.player_id}
                  </div>
                </div>
              </div>
              <div className="text-right ml-2">
                <div className="text-lg font-bold text-gray-900">
                  {player.total_score}
                </div>
                <div className="text-xs text-gray-500">points</div>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};