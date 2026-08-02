import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useChatStore } from '@store/chatStore';
import { generateAIResponse } from '@services/ollamaService';
import './AISuggestionWidget.css';

interface AISuggestionWidgetProps {
  conversationId: string;
  onSuggestionSelect: (text: string) => void;
}

export default function AISuggestionWidget({
  conversationId,
  onSuggestionSelect,
}: AISuggestionWidgetProps) {
  const { messages, suggestions, setSuggestions, settings } = useChatStore();
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const convMessages = messages[conversationId] || [];
  const currentSuggestions = suggestions[conversationId] || [];

  const fetchSuggestions = async () => {
    if (convMessages.length === 0) return;
    setLoading(true);
    try {
      // Build context from last 5 messages
      const recentMessages = convMessages.slice(-5).map((m) => ({
        role: m.sender.id === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

      const systemPrompt =
        'You are a helpful assistant. Based on the conversation, suggest 3 short reply options for the user. ' +
        'Return ONLY a JSON array of strings, like: ["Sure!", "I need more time", "Let me check"]. No extra text.';

      const response = await generateAIResponse(
        [{ role: 'system', content: systemPrompt }, ...recentMessages],
        settings.ollamaModel
      );

      // Parse JSON array from response
      const match = response.match(/\[[\s\S]*?\]/);
      if (match) {
        const parsed = JSON.parse(match[0]) as string[];
        setSuggestions(conversationId, parsed.slice(0, 3));
        setVisible(true);
      }
    } catch (e) {
      console.error('Failed to generate suggestions:', e);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch suggestions when messages change (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions();
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convMessages.length, conversationId]);

  if (!visible && currentSuggestions.length === 0 && !loading) return null;

  return (
    <AnimatePresence>
      {(currentSuggestions.length > 0 || loading) && visible && (
        <motion.div
          className="ai-suggestion-widget"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
        >
          <div className="suggestion-header">
            <span className="suggestion-label">
              <Sparkles size={12} />
              AI Suggestions
            </span>
            <button className="suggestion-dismiss" onClick={() => setVisible(false)}>
              <X size={12} />
            </button>
          </div>

          <div className="suggestion-chips">
            {loading && currentSuggestions.length === 0 ? (
              <div className="suggestion-loading">
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
              </div>
            ) : (
              currentSuggestions.map((s, i) => (
                <motion.button
                  key={i}
                  className="suggestion-chip"
                  onClick={() => {
                    onSuggestionSelect(s);
                    setVisible(false);
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  {s}
                </motion.button>
              ))
            )}
          </div>

          <button className="suggestion-refresh-btn" onClick={fetchSuggestions} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
