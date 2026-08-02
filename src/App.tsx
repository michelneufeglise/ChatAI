import { useEffect } from 'react';
import ChatWindow from './pages/ChatWindow';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  useEffect(() => {
    console.log('ChatAI initialised');
  }, []);

  return (
    <ErrorBoundary>
      <div className="app">
        <ChatWindow />
      </div>
    </ErrorBoundary>
  );
}

export default App;
