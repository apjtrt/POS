import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import api from '../services/api';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#eab308'];

const DetailedReports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const query = filter ? `?filter=${filter}` : '';
        const res = await api.get(`/dashboard/reports${query}`);
        setReports(res.data.data);
      } catch (error) {
        console.error('Failed to fetch detailed reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <div className="animate-pulse">Loading detailed reports...</div>;
  if (!reports) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {filter === 'today' ? "Today's Detailed Reports" : "Detailed Collection Reports"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Breakdown of collections by street, collector, and date.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Street Wise Report */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Street-Wise Collection</h2>
          </div>
          <div className="p-6">
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reports.streetWise}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="amount"
                  >
                    {reports.streetWise.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Street Name</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Receipts</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {reports.streetWise.map((s, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-200 flex items-center">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-right">{s.count}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-200 text-right">₹{s.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Collector Wise Report */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Collector-Wise Collection</h2>
          </div>
          <div className="p-6">
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports.collectorWise}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" tick={{fill: '#64748b'}} />
                  <YAxis tick={{fill: '#64748b'}} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Collector Name</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Receipts</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Amount</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {reports.collectorWise.map((c, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-200">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-right">{c.count}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-right">₹{c.amount}</td>
                      <td className="px-4 py-3 text-right">
                        <Link 
                          to={`/donations/history?collector=${encodeURIComponent(c.name)}`}
                          className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-md text-sm font-medium transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Receipts
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Date Wise Report */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden lg:col-span-2">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Date-Wise Collection</h2>
          </div>
          <div className="p-6">
            <div className="h-72 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports.dateWise}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'MMM dd')} tick={{fill: '#64748b'}} />
                  <YAxis tick={{fill: '#64748b'}} />
                  <Tooltip 
                    labelFormatter={(label) => format(new Date(label), 'dd MMM yyyy')}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Receipts</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Amount Collected</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {reports.dateWise.map((d, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-200">
                        {format(new Date(d.date), 'dd MMM yyyy, EEEE')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-right">{d.count}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 text-right">₹{d.amount}</td>
                      <td className="px-4 py-3 text-right">
                        <Link 
                          to={`/donations/history?date=${d.date}`}
                          className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-md text-sm font-medium transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Receipts
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DetailedReports;
