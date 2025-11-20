import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { GlassCard } from '../components/UIComponents';
import { User } from '../types';

const StatCard: React.FC<{ title: string; value: string | number; trend?: string }> = ({ title, value, trend }) => (
  <GlassCard className="p-5 relative overflow-hidden group hover:border-white/20 transition-all">
    <div className="flex flex-col">
        <div className="flex justify-between items-start mb-1">
             <span className="text-3xl font-bold text-white tracking-tight leading-none">{value}</span>
             
             {trend && (
                <span className="flex items-center gap-1 text-green-400 text-[10px] font-bold bg-green-500/10 px-2 py-1 rounded-full border border-green-500/10">
                    <TrendingUp size={10} />
                    {trend}
                </span>
             )}
        </div>
        
        <span className="text-gray-500 text-sm font-medium">{title}</span>
    </div>
  </GlassCard>
);

export const DashboardView: React.FC<{ user: User }> = ({ user }) => {
  const [timeRange, setTimeRange] = useState<'7' | '30'>('7');

  // For now, show real user data - charts will show actual data when posts are available
  const emptyChartData = Array.from({ length: 7 }, (_, i) => ({
    name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    posts: 0,
    interaction: 0
  }));

  return (
    <div className="max-w-7xl mx-auto pt-8 pb-24 px-4 animate-fade-in">
      <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Analytics</h2>
            <p className="text-gray-500 mt-1 text-sm">Performance metrics for your on-chain activity</p>
          </div>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7' | '30')}
            className="bg-black/20 border border-white/10 text-white text-sm rounded-xl px-4 py-2 outline-none focus:border-primary/50 cursor-pointer hover:bg-white/5 transition-colors"
          >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
          </select>
      </div>
      
      {/* Stats Grid - Real User Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Total Posts" 
          value={user.totalPosts} 
        />
        <StatCard 
          title="Followers" 
          value={user.followers} 
        />
        <StatCard 
          title="Following" 
          value={user.following} 
        />
        <StatCard 
          title="Account Age" 
          value={user.createdAt ? `${Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24))}d` : 'New'} 
        />
      </div>

      {/* Charts - Will show real data when posts exist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-lg font-bold text-white">Post Activity</h3>
             <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Last {timeRange} Days</span>
          </div>
          <div className="h-72 flex items-center justify-center">
            {user.totalPosts === 0 ? (
              <div className="text-center">
                <p className="text-gray-500 text-sm">No posts yet</p>
                <p className="text-gray-600 text-xs mt-1">Start minting to see your activity</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={emptyChartData}>
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
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-lg font-bold text-white">Engagement Overview</h3>
             <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Interactions</span>
          </div>
          <div className="h-72 flex items-center justify-center">
            {user.totalPosts === 0 ? (
              <div className="text-center">
                <p className="text-gray-500 text-sm">No engagement data yet</p>
                <p className="text-gray-600 text-xs mt-1">Post content to track engagement</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emptyChartData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                  <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }} 
                  />
                  <Bar dataKey="posts" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};