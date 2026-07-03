import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Download, Search, Filter, Trash2, Send, MapPin, FileSpreadsheet, FileText, Image } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReceiptHistory = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  
  // The specific date or collector clicked from the reports page
  const targetDate = searchParams.get('date');
  const targetCollector = searchParams.get('collector');
  
  // Filters
  const [search, setSearch] = useState('');
  const [street, setStreet] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [collectorFilter, setCollectorFilter] = useState(targetCollector || '');
  const [exporting, setExporting] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  const fetchDonations = async (page = 1, fetchAll = false) => {
    setLoading(!fetchAll);
    try {
      const query = new URLSearchParams({
        page: fetchAll ? 1 : page,
        limit: fetchAll ? 1000000 : 10,
        ...(search && { search }),
        ...(street && { street }),
        ...(paymentMode && { paymentMode }),
        ...(collectorFilter && { collector: collectorFilter }),
        ...(targetDate && { date: targetDate }),
      });
      const res = await api.get(`/donations?${query}`);
      if (fetchAll) {
        return res.data.data;
      }
      setDonations(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch donations');
      return [];
    } finally {
      if (!fetchAll) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations(1);
    api.get('/settings').then(res => setSettings(res.data.data)).catch(console.error);
  }, [search, street, paymentMode, collectorFilter]);

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const allData = await fetchDonations(1, true);
      
      const headers = ['Receipt No', 'Date', 'Donor Name', 'Mobile', 'Street', 'Amount', 'Payment Mode', 'Collector'];
      const rows = allData.map(d => [
        d.receiptNumber,
        format(new Date(d.date), 'dd-MMM-yyyy'),
        `"${d.donorName}"`,
        d.mobile,
        `"${d.street}"`,
        d.amount,
        d.paymentMode,
        `"${d.collector}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipts_Export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Excel (CSV) exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const allData = await fetchDonations(1, true);
      
      const doc = new jsPDF('landscape');
      doc.setFontSize(18);
      doc.text(settings?.associationName || 'Donation Receipts Report', 14, 22);
      
      doc.setFontSize(11);
      doc.text(`Generated on: ${format(new Date(), 'dd-MMM-yyyy HH:mm')}`, 14, 30);

      const tableColumn = ['Receipt No', 'Date', 'Donor Name', 'Mobile', 'Street', 'Amount', 'Payment Mode', 'Collector'];
      const tableRows = allData.map(d => [
        d.receiptNumber,
        format(new Date(d.date), 'dd-MMM-yyyy'),
        d.donorName,
        d.mobile,
        d.street,
        `Rs. ${d.amount}`,
        d.paymentMode,
        d.collector
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`Receipts_Export_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      try {
        await api.delete(`/donations/${id}`);
        toast.success('Receipt deleted');
        fetchDonations(pagination.page);
      } catch (error) {
        toast.error('Failed to delete receipt');
      }
    }
  };

  const handleWhatsApp = (donor) => {
    if (!settings) return;
    let message = settings.whatsappMessage
      .replace('{amount}', donor.amount)
      .replace('{receiptNumber}', donor.receiptNumber)
      .replace('{pdfUrl}', donor.pdfUrl || `http://localhost:5000/api/donations/${donor.receiptNumber}/pdf`);
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/91${donor.mobile}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Receipt History</h1>
        
        <div className="flex gap-2">
          <button 
            onClick={exportToCSV}
            disabled={exporting || donations.length === 0}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
          </button>
          <button 
            onClick={exportToPDF}
            disabled={exporting || donations.length === 0}
            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4 mr-2" /> Export PDF
          </button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-700 placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select 
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
          >
            <option value="">All Streets</option>
            <option value="Kambar Street">Kambar Street</option>
            <option value="Kumaran Street">Kumaran Street</option>
            <option value="Maruthi Street">Maruthi Street</option>
            <option value="Others">Others</option>
          </select>
          
          <select 
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
          </select>
          
          {user?.role === 'ADMIN' && (
            <input
              type="text"
              placeholder="Filter by Collector..."
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={collectorFilter}
              onChange={(e) => setCollectorFilter(e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Receipt No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Donor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Street</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Collector</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-4 text-center text-sm text-slate-500">Loading...</td></tr>
              ) : donations.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-4 text-center text-sm text-slate-500">No receipts found.</td></tr>
              ) : (
                donations.map((donor) => (
                  <tr key={donor.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">{donor.receiptNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {format(new Date(donor.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-200">
                      <div>{donor.donorName}</div>
                      <div className="text-xs text-slate-500">{donor.mobile}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {donor.street}
                      {donor.latitude && user?.role === 'ADMIN' && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${donor.latitude},${donor.longitude}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex text-red-500 hover:text-red-600"
                          title="View on Map"
                        >
                          <MapPin className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{donor.collector}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-slate-200">₹{donor.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <a href={donor.pdfUrl || `http://localhost:5000/api/donations/${donor.receiptNumber}/pdf`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Download PDF">
                        <Download className="inline h-4 w-4" />
                      </a>
                      {donor.paymentMode === 'UPI' && donor.upiScreenshot && user?.role === 'ADMIN' && (
                        <button onClick={() => setSelectedScreenshot(donor.upiScreenshot)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" title="View UPI Screenshot">
                          <Image className="inline h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleWhatsApp(donor)} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300" title="Send WhatsApp">
                        <Send className="inline h-4 w-4" />
                      </button>
                      {user?.role === 'ADMIN' && (
                        <button onClick={() => handleDelete(donor.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Delete">
                          <Trash2 className="inline h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white dark:bg-slate-800 px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button 
                onClick={() => fetchDonations(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                onClick={() => fetchDonations(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Showing <span className="font-medium">{((pagination.page - 1) * 10) + 1}</span> to <span className="font-medium">{Math.min(pagination.page * 10, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => fetchDonations(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white dark:bg-slate-700 dark:border-slate-600 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchDonations(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white dark:bg-slate-700 dark:border-slate-600 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="relative max-w-3xl w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">UPI Payment Screenshot</h3>
              <button 
                onClick={() => setSelectedScreenshot(null)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-4 flex justify-center bg-slate-100 dark:bg-slate-900 overflow-auto max-h-[80vh]">
              <img src={selectedScreenshot} alt="UPI Screenshot" className="max-w-full h-auto object-contain rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptHistory;
