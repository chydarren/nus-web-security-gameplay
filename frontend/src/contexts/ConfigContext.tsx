import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ConfigContextType {
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  getWebSocketUrl: (playerId: string) => string;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [backendUrl, setBackendUrlState] = useState(() => {
    // Try to load from localStorage, fallback to localhost:8000
    const saved = localStorage.getItem('backend_url');
    return saved || 'http://localhost:8000';
  });

  const setBackendUrl = (url: string) => {
    // Clean up the URL (remove trailing slash, ensure http/https prefix)
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }
    
    setBackendUrlState(cleanUrl);
    localStorage.setItem('backend_url', cleanUrl);
  };

  const getWebSocketUrl = (playerId: string) => {
    // Convert HTTP URL to WebSocket URL
    const wsUrl = backendUrl.replace(/^https?:\/\//, 'ws://').replace(/^wss:\/\//, 'ws://');
    return `${wsUrl}/ws/${playerId}`;
  };

  useEffect(() => {
    // Save to localStorage whenever backendUrl changes
    localStorage.setItem('backend_url', backendUrl);
  }, [backendUrl]);

  return (
    <ConfigContext.Provider value={{ backendUrl, setBackendUrl, getWebSocketUrl }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};