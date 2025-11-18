import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { TrendingUp, MoreHorizontal } from 'lucide-react';
import { GlassCard } from '../components/UIComponents';
import { User } from '../types';

const data = [
  { name: 'Mon', posts: 4, interaction: 240 },
  { name: 'Tue', posts: 3, interaction: 139 },
  { name: 'Wed', posts: 9, interaction: 980 },
  { name: 'Thu', posts: 1, interaction: 309 },
  { name: 'Fri', posts: 6, interaction: 480 },
  { name: 'Sat', posts: 8, interaction: 390 },
  { name: 'Sun', posts: 2, interaction: 430 },
];

const StatCard: React.FC<{ title: string; value: string; trend?: string }> = ({ title, value, trend }) => (
  <GlassCard className="p-5 relative overflow-hidden group hover:border-white/20 transition-all">
    <div className="flex flex-col">
        <div className="flex justify-between items-start mb-1">
             <span className="text-3xl font-bold text-white tracking-tight leading-none">{value}</span>
             
             {trend ? (
                <span className="flex items-center gap-1 text-green-400 text-[10px] font-bold bg-green-500/10 px-2 py-1 rounded-full border border-green-500/10">
                    <TrendingUp size={10} />
                    {trend}
                </span>
             ) : (
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal size={16} className="text-gray-500" />
                 </div>
             )}
        </div>
        
        <span className="text-gray-500 text-sm font-medium">{title}</span>
    </div>
  </GlassCard>
);

export const DashboardView: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="max-w-7xl mx-auto pt-8 pb-24 px-4 animate-fade-in">
      <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Analytics</h2>
            <p className="text-gray-500 mt-1 text-sm">Performance metrics for your on-chain activity</p>
          </div>
          <select className="bg-black/20 border border-white/10 text-white text-sm rounded-xl px-4 py-2 outline-none focus:border-primary/50 cursor-pointer hover:bg-white/5 transition-colors">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
          </select>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Total Mints" 
          value={user.totalPosts.toString()} 
          trend="+12%" 
        />
        <StatCard 
          title="Network Balance" 
          value="1.4 BNB" 
        />
        <StatCard 
          title="Engagement Score" 
          value="894" 
          trend="+5.4%" 
        />
        <StatCard 
          title="Total Reach" 
          value="12.5k" 
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-lg font-bold text-white">Engagement Activity</h3>
             <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Interaction Vol</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorInteraction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f2c94c" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f2c94c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#f2c94c', fontWeight: 'bold' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="interaction" stroke="#f2c94c" strokeWidth={3} fillOpacity={1} fill="url(#colorInteraction)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-lg font-bold text-white">Daily Mints</h3>
             <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Token Gen</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }} 
                />
                <Bar dataKey="posts" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};