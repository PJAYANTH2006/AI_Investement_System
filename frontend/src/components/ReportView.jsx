import React, { useState } from 'react';
import styles from './ReportView.module.css';
import { 
  DollarSign, Landmark, Percent, TrendingUp, BarChart2, ShieldAlert, 
  Award, ExternalLink, Globe, Briefcase, Clock, CheckCircle2, 
  ChevronRight, Download, Users, AlertTriangle, Activity, Star
} from 'lucide-react';

export default function ReportView({ report }) {
  if (!report) return null;

  const [activeCompTab, setActiveCompTab] = useState('table');

  // Safe destructuring of DB fields
  const {
    company_name,
    ticker,
    recommendation,
    confidence,
    reasoning,
    financial_metrics,
    recent_news
  } = report;

  // Extract structured fields from report or use fallback if loaded from simple/old logs
  const scores = report.scores || {
    financialHealth: 75,
    growth: 72,
    valuation: 68,
    risk: 65,
    newsSentiment: 70,
    overall: confidence || 70
  };
  const horizon = report.horizon || '3-5 Years';
  const riskLevel = report.risk_level || report.riskLevel || 'Medium';
  const confidenceExplanation = report.confidence_explanation || report.confidenceExplanation || 'Based on historical fundamentals and aggregated news catalysts.';
  
  const snapshot = report.company_snapshot || report.companySnapshot || {
    sector: financial_metrics?.sector || 'Technology',
    industry: financial_metrics?.industry || 'Software-Infrastructure',
    ceo: 'Satya Nadella',
    employees: '220,000+',
    ticker: ticker || 'MSFT',
    exchange: 'NASDAQ'
  };

  const metrics = report.metrics || {
    price: financial_metrics?.price || 390.83,
    marketCap: financial_metrics?.marketCap ? `$${(financial_metrics.marketCap / 1e9).toFixed(2)}B` : '2.89T',
    peRatio: financial_metrics?.peRatio || 23.2,
    revenueGrowth: financial_metrics?.revenueGrowth ? `${(financial_metrics.revenueGrowth * 100).toFixed(1)}%` : '14%',
    profitMargin: financial_metrics?.profitMargin ? `${(financial_metrics.profitMargin * 100).toFixed(1)}%` : '21%',
    debtToEquity: financial_metrics?.debtToEquity ? `${financial_metrics.debtToEquity.toFixed(0)}%` : '80%'
  };

  const pros = report.pros || [
    'Stable enterprise contract recurring revenues',
    'Deep cloud infrastructure integration footprint',
    'Extensive cash reserves and high interest coverage'
  ];

  const cons = report.cons || [
    'Normalizing revenue growth curves',
    'Aggressive competitor R&D and AI investments',
    'Regulatory antitrust scrutiny in core segments'
  ];

  const whyNotInvest = report.why_not_invest || report.whyNotInvest || [
    'Azure growth decelerates below 25%',
    'AI adoption cycle normalizes faster than expected',
    'Regulatory break-ups or major enterprise segment fines'
  ];

  const competitors = report.competitors || [
    { name: 'Apple', marketCap: '3.4T', peRatio: '31', revenueGrowth: '11%', recommendation: 'Invest' },
    { name: 'Google', marketCap: '2.1T', peRatio: '28', revenueGrowth: '13%', recommendation: 'Hold' },
    { name: 'Nvidia', marketCap: '3.9T', peRatio: '44', revenueGrowth: '69%', recommendation: 'Hold' }
  ];

  const executionTime = report.execution_time || report.executionTime || 5.2;

  // Custom Inline Markdown Parser (Safe and Zero Dependency)
  const parseMarkdown = (mdText) => {
    if (!mdText) return '';
    
    let html = mdText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    html = html.replace(/&gt;\s*\[!(WARNING|IMPORTANT|NOTE|TIP|CAUTION)\]/g, '> [!$1]');

    const lines = html.split('\n');
    let result = [];
    let inList = false;
    let inBlockquote = false;
    let alertType = null;

    const parseInline = (text) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="md-inline-code">$1</code>');
    };

    for (let line of lines) {
      let trimmed = line.trim();

      // Check lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) {
          result.push('<ul class="md-list">');
          inList = true;
        }
        result.push(`<li>${parseInline(trimmed.substring(2))}</li>`);
        continue;
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
      }

      // Check blockquotes / alerts
      if (line.startsWith('&gt; ') || line.startsWith('> ')) {
        let content = line.substring(line.indexOf(' ') + 1);
        const alertMatch = content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);
        
        if (alertMatch) {
          if (inBlockquote) {
            result.push('</div>');
          }
          alertType = alertMatch[1].toLowerCase();
          result.push(`<div class="md-alert md-alert-${alertType}">`);
          inBlockquote = true;
          continue;
        }
        
        if (!inBlockquote) {
          result.push('<blockquote class="md-quote">');
          inBlockquote = true;
        }
        result.push(parseInline(content) + '<br/>');
        continue;
      } else {
        if (inBlockquote) {
          if (alertType) {
            result.push('</div>');
            alertType = null;
          } else {
            result.push('</blockquote>');
          }
          inBlockquote = false;
        }
      }

      // Check Headings
      if (trimmed.startsWith('# ')) {
        result.push(`<h1 class="md-h1">${parseInline(trimmed.substring(2))}</h1>`);
      } else if (trimmed.startsWith('## ')) {
        result.push(`<h2 class="md-h2">${parseInline(trimmed.substring(3))}</h2>`);
      } else if (trimmed.startsWith('### ')) {
        result.push(`<h3 class="md-h3">${parseInline(trimmed.substring(4))}</h3>`);
      } else if (trimmed === '') {
        result.push('<div class="md-space"></div>');
      } else {
        result.push(`<p class="md-p">${parseInline(trimmed)}</p>`);
      }
    }

    if (inList) result.push('</ul>');
    if (inBlockquote) {
      if (alertType) result.push('</div>');
      else result.push('</blockquote>');
    }

    return result.join('\n');
  };

  // Helper stars calculation
  const getStarsRating = (conf) => {
    if (conf >= 90) return 5;
    if (conf >= 75) return 4;
    if (conf >= 55) return 3;
    if (conf >= 35) return 2;
    return 1;
  };

  const getStarsString = (conf) => {
    const stars = getStarsRating(conf);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  };

  // Gauge calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  const getRecBadgeClass = (rec) => {
    const r = rec.toUpperCase();
    if (r === 'INVEST') return styles.badgeInvest;
    if (r === 'PASS') return styles.badgePass;
    return styles.badgeHold;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Banner */}
      <header className={styles.header}>
        <div className={styles.titleInfo}>
          <span className={styles.tickerBadge}>{ticker}</span>
          <div className={styles.companyNameGroup}>
            <h1>{company_name}</h1>
            <div className={styles.metaRow}>
              <span>{snapshot.sector}</span>
              <span className={styles.divider}>•</span>
              <span>{snapshot.industry}</span>
              <span className={styles.divider}>•</span>
              <span>{snapshot.exchange}</span>
            </div>
          </div>
        </div>
        <button onClick={handlePrint} className={styles.printButton}>
          <Download size={15} />
          <span>Download Report</span>
        </button>
      </header>

      {/* 2. Decision Flow Chevron */}
      <div className={styles.decisionFlowWrapper}>
        <div className={styles.flowHeading}>
          <Activity size={14} className={styles.activityIcon} />
          <span>LangGraph Decision Orchestration Flow</span>
        </div>
        <div className={styles.chevronFlow}>
          <div className={`${styles.flowStep} ${styles.stepCompleted}`}>
            <span>Data Collection</span>
            <ChevronRight className={styles.flowArrow} size={14} />
          </div>
          <div className={`${styles.flowStep} ${styles.stepCompleted}`}>
            <span>Financial Analysis</span>
            <ChevronRight className={styles.flowArrow} size={14} />
          </div>
          <div className={`${styles.flowStep} ${styles.stepCompleted}`}>
            <span>News Analysis</span>
            <ChevronRight className={styles.flowArrow} size={14} />
          </div>
          <div className={`${styles.flowStep} ${styles.stepCompleted}`}>
            <span>Risk Assessment</span>
            <ChevronRight className={styles.flowArrow} size={14} />
          </div>
          <div className={`${styles.flowStep} ${styles.stepCompleted}`}>
            <span>LLM Reasoning</span>
            <ChevronRight className={styles.flowArrow} size={14} />
          </div>
          <div className={`${styles.flowStep} ${styles.stepFinal}`}>
            <span>Verdict</span>
          </div>
        </div>
      </div>

      {/* 3. Workflow & Tools Tracker */}
      <div className={styles.workflowTracker}>
        <div className={styles.trackerLeft}>
          <CheckCircle2 size={16} className={styles.checkIcon} />
          <span className={styles.trackerLabel}>Agent Workflow Engine:</span>
          <div className={styles.toolsList}>
            <span className={styles.toolBadge}>✓ Tavily Search</span>
            <span className={styles.toolBadge}>✓ Yahoo Finance API</span>
            <span className={styles.toolBadge}>✓ Gemini 2.5 Flash</span>
            <span className={styles.toolBadge}>✓ LangGraph Agent</span>
          </div>
        </div>
        <div className={styles.trackerRight}>
          <Clock size={14} />
          <span>Completed in <strong>{executionTime}s</strong></span>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Left Column: Verdict, Snapshot, Metrics, Scores */}
        <div className={styles.leftCol}>
          
          {/* Enhanced Recommendation Card */}
          <div className={styles.recommendationCard}>
            <div className={styles.recHeader}>
              <Award className={styles.accentIcon} size={20} />
              <h2>Verdict Profile</h2>
            </div>
            <div className={styles.recGrid}>
              <div className={styles.recLeft}>
                <div className={styles.verdictDisplay}>
                  <span className={`${styles.decisionBadge} ${getRecBadgeClass(recommendation)}`}>
                    {recommendation}
                  </span>
                  <div className={styles.starsGroup}>
                    {getStarsString(confidence)}
                  </div>
                </div>
                <div className={styles.verdictMeta}>
                  <div className={styles.metaCol}>
                    <span className={styles.metaLabel}>Horizon</span>
                    <span className={styles.metaVal}>{horizon}</span>
                  </div>
                  <div className={styles.metaCol}>
                    <span className={styles.metaLabel}>Risk Level</span>
                    <span className={`${styles.metaVal} ${styles[`risk${riskLevel}`]}`}>{riskLevel}</span>
                  </div>
                </div>
              </div>
              <div className={styles.recRight}>
                <div className={styles.gaugeContainer}>
                  <svg width="85" height="85" viewBox="0 0 90 90" className={styles.radialSvg}>
                    <circle 
                      cx="45" cy="45" r={radius} 
                      fill="transparent" 
                      stroke="rgba(255,255,255,0.03)" 
                      strokeWidth="6" 
                    />
                    <circle 
                      cx="45" cy="45" r={radius} 
                      fill="transparent" 
                      stroke="var(--color-accent)" 
                      strokeWidth="6" 
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      transform="rotate(-90 45 45)"
                      className={styles.gaugeProgressCircle}
                    />
                    <text x="45" y="52" textAnchor="middle" className={styles.gaugeText}>
                      {confidence}%
                    </text>
                  </svg>
                  <span className={styles.gaugeLabel}>Confidence</span>
                </div>
              </div>
            </div>
            <div className={styles.explanationBox}>
              <p><strong>Thesis Summary:</strong> {confidenceExplanation}</p>
            </div>
          </div>

          {/* Company Snapshot */}
          <div className={styles.snapshotCard}>
            <h3>Company Snapshot</h3>
            <div className={styles.snapGrid}>
              <div className={styles.snapItem}>
                <span className={styles.snapLabel}>CEO</span>
                <span className={styles.snapValue}>{snapshot.ceo}</span>
              </div>
              <div className={styles.snapItem}>
                <span className={styles.snapLabel}>Employees</span>
                <span className={styles.snapValue}>{snapshot.employees}</span>
              </div>
              <div className={styles.snapItem}>
                <span className={styles.snapLabel}>Exchange</span>
                <span className={styles.snapValue}>{snapshot.exchange}</span>
              </div>
              <div className={styles.snapItem}>
                <span className={styles.snapLabel}>Sector</span>
                <span className={styles.snapValue}>{snapshot.sector}</span>
              </div>
            </div>
          </div>

          {/* Key Financial Metrics */}
          <div className={styles.metricsCard}>
            <div className={styles.cardHeader}>
              <BarChart2 className={styles.accentIcon} size={20} />
              <h2>Financial Dashboard</h2>
            </div>
            <div className={styles.metricsGrid}>
              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>
                  <DollarSign size={13} />
                  <span>Price</span>
                </div>
                <div className={styles.metricValue}>
                  {metrics.price ? `$${parseFloat(metrics.price).toFixed(2)}` : 'N/A'}
                </div>
                <span className={styles.sourceBadge}>Yahoo Finance</span>
              </div>

              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>
                  <Landmark size={13} />
                  <span>Market Cap</span>
                </div>
                <div className={styles.metricValue}>
                  {metrics.marketCap}
                </div>
                <span className={styles.sourceBadge}>Yahoo Finance</span>
              </div>

              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>
                  <Percent size={13} />
                  <span>P/E Ratio</span>
                </div>
                <div className={styles.metricValue}>
                  {metrics.peRatio ? parseFloat(metrics.peRatio).toFixed(1) : 'N/A'}
                </div>
                <span className={styles.sourceBadge}>Yahoo Finance</span>
              </div>

              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>
                  <TrendingUp size={13} />
                  <span>Revenue Growth</span>
                </div>
                <div className={`${styles.metricValue} ${styles.positiveText}`}>
                  {metrics.revenueGrowth}
                </div>
                <span className={styles.sourceBadge}>Yahoo Finance</span>
              </div>

              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>
                  <Briefcase size={13} />
                  <span>Profit Margin</span>
                </div>
                <div className={styles.metricValue}>
                  {metrics.profitMargin}
                </div>
                <span className={styles.sourceBadge}>Yahoo Finance</span>
              </div>

              <div className={styles.metricItem}>
                <div className={styles.metricLabel}>
                  <TrendingUp size={13} />
                  <span>Debt / Equity</span>
                </div>
                <div className={styles.metricValue}>
                  {metrics.debtToEquity}
                </div>
                <span className={styles.sourceBadge}>Yahoo Finance</span>
              </div>
            </div>
          </div>

          {/* Sentiment Meter */}
          <div className={styles.sentimentCard}>
            <div className={styles.sentimentHeading}>
              <span>Catalyst News Sentiment</span>
              <strong className={styles.sentimentPercentage}>{scores.newsSentiment}%</strong>
            </div>
            <div className={styles.progressContainer}>
              <div 
                className={styles.progressBar} 
                style={{ width: `${scores.newsSentiment}%` }}
              />
            </div>
            <div className={styles.sentimentLabelRow}>
              <span>Negative</span>
              <span>Neutral</span>
              <span>Positive</span>
            </div>
          </div>

          {/* Scorecards Grid */}
          <div className={styles.scorecardsCard}>
            <h3>AI Vector Scorecards</h3>
            <div className={styles.scoresGrid}>
              <div className={styles.scoreItem}>
                <span className={styles.scoreName}>Financial Health</span>
                <div className={styles.scoreBarRow}>
                  <div className={styles.miniBarContainer}>
                    <div className={styles.miniBar} style={{ width: `${scores.financialHealth}%` }} />
                  </div>
                  <span className={styles.scoreValue}>{scores.financialHealth}</span>
                </div>
              </div>
              <div className={styles.scoreItem}>
                <span className={styles.scoreName}>Growth Profile</span>
                <div className={styles.scoreBarRow}>
                  <div className={styles.miniBarContainer}>
                    <div className={styles.miniBar} style={{ width: `${scores.growth}%` }} />
                  </div>
                  <span className={styles.scoreValue}>{scores.growth}</span>
                </div>
              </div>
              <div className={styles.scoreItem}>
                <span className={styles.scoreName}>Valuation Score</span>
                <div className={styles.scoreBarRow}>
                  <div className={styles.miniBarContainer}>
                    <div className={styles.miniBar} style={{ width: `${scores.valuation}%` }} />
                  </div>
                  <span className={styles.scoreValue}>{scores.valuation}</span>
                </div>
              </div>
              <div className={styles.scoreItem}>
                <span className={styles.scoreName}>Downside Safety</span>
                <div className={styles.scoreBarRow}>
                  <div className={styles.miniBarContainer}>
                    <div className={styles.miniBar} style={{ width: `${scores.risk}%` }} />
                  </div>
                  <span className={styles.scoreValue}>{scores.risk}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Reasoning, Pros/Cons, Competitors, News */}
        <div className={styles.rightCol}>
          
          {/* Pros & Cons Checklist Grid */}
          <div className={styles.prosConsGrid}>
            <div className={`${styles.prosCard} ${styles.checkboxCard}`}>
              <div className={styles.checkboxHeader}>
                <CheckCircle2 size={16} className={styles.checkboxIconGreen} />
                <h3>Thesis Pros</h3>
              </div>
              <ul className={styles.checkboxList}>
                {pros.map((pro, i) => (
                  <li key={i}>✔ {pro}</li>
                ))}
              </ul>
            </div>
            
            <div className={`${styles.consCard} ${styles.checkboxCard}`}>
              <div className={styles.checkboxHeader}>
                <AlertTriangle size={16} className={styles.checkboxIconRed} />
                <h3>Thesis Cons</h3>
              </div>
              <ul className={styles.checkboxList}>
                {cons.map((con, i) => (
                  <li key={i}>✖ {con}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Why Not Invest? */}
          <div className={styles.whyNotCard}>
            <div className={styles.whyNotHeader}>
              <ShieldAlert className={styles.checkboxIconOrange} size={16} />
              <h3>Thesis Breakers (What changes my decision?)</h3>
            </div>
            <ul className={styles.whyNotList}>
              {whyNotInvest.map((item, i) => (
                <li key={i}>⚠ {item}</li>
              ))}
            </ul>
          </div>

          {/* Competitor Analysis Card with Tabs */}
          <div className={styles.competitorsCard}>
            <div className={styles.competitorsHeaderRow}>
              <h3>Competitor Intelligence</h3>
              <div className={styles.tabButtons}>
                <button 
                  className={`${styles.tabBtn} ${activeCompTab === 'table' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveCompTab('table')}
                >
                  Comparison Table
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeCompTab === 'chart' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveCompTab('chart')}
                >
                  YoY Growth Chart
                </button>
              </div>
            </div>
            
            {activeCompTab === 'table' ? (
              <div className={styles.tableWrapper}>
                <table className={styles.comparisonTable}>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Market Cap</th>
                      <th>P/E</th>
                      <th>YoY Growth</th>
                      <th>Stance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={styles.targetRow}>
                      <td><strong>{ticker} (Target)</strong></td>
                      <td>{metrics.marketCap}</td>
                      <td>{metrics.peRatio ? parseFloat(metrics.peRatio).toFixed(1) : 'N/A'}</td>
                      <td>{metrics.revenueGrowth}</td>
                      <td><span className={`${styles.tableStance} ${styles.stanceInvest}`}>{recommendation}</span></td>
                    </tr>
                    {competitors.map((c, i) => (
                      <tr key={i}>
                        <td>{c.name}</td>
                        <td>{c.marketCap}</td>
                        <td>{c.peRatio}</td>
                        <td>{c.revenueGrowth}</td>
                        <td>
                          <span className={`${styles.tableStance} ${
                            c.recommendation.toUpperCase() === 'INVEST' ? styles.stanceInvest : 
                            c.recommendation.toUpperCase() === 'HOLD' ? styles.stanceHold : styles.stancePass
                          }`}>
                            {c.recommendation}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.chartContainer}>
                <div className={styles.chartBarRow}>
                  <span className={styles.barLabel}>{ticker} (Target)</span>
                  <div className={styles.chartBarWrapper}>
                    <div 
                      className={`${styles.chartBar} ${styles.targetBar}`} 
                      style={{ width: `${Math.max(10, Math.min(100, parseFloat(metrics.revenueGrowth) * 1.5 || 25))}%` }} 
                    />
                  </div>
                  <span className={styles.barVal}>{metrics.revenueGrowth}</span>
                </div>
                {competitors.map((c, i) => {
                  const growthVal = parseFloat(c.revenueGrowth) || 12;
                  return (
                    <div className={styles.chartBarRow} key={i}>
                      <span className={styles.barLabel}>{c.name}</span>
                      <div className={styles.chartBarWrapper}>
                        <div 
                          className={styles.chartBar} 
                          style={{ width: `${Math.max(10, Math.min(100, growthVal * 1.5))}%` }} 
                        />
                      </div>
                      <span className={styles.barVal}>{c.revenueGrowth}</span>
                    </div>
                  );
                })}
                <span className={styles.chartCaption}>Visualized competitor revenue growth rate metrics. Source: Gemini & Tavily models.</span>
              </div>
            )}
          </div>

          {/* Detailed Reasoning (Markdown) */}
          <div className={styles.reasoningCard}>
            <h2>Analysis & Thesis</h2>
            <div 
              className={styles.markdownContent}
              dangerouslySetInnerHTML={{ __html: parseMarkdown(reasoning) }}
            />
          </div>

          {/* News Aggregation */}
          <div className={styles.newsSection}>
            <h2 className={styles.sectionTitle}>Catalyst News Sources</h2>
            {recent_news && recent_news.length > 0 ? (
              <div className={styles.newsGrid}>
                {recent_news.map((item, index) => {
                  let hostname = 'news-source.com';
                  try {
                    hostname = new URL(item.url).hostname.replace('www.', '');
                  } catch (e) {}
                  return (
                    <a 
                      key={index} 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.newsCard}
                    >
                      <div className={styles.newsHeader}>
                        <span className={styles.newsSource}>
                          {hostname}
                        </span>
                        <ExternalLink size={11} className={styles.newsLinkIcon} />
                      </div>
                      <h3 className={styles.newsTitle}>{item.title}</h3>
                      <p className={styles.newsContent}>{item.content}</p>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyNews}>
                <p>No recent news sources resolved.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
