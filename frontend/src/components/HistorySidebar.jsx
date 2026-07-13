import React, { useState } from 'react';
import styles from './HistorySidebar.module.css';
import { History, TrendingUp, Search, Calendar, ChevronRight } from 'lucide-react';

export default function HistorySidebar({ history, activeReportId, onSelectReport, isLoadingHistory }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(item => 
    item.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  const getBadgeClass = (rec) => {
    const r = rec.toUpperCase();
    if (r === 'INVEST') return styles.badgeInvest;
    if (r === 'PASS') return styles.badgePass;
    return styles.badgeHold;
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <History className={styles.iconTitle} size={20} />
          <h2>Research History</h2>
        </div>
        <span className={styles.countBadge}>{history.length}</span>
      </div>

      <div className={styles.searchWrapper}>
        <Search className={styles.iconSearch} size={16} />
        <input 
          type="text" 
          placeholder="Filter history..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.listContainer}>
        {isLoadingHistory ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading history...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{searchTerm ? 'No matches found' : 'No research reports yet'}</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {filteredHistory.map((item) => (
              <li 
                key={item.id} 
                className={`${styles.listItem} ${activeReportId === item.id ? styles.activeItem : ''}`}
                onClick={() => onSelectReport(item.id)}
              >
                <div className={styles.itemHeader}>
                  <span className={styles.ticker}>{item.ticker}</span>
                  <span className={`${styles.badge} ${getBadgeClass(item.recommendation)}`}>
                    {item.recommendation}
                  </span>
                </div>
                <div className={styles.companyName}>{item.company_name}</div>
                <div className={styles.itemFooter}>
                  <div className={styles.dateGroup}>
                    <Calendar size={12} />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <div className={styles.confidence}>
                    <span>Conf: {item.confidence}%</span>
                    <ChevronRight size={14} className={styles.arrow} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
