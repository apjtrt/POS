import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DonationForm from './pages/DonationForm';
import ReceiptHistory from './pages/ReceiptHistory';
import Settings from './pages/Settings';
import ReceiptVerification from './pages/ReceiptVerification';
import DetailedReports from './pages/DetailedReports';
import ManageUsers from './pages/ManageUsers';
import SecurityLogs from './pages/SecurityLogs';
import Expenses from './pages/Expenses';
import ManageExpenses from './pages/ManageExpenses';
import CashierExpenses from './pages/CashierExpenses';
import RecordTransfer from './pages/RecordTransfer';
import TransferHistory from './pages/TransferHistory';

// Layout
import MainLayout from './components/layout/MainLayout';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <MainLayout>{children}</MainLayout>;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/" />;
  return <MainLayout>{children}</MainLayout>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/receipt/:receiptNumber" element={<ReceiptVerification />} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/donations/new" element={<ProtectedRoute><DonationForm /></ProtectedRoute>} />
          <Route path="/donations/history" element={<ProtectedRoute><ReceiptHistory /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
          <Route path="/transfers/new" element={<ProtectedRoute><RecordTransfer /></ProtectedRoute>} />
          <Route path="/transfers" element={<ProtectedRoute><TransferHistory /></ProtectedRoute>} />
          <Route path="/cashier/expenses" element={<ProtectedRoute><CashierExpenses /></ProtectedRoute>} />
          
          {/* Admin Only Routes */}
          <Route path="/reports" element={<AdminRoute><DetailedReports /></AdminRoute>} />
          <Route path="/users" element={<AdminRoute><ManageUsers /></AdminRoute>} />
          <Route path="/security-logs" element={<AdminRoute><SecurityLogs /></AdminRoute>} />
          <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
          <Route path="/manage-expenses" element={<AdminRoute><ManageExpenses /></AdminRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
