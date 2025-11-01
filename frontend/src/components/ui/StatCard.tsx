import React from 'react';
import './StatCard.css';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend,
  icon,
  color,
  className = ''
}) => {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {icon && (
          <div className="stat-card-icon" style={{ color }}>
            {icon}
          </div>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      {change && (
        <div className={`stat-card-change stat-card-change-${trend}`}>
          {trend === 'up' && '↑ '}
          {trend === 'down' && '↓ '}
          {change}
        </div>
      )}
    </div>
  );
};

export default StatCard;
