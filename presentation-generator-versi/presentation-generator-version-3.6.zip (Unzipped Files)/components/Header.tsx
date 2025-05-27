
import React from 'react';
import Button from './Button';
import { ArrowPathIcon } from './Icons'; // Assuming you have an ArrowPathIcon for restart

interface HeaderProps {
  onRestart: () => void;
}

const Header: React.FC<HeaderProps> = ({ onRestart }) => {
  return (
    <header className="bg-slate-900/80 backdrop-blur-sm shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {/* You can add a logo here if you have one */}
            {/* <img className="h-8 w-auto" src="/logo.svg" alt="Logo" /> */}
            <h1 className="ml-3 text-xl md:text-2xl font-bold tracking-tight">
              <span className="text-sky-400">Presentation Generator by RADDOC</span>
              <span className="text-slate-400 ml-2">☯</span>
            </h1>
          </div>
          <div className="flex items-center">
            <Button onClick={onRestart} variant="secondary" size="sm" Icon={ArrowPathIcon}>
              Start Over
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
