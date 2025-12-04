export interface Player {
  player_id: string;
  player_name: string;
  role: string;
  is_connected: boolean;
  is_ai_agent: boolean;
  total_score: number;
}

export interface GameState {
  game_id: string;
  phase: 'waiting_for_players' | 'round_start' | 'awaiting_actions' | 'processing_actions' | 'round_end' | 'game_end';
  current_round: number;
  max_rounds: number;
  current_turn_role?: string;
  players: Record<string, Player>;
  round_deadline?: string;
  description?: string;
}

export interface GameEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  player_id?: string;
  round_number?: number;
  data: Record<string, any>;
}

export interface VisibleState {
  [key: string]: any;
}