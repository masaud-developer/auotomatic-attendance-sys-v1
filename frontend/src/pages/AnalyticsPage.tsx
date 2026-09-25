import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, TrendingUp, BookOpen, PieChart as PieIcon, Calendar } from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import { api } from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [trends, setTrends] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [statusDist, setStatusDist] = useState<any | null>(null);
  const [days, setDays] = useState<number>(14);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [trendData, subData, distData] = await Promise.all([
          api.getTrends(days),
          api.getSubjectWiseAnalytics(),
          api.getStatusDistribution(days),
        ]);
        setTrends(trendData);
        setSubjects(subData);
        setStatusDist(distData);
      } catch (err) {
        console.error('Analytics load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [days]);

  const pieData = statusDist ? [
    { name: 'Present', value: statusDist.present, color: '#10b981' },
    { name: 'Late', value: statusDist.late, color: '#f59e0b' },
    { name: 'Absent', value: statusDist.absent, color: '#ef4444' },
  ] : [];

  return (
    <AdminLayout activePath="analytics">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Attendance Analytics</h1>
            <p className="text-xs text-slate-500 mt-1">Real database intelligence across classes, subjects, and institutional trends</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Time Window:</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800"
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
            </select>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Daily Attendance Percentage Trend (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attendance Rate Over Time (%)</h3>
                <p className="text-xs text-slate-500">Daily present & late student percentage</p>
              </div>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>

            <div className="h-72 w-full">
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(d) => d.slice(5)} 
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(v) => `${v}%`} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                      formatter={(val: any) => [`${val}%`, 'Attendance Rate']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percentage" 
                      stroke="#4f46e5" 
                      strokeWidth={2.5} 
                      dot={{ r: 3, fill: '#4f46e5' }}
                      activeDot={{ r: 5 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No historical trend records found for this window.
                </div>
              )}
            </div>
          </div>

          {/* 2. Status Distribution Donut (1 Col) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">Attendance Ratio</h3>
                <PieIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs text-slate-500 mb-4">Breakdown of total attendance scans</p>
            </div>

            <div className="h-52 w-full flex items-center justify-center">
              {statusDist && statusDist.total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-400 text-center">No attendance scans recorded.</div>
              )}
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-4 border-t border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Present</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">{statusDist?.present ?? 0}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Late</span>
                <span className="font-mono font-bold text-amber-600 text-sm">{statusDist?.late ?? 0}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Absent</span>
                <span className="font-mono font-bold text-rose-600 text-sm">{statusDist?.absent ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Subject-wise Comparison Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Subject-Wise Attendance Comparison</h3>
              <p className="text-xs text-slate-500">Attendance percentages aggregated across laboratories and lectures</p>
            </div>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>

          <div className="h-64 w-full">
            {subjects.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjects} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="subject_code" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    tickFormatter={(v) => `${v}%`} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                    formatter={(val: any) => [`${val}%`, 'Attendance Rate']}
                    labelFormatter={(label) => {
                      const s = subjects.find((x) => x.subject_code === label);
                      return s ? `${label}: ${s.subject_name}` : label;
                    }}
                  />
                  <Bar dataKey="attendance_rate" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No subject records available.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
