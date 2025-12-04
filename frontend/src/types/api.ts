export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface GameConfig {
  game_type: string;
  total_rounds: number;
  required_players: number;
  available_roles: string[];
}

export interface GameInfo {
  exists: boolean;
  game_id?: string;
  phase?: string;
  current_round?: number;
  config?: GameConfig;
}

export interface JoinGameRequest {
  player_name: string;
  role: string;
}

export interface SubmitActionRequest {
  action: string;
  action_data?: Record<string, any>;
}