import React from 'react';
import {
  Trophy,
  Users,
  Target,
  TrendingUp,
  Clock,
  Shield,
  Briefcase
} from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
  <div className="p-6 rounded-2xl border border-slate-700/60 bg-slate-800/40">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-emerald-400 text-xs font-bold">+12%</span>
    </div>
    <div className="text-2xl font-black text-white mb-1">{value}</div>
    <div className="text-sm font-bold text-slate-400">{title}</div>
    <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wider">{subtitle}</p>
  </div>
);

export const PlannerPreview = () => {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white mb-2">Command Center</h2>
          <p className="text-slate-400">Tournament readiness & operational overview</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2">
            <Clock className="w-4 h-4" /> Mar 15 - Mar 22
          </div>
          <button className="px-6 py-2 rounded-xl bg-amber-500 text-slate-900 text-xs font-bold hover:bg-amber-400 transition-colors">
            Quick Action
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Athletes" value="248" subtitle="Active Roster" icon={Users} color="bg-blue-500/20" />
        <StatCard title="Staff Coaches" value="24" subtitle="Management" icon={Shield} color="bg-purple-500/20" />
        <StatCard title="Open DIBS" value="12" subtitle="Available Shifts" icon={Briefcase} color="bg-amber-500/20" />
        <StatCard title="Win Rate" value="68%" subtitle="Season Avg" icon={Trophy} color="bg-emerald-500/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 rounded-3xl border border-slate-700/60 bg-slate-800/20">
            <h3 className="text-xl font-bold text-white mb-6">Upcoming Tournaments</h3>
            <div className="space-y-4">
               {[
                 { name: 'SRVA Regionals', date: 'Apr 12-14', location: 'Atlanta, GA', status: 'Ready', color: 'text-emerald-400' },
                 { name: 'Big South Qualifier', date: 'Mar 29-31', location: 'Atlanta, GA', status: 'Action Required', color: 'text-amber-400' },
                 { name: 'Bluegrass Tournament', date: 'Mar 15-17', location: 'Louisville, KY', status: 'In Progress', color: 'text-blue-400' }
               ].map((t, i) => (
                 <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-700/40 bg-slate-900/40">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-slate-500" />
                     </div>
                     <div>
                       <div className="text-sm font-bold text-white">{t.name}</div>
                       <div className="text-xs text-slate-500">{t.date} • {t.location}</div>
                     </div>
                   </div>
                   <span className={`text-xs font-bold ${t.color} px-3 py-1 rounded-full bg-slate-800/60`}>{t.status}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-8 rounded-3xl border border-slate-700/60 bg-slate-800/20">
             <h3 className="text-xl font-bold text-white mb-6">Readiness Score</h3>
             <div className="flex flex-col items-center py-4">
                <div className="relative w-40 h-40">
                   <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path className="text-slate-800" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                      <path className="text-amber-500" strokeDasharray="85, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white">85</span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Global</span>
                   </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                   <div className="text-center">
                      <div className="text-sm font-bold text-white">22/25</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Rosters</div>
                   </div>
                   <div className="text-center">
                      <div className="text-sm font-bold text-white">18/25</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Hotels</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
