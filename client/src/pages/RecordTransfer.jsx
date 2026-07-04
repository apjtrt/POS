import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

const RecordTransfer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [collectors, setCollectors] = useState([]);
  const [formData, setFormData] = useState({
    collectorId: '',
    amount: '',
    paymentMode: 'Cash',
    description: ''
  });

  useEffect(() => {
    const fetchCollectors = async () => {
      try {
        const res = await api.get('/users/collectors');
        // Filter out Cashiers just in case, only show Collectors
        const filtered = res.data.data.filter(u => u.role === 'COLLECTOR');
        setCollectors(filtered);
      } catch (error) {
        toast.error('Failed to load collectors');
      }
    };
    fetchCollectors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/transfers', formData);
      toast.success('Transfer recorded successfully');
      navigate('/transfers');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
          <FileText className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Record Fund Transfer</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Collector *
              </label>
              <select
                required
                value={formData.collectorId}
                onChange={(e) => setFormData({ ...formData, collectorId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="">Select a Collector...</option>
                {collectors.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (@{c.username})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Payment Mode *
              </label>
              <select
                required
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                placeholder="Any remarks about this transfer..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordTransfer;
