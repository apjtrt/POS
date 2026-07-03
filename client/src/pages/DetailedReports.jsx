import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import api from '../services/api';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-toastify';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#eab308'];

const DetailedReports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState(null);
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const query = filter ? `?filter=${filter}` : '';
        const res = await api.get(`/dashboard/reports${query}`);
        setReports(res.data.data);
      } catch (error) {
        console.error('Failed to fetch detailed reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
    api.get('/settings').then(res => setSettings(res.data.data)).catch(console.error);
  }, [filter]);

  const fetchRawDonations = async () => {
    try {
      const today = new Date();
      const query = new URLSearchParams({ limit: 1000000 });
      if (filter === 'today') {
        query.append('date', today.toISOString());
      }
      const res = await api.get(`/donations?${query}`);
      return res.data.data;
    } catch (error) {
      toast.error('Failed to fetch raw receipts for export');
      return [];
    }
  };

  const groupDonationsByStreet = (donations) => {
    const grouped = {};
    donations.forEach(d => {
      const street = d.street || 'Unknown Street';
      if (!grouped[street]) grouped[street] = [];
      grouped[street].push(d);
    });
    
    // Sort streets alphabetically
    return Object.keys(grouped).sort().reduce((acc, street) => {
      acc[street] = grouped[street];
      return acc;
    }, {});
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const allData = await fetchRawDonations();
      if (allData.length === 0) return toast.info('No data to export');
      
      const grouped = groupDonationsByStreet(allData);
      const csvLines = [];
      let grandTotal = 0;

      // Add report header
      csvLines.push(`"${settings?.associationName || 'Donation Receipts'}"`);
      csvLines.push(`"${filter === 'today' ? "Today's Detailed Report" : "Detailed Collection Report"}"`);
      csvLines.push(`"Generated on: ${format(new Date(), 'dd-MMM-yyyy HH:mm')}"`);
      csvLines.push("");

      Object.entries(grouped).forEach(([street, donations]) => {
        csvLines.push(`"STREET: ${street.toUpperCase()}"`);
        csvLines.push("Receipt No,Date,Donor Name,Mobile,Amount,Payment Mode,Collector");
        
        let streetTotal = 0;
        donations.forEach(d => {
          streetTotal += d.amount;
          csvLines.push([
            d.receiptNumber,
            format(new Date(d.date), 'dd-MMM-yyyy'),
            `"${d.donorName}"`,
            d.mobile,
            d.amount,
            d.paymentMode,
            `"${d.collector}"`
          ].join(','));
        });

        grandTotal += streetTotal;
        csvLines.push(`"","","","","SUBTOTAL: ${streetTotal}","",""`);
        csvLines.push(""); // empty row between streets
      });

      csvLines.push(`"","","","","GRAND TOTAL: ${grandTotal}","",""`);

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Grouped_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Excel (CSV) exported successfully');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const allData = await fetchRawDonations();
      if (allData.length === 0) return toast.info('No data to export');
      
      const grouped = groupDonationsByStreet(allData);
      
      const doc = new jsPDF('portrait');
      doc.setFontSize(16);
      doc.text(settings?.associationName || 'Donation Receipts', 14, 20);
      
      doc.setFontSize(11);
      doc.text(filter === 'today' ? "Today's Detailed Report (Street Wise)" : "Detailed Collection Report (Street Wise)", 14, 28);
      doc.text(`Generated on: ${format(new Date(), 'dd-MMM-yyyy HH:mm')}`, 14, 34);

      let currentY = 42;
      let grandTotal = 0;

      Object.entries(grouped).forEach(([street, donations]) => {
        // Check if we need a new page for the heading
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Street: ${street}`, 14, currentY);
        currentY += 4;

        let streetTotal = 0;
        const tableRows = donations.map(d => {
          streetTotal += d.amount;
          return [
            d.receiptNumber,
            format(new Date(d.date), 'dd-MMM'),
            d.donorName,
            d.mobile,
            `Rs. ${d.amount}`,
            d.collector
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [['Receipt No', 'Date', 'Donor Name', 'Mobile', 'Amount', 'Collector']],
          body: tableRows,
          theme: 'striped',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
          margin: { top: 10 },
          didDrawPage: (data) => {
            // Keep track of Y position for next elements
            currentY = data.cursor.y;
          }
        });

        grandTotal += streetTotal;
        
        currentY += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Subtotal for ${street}: Rs. ${streetTotal}`, 14, currentY);
        currentY += 10;
      });

      // Grand Total at the end
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`GRAND TOTAL: Rs. ${grandTotal}`, 14, currentY + 10);

      doc.save(`Grouped_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="animate-pulse">Loading detailed reports...</div>;
  if (!reports) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {filter === 'today' ? "Today's Detailed Reports" : "Detailed Collection Reports"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Breakdown of collections by street, collector, and date.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={exportToCSV}
            disabled={exporting}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
          </button>
          <button 
            onClick={exportToPDF}
            disabled={exporting}
            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4 mr-2" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Street Wise Report */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Street-Wise Collection</h2>
          </div>
          <div className="p-6">
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reports.streetWise}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="amount"
                  >
                    {reports.streetWise.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Street Name</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Receipts</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {reports.streetWise.map((s, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-200 flex items-center">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-right">{s.count}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-200 text-right">₹{s.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Collector Wise Report */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Collector-Wise Collection</h2>
          </div>
          <div className="p-6">
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports.collectorWise}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" tick={{fill: '#64748b'}} />
                  <YAxis tick={{fill: '#64748b'}} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Collector Name</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Receipts</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Amount</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {reports.collectorWise.map((c, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-200">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-right">{c.count}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-right">₹{c.amount}</td>
                      <td className="px-4 py-3 text-right">
                        <Link 
                          to={`/donations/history?collector=${encodeURIComponent(c.name)}`}
                          className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-md text-sm font-medium transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Receipts
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Date Wise Report */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden lg:col-span-2">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Date-Wise Collection</h2>
          </div>
          <div className="p-6">
            <div className="h-72 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports.dateWise}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'MMM dd')} tick={{fill: '#64748b'}} />
                  <YAxis tick={{fill: '#64748b'}} />
                  <Tooltip 
                    labelFormatter={(label) => format(new Date(label), 'dd MMM yyyy')}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Receipts</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Amount Collected</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {reports.dateWise.map((d, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-200">
                        {format(new Date(d.date), 'dd MMM yyyy, EEEE')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-right">{d.count}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 text-right">₹{d.amount}</td>
                      <td className="px-4 py-3 text-right">
                        <Link 
                          to={`/donations/history?date=${d.date}`}
                          className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-md text-sm font-medium transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Receipts
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DetailedReports;
