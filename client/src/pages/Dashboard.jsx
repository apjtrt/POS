import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { IndianRupee, Users, Receipt, TrendingUp, ChevronRight, ArrowDownToLine, ArrowUpFromLine, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DashboardSkeleton from '../components/DashboardSkeleton';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!stats) return null;

  const UniversalOverview = () => (
    <div className="mb-2">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Universal Overview (System-wide)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Universal Income"
          value={`₹${stats.universalIncome?.toLocaleString() || 0}`}
          icon={IndianRupee}
          color="text-blue-600"
          bg="bg-blue-100 dark:bg-blue-900/50"
        />
        <StatCard
          title="Universal Expenses"
          value={`₹${stats.universalExpenses?.toLocaleString() || 0}`}
          icon={ArrowUpFromLine}
          color="text-red-600"
          bg="bg-red-100 dark:bg-red-900/50"
        />
        <StatCard
          title="Net Balance"
          value={`₹${((stats.universalIncome || 0) - (stats.universalExpenses || 0)).toLocaleString()}`}
          icon={Wallet}
          color="text-emerald-600"
          bg="bg-emerald-100 dark:bg-emerald-900/50"
        />
      </div>
    </div>
  );

  if (stats.isCashier) {
    return (
      <div className="space-y-6">
        <UniversalOverview />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cashier Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Amount In (UPI + Cash)"
            value={`₹${((stats.totalUpi || 0) + (stats.totalReceived || 0)).toLocaleString()}`}
            icon={IndianRupee}
            color="text-indigo-600"
            bg="bg-indigo-100 dark:bg-indigo-900/50"
          />
          <StatCard
            title="Amount Out"
            value={`₹${stats.totalSpent.toLocaleString()}`}
            icon={ArrowUpFromLine}
            color="text-red-600"
            bg="bg-red-100 dark:bg-red-900/50"
          />
          <StatCard
            title="Remaining Amount"
            value={`₹${(((stats.totalUpi || 0) + (stats.totalReceived || 0)) - (stats.totalSpent || 0)).toLocaleString()}`}
            icon={Wallet}
            color="text-primary-600"
            bg="bg-primary-100 dark:bg-primary-900/50"
          />
          <StatCard
            title="Amount Received as Cash"
            value={`₹${stats.totalReceived.toLocaleString()}`}
            icon={ArrowDownToLine}
            color="text-emerald-600"
            bg="bg-emerald-100 dark:bg-emerald-900/50"
          />
          <StatCard
            title="Amount Received in UPI"
            value={`₹${stats.totalUpi?.toLocaleString() || 0}`}
            icon={IndianRupee}
            color="text-purple-600"
            bg="bg-purple-100 dark:bg-purple-900/50"
          />
        </div>

        {/* Collector Balances Table for Cashier */}
        {stats.collectorBalances && stats.collectorBalances.length > 0 && (
          <div className="saas-card overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Collector Cash Balances</h2>
              <p className="text-sm text-slate-500">Physical cash currently held by collectors (Donations - Handed Over)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Collector</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Physical Cash in Hand</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Advance Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Advance Spent</th>
                  </tr>
                </thead>
                <tbody className="saas-card divide-y divide-slate-200 dark:divide-slate-700">
                  {stats.collectorBalances.map((collector) => (
                    <tr key={collector.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-200">{collector.name} ({collector.username})</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 font-bold text-red-600">₹{collector.cashInHand?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 font-bold text-primary-600">₹{collector.advanceBalance?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 font-bold text-purple-600">₹{collector.advanceSpent?.toLocaleString() || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UniversalOverview />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role === 'ADMIN' ? (
          <Link to="/reports" className="block transform transition-transform hover:scale-105">
            <StatCard
              title="Total Donation (Click for Details)"
              value={`₹${stats.totalDonation?.toLocaleString() || 0}`}
              icon={IndianRupee}
              color="text-blue-600"
              bg="bg-blue-100 dark:bg-blue-900/50"
              rightIcon={<ChevronRight className="text-slate-400 ml-auto" />}
            />
          </Link>
        ) : (
          <StatCard title="Total Donation" value={`₹${stats.totalDonation?.toLocaleString() || 0}`} icon={IndianRupee} color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/50" />
        )}
        <Link to="/reports?filter=today" className="block transform transition-transform hover:scale-105">
          <StatCard
            title="Today's Collection (Click for Details)"
            value={`₹${stats.todayCollection}`}
            icon={TrendingUp}
            color="text-emerald-600"
            bg="bg-emerald-100 dark:bg-emerald-900/50"
            rightIcon={<ChevronRight className="text-slate-400 ml-auto" />}
          />
        </Link>

        <Link to="/donations/history" className="block transform transition-transform hover:scale-105">
          <StatCard
            title="Total Receipts (Click for Details)"
            value={stats.totalReceipts}
            icon={Receipt}
            color="text-amber-600"
            bg="bg-amber-100 dark:bg-amber-900/50"
            rightIcon={<ChevronRight className="text-slate-400 ml-auto" />}
          />
        </Link>
        <StatCard title="Average Donation" value={`₹${Math.round(stats.averageDonation)}`} icon={Users} color="text-purple-600" bg="bg-purple-100 dark:bg-purple-900/50" />

        {/* Cash In Hand for Collector */}
        {user?.role === 'COLLECTOR' && (
          <StatCard
            title="Cash to Hand Over"
            value={`₹${stats.cashInHand?.toLocaleString() || 0}`}
            icon={Wallet}
            color="text-red-600"
            bg="bg-red-100 dark:bg-red-900/50"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Street Wise Chart */}
        <div className="saas-card p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Street Wise Collection</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.streetWise || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                <YAxis tick={{ fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Mode Chart */}
        <div className="saas-card p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Payment Wise Collection</h2>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.paymentWise || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(stats?.paymentWise || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-4">
            {(stats?.paymentWise || []).map((entry, index) => (
              <div key={entry.name} className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {entry.name}: ₹{entry.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Donors Table */}
      <div className="saas-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Top Donors</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Donor Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="saas-card divide-y divide-slate-200 dark:divide-slate-700">
              {(stats?.topDonors || []).map((donor, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-200">{donor.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{donor.mobile}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 font-semibold">₹{donor.amount}</td>
                </tr>
              ))}
              {(!stats?.topDonors || stats.topDonors.length === 0) && (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-sm text-slate-500 dark:text-slate-400">No donations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collector Balances Table for Admin */}
      {user?.role === 'ADMIN' && stats?.collectorBalances && stats.collectorBalances.length > 0 && (
        <div className="saas-card overflow-hidden mt-6">
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Collector Cash Balances</h2>
            <p className="text-sm text-slate-500">Physical cash currently held by collectors (Donations - Handed Over)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Collector</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Physical Cash in Hand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Advance Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Advance Spent</th>
                </tr>
              </thead>
              <tbody className="saas-card divide-y divide-slate-200 dark:divide-slate-700">
                {stats.collectorBalances.map((collector) => (
                  <tr key={collector.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-200">{collector.name} ({collector.username})</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 font-bold text-red-600">₹{collector.cashInHand?.toLocaleString() || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 font-bold text-primary-600">₹{collector.advanceBalance?.toLocaleString() || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 font-bold text-purple-600">₹{collector.advanceSpent?.toLocaleString() || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg, rightIcon }) => (
  <div className={`saas-card p-6 flex items-center animate-lift ${rightIcon ? 'h-full' : ''}`}>
    <div className={`p-3 rounded-lg ${bg} mr-4`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
    {rightIcon}
  </div>
);

export default Dashboard;
