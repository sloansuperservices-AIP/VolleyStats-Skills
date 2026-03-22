import React, { useState } from 'react';
import { DashboardHub } from './components/hub/DashboardHub';
import { DibsApp } from './components/dibs/DibsApp';
import { CombineApp } from './components/combine/CombineApp';
import { PlannerPreview } from './components/planner/PlannerPreview';
import {
  ArrowLeft,
  Home,
  Settings,
  User,
  Bell,
  Search,
  LayoutDashboard
} from 'lucide-react';

type AppView = 'hub' | 'dibs' | 'combine' | 'tryouts' | 'coach' | 'tournaments' | 'social' | 'volleyai' | 'financials' | 'planner';

export const AppShell: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('hub');

  const renderView = () => {
    switch (currentView) {
      case 'hub':
        return <DashboardHub onNavigate={(target) => setCurrentView(target as AppView)} />;
      case 'dibs':
        return <DibsApp />;
      case 'combine':
        return <CombineApp />;
      case 'planner':
        return <PlannerPreview />;
      default:
        return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
            <div className="p-12 rounded-3xl border border-slate-700/60 bg-slate-800/40 text-center max-w-md">
              <div className="w-20 h-20 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <LayoutDashboard className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 uppercase">{currentView} Module</h2>
              <p className="text-slate-400 mb-8">This module is currently under development. Check back soon for updates!</p>
              <button
                onClick={() => setCurrentView('hub')}
                className="px-8 py-3 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition-colors flex items-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {currentView !== 'hub' && (
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('hub')}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Back to Hub"
              >
                <Home className="w-5 h-5" />
              </button>
              <div className="h-4 w-px bg-slate-800 mx-2"></div>
              <span className="text-white font-bold uppercase tracking-widest text-sm">
                Mid TN <span className="text-amber-500">{currentView}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
               <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <Search className="w-5 h-5" />
              </button>
               <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
              </button>
               <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-slate-800 mx-2"></div>
              <div className="flex items-center gap-3 pl-2">
                 <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-white">Alex Mitchell</div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Athlete</div>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                    <User className="w-5 h-5 text-slate-500" />
                 </div>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-auto">
        {renderView()}
      </main>
    </div>
  );
};
