import React, { useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { Button } from './UI/Button';
import { Card } from './UI/Card';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { backendUrl, setBackendUrl } = useConfig();
  const [inputUrl, setInputUrl] = useState(backendUrl);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    setBackendUrl(inputUrl);
    onClose();
  };

  const handleTest = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connection...');
    
    try {
      // Clean up URL for testing
      let testUrl = inputUrl.trim();
      if (testUrl.endsWith('/')) {
        testUrl = testUrl.slice(0, -1);
      }
      if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
        testUrl = `http://${testUrl}`;
      }

      const response = await fetch(`${testUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setTestStatus('success');
        setTestMessage('✅ Connection successful!');
      } else {
        setTestStatus('error');
        setTestMessage(`❌ Connection failed: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      setTestStatus('error');
      setTestMessage(`❌ Connection failed: ${error.message}`);
    }

    // Clear test status after 3 seconds
    setTimeout(() => {
      setTestStatus('idle');
      setTestMessage('');
    }, 3000);
  };

  const handleReset = () => {
    setInputUrl('http://localhost:8000');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="backend-url" className="block text-sm font-medium mb-1">
              Backend URL
            </label>
            <input
              id="backend-url"
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://localhost:8000"
            />
            <p className="text-sm text-gray-600 mt-1">
              Enter the URL where your game backend is running
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={testStatus === 'testing'}
              variant="secondary"
              className="flex-1"
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              onClick={handleReset}
              variant="secondary"
              className="px-4"
            >
              Reset
            </Button>
          </div>

          {testMessage && (
            <div className={`p-2 rounded text-sm ${
              testStatus === 'success' ? 'bg-green-100 text-green-800' :
              testStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {testMessage}
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSave} className="flex-1">
              Save
            </Button>
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};