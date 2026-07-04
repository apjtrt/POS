import React, { useState, useEffect } from 'react';
import { Loader2, Banknote, Search, CheckCircle, Smartphone } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

function CashierExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/expenses');
      setExpenses(response.data.data);
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id, paymentMode) => {
    if (!window.confirm(`Are you sure you want to mark this as paid via ${paymentMode}?`)) return;

    setProcessingId(id);
    try {
      await api.put(`/expenses/${id}/pay`, { paymentMode });
      toast.success('Payout recorded successfully');
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process payout');
    } finally {
      setProcessingId(null);
    }
  };

  // Only show APPROVED expenses (Pending Payouts)
  const pendingPayouts = expenses.filter(e => e.status === 'APPROVED');
  const paidOut = expenses.filter(e => e.status === 'PAID');

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
            <Banknote className="w-5 h-5" />
          </span>
          Pending Payouts
        </h2>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : pendingPayouts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">All approved expenses have been paid out!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingPayouts.map(expense => (
              <div key={expense.id} className="bg-white border-2 border-blue-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="h-32 bg-gray-100 relative group">
                  <img src={expense.billPhotoBase64} alt="Bill" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={expense.billPhotoBase64} target="_blank" rel="noreferrer" className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium text-sm">View Bill</a>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl font-bold text-gray-800">₹{expense.amount}</span>
                  </div>
                  
                  <p className="text-gray-600 font-medium mb-1">Pay to: {expense.user.name}</p>
                  {expense.paymentNumber ? (
                    <div className="flex items-center text-sm font-bold text-purple-700 bg-purple-50 p-2 rounded-lg mb-2">
                      <Smartphone className="w-4 h-4 mr-2" />
                      {expense.paymentNumber}
                    </div>
                  ) : (
                    <p className="text-sm text-yellow-600 font-medium mb-2">No GPay number provided.</p>
                  )}
                  
                  <p className="text-sm text-gray-500 mb-4 h-10 overflow-hidden text-ellipsis">{expense.description}</p>
                  
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handlePay(expense.id, 'Cash')}
                      disabled={processingId === expense.id}
                      className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                    >
                      Paid Cash
                    </button>
                    <button
                      onClick={() => handlePay(expense.id, 'UPI')}
                      disabled={processingId === expense.id}
                      className="flex-1 bg-purple-100 text-purple-700 hover:bg-purple-200 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                    >
                      Paid UPI
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {paidOut.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 opacity-70">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recently Paid</h3>
          <div className="space-y-3">
            {paidOut.slice(0, 5).map(e => (
              <div key={e.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg">
                <div>
                  <p className="font-bold text-gray-800">₹{e.amount} paid to {e.user.name}</p>
                  <p className="text-xs text-gray-500">Via {e.paymentMode} - {new Date(e.updatedAt).toLocaleDateString()}</p>
                </div>
                <CheckCircle className="text-green-500 w-5 h-5" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CashierExpenses;
