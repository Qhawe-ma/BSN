import React from 'react';
import { Crown } from 'lucide-react';
import { BadgeType } from '../types';

interface BadgeIconProps {
  badgeType: BadgeType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BadgeIcon: React.FC<BadgeIconProps> = ({ 
  badgeType, 
  size = 'sm',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14
  };
  
  const gradientClass = badgeType === 'gold' 
    ? 'bg-gradient-to-br from-yellow-400 to-amber-600'
    : 'bg-gradient-to-br from-blue-400 to-blue-600';
  
  return (
    <div 
      className={`${sizeClasses[size]} ${gradientClass} rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      title={`${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} Badge`}
    >
      <Crown size={iconSizes[size]} className="text-white" />
    </div>
  );
};
