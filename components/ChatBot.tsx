
import React, { useState, useRef, useEffect } from 'react';
/* Fix: Removed non-existent import generateChatResponse as it is not exported from services/gemini */
import { streamChatResponse } from '../services/gemini';
import { ChatMessage } from '../types';

interface ChatBotProps {
  onClose: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: '¡Hola! Soy MediClinic AI. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      let fullResponse = '';
      const stream = streamChatResponse(input);
      
      // Add a placeholder for the AI response
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'model', text: fullResponse };
          return updated;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, ha ocurrido un error al procesar tu solicitud.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 w-[90vw] md:w-[400px] h-[600px] bg-background-dark border border-border-dark rounded-2xl shadow-2xl flex flex-col z-[60] overflow-hidden">
      <div className="p-4 border-b border-border-dark bg-surface-dark flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-background-dark">
            <span className="material-symbols-outlined text-[20px] font-bold">smart_toy</span>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">MediClinic AI</h3>
            <p className="text-[10px] text-primary">En línea</p>
          </div>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-white">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#131811]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-primary text-background-dark rounded-tr-none font-medium' 
                : 'bg-surface-dark text-white border border-border-dark rounded-tl-none'
            }`}>
              {msg.text || (msg.role === 'model' && i === messages.length - 1 && isTyping ? '...' : '')}
            </div>
          </div>
        ))}
        {isTyping && messages[messages.length-1].text === '' && (
           <div className="flex justify-start">
             <div className="bg-surface-dark text-white p-3 rounded-2xl rounded-tl-none animate-pulse text-xs">Pensando...</div>
           </div>
        )}
      </div>

      <div className="p-4 border-t border-border-dark bg-surface-dark">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-background-dark border-none rounded-xl text-sm text-white focus:ring-1 focus:ring-primary px-4 py-2"
          />
          <button
            onClick={handleSend}
            disabled={isTyping}
            className="size-10 bg-primary text-background-dark rounded-xl flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
