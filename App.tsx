
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import Agenda from './screens/Agenda';
import Metrics from './screens/Metrics';
import Patients from './screens/Patients';
import Doctors from './screens/Doctors';
import Services from './screens/Services';
import Clinics from './screens/Clinics';
import Settings from './screens/Settings';
import Users from './screens/Users';
import Layout from './components/Layout';
import ChatBot from './components/ChatBot';
import VoiceAssistant from './components/VoiceAssistant';

const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/services" element={<Services />} />
          <Route path="/clinics" element={<Clinics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/users" element={<Users />} />
        </Routes>
      </Layout>

      {/* Floating AI Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
        <button
          onClick={() => {
            setIsVoiceOpen(true);
            setIsChatOpen(false);
          }}
          className="size-14 bg-primary text-background-dark rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group"
          title="Asistente de Voz"
        >
          <span className="material-symbols-outlined text-3xl group-hover:animate-pulse">audio_spark</span>
        </button>
        <button
          onClick={() => {
            setIsChatOpen(true);
            setIsVoiceOpen(false);
          }}
          className="size-14 bg-white dark:bg-surface-dark text-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group border border-primary/20"
          title="Chat con IA"
        >
          <span className="material-symbols-outlined text-3xl">smart_toy</span>
        </button>
      </div>

      {/* Modals */}
      {isChatOpen && <ChatBot onClose={() => setIsChatOpen(false)} />}
      {isVoiceOpen && <VoiceAssistant onClose={() => setIsVoiceOpen(false)} />}
    </HashRouter>
  );
};

export default App;
