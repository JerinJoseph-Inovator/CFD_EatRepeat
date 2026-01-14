
import React from 'react';
import { UserProfile } from '../../types';
import ChefAvatar from '../Chef/ChefAvatar';

interface HeaderProps {
  profile: UserProfile | null;
  isVisible: boolean;
}

const Header: React.FC<HeaderProps> = ({ profile, isVisible }) => {
  if (!isVisible) return null;

  return (
    <header className="flex justify-between items-center mb-20 animate-in fade-in slide-in-from-top-4 duration-1000">
      <div className="flex items-center space-x-6">
        <div className="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-5xl transition-transform hover:rotate-12">
          <i className="fas fa-dna text-2xl text-emerald-400"></i>
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">EatRepeat<span className="text-emerald-500">.AI</span></h1>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em]">Neural Inventory OS</p>
        </div>
      </div>
      
      {profile && (
        <div className="flex items-center space-x-6 bg-white p-2 pl-8 rounded-full border border-slate-100 shadow-2xl ring-1 ring-slate-900/5">
          <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 hidden sm:block">{profile.name}</span>
          <ChefAvatar size="sm" className="!animate-none" />
        </div>
      )}
    </header>
  );
};

export default Header;
