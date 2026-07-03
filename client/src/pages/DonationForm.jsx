import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Download, Send, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const DonationForm = () => {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    defaultValues: {
      paymentMode: 'Cash',
      purpose: 'Vinayagar Chadurthi 2026',
      date: new Date().toISOString().split('T')[0]
    }
  });

  const paymentMode = useWatch({ control, name: 'paymentMode' });
  const amount = useWatch({ control, name: 'amount' });

  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [formDataCache, setFormDataCache] = useState(null);
  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [settings, setSettings] = useState(null);

  // Fetch settings for WhatsApp message template
  useState(() => {
    api.get('/settings').then(res => setSettings(res.data.data));
  }, []);

  const onSubmit = async (data, bypass = false) => {
    setLoading(true);
    setDuplicateWarning(null);
    setFormDataCache(data);

    try {
      const payload = { ...data, bypassDuplicateCheck: bypass };
      const res = await api.post('/donations', payload);
      
      toast.success('Receipt generated successfully!');
      setCreatedReceipt(res.data.donor);
      reset(); // Reset form for next entry
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.isDuplicate) {
        setDuplicateWarning(error.response.data.message);
      } else {
        toast.error(error.response?.data?.message || 'Failed to create receipt');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!createdReceipt || !settings) return;
    
    let message = settings.whatsappMessage
      .replace('{amount}', createdReceipt.amount)
      .replace('{receiptNumber}', createdReceipt.receiptNumber)
      .replace('{pdfUrl}', createdReceipt.pdfUrl || `http://localhost:5000/api/donations/${createdReceipt.receiptNumber}/pdf`);
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/91${createdReceipt.mobile}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  if (createdReceipt) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Receipt Generated!</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Receipt No: <span className="font-bold text-slate-900 dark:text-white">{createdReceipt.receiptNumber}</span></p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a 
            href={createdReceipt.pdfUrl || `http://localhost:5000/api/donations/${createdReceipt.receiptNumber}/pdf`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
          >
            <Download className="mr-2 h-4 w-4" /> View PDF
          </a>
          
          <button 
            onClick={handleWhatsApp}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            <Send className="mr-2 h-4 w-4" /> Send WhatsApp
          </button>
          
          <button 
            onClick={() => setCreatedReceipt(null)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            New Receipt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">New Donation Entry</h2>
      </div>

      <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="p-6">
        {duplicateWarning && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  {duplicateWarning}
                </p>
                <button
                  type="button"
                  onClick={() => onSubmit(formDataCache, true)}
                  className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200 hover:underline"
                >
                  Continue and generate anyway
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Donor Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Donor Name *</label>
            <input 
              {...register('donorName', { required: 'Donor Name is required' })}
              className={`w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${errors.donorName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} 
            />
            {errors.donorName && <p className="mt-1 text-sm text-red-600">{errors.donorName.message}</p>}
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mobile Number *</label>
            <input 
              {...register('mobile', { 
                required: 'Mobile Number is required',
                pattern: { value: /^[0-9]{10}$/, message: 'Must be 10 digits' }
              })}
              className={`w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${errors.mobile ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} 
            />
            {errors.mobile && <p className="mt-1 text-sm text-red-600">{errors.mobile.message}</p>}
          </div>

          {/* Father/Husband Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Father/Husband Name *</label>
            <input 
              {...register('fatherName', { required: 'Father/Husband name is required' })}
              className={`w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${errors.fatherName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} 
            />
            {errors.fatherName && <p className="mt-1 text-sm text-red-600">{errors.fatherName.message}</p>}
          </div>

          {/* Donation Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Donation Amount (₹) *</label>
            <input 
              type="number"
              {...register('amount', { required: 'Amount is required', min: { value: 1, message: 'Amount must be greater than 0' } })}
              className={`w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${errors.amount ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} 
            />
            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
          </div>

          {/* Street */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Street *</label>
            <select 
              {...register('street', { required: 'Street is required' })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Street</option>
              <option value="Kambar Street">Kambar Street</option>
              <option value="Kumaran Street">Kumaran Street</option>
              <option value="Maruthi Street">Maruthi Street</option>
              <option value="Others">Others</option>
            </select>
            {errors.street && <p className="mt-1 text-sm text-red-600">{errors.street.message}</p>}
          </div>

          {/* Door Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Door Number *</label>
            <input 
              {...register('doorNumber', { required: 'Door number is required' })}
              className={`w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${errors.doorNumber ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} 
            />
            {errors.doorNumber && <p className="mt-1 text-sm text-red-600">{errors.doorNumber.message}</p>}
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Mode *</label>
            <select 
              {...register('paymentMode', { required: 'Payment mode is required' })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
            <input 
              type="date"
              {...register('date', { required: 'Date is required' })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Purpose *</label>
            <input 
              {...register('purpose', { required: 'Purpose is required' })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>

          {/* Remarks */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Remarks (Optional)</label>
            <textarea 
              {...register('remarks')}
              rows="3"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
            ></textarea>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          
          <div className="w-full md:w-auto">
            {paymentMode === 'UPI' && amount > 0 && settings?.upiId && (
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm">
                <div className="bg-white p-2 rounded-md">
                  <QRCodeSVG 
                    value={`upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.associationName)}&am=${amount}&cu=INR`}
                    size={120}
                    level="H"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center">
                    <QrCode className="w-4 h-4 mr-1 text-blue-600 dark:text-blue-400" />
                    Scan to Pay
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">UPI ID: {settings.upiId}</p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">Amount: ₹{amount}</p>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-sm font-bold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Generating...' : 'Generate Receipt'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DonationForm;
