import React from 'react';
import { Classes } from '@blueprintjs/core';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import LandingPage from './components/LandingPage';
import './App.css';

function App() {
  return (
    <div className={`App ${Classes.DARK}`}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
