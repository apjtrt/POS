import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import axios from 'axios';
import { CheckCircle, AlertCircle, Download, Calendar, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const ReceiptVerification = () => {
  const { receiptNumber } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyReceipt = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        // Note: calling standard axios, not the auth 'api' instance
        const res = await axios.get(`${apiUrl.replace('/api', '')}/receipt/${receiptNumber}`);
        setReceipt(res.data.data);
      } catch (err) {
        setError('Receipt not found or invalid.');
      } finally {
        setLoading(false);
      }
    };
    verifyReceipt();
  }, [receiptNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-pulse text-blue-600 dark:text-blue-400 font-medium">Verifying receipt...</div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-red-200 dark:border-red-900 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invalid Receipt</h2>
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-10 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <CheckCircle className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Verified Receipt</h1>
              <p className="text-blue-100 font-medium tracking-wider">NO: {receipt.receiptNumber}</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 space-y-6">
            <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Donation Amount</h3>
              <p className="text-5xl font-bold text-slate-900 dark:text-white">₹{receipt.amount}</p>
              <p className="mt-2 text-sm text-slate-500 font-medium bg-slate-100 dark:bg-slate-700 inline-block px-3 py-1 rounded-full">
                Paid via {receipt.paymentMode}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="flex items-start">
                <User className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Donor Name</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{receipt.donorName}</p>
                  {receipt.fatherName && <p className="text-sm text-slate-600 dark:text-slate-400">S/o, D/o, W/o: {receipt.fatherName}</p>}
                </div>
              </div>

              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Date</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{format(new Date(receipt.date), 'dd MMMM yyyy')}</p>
                </div>
              </div>

              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Address</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{receipt.doorNumber}, {receipt.street}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
              {receipt.pdfUrl ? (
                <a 
                  href={receipt.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download PDF Receipt
                </a>
              ) : (
                <p className="text-sm text-amber-600 font-medium">PDF receipt is currently processing. Please check back later.</p>
              )}
            </div>
            
            <div className="text-center mt-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Thank you for your valuable contribution to Dr. A.P.J. Abdul Kalam Association.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptVerification;
