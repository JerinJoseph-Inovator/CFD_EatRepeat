
import React from 'react';
import { ASSETS } from '../../constants/assets';

interface ChefAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const ChefAvatar: React.FC<ChefAvatarProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  return (
    <div className={`${sizeMap[size]} rounded-full bg-emerald-500 overflow-hidden border-2 border-emerald-400 shadow-2xl animate-float ${className}`}>
      <img 
        src={ASSETS.GUSTO} 
        alt="Chef Gusto" 
        className="w-full h-full object-cover"
        loading="eager"
        onError={(e) => {
          // Robust fallback to UI Avatar if local image fails
          (e.currentTarget as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Chef+Gusto&background=10b981&color=fff&size=256';
        }}
      />
    </div>
  );
};

export default React.memo(ChefAvatar);
