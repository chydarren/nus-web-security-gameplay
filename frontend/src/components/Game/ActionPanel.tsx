import React, { useState, useEffect } from 'react';
import { Player, GameState, VisibleState } from '../../types/game';
import { Button } from '../UI/Button';

interface ActionPanelProps {
  player: Player;
  gameState: GameState;
  visibleState: VisibleState;
  availableActions: string[];
  onSubmitAction: (action: string, actionData?: Record<string, any>) => void;
  gameHistory?: any[];
  actionStatus?: Record<string, boolean>;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  player,
  gameState,
  visibleState,
  availableActions,
  onSubmitAction,
  gameHistory = [],
  actionStatus = {}
}: ActionPanelProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedAction, setLastSubmittedAction] = useState<string | null>(null);
  
  // Use server-provided action status
  const hasSubmittedThisRound = actionStatus[player.player_id] || false;
  
  // Reset submission state when new round starts or when action status changes
  useEffect(() => {
    // Reset submission state when new round starts and server confirms no action
    if (gameState.phase === 'awaiting_actions' && !hasSubmittedThisRound) {
      setIsSubmitting(false);
      setLastSubmittedAction(null);
    }
  }, [gameState.current_round, gameState.phase, hasSubmittedThisRound]);
  
  const canAct = gameState.phase === 'awaiting_actions' && 
                (!gameState.current_turn_role || gameState.current_turn_role === player.role) &&
                !hasSubmittedThisRound && !isSubmitting;

  const handleActionSubmit = async (action: string) => {
    setIsSubmitting(true);
    setLastSubmittedAction(action);
    try {
      await onSubmitAction(action);
    } catch (error) {
      // Reset on error
      setIsSubmitting(false);
      setLastSubmittedAction(null);
    }
  };

  const renderActionButtons = () => {
    // Show feedback if action submitted
    if (hasSubmittedThisRound || isSubmitting) {
      const actionName = lastSubmittedAction ? lastSubmittedAction.replace('_', ' ').toUpperCase() : 'Action';
      return (
        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-800 font-medium mb-2">
            ✅ Action Submitted Successfully!
          </div>
          {lastSubmittedAction && (
            <div className="text-green-600 text-sm mb-2">
              You chose: <strong>{actionName}</strong>
            </div>
          )}
        </div>
      );
    }
    
    if (!canAct || availableActions.length === 0) {
      const reason = gameState.phase !== 'awaiting_actions' 
        ? 'Not accepting actions in current phase' 
        : gameState.current_turn_role && gameState.current_turn_role !== player.role
        ? `Waiting for ${gameState.current_turn_role.toUpperCase()} to act`
        : 'No actions available';
      
      return <p className="text-gray-600">{reason}</p>;
    }

    return (
      <div>
        <div className="mb-2 text-sm text-gray-600">
          Choose your action for Round {gameState.current_round}:
        </div>
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action: string) => (
            <Button
              key={action}
              onClick={() => handleActionSubmit(action)}
              variant="primary"
              disabled={isSubmitting}
              className="transition-all duration-200 hover:scale-105"
            >
              {isSubmitting ? 'Submitting...' : action.replace('_', ' ').toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">
        Actions - {player.role.toUpperCase()} 
        {player.is_ai_agent && <span className="ml-2 text-sm bg-gray-200 px-2 py-1 rounded">AI</span>}
      </h2>
      
      <div>
        <div className="flex flex-wrap">
          {renderActionButtons()}
        </div>
      </div>
      
      {gameState.current_turn_role && (
        <div className="mt-4 p-3 bg-yellow-100 rounded">
          <p className="text-sm">
            Current Turn: <strong>{gameState.current_turn_role.toUpperCase()}</strong>
          </p>
        </div>
      )}
    </div>
  );
};