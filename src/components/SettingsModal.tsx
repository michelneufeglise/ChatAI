import { useState, useEffect } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import { useChatStore } from '@store/chatStore';
import { getOllamaModels } from '@services/ollamaService';
import { motion, AnimatePresence } from 'framer-motion';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setSetting } = useChatStore();
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollamaUrl);
  const [selectedModel, setSelectedModel] = useState(settings.ollamaModel);
  const [telegramToken, setTelegramToken] = useState(settings.telegramToken);
  const [whatsappSession, setWhatsappSession] = useState(settings.whatsappSession);
  const [theme, setTheme] = useState(settings.theme);
  
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      setOllamaUrl(settings.ollamaUrl);
      setSelectedModel(settings.ollamaModel);
      setTelegramToken(settings.telegramToken);
      setWhatsappSession(settings.whatsappSession);
      setTheme(settings.theme);
      fetchModels();
    }
  }, [isOpen, settings]);

  const fetchModels = async () => {
    setIsFetchingModels(true);
    try {
      const models = await getOllamaModels();
      setAvailableModels(models);
      if (models.length > 0 && !models.includes(selectedModel)) {
        setSelectedModel(models[0]);
      }
    } catch (e) {
      console.error('Failed to fetch Ollama models:', e);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await setSetting('ollamaUrl', ollamaUrl);
      await setSetting('ollamaModel', selectedModel);
      await setSetting('telegramToken', telegramToken);
      await setSetting('whatsappSession', whatsappSession);
      await setSetting('theme', theme);
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
        onClose();
      }, 1000);
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="settings-modal-overlay">
          <motion.div 
            className="settings-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div 
            className="settings-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="settings-header">
              <h3>System Settings</h3>
              <button className="close-button" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="settings-content">
              {/* Ollama Section */}
              <div className="settings-section">
                <h4>🤖 Ollama (Local AI)</h4>
                <div className="form-group">
                  <label htmlFor="ollamaUrl">Ollama Server URL</label>
                  <input
                    type="text"
                    id="ollamaUrl"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="ollamaModel">Default Model</label>
                  <div className="select-wrapper">
                    <select
                      id="ollamaModel"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      disabled={isFetchingModels}
                    >
                      {availableModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                      {availableModels.length === 0 && (
                        <option value={selectedModel}>{selectedModel}</option>
                      )}
                    </select>
                    <button 
                      type="button" 
                      className={`refresh-models-button ${isFetchingModels ? 'spinning' : ''}`}
                      onClick={fetchModels}
                      title="Fetch models list"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messaging Platforms Section */}
              <div className="settings-section">
                <h4>💬 Integrations</h4>
                <div className="form-group">
                  <label htmlFor="tgToken">Telegram Bot Token</label>
                  <input
                    type="password"
                    id="tgToken"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="Enter Telegram bot token"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="waSession">WhatsApp Session Directory</label>
                  <input
                    type="text"
                    id="waSession"
                    value={whatsappSession}
                    onChange={(e) => setWhatsappSession(e.target.value)}
                    placeholder="./whatsapp_session"
                  />
                </div>
              </div>

              {/* UI Preferences Section */}
              <div className="settings-section">
                <h4>🎨 Appearance</h4>
                <div className="form-group">
                  <label>Color Theme</label>
                  <div className="theme-toggle-group">
                    <button
                      type="button"
                      className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                      onClick={() => setTheme('dark')}
                    >
                      🌙 Dark
                    </button>
                    <button
                      type="button"
                      className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                      onClick={() => setTheme('light')}
                    >
                      ☀️ Light
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-footer">
              <button className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button 
                className={`save-btn ${saveStatus}`}
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
              >
                <Save size={16} />
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && 'Saved!'}
                {saveStatus === 'error' && 'Error!'}
                {saveStatus === 'idle' && 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
