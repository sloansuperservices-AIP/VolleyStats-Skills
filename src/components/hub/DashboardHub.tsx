import React from 'react';
import {
  Calendar,
  Users,
  BookOpen,
  Trophy,
  Share2,
  MessageSquare,
  DollarSign,
  LayoutDashboard,
  ClipboardList,
  Activity
} from 'lucide-react';

interface HubNodeProps {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  onClick: (id: string) => void;
}

const HubNode: React.FC<HubNodeProps> = ({ id, title, subtitle, icon, color, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className="group relative flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-500 transition-all duration-300 text-center w-full h-full"
  >
    <div className={`p-4 rounded-xl ${color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
    <p className="text-slate-400 text-xs">{subtitle}</p>
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <LayoutDashboard className="w-4 h-4 text-slate-500" />
    </div>
  </button>
);

export const DashboardHub: React.FC<{ onNavigate: (target: string) => void }> = ({ onNavigate }) => {
  const nodes = [
    {
      id: 'dibs',
      title: 'DIBS',
      subtitle: 'Court scheduling',
      icon: <Calendar className="w-6 h-6 text-indigo-400" />,
      color: 'bg-indigo-500/20'
    },
    {
      id: 'planner',
      title: 'Club Ops',
      subtitle: 'Manager Center',
      icon: <ClipboardList className="w-6 h-6 text-indigo-400" />,
      color: 'bg-indigo-500/20'
    },
    {
      id: 'tryouts',
      title: 'Tryouts',
      subtitle: 'Roster builder',
      icon: <Users className="w-6 h-6 text-emerald-400" />,
      color: 'bg-emerald-500/20'
    },
    {
      id: 'coach',
      title: 'Coach mgmt',
      subtitle: 'AI lesson plans',
      icon: <BookOpen className="w-6 h-6 text-emerald-400" />,
      color: 'bg-emerald-500/20'
    },
    {
      id: 'combine',
      title: 'PlayerBoard',
      subtitle: 'Skills & Scores',
      icon: <Activity className="w-6 h-6 text-emerald-400" />,
      color: 'bg-emerald-500/20'
    },
    {
      id: 'tournaments',
      title: 'Tournaments',
      subtitle: 'Events & travel',
      icon: <Trophy className="w-6 h-6 text-amber-400" />,
      color: 'bg-amber-500/20'
    },
    {
      id: 'social',
      title: 'Social media',
      subtitle: 'Content calendar',
      icon: <Share2 className="w-6 h-6 text-amber-400" />,
      color: 'bg-amber-500/20'
    },
    {
      id: 'volleyai',
      title: 'VOLLEY AI',
      subtitle: 'Club AI agent',
      icon: <MessageSquare className="w-6 h-6 text-indigo-400" />,
      color: 'bg-indigo-500/20'
    },
    {
      id: 'financials',
      title: 'Financials',
      subtitle: 'Dues & budgets',
      icon: <DollarSign className="w-6 h-6 text-indigo-400" />,
      color: 'bg-indigo-500/20'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-8 flex flex-col items-center">
      <div className="max-w-6xl w-full text-center mb-12">
        <h1 className="text-4xl font-black text-white mb-2">Mid TN Volleyball</h1>
        <p className="text-slate-500 uppercase tracking-widest text-sm font-semibold">Club Management Dashboard — System Overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 max-w-6xl w-full">
        <div className="lg:col-span-3 flex justify-center mb-8">
          <div className="relative">
             <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
             <div className="relative px-12 py-6 rounded-full border border-orange-500/50 bg-orange-500/10 backdrop-blur-md flex flex-col items-center">
                <span className="text-white font-black text-2xl">Dashboard</span>
                <span className="text-orange-400 text-sm font-bold uppercase tracking-wider">Mid TN Volleyball</span>
             </div>
          </div>
        </div>

        {nodes.map(node => (
          <HubNode
            key={node.id}
            {...node}
            onClick={onNavigate}
          />
        ))}
      </div>

      <div className="mt-16 flex gap-8 text-xs font-semibold uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500/50 border border-indigo-400"></div>
          <span className="text-slate-500">Admin & systems</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500/50 border border-emerald-400"></div>
          <span className="text-slate-500">Athletes & coaching</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500/50 border border-amber-400"></div>
          <span className="text-slate-500">Events & community</span>
        </div>
      </div>
    </div>
  );
};
