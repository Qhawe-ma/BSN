import React from 'react';
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
  
  const imageSrc = badgeType === 'gold' 
    ? '/check/gold.svg'
    : '/check/blue.svg';
  
  return (
    <img 
      src={imageSrc}
      alt={`${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} Badge`}
      title={`${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} Badge`}
      className={`${sizeClasses[size]} flex-shrink-0 object-contain ${className}`}
    />
  );
};
