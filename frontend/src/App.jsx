import React, { useState, useEffect } from 'react';
import './App.css';
import HistorySidebar from './components/HistorySidebar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

export default function App() {
  const [history, setHistory] = useState([]);
  const [activeReportId, setActiveReportId] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [isResearching, setIsResearching] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [researchError, setResearchError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  // Fetch report history on mount (only if logged in)
  useEffect(() => {
    if (isLoggedIn) {
      fetchHistory();
    }
  }, [isLoggedIn]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        console.error('Failed to fetch history:', res.statusText);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSelectReport = async (id) => {
    if (activeReportId === id && activeReport) return;
    
    try {
      const res = await fetch(`/api/report/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveReport(data);
        setActiveReportId(id);
        // Clear any previous error when switching
        setResearchError(null);
      } else {
        console.error('Failed to fetch report details:', res.statusText);
      }
    } catch (err) {
      console.error('Error fetching report details:', err);
    }
  };

  const handleRunResearch = async (companyName) => {
    setIsResearching(true);
    setResearchError(null);
    setActiveReport(null);
    setActiveReportId(null);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyName }),
      });

      const data = await res.json();

      if (res.ok) {
        setActiveReport(data);
        setActiveReportId(data.id);
        // Refresh the sidebar history list
        await fetchHistory();
      } else {
        setResearchError(data.error || 'Failed to complete research analysis.');
      }
    } catch (err) {
      console.error('Error executing research request:', err);
      setResearchError('Network error connecting to research agent. Please verify server status.');
    } finally {
      setIsResearching(false);
    }
  };

  const handleLogin = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    setActiveReport(null);
    setActiveReportId(null);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="appContainer">
      <HistorySidebar 
        history={history} 
        activeReportId={activeReportId} 
        onSelectReport={handleSelectReport} 
        isLoadingHistory={isLoadingHistory}
      />
      <Dashboard 
        activeReport={activeReport}
        onRunResearch={handleRunResearch}
        isResearching={isResearching}
        researchError={researchError}
        onLogout={handleLogout}
      />
    </div>
  );
}
