import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import ChatWindow from './pages/ChatWindow';
import './App.css';

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');

  async function greet() {
    setGreetMsg(await invoke('greet', { name }));
  }

  useEffect(() => {
    // Initialize app
    console.log('ChatAI initialized');
  }, []);

  return (
    <div className="app">
      <ChatWindow />
    </div>
  );
}

export default App;
