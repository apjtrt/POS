import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Send, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Expenses() {
  const { user, login } = useAuth(); // Need useAuth to fetch user and potentially refresh it
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ amount: '', description: '', paymentNumber: '' });
  const [photoBase64, setPhotoBase64] = useState(null);
  const fileInputRef = useRef(null);

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

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Compress heavily for database storage
        const base64 = canvas.toDataURL('image/jpeg', 0.5);
        setPhotoBase64(base64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoBase64) {
      toast.error('Please capture a photo of the bill/receipt');
      return;
    }
    
    setSubmitting(true);

    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await submitData(position.coords.latitude, position.coords.longitude);
        },
        async (error) => {
          toast.warning('Location access denied. Submitting without GPS.');
          await submitData(null, null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      await submitData(null, null);
    }
  };

  const submitData = async (latitude, longitude) => {
    try {
      const payloadPaymentNumber = user?.upiId || formData.paymentNumber;
      
      await api.post('/expenses', {
        amount: formData.amount,
        description: formData.description,
        paymentNumber: payloadPaymentNumber,
        billPhotoBase64: photoBase64,
        latitude,
        longitude
      });
      
      toast.success('Expense submitted for approval!');
      
      // Refresh user to get the newly saved upiId in context
      if (!user?.upiId) {
        setTimeout(() => window.location.reload(), 1500);
      }

      setFormData({ amount: '', description: '', paymentNumber: '' });
      setPhotoBase64(null);
      fetchExpenses(); // Refresh list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'APPROVED': return <span className="flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs font-semibold"><CheckCircle className="w-3 h-3 mr-1"/> Approved (Pending Payout)</span>;
      case 'PAID': return <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-semibold"><CheckCircle className="w-3 h-3 mr-1"/> Paid</span>;
      case 'REJECTED': return <span className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-semibold"><XCircle className="w-3 h-3 mr-1"/> Rejected</span>;
      default: return <span className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-semibold"><Clock className="w-3 h-3 mr-1"/> Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
            <Send className="w-5 h-5" />
          </span>
          Submit New Expense
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              required
              min="1"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="e.g. 150"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              required
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="What was this expense for?"
            />
          </div>

          {user?.upiId ? (
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <label className="block text-sm font-medium text-purple-900 mb-1">Reimbursement Payment Address</label>
              <div className="flex items-center justify-between">
                <p className="text-purple-700 font-bold">{user.upiId}</p>
                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-semibold">Saved</span>
              </div>
              <p className="text-xs text-purple-600 mt-2">Payments will be sent automatically to this saved UPI ID.</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full UPI ID (for Reimbursement)</label>
              <input
                type="text"
                required
                value={formData.paymentNumber}
                onChange={(e) => setFormData({...formData, paymentNumber: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="e.g. 9876543210@ybl or name@okaxis"
              />
              <p className="text-xs text-gray-500 mt-1">This will be securely saved for all future reimbursements.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill / Receipt Photo</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handlePhotoCapture}
              className="hidden"
            />
            {photoBase64 ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <img src={photoBase64} alt="Captured Bill" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoBase64(null)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                <Camera className="w-8 h-8 mb-2" />
                <span className="font-medium">Tap to Capture Bill</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit for Approval'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">My Past Expenses</h3>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : expenses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No expenses submitted yet.</p>
        ) : (
          <div className="space-y-4">
            {expenses.map(expense => (
              <div key={expense.id} className="border border-gray-100 rounded-xl p-4 flex justify-between items-start bg-gray-50">
                <div>
                  <p className="font-bold text-gray-800">₹{expense.amount}</p>
                  <p className="text-sm text-gray-600 mt-1">{expense.description}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(expense.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(expense.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Expenses;
