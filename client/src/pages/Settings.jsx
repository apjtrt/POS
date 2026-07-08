import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { toast } from 'react-toastify';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState(null);
  
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data.data) {
          setSettingsId(res.data.data.id);
          reset(res.data.data);
        }
      } catch (error) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      if (settingsId) {
        await api.put(`/settings/${settingsId}`, data);
        toast.success('Settings updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleDownloadBackup = async () => {
    try {
      toast.info('Generating backup...', { autoClose: 2000 });
      const response = await api.get('/settings/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `database_backup_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Backup downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download backup. Make sure you are an admin.');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">System Settings</h2>
        <button
          onClick={handleDownloadBackup}
          className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Download Full Backup
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Association Name</label>
            <input 
              {...register('associationName')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">President Name</label>
            <input 
              {...register('presidentName')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Secretary Name</label>
            <input 
              {...register('secretaryName')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Purpose</label>
            <input 
              {...register('defaultPurpose')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Financial Year</label>
            <input 
              {...register('financialYear')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Association UPI ID</label>
            <input 
              {...register('upiId')}
              placeholder="e.g. yourname@upi"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">WhatsApp Message Template (English)</label>
            <textarea 
              {...register('whatsappMessage')}
              rows="6"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" 
            ></textarea>
            <p className="mt-1 text-xs text-slate-500">Variables available: {'{donorName}'}, {'{amount}'}, {'{receiptNumber}'}, {'{pdfUrl}'}, {'{streetLink}'}</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">WhatsApp Message Template (Tamil)</label>
            <textarea 
              {...register('whatsappMessageTa')}
              rows="6"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" 
            ></textarea>
            <p className="mt-1 text-xs text-slate-500">Variables available: {'{amount}'}, {'{receiptNumber}'}, {'{pdfUrl}'}, {'{streetLink}'}</p>
          </div>

          <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">Street WhatsApp Group Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kambar Street</label>
                <input 
                  {...register('streetLinks.Kambar Street')}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kumaran Street</label>
                <input 
                  {...register('streetLinks.Kumaran Street')}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Maruthi Street</label>
                <input 
                  {...register('streetLinks.Maruthi Street')}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
