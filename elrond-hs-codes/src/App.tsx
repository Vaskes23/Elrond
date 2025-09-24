import React from 'react';
import { Classes } from '@blueprintjs/core';
import { Dashboard } from './components/Dashboard';
import './App.css';

function App() {
  return (
    <div className={`App ${Classes.DARK}`}>
      <Dashboard />
    </div>
  );
}

export default App;
