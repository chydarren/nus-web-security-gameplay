import React from 'react';
import { GameState, Player, VisibleState } from '../../types/game';
import { PlayerList } from './PlayerList';
import { ActionPanel } from './ActionPanel';
import { GameHistory } from './GameHistory';

interface GameBoardProps {
  gameState: GameState;
  currentPlayer: Player;
  visibleState: VisibleState;
  availableActions: string[];
  gameHistory: any[];
  actionStatus?: Record<string, boolean>;
  onSubmitAction: (action: string, actionData?: Record<string, any>) => void;
  isConnected: boolean;
  isLoading: boolean;
  backendUrl: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  currentPlayer,
  visibleState,
  availableActions,
  gameHistory,
  actionStatus,
  onSubmitAction,
  isConnected,
  isLoading,
  backendUrl
}) => {
  const renderGameInformation = () => {
    // Filter out basic game state info that's already shown elsewhere
    const filteredVisibleState = { ...visibleState };
    
    // Remove redundant info that's already displayed in the game header
    delete filteredVisibleState.current_round;
    delete filteredVisibleState.max_rounds;
    delete filteredVisibleState.phase;

    // If no data to show, return null
    if (Object.keys(filteredVisibleState).length === 0) {
      return null;
    }

    return (
      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Game Information</h4>
        <div className="text-xs text-blue-700">
          {Object.entries(filteredVisibleState).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="font-medium">{key.replace(/_/g, ' ').toUpperCase()}:</span>
              <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Game Stats Card - Variable Height to accommodate description */}
      <div className="flex-shrink-0 container mx-auto px-4 py-4 max-h-60 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-md p-4">
          {/* Game Description */}
          {gameState.description && (
            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">📖 Game Description</h3>
              <p className="text-sm text-blue-700 leading-relaxed">{gameState.description}</p>
            </div>
          )}
          
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <span className="font-medium">Round: {gameState.current_round}/{gameState.max_rounds}</span>
              <span>Phase: {gameState.phase.replace('_', ' ').toUpperCase()}</span>
              <span className="capitalize">Role: {currentPlayer.role}</span>
              <span>Score: {currentPlayer.total_score}</span>
            </div>
            {gameState.round_deadline && (
              <div className="text-sm text-red-600">
                Round ends at: {new Date(gameState.round_deadline).toLocaleTimeString()}
              </div>
            )}
          </div>
          {renderGameInformation()}
        </div>
      </div>

      {/* Main Content Area - Flexible Height with more room for description */}
      <div className="flex-1 container mx-auto px-4 pb-4 min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full max-h-full">
          {/* Players List - Left Side (1/3 width) */}
          <div className="lg:col-span-1 min-h-0 overflow-hidden">
            <PlayerList 
              players={Object.values(gameState.players)} 
              currentPlayerId={currentPlayer.player_id}
              gameState={gameState}
              gameHistory={gameHistory}
              actionStatus={actionStatus}
            />
          </div>
          
          {/* Game Events - Right Side (2/3 width) */}
          <div className="lg:col-span-2 min-h-0 overflow-hidden">
            <GameHistory 
              history={gameHistory}
              currentPlayer={currentPlayer}
              gameState={gameState}
              actionStatus={actionStatus}
            />
          </div>
        </div>
      </div>

      {/* Fixed Action Panel at Bottom */}
      <div className="flex-shrink-0 bg-white shadow-lg border-t border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <ActionPanel
            player={currentPlayer}
            gameState={gameState}
            visibleState={visibleState}
            availableActions={availableActions}
            onSubmitAction={onSubmitAction}
            gameHistory={gameHistory}
            actionStatus={actionStatus}
          />
        </div>
      </div>
    </div>
  );
};