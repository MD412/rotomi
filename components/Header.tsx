
import React from 'react';
import { PokedexIcon } from './icons';

interface HeaderProps {
  currentView: 'scanner' | 'collection';
  onNavigate: (view: 'scanner' | 'collection') => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const navItemClasses = (view: 'scanner' | 'collection') => 
    `px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
      currentView === view 
        ? 'bg-blue-600 text-white' 
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;

  return (
    <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-white flex items-center gap-3">
                <PokedexIcon className="h-8 w-8 text-red-500" />
              <span className="font-bold text-xl">Project Arceus</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => onNavigate('scanner')} className={navItemClasses('scanner')}>
              Scanner
            </button>
            <button onClick={() => onNavigate('collection')} className={navItemClasses('collection')}>
              My Collection
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
   