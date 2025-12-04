import { GameState, VisibleState, Player } from '../types/game';
import { ApiResponse, JoinGameRequest, SubmitActionRequest, GameInfo } from '../types/api';

class ApiService {
  private backendUrl: string = 'http://localhost:8000';

  setBackendUrl(url: string) {
    this.backendUrl = url;
  }

  getBackendUrl(): string {
    return this.backendUrl;
  }

  private async makeRequest<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      console.log(`API Request: ${options.method || 'GET'} ${url}`);
      if (options.body) {
        console.log('Request body:', options.body);
      }
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log(`API Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      return data;
    } catch (error) {
      console.error(`API Request failed for ${url}:`, error);
      throw error;
    }
  }

  async getGameInfo(): Promise<ApiResponse<GameInfo>> {
    return this.makeRequest(`${this.backendUrl}/api/game_info`);
  }

  async createGame(configFile: string = 'config/game_configs/security_game.json'): Promise<ApiResponse<any>> {
    return this.makeRequest(`${this.backendUrl}/api/create_game?config_file=${encodeURIComponent(configFile)}`, {
      method: 'POST',
    });
  }

  async joinGame(request: JoinGameRequest): Promise<ApiResponse<{player: Player, game_state: GameState}>> {
    return this.makeRequest(`${this.backendUrl}/api/join`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async startGame(): Promise<ApiResponse> {
    return this.makeRequest(`${this.backendUrl}/api/start`, {
      method: 'POST',
    });
  }

  async submitAction(playerId: string, request: SubmitActionRequest): Promise<ApiResponse> {
    return this.makeRequest(`${this.backendUrl}/api/action/${playerId}`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getGameState(): Promise<GameState> {
    return this.makeRequest(`${this.backendUrl}/api/state`);
  }

  async getPlayerState(playerId: string): Promise<ApiResponse<{
    game_state: GameState;
    visible_state: VisibleState;
    available_actions: string[];
    player: Player;
    game_history?: any[];
    action_status?: Record<string, boolean>;
  }>> {
    return this.makeRequest(`${this.backendUrl}/api/state/${playerId}`);
  }

  async addAIAgent(agentType: string, agentConfig: Record<string, any>): Promise<ApiResponse> {
    return this.makeRequest(`${this.backendUrl}/api/add_ai_agent`, {
      method: 'POST',
      body: JSON.stringify({
        agent_type: agentType,
        agent_config: agentConfig,
      }),
    });
  }
}

export const apiService = new ApiService();