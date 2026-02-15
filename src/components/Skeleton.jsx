import React from 'react';

// Base skeleton block
const S = ({ w, h, r = '8px', className = '', style = {} }) => (
  <div className={`sk ${className}`} style={{ width: w || '100%', height: h || '20px', borderRadius: r, ...style }} />
);

// Stat Card Skeleton — with icon placeholder + text lines
export const StatCardSkeleton = ({ color = '#3b82f6', delay = 0 }) => (
  <div className="skc stat-skc" style={{ animationDelay: `${delay}s` }}>
    <div className="sk-stat-icon" style={{ background: `${color}15`, borderColor: `${color}20` }}>
      <div className="sk-icon-pulse" style={{ background: `${color}30` }} />
    </div>
    <div className="sk-stat-text">
      <S w="70px" h="12px" />
      <S w="100px" h="26px" className="sk-bold" />
      <S w="50px" h="11px" />
    </div>
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton = ({ columns = 6 }) => (
  <tr className="sk-tr">
    {[...Array(columns)].map((_, i) => (
      <td key={i}><S w={i === 0 ? '80px' : i === columns - 1 ? '120px' : '100%'} h="18px" /></td>
    ))}
  </tr>
);

// Invoice Card Skeleton
export const InvoiceCardSkeleton = () => (
  <div className="skc invoice-skc">
    <div className="sk-row-between">
      <S w="100px" h="24px" r="6px" />
      <S w="60px" h="24px" r="20px" />
    </div>
    <div className="sk-col" style={{ gap: '10px', margin: '20px 0' }}>
      <S w="150px" h="18px" />
      <S w="80px" h="14px" />
    </div>
    <div className="sk-row-between">
      <S w="100px" h="28px" />
      <S w="120px" h="36px" r="8px" />
    </div>
  </div>
);

// Student Card Skeleton
export const StudentCardSkeleton = () => (
  <div className="skc student-skc">
    <div className="sk-avatar-circle" />
    <div className="sk-col" style={{ gap: '8px' }}>
      <S w="140px" h="18px" />
      <S w="100px" h="14px" />
      <S w="80px" h="20px" r="10px" />
    </div>
  </div>
);

// Chart Skeleton — bar chart placeholder
export const ChartSkeleton = ({ color = '#3b82f6' }) => (
  <div className="skc chart-skc">
    <div className="sk-row-between" style={{ marginBottom: '24px' }}>
      <S w="130px" h="18px" />
      <S w="80px" h="14px" />
    </div>
    <div className="sk-chart-area">
      {[45, 72, 58, 88, 42, 65, 80, 55].map((h, i) => (
        <div key={i} className="sk-bar-col" style={{ animationDelay: `${i * 0.08}s` }}>
          <div className="sk-bar" style={{ height: `${h}%`, background: `linear-gradient(to top, ${color}25, ${color}08)` }} />
          <S w="20px" h="8px" style={{ marginTop: '6px' }} />
        </div>
      ))}
    </div>
  </div>
);

// Invoice Table Skeleton — full table with rows
export const InvoiceTableSkeleton = () => (
  <div className="sk-table-wrap">
    <div className="sk-table-head">
      {['#', 'Student', 'Period', 'Qty', 'Amount', 'Status', 'Actions'].map((_, i) => (
        <S key={i} w={['50px', '120px', '80px', '40px', '70px', '60px', '90px'][i]} h="10px" />
      ))}
    </div>
    {[0, 1, 2, 3, 4].map(idx => (
      <div key={idx} className="sk-table-row" style={{ animationDelay: `${idx * 0.1}s` }}>
        <div className="sk-cell"><S w="68px" h="22px" r="6px" className="sk-code" /></div>
        <div className="sk-cell sk-col" style={{ gap: '6px' }}>
          <S w={`${100 + idx * 10}px`} h="15px" />
          <S w="55px" h="16px" r="10px" className="sk-tag" />
        </div>
        <div className="sk-cell"><S w="85px" h="14px" /></div>
        <div className="sk-cell"><S w="28px" h="20px" r="6px" className="sk-num" /></div>
        <div className="sk-cell"><S w="72px" h="18px" className="sk-bold" /></div>
        <div className="sk-cell"><S w="60px" h="24px" r="20px" className="sk-badge" /></div>
        <div className="sk-cell sk-actions">
          <S w="30px" h="30px" r="8px" />
          <S w="30px" h="30px" r="8px" />
          <S w="30px" h="30px" r="8px" />
        </div>
      </div>
    ))}
  </div>
);

// Attendance Page Skeleton
export const AttendanceSkeleton = () => (
  <div className="sk-attendance">
    <SkeletonStyles />
    {[0, 1, 2, 3, 4].map(idx => (
      <div key={idx} className="sk-att-row" style={{ animationDelay: `${idx * 0.1}s` }}>
        <div className="sk-att-left">
          <div className="sk-avatar-sm" style={{ background: `hsl(${idx * 60}, 60%, 92%)` }}>
            <div className="sk-avatar-letter" style={{ color: `hsl(${idx * 60}, 50%, 55%)` }}>
              {['A', 'S', 'R', 'M', 'K'][idx]}
            </div>
          </div>
          <div className="sk-col" style={{ gap: '5px' }}>
            <S w={`${110 + idx * 12}px`} h="15px" />
            <S w="80px" h="18px" r="10px" className="sk-tag" />
          </div>
        </div>
        <div className="sk-att-controls">
          <div className="sk-btn-ghost"><S w="60px" h="14px" /></div>
          <div className="sk-btn-ghost"><S w="60px" h="14px" /></div>
        </div>
        <div className="sk-att-right">
          <div className="sk-count-box">
            <S w="28px" h="24px" className="sk-num" />
            <S w="42px" h="9px" />
          </div>
          <div className="sk-col" style={{ alignItems: 'flex-end' }}>
            <S w="10px" h="10px" />
            <S w="65px" h="16px" className="sk-bold" />
          </div>
          <S w="30px" h="30px" r="8px" />
        </div>
      </div>
    ))}
  </div>
);

// Analytics Page Skeleton
export const AnalyticsSkeleton = () => (
  <div className="sk-analytics">
    <SkeletonStyles />
    <div className="sk-stats-grid four">
      <StatCardSkeleton color="#3b82f6" delay={0} />
      <StatCardSkeleton color="#10b981" delay={0.08} />
      <StatCardSkeleton color="#f59e0b" delay={0.16} />
      <StatCardSkeleton color="#ef4444" delay={0.24} />
    </div>
    <div className="sk-two-col">
      <ChartSkeleton color="#3b82f6" />
      <div className="skc" style={{ minHeight: '280px' }}>
        <S w="130px" h="18px" style={{ marginBottom: '20px' }} />
        <div className="sk-donut-wrap">
          <div className="sk-donut">
            <div className="sk-donut-hole" />
          </div>
        </div>
        <div className="sk-legend">
          {['#3b82f6', '#10b981', '#f59e0b'].map((c, i) => (
            <div key={i} className="sk-legend-item">
              <div className="sk-legend-dot" style={{ background: `${c}40` }} />
              <S w="70px" h="12px" />
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="sk-two-col">
      <div className="skc" style={{ minHeight: '280px' }}>
        <S w="140px" h="18px" style={{ marginBottom: '16px' }} />
        <div className="sk-cal-grid">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="sk-cal-head">{d}</div>
          ))}
          {[...Array(28)].map((_, i) => (
            <div key={i} className={`sk-cal-cell ${[3, 7, 10, 14, 17, 21, 24].includes(i) ? 'active' : ''}`} />
          ))}
        </div>
      </div>
      <div className="skc" style={{ minHeight: '280px' }}>
        <S w="140px" h="18px" style={{ marginBottom: '16px' }} />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="sk-leaderboard-item" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="sk-rank" style={{ background: i === 0 ? '#fbbf2420' : 'var(--bg-secondary)' }}>
              <span style={{ color: i === 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: 800, fontSize: '0.75rem' }}>{i + 1}</span>
            </div>
            <div className="sk-avatar-xs" style={{ background: `hsl(${i * 80 + 200}, 55%, 90%)` }} />
            <div className="sk-col" style={{ gap: '4px', flex: 1 }}>
              <S w={`${90 + i * 10}px`} h="13px" />
              <S w="55px" h="10px" />
            </div>
            <S w="30px" h="20px" r="6px" className="sk-num" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Insights Page Skeleton
export const InsightsSkeleton = () => (
  <div className="sk-insights">
    <SkeletonStyles />
    <div className="sk-stats-grid six">
      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'].map((c, i) => (
        <StatCardSkeleton key={i} color={c} delay={i * 0.06} />
      ))}
    </div>
    <div className="sk-two-col">
      <ChartSkeleton color="#10b981" />
      <ChartSkeleton color="#8b5cf6" />
    </div>
    <div className="sk-two-col">
      <div className="skc" style={{ minHeight: '260px' }}>
        <S w="140px" h="18px" style={{ marginBottom: '16px' }} />
        {[0, 1, 2].map(i => (
          <div key={i} className="sk-risk-row" style={{ animationDelay: `${i * 0.12}s` }}>
            <div className="sk-risk-indicator" style={{ background: ['#fef3c7', '#fee2e2', '#dcfce7'][i] }} />
            <div className="sk-col" style={{ flex: 1, gap: '4px' }}>
              <S w={`${90 + i * 15}px`} h="14px" />
              <S w="130px" h="11px" />
            </div>
            <S w="70px" h="28px" r="8px" />
          </div>
        ))}
      </div>
      <div className="skc sk-ai-panel" style={{ minHeight: '260px' }}>
        <div className="sk-ai-badge">
          <div className="sk-ai-icon">✨</div>
          <S w="90px" h="14px" />
        </div>
        <div className="sk-ai-body">
          <S w="180px" h="13px" />
          <S w="150px" h="13px" />
          <S w="200px" h="13px" />
        </div>
      </div>
    </div>
  </div>
);

// Settings Page Skeleton
export const SettingsSkeleton = () => (
  <div className="sk-settings">
    <SkeletonStyles />
    <div className="sk-tabs">
      {['Business', 'Pricing', 'Theme', 'Backup'].map((t, i) => (
        <div key={i} className={`sk-tab ${i === 0 ? 'active' : ''}`}>
          <S w="14px" h="14px" r="4px" />
          <span className="sk-tab-text">{t}</span>
        </div>
      ))}
    </div>
    <div className="skc sk-form-card">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="sk-field" style={{ animationDelay: `${i * 0.08}s` }}>
          <S w={['90px', '70px', '100px', '80px'][i]} h="11px" />
          <S h="42px" r="10px" className="sk-input" />
        </div>
      ))}
      <div className="sk-row" style={{ gap: '16px' }}>
        <div className="sk-field" style={{ flex: 1 }}>
          <S w="60px" h="11px" />
          <S h="42px" r="10px" className="sk-input" />
        </div>
        <div className="sk-field" style={{ flex: 1 }}>
          <S w="75px" h="11px" />
          <S h="42px" r="10px" className="sk-input" />
        </div>
      </div>
      <div className="sk-row" style={{ justifyContent: 'flex-end', marginTop: '8px' }}>
        <S w="120px" h="42px" r="10px" className="sk-btn-primary" />
      </div>
    </div>
  </div>
);

// Full Page Skeleton
export const PageSkeleton = () => (
  <div className="sk-page">
    <SkeletonStyles />
    <div className="sk-row-between" style={{ marginBottom: '28px' }}>
      <div className="sk-col" style={{ gap: '8px' }}>
        <S w="200px" h="28px" />
        <S w="150px" h="14px" />
      </div>
      <S w="140px" h="44px" r="10px" />
    </div>
    <div className="sk-stats-grid four">
      <StatCardSkeleton color="#3b82f6" delay={0} />
      <StatCardSkeleton color="#10b981" delay={0.08} />
      <StatCardSkeleton color="#f59e0b" delay={0.16} />
      <StatCardSkeleton color="#ef4444" delay={0.24} />
    </div>
  </div>
);

// ─── Styles (layout-only — animations are pre-loaded in index.css) ──
export const SkeletonStyles = () => (
  <style jsx="true">{`
    /* Utility */
    .sk-row-between { display: flex; justify-content: space-between; align-items: center; }
    .sk-col { display: flex; flex-direction: column; }
    .sk-row { display: flex; align-items: center; }
    .sk-bold { opacity: 0.7; }
    .sk-input { background: var(--bg-secondary); border: 1px solid var(--border-color); }

    /* Stat Card */
    .stat-skc { display: flex; align-items: flex-start; gap: 15px; }
    .sk-stat-icon {
        width: 50px; height: 50px; min-width: 50px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        border: 1px solid transparent;
    }
    .sk-icon-pulse {
        width: 24px; height: 24px; border-radius: 8px;
        animation: skPulse 2s ease-in-out infinite;
    }
    .sk-stat-text { display: flex; flex-direction: column; gap: 8px; }

    /* Table Skeleton */
    .sk-table-wrap { padding: 0; }
    .sk-table-head {
        display: grid; grid-template-columns: 70px 1.5fr 100px 50px 80px 70px 110px;
        gap: 12px; padding: 14px 20px;
        border-bottom: 2px solid var(--border-color);
    }
    .sk-table-row {
        display: grid; grid-template-columns: 70px 1.5fr 100px 50px 80px 70px 110px;
        gap: 12px; padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
        animation: skRowSlide 0.4s ease-out both;
    }
    .sk-cell { display: flex; align-items: center; }
    .sk-cell.sk-actions { gap: 5px; justify-content: flex-end; }

    /* Attendance */
    .sk-attendance { display: flex; flex-direction: column; }
    .sk-att-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 18px 24px; border-bottom: 1px solid var(--border-color);
        animation: skRowSlide 0.4s ease-out both;
    }
    .sk-att-left { display: flex; align-items: center; gap: 14px; }
    .sk-avatar-sm {
        width: 44px; height: 44px; min-width: 44px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
    }
    .sk-avatar-letter {
        font-weight: 800; font-size: 1rem; opacity: 0.5;
        animation: skPulse 2s ease-in-out infinite;
    }
    .sk-avatar-circle {
        width: 56px; height: 56px; border-radius: 50%;
        background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15));
        animation: skPulse 2s ease-in-out infinite;
    }
    .sk-avatar-xs { width: 32px; height: 32px; min-width: 32px; border-radius: 10px; }
    .sk-att-controls { display: flex; gap: 8px; }
    .sk-btn-ghost {
        padding: 8px 14px; border-radius: 8px;
        border: 1px dashed var(--border-color);
        display: flex; align-items: center; justify-content: center;
    }
    .sk-att-right { display: flex; align-items: center; gap: 18px; }
    .sk-count-box { display: flex; flex-direction: column; align-items: center; gap: 3px; }

    /* Chart */
    .chart-skc { min-height: 280px; }
    .sk-chart-area {
        height: 190px; display: flex; align-items: flex-end;
        justify-content: space-between; gap: 8px; padding: 0 6px;
    }
    .sk-bar-col {
        flex: 1; display: flex; flex-direction: column; align-items: center;
        animation: skBarGrow 0.6s ease-out both;
    }
    .sk-bar { width: 100%; border-radius: 6px 6px 2px 2px; min-width: 20px; }

    /* Donut */
    .sk-donut-wrap { display: flex; justify-content: center; padding: 10px 0; }
    .sk-donut {
        width: 140px; height: 140px; border-radius: 50%;
        background: conic-gradient(
            rgba(99,102,241,0.2) 0deg 130deg,
            rgba(16,185,129,0.2) 130deg 230deg,
            rgba(245,158,11,0.2) 230deg 360deg
        );
        display: flex; align-items: center; justify-content: center;
        animation: skDonutSpin 12s linear infinite;
    }
    .sk-donut-hole {
        width: 80px; height: 80px; border-radius: 50%;
        background: var(--bg-card);
    }
    .sk-legend { display: flex; flex-direction: column; gap: 8px; align-items: center; padding-top: 16px; }
    .sk-legend-item { display: flex; align-items: center; gap: 8px; }
    .sk-legend-dot { width: 10px; height: 10px; border-radius: 3px; }

    /* Calendar */
    .sk-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .sk-cal-head {
        text-align: center; font-size: 0.65rem; font-weight: 700;
        color: var(--text-muted); opacity: 0.5; padding: 4px;
    }
    .sk-cal-cell {
        aspect-ratio: 1; border-radius: 8px;
        background: var(--bg-secondary);
    }
    .sk-cal-cell.active {
        background: rgba(59, 130, 246, 0.15);
        animation: skPulse 2.5s ease-in-out infinite;
    }

    /* Leaderboard */
    .sk-leaderboard-item {
        display: flex; align-items: center; gap: 10px;
        padding: 10px; border-radius: 10px;
        background: var(--bg-secondary); margin-bottom: 8px;
        animation: skRowSlide 0.4s ease-out both;
    }
    .sk-rank {
        width: 28px; height: 28px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
    }

    /* Risk rows */
    .sk-risk-row {
        display: flex; align-items: center; gap: 12px;
        padding: 14px; border-radius: 12px;
        background: var(--bg-secondary); margin-bottom: 10px;
        animation: skRowSlide 0.4s ease-out both;
    }
    .sk-risk-indicator { width: 4px; height: 36px; border-radius: 4px; }

    /* AI Panel */
    .sk-ai-panel { position: relative; overflow: hidden; }
    .sk-ai-badge { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .sk-ai-icon {
        width: 36px; height: 36px; border-radius: 10px;
        background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.15));
        display: flex; align-items: center; justify-content: center;
        font-size: 1.1rem; animation: skPulse 2s ease-in-out infinite;
    }
    .sk-ai-body { display: flex; flex-direction: column; gap: 10px; padding-left: 6px; }

    /* Settings */
    .sk-settings { max-width: 900px; }
    .sk-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
    .sk-tab {
        display: flex; align-items: center; gap: 7px;
        padding: 10px 18px; border-radius: 10px;
        background: var(--bg-secondary); border: 1px solid var(--border-color);
    }
    .sk-tab.active {
        background: linear-gradient(135deg, rgba(79,70,229,0.08), rgba(79,70,229,0.15));
        border-color: rgba(79,70,229,0.3);
    }
    .sk-tab-text { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .sk-tab.active .sk-tab-text { color: var(--primary); }
    .sk-form-card { margin-top: 0; }
    .sk-field {
        display: flex; flex-direction: column; gap: 8px;
        margin-bottom: 18px; animation: skFadeSlide 0.4s ease-out both;
    }

    /* Grid */
    .sk-stats-grid { display: grid; gap: 16px; margin-bottom: 24px; }
    .sk-stats-grid.four { grid-template-columns: repeat(4, 1fr); }
    .sk-stats-grid.six { grid-template-columns: repeat(3, 1fr); }
    .sk-two-col { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 24px; }

    /* Page */
    .sk-page, .sk-analytics, .sk-insights, .sk-settings { padding: 10px 0; }

    /* Student */
    .student-skc { display: flex; gap: 15px; }

    @media (max-width: 1024px) {
        .sk-stats-grid.four { grid-template-columns: repeat(2, 1fr); }
        .sk-stats-grid.six { grid-template-columns: repeat(2, 1fr); }
        .sk-two-col { grid-template-columns: 1fr; }
        .sk-table-head, .sk-table-row { display: none; }
        .sk-tabs { flex-wrap: wrap; }
    }

    @media (max-width: 640px) {
        .sk-stats-grid.four, .sk-stats-grid.six { grid-template-columns: 1fr; }
        .sk-att-row { flex-direction: column; gap: 12px; align-items: flex-start; }
        .sk-att-controls { display: none; }
        .sk-att-right { width: 100%; justify-content: space-between; }
    }
    `}</style>
);

export default S;
