import React, { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import ReportView from './ReportView';
import { Search, TrendingUp, Sparkles, Building2, AlertTriangle } from 'lucide-react';

export default function Dashboard({ 
  activeReport, 
  onRunResearch, 
  isResearching, 
  researchError,
  onLogout
}) {
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const suggestions = [
    { label: 'Tesla (TSLA)', value: 'TSLA' },
    { label: 'Nvidia (NVDA)', value: 'NVDA' },
    { label: 'Apple (AAPL)', value: 'AAPL' },
    { label: 'Microsoft (MSFT)', value: 'MSFT' },
    { label: 'Amazon (AMZN)', value: 'AMZN' },
    { label: 'Google (GOOGL)', value: 'GOOGL' },
    { label: 'Meta (META)', value: 'META' },
    { label: 'AMD (AMD)', value: 'AMD' }
  ];

  useEffect(() => {
    if (!isResearching) {
      setLogs([]);
      return;
    }

    setLogs([{ time: '00:00.00', text: '🟢 Initiating LangGraph Research Agent pipeline...' }]);

    const steps = [
      { delay: 1000, text: '🤖 [resolveTicker] Ticker Resolver node active. Resolving company name alias...' },
      { delay: 2800, text: '📊 [fetchFinancials] Financials node active. Scraping Yahoo Finance stock quotes and margins...' },
      { delay: 8200, text: '🔍 [fetchNews] News Scraper node active. Aggregating Tavily catalyst articles & sentiment feeds...' },
      { delay: 14500, text: '🧠 [generateReport] Gemini 2.5 Flash node active. Constructing structured investment reasoning schema...' },
      { delay: 23500, text: '💾 [database] Persisting report structure to database and client cache pools...' }
    ];

    const timers = [];
    const startTime = Date.now();

    steps.forEach(step => {
      const timer = setTimeout(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        setLogs(prev => [...prev, { time: `00:${elapsed < 10 ? '0' : ''}${elapsed}`, text: step.text }]);
      }, step.delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isResearching]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || isResearching) return;
    onRunResearch(query.trim());
  };

  const handleSuggestionClick = (value) => {
    if (isResearching) return;
    setQuery(value);
    onRunResearch(value);
  };

  return (
    <main className={styles.main}>
      {/* Search Bar Panel */}
      <section className={styles.searchSection}>
        <div className={styles.brandRow}>
          <div className={styles.brand}>
            <Sparkles className={styles.sparkleIcon} size={20} />
            <span>Altuni AI Labs</span>
          </div>
          <div className={styles.statusBadges}>
            <div className={styles.statusBadge}>
              <span className={styles.pulseDot}></span>
              <span>Gemini 2.5 Live</span>
            </div>
            <div className={styles.statusBadgeDb}>
              <span className={styles.dbDot}></span>
              <span>DB Pool Active</span>
            </div>
            <button onClick={onLogout} className={styles.logoutBtn}>
              Log Out
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <div className={styles.inputWrapper}>
            <Search className={styles.searchIcon} size={20} />
            <input 
              type="text" 
              placeholder="Search company (e.g. Tesla, Nvidia, Apple)..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isResearching}
              className={styles.input}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isResearching || !query.trim()} 
            className={styles.searchButton}
          >
            {isResearching ? (
              <span className={styles.spinner}></span>
            ) : 'Analyze'}
          </button>
        </form>

        <div className={styles.suggestions}>
          <span className={styles.suggestionLabel}>Suggestions:</span>
          {suggestions.map((s) => (
            <button 
              key={s.value}
              onClick={() => handleSuggestionClick(s.value)}
              disabled={isResearching}
              className={styles.suggestionPill}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Main Content Area */}
      <section className={styles.contentSection}>
        {isResearching ? (
          /* High-Fidelity Shimmer Loading State with Live Logs */
          <div className={styles.shimmerContainer}>
            {/* Terminal Console Card */}
            <div className={styles.terminalConsole}>
              <div className={styles.terminalHeader}>
                <div className={styles.terminalDots}>
                  <span className={styles.dotRed}></span>
                  <span className={styles.dotYellow}></span>
                  <span className={styles.dotGreen}></span>
                </div>
                <span className={styles.terminalTitle}>LangGraph Agent Pipeline Console</span>
              </div>
              <div className={styles.terminalBody}>
                {logs.map((log, index) => (
                  <div key={index} className={styles.terminalLine}>
                    <span className={styles.logTimestamp}>[{log.time}]</span>{' '}
                    <span className={styles.logText}>{log.text}</span>
                  </div>
                ))}
                <div className={styles.terminalCursorLine}>
                  <span className={styles.terminalCursor}>_</span>
                </div>
              </div>
            </div>

            {/* Header Shimmer */}
            <div className={`${styles.shimmerHeader} shimmer-effect`}></div>
            
            <div className={styles.shimmerGrid}>
              {/* Left Column Shimmer */}
              <div className={styles.shimmerLeftCol}>
                <div className={`${styles.shimmerCardMedium} shimmer-effect`}></div>
                <div className={`${styles.shimmerCardLarge} shimmer-effect`}></div>
              </div>
              
              {/* Right Column Shimmer */}
              <div className={styles.shimmerRightCol}>
                <div className={`${styles.shimmerCardReasoning} shimmer-effect`}>
                  <div className={styles.shimmerLineGroup}>
                    <div className={styles.shimmerLine}></div>
                    <div className={styles.shimmerLine}></div>
                    <div className={styles.shimmerLine} style={{ width: '80%' }}></div>
                    <div className={styles.shimmerLine} style={{ width: '90%' }}></div>
                    <div className={styles.shimmerLine} style={{ width: '50%' }}></div>
                  </div>
                </div>
                <div className={styles.shimmerNewsGrid}>
                  <div className={`${styles.shimmerNewsCard} shimmer-effect`}></div>
                  <div className={`${styles.shimmerNewsCard} shimmer-effect`}></div>
                </div>
              </div>
            </div>
          </div>
        ) : researchError ? (
          /* Error Banner */
          <div className={styles.errorBanner}>
            <AlertTriangle className={styles.errorIcon} size={28} />
            <div className={styles.errorText}>
              <h3>Research Node Failed</h3>
              <p>{researchError}</p>
            </div>
          </div>
        ) : activeReport ? (
          /* Active Report Visualization */
          <ReportView report={activeReport} />
        ) : (
          /* Welcome Splash Screen */
          <div className={styles.welcomeSplash}>
            <div className={styles.welcomeGlow}></div>
            <Building2 className={styles.welcomeIcon} size={48} />
            <h2>AI Investment Research Agent</h2>
            <p>
              Enter a company name above to initiate a deep workflow. The agent will resolve the ticker, pull financials from Yahoo Finance, scrape recent news with Tavily, and generate a comprehensive investment decision using Gemini 2.5 Flash.
            </p>
            <div className={styles.processSteps}>
              <div className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <span>Yahoo Finance Ticker & Metrics</span>
              </div>
              <div className={styles.stepConnector}></div>
              <div className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <span>Tavily Real-Time News</span>
              </div>
              <div className={styles.stepConnector}></div>
              <div className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <span>Gemini Analysis & Report</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
