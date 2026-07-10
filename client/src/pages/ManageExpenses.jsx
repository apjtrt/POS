import React, { useState, useEffect } from 'react';
import { Loader2, MapPin, CheckCircle, XCircle, Search, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

function ManageExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

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

  const handleUpdateStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this expense?`)) return;

    try {
      await api.put(`/expenses/${id}/status`, { status });
      toast.success(`Expense ${status.toLowerCase()} successfully`);
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredExpenses = expenses.filter(e => filter === 'ALL' || e.status === filter);

  const generatePDF = () => {
    if (filteredExpenses.length === 0) {
      toast.warning('No expenses to export!');
      return;
    }

    const grouped = {};
    filteredExpenses.forEach(exp => {
      const dateKey = format(new Date(exp.createdAt), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(exp);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));

    const doc = new jsPDF('portrait');
    
    const centerText = (text, y, size, isBold = false) => {
      doc.setFontSize(size);
      if (isBold) doc.setFont("helvetica", "bold");
      else doc.setFont("helvetica", "normal");
      const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      const textOffset = (doc.internal.pageSize.width - textWidth) / 2;
      doc.text(text, textOffset, y);
    };

    centerText('Dr.A.P.J Abdul Kalam Youth Welfare Association', 15, 14, true);
    centerText(`Expense Report - ${filter}`, 22, 12, true);

    let currentY = 32;
    let grandTotal = 0;
    let receiptCounter = 1;

    sortedDates.forEach(dateStr => {
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      centerText(`Date: ${format(new Date(dateStr), 'dd/MM/yy')}`, currentY, 11, true);
      currentY += 6;

      let dateTotal = 0;
      const tableRows = grouped[dateStr].map(exp => {
        dateTotal += exp.amount;
        return [
          receiptCounter++,
          exp.description,
          exp.amount,
          exp.user?.name || 'Unknown'
        ];
      });

      tableRows.push([
        { content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: dateTotal, styles: { fontStyle: 'bold' } },
        { content: '' }
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Receipt No.', 'Description', 'Amount', 'Collector']],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'normal' },
        bodyStyles: { lineWidth: 0.1 },
        didDrawPage: (data) => {
          currentY = data.cursor.y;
        }
      });

      currentY += 8;
      
      grandTotal += dateTotal;
      centerText(`Total for Date ${format(new Date(dateStr), 'dd/MM/yy')}: Rs. ${dateTotal}`, currentY, 11, true);
      currentY += 10;
    });

    if (currentY > 260) { doc.addPage(); currentY = 20; }
    centerText(`GRAND TOTAL: Rs. ${grandTotal}`, currentY, 14, true);

    doc.save(`Expenses_Report_${filter}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="saas-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Manage Expenses</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap bg-slate-100 dark:bg-slate-900 p-1 rounded-lg gap-1">
              {['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'ALL'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === f ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={generatePDF}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Generate PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No {filter.toLowerCase()} expenses found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExpenses.map(expense => (
              <div key={expense.id} className="saas-card overflow-hidden hover:shadow-md transition-all">
                <div className="h-48 bg-gray-100 relative group">
                  <img src={expense.billPhotoBase64} alt="Bill" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={expense.billPhotoBase64} target="_blank" rel="noreferrer" className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium text-sm">View Full Image</a>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl font-bold text-gray-800">₹{expense.amount}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      expense.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      expense.status === 'APPROVED' ? 'bg-primary-100 text-blue-700' :
                      expense.status === 'PAID' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {expense.status === 'APPROVED' ? 'PENDING PAYOUT' : expense.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 font-medium mb-1">Collector: {expense.user.name}</p>
                  {expense.paymentNumber && (
                    <p className="text-sm font-semibold text-purple-700 mb-1">Payment No: {expense.paymentNumber}</p>
                  )}
                  <p className="text-sm text-gray-500 mb-4">{expense.description}</p>
                  
                  <div className="flex items-center text-xs text-gray-400 mb-4 bg-gray-50 p-2 rounded-lg">
                    <MapPin className="w-4 h-4 mr-1 text-red-400" />
                    {expense.latitude ? (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${expense.latitude},${expense.longitude}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        View Submission Location
                      </a>
                    ) : (
                      'Location not provided'
                    )}
                  </div>

                  {expense.status === 'PENDING' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleUpdateStatus(expense.id, 'APPROVED')}
                        className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-2 rounded-lg font-bold flex items-center justify-center transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(expense.id, 'REJECTED')}
                        className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 py-2 rounded-lg font-bold flex items-center justify-center transition-colors"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageExpenses;
