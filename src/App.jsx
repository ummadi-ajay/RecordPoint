import { Routes, Route } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';

// Page components
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Invoices from './pages/Invoices';
import PublicInvoice from './pages/PublicInvoice';
import Analytics from './pages/Analytics';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import Quotations from './pages/Quotations';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/invoice/:invoiceId" element={<PublicInvoice />} />

      {/* Admin Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
