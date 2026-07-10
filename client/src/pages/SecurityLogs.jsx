import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Camera, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

const SecurityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/login-logs');
      setLogs(res.data.data);
    } catch (error) {
      toast.error('Failed to load security logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading security logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
            <ShieldAlert className="mr-2 h-6 w-6 text-red-500" />
            Security Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review captured photos from recent collector login sessions to verify identity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {logs.map((log) => (
          <div key={log.id} className="saas-card rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 overflow-hidden flex flex-col">
            <div className="relative aspect-video bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              {log.photoBase64 ? (
                <img 
                  src={log.photoBase64} 
                  alt={`Login capture of ${log.user.name}`} 
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <Camera className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs font-medium">No photo</span>
                </div>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{log.user.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">@{log.user.username}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  log.user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-primary-100 text-blue-700 dark:bg-primary-900/30 dark:text-primary-300'
                }`}>
                  {log.user.role}
                </span>
              </div>
              <div className="mt-auto space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <div className="flex justify-between items-center">
                  <span>Login: {format(new Date(log.createdAt), 'MMM d, h:mm a')}</span>
                  {log.loginLatitude && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${log.loginLatitude},${log.loginLongitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-primary-600 flex items-center">
                      <Camera className="w-3 h-3 mr-1" /> Map
                    </a>
                  )}
                </div>
                {log.logoutTime ? (
                  <div className="flex justify-between items-center">
                    <span>Logout: {format(new Date(log.logoutTime), 'MMM d, h:mm a')}</span>
                    {log.logoutLatitude && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${log.logoutLatitude},${log.logoutLongitude}`} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-600 flex items-center">
                        <Camera className="w-3 h-3 mr-1" /> Map
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-green-500">Currently Active</div>
                )}
              </div>
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="col-span-full py-12 text-center saas-card rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <ShieldAlert className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No login logs found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityLogs;
