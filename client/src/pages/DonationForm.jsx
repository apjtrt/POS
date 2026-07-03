import { useState, useRef, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Download, Send, QrCode, Camera, Upload, X } from 'lucide-react';
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
  const [upiScreenshot, setUpiScreenshot] = useState(null);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Clean up camera if payment mode changes away from UPI
  useEffect(() => {
    if (paymentMode !== 'UPI') {
      stopCamera();
      setUpiScreenshot(null);
    }
  }, [paymentMode]);

  const startCamera = async () => {
    try {
      // Use environment facing camera (back camera) for capturing another screen
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      toast.error('Could not access camera. You can still upload a file.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    
    // Use actual video dimensions
    const width = videoRef.current.videoWidth || 640;
    const height = videoRef.current.videoHeight || 480;
    
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    
    context.drawImage(videoRef.current, 0, 0, width, height);
    const photoBase64 = canvasRef.current.toDataURL('image/jpeg', 0.6);
    setUpiScreenshot(photoBase64);
    stopCamera();
  };

  // Fetch settings for WhatsApp message template
  useState(() => {
    api.get('/settings').then(res => setSettings(res.data.data));
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Compress image and convert to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert back to base64, 0.7 quality jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setUpiScreenshot(dataUrl);
      };
    };
  };

  const onSubmit = async (data, bypass = false) => {
    if (data.paymentMode === 'UPI' && !upiScreenshot) {
      toast.error('Please upload a screenshot of the UPI payment.');
      return;
    }

    setLoading(true);
    setDuplicateWarning(null);
    setFormDataCache(data);

    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await submitData(data, bypass, position.coords.latitude, position.coords.longitude);
        },
        async (error) => {
          toast.warning('Location access denied. Submitting without GPS.');
          await submitData(data, bypass, null, null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      await submitData(data, bypass, null, null);
    }
  };

  const submitData = async (data, bypass, latitude, longitude) => {
    try {
      const payload = { ...data, bypassDuplicateCheck: bypass, latitude, longitude, upiScreenshot };
      const res = await api.post('/donations', payload);
      
      toast.success('Receipt generated successfully!');
      setCreatedReceipt(res.data.donor);
      setUpiScreenshot(null);
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

          {paymentMode === 'UPI' && (
            <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mt-4">
              {amount > 0 && settings?.upiId ? (
                <div className="mb-6 flex flex-col sm:flex-row items-center gap-6 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                  <div className="bg-white p-2 rounded-xl shadow-inner">
                    <QRCodeSVG 
                      value={`upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.associationName)}&am=${amount}&cu=INR`}
                      size={140}
                      level="H"
                    />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center justify-center sm:justify-start mb-2">
                      <QrCode className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                      Scan to Pay
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">UPI ID:</span> {settings.upiId}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Amount:</span> <span className="text-emerald-600 font-bold text-lg">₹{amount}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-center">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  {!settings?.upiId 
                    ? "Admin hasn't configured a UPI ID yet. (Go to Settings to add one)" 
                    : "Please enter a Donation Amount above to generate the QR Code."}
                </div>
              )}

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                Upload UPI Screenshot (Mandatory) *
              </label>

              {!showCamera && !upiScreenshot && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    type="button" 
                    onClick={startCamera}
                    className="flex-1 flex items-center justify-center px-4 py-3 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Camera className="w-5 h-5 mr-2" /> Use Live Camera
                  </button>
                  <div className="flex-1 relative">
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-center px-4 py-3 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors pointer-events-none">
                      <Upload className="w-5 h-5 mr-2" /> Upload File
                    </div>
                  </div>
                </div>
              )}

              {showCamera && (
                <div className="mt-4 space-y-4">
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-300 dark:border-slate-600 max-w-lg mx-auto">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover"
                    ></video>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  
                  <div className="flex gap-4 justify-center">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center"
                    >
                      <Camera className="w-4 h-4 mr-2" /> Capture
                    </button>
                  </div>
                </div>
              )}

              {upiScreenshot && !showCamera && (
                <div className="mt-4 p-4 border border-green-200 bg-green-50 dark:bg-green-900/30 dark:border-green-800 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center text-green-700 dark:text-green-400">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      <span className="font-medium text-sm">Screenshot attached successfully!</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setUpiScreenshot(null)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-3 flex justify-center bg-white dark:bg-slate-800 p-2 rounded border border-green-100 dark:border-green-800 max-h-48 overflow-hidden">
                    <img src={upiScreenshot} alt="Preview" className="object-contain w-full h-full rounded max-w-xs" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col md:flex-row justify-end items-center gap-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          
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
