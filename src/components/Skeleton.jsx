import React from 'react';

// Skeleton base component with shimmer animation
const Skeleton = ({ width, height, borderRadius = '8px', className = '' }) => (
    <div
        className={`skeleton ${className}`}
        style={{
            width: width || '100%',
            height: height || '20px',
            borderRadius,
        }}
    />
);

// Card skeleton for dashboard stat cards
export const StatCardSkeleton = () => (
    <div className="skeleton-card stat-skeleton">
        <div className="skeleton-icon" />
        <div className="skeleton-content">
            <Skeleton width="80px" height="14px" />
            <Skeleton width="100px" height="28px" />
            <Skeleton width="60px" height="12px" />
        </div>
    </div>
);

// Table row skeleton
export const TableRowSkeleton = ({ columns = 6 }) => (
    <tr className="skeleton-row">
        {[...Array(columns)].map((_, i) => (
            <td key={i}>
                <Skeleton width={i === 0 ? '80px' : i === columns - 1 ? '120px' : '100%'} height="18px" />
            </td>
        ))}
    </tr>
);

// Invoice card skeleton
export const InvoiceCardSkeleton = () => (
    <div className="skeleton-card invoice-skeleton">
        <div className="skeleton-header">
            <Skeleton width="100px" height="24px" borderRadius="6px" />
            <Skeleton width="60px" height="24px" borderRadius="20px" />
        </div>
        <div className="skeleton-body">
            <Skeleton width="150px" height="18px" />
            <Skeleton width="80px" height="14px" />
        </div>
        <div className="skeleton-footer">
            <Skeleton width="100px" height="28px" />
            <Skeleton width="120px" height="36px" borderRadius="8px" />
        </div>
    </div>
);

// Student card skeleton
export const StudentCardSkeleton = () => (
    <div className="skeleton-card student-skeleton">
        <div className="skeleton-avatar" />
        <div className="skeleton-info">
            <Skeleton width="140px" height="18px" />
            <Skeleton width="100px" height="14px" />
            <Skeleton width="80px" height="20px" borderRadius="10px" />
        </div>
    </div>
);

// Chart skeleton
export const ChartSkeleton = () => (
    <div className="skeleton-card chart-skeleton">
        <div className="skeleton-chart-header">
            <Skeleton width="120px" height="20px" />
            <Skeleton width="80px" height="16px" />
        </div>
        <div className="skeleton-chart-body">
            <div className="skeleton-bars">
                {[40, 70, 55, 85, 60, 90].map((height, i) => (
                    <div key={i} className="skeleton-bar" style={{ height: `${height}%` }} />
                ))}
            </div>
        </div>
    </div>
);

// Full page loader skeleton
export const PageSkeleton = () => (
    <div className="page-skeleton">
        <div className="skeleton-page-header">
            <div>
                <Skeleton width="200px" height="28px" />
                <Skeleton width="150px" height="16px" style={{ marginTop: '8px' }} />
            </div>
            <Skeleton width="140px" height="44px" borderRadius="10px" />
        </div>
        <div className="skeleton-grid">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>
    </div>
);

// Styles
export const SkeletonStyles = () => (
    <style jsx="true">{`
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--bg-secondary) 0%,
        var(--bg-card) 50%,
        var(--bg-secondary) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .skeleton-card {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid var(--border-color);
    }

    .stat-skeleton {
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }

    .skeleton-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(
        90deg,
        var(--bg-secondary) 0%,
        var(--bg-card) 50%,
        var(--bg-secondary) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .skeleton-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-row td {
      padding: 16px;
    }

    .invoice-skeleton .skeleton-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .invoice-skeleton .skeleton-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }

    .invoice-skeleton .skeleton-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .student-skeleton {
      display: flex;
      gap: 15px;
    }

    .skeleton-avatar {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: linear-gradient(
        90deg,
        var(--bg-secondary) 0%,
        var(--bg-card) 50%,
        var(--bg-secondary) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .skeleton-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .chart-skeleton {
      min-height: 250px;
    }

    .skeleton-chart-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }

    .skeleton-chart-body {
      height: 180px;
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
    }

    .skeleton-bar {
      width: 40px;
      background: linear-gradient(
        90deg,
        var(--bg-secondary) 0%,
        var(--bg-card) 50%,
        var(--bg-secondary) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px 8px 0 0;
    }

    .page-skeleton {
      padding: 20px 0;
    }

    .skeleton-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }

    @media (max-width: 1024px) {
      .skeleton-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 640px) {
      .skeleton-grid { grid-template-columns: 1fr; }
    }
  `}</style>
);

export default Skeleton;
