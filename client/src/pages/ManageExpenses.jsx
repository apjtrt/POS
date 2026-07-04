import React, { useState, useEffect } from 'react';
import { Loader2, MapPin, CheckCircle, XCircle, Search, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Expense Report - ${filter} Expenses`, 14, 22);
    
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const tableData = filteredExpenses.map(exp => [
      new Date(exp.createdAt).toLocaleDateString(),
      exp.description,
      `Rs. ${exp.amount}`
    ]);
    
    tableData.push([
      { content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: `Rs. ${totalAmount}`, styles: { fontStyle: 'bold' } }
    ]);

    doc.autoTable({
      startY: 30,
      head: [['Date', 'Expense Description', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Expenses_Report_${filter}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-800">Manage Expenses</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap bg-gray-100 p-1 rounded-lg gap-1">
              {['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'ALL'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={generatePDF}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Generate PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No {filter.toLowerCase()} expenses found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExpenses.map(expense => (
              <div key={expense.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
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
                      expense.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
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
