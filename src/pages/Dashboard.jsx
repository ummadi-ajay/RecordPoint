import React, { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  TrendingUp,
  Calendar,
  ArrowRight,
  Loader2,
  RefreshCcw,
  Plus,
  AlertTriangle,
  Trophy,
  DollarSign,
  Clock,
  Phone
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -3 }}
    className="glass card stat-card"
  >
    <div className="stat-content">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-details">
        <span className="stat-label">{title}</span>
        <h3 className="stat-number">{value}</h3>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    studentCount: 0,
    totalRevenue: 0,
    paidRevenue: 0,
    unpaidRevenue: 0,
    invoiceCount: 0,
    thisMonthClasses: 0,
    recentInvoices: [],
    unpaidInvoices: [],
    topStudents: [],
    monthlyRevenue: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Get Students
      const sSnap = await getDocs(collection(db, 'students'));
      const allStudents = sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Get All Invoices
      const iSnap = await getDocs(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')));
      const allInvoices = iSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate revenue
      const paidInvoices = allInvoices.filter(i => i.status === 'Paid');
      const unpaidInvoices = allInvoices.filter(i => i.status !== 'Paid');
      const totalRevenue = allInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
      const paidRevenue = paidInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
      const unpaidRevenue = unpaidInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);

      // Monthly revenue for chart (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const m = format(d, 'MM');
        const y = format(d, 'yyyy');
        const monthInvoices = allInvoices.filter(inv => inv.month === m && inv.year === y);
        const revenue = monthInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
        monthlyData.push({
          month: format(d, 'MMM'),
          revenue: revenue,
          invoices: monthInvoices.length
        });
      }

      // 3. Get this month's total classes
      const now = new Date();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentYear = String(now.getFullYear());

      const attSnap = await getDocs(collection(db, 'monthly_attendance'));
      let thisMonthClasses = 0;
      const studentAttendance = {};

      attSnap.forEach(doc => {
        const d = doc.data();
        if (d.month === currentMonth && d.year === currentYear) {
          thisMonthClasses += d.classCount || 0;
        }
        // Track all-time attendance per student
        if (!studentAttendance[d.studentId]) {
          studentAttendance[d.studentId] = 0;
        }
        studentAttendance[d.studentId] += d.classCount || 0;
      });

      // Top Students by attendance
      const topStudents = Object.entries(studentAttendance)
        .map(([studentId, count]) => {
          const student = allStudents.find(s => s.id === studentId);
          return {
            id: studentId,
            name: student?.name || 'Unknown',
            photo: student?.photo,
            count
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        studentCount: allStudents.length,
        totalRevenue,
        paidRevenue,
        unpaidRevenue,
        invoiceCount: allInvoices.length,
        thisMonthClasses,
        recentInvoices: allInvoices.slice(0, 5),
        unpaidInvoices: unpaidInvoices.slice(0, 5),
        topStudents,
        monthlyRevenue: monthlyData
      });
    } catch (err) {
      console.error('Dashboard Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppReminder = (invoice) => {
    const phone = invoice.studentSnapshot?.phone?.replace(/\D/g, '');
    const message = `Hi! This is a reminder from Makerworks Lab.\n\nInvoice: #${invoice.id.slice(-8).toUpperCase()}\nAmount Due: ₹${invoice.totalAmount?.toLocaleString()}\n\nPlease complete the payment at your earliest convenience. Thank you!`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back! Here's your overview</p>
        </div>
        <button className="sync-btn" onClick={fetchDashboardData}>
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="loader-full">
          <Loader2 className="animate-spin" size={48} style={{ color: '#4f46e5' }} />
          <p>Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid">
            <StatCard
              title="Total Students"
              value={stats.studentCount}
              icon={<Users size={22} />}
              color="indigo"
            />
            <StatCard
              title="Total Revenue"
              value={`₹${stats.totalRevenue.toLocaleString()}`}
              icon={<DollarSign size={22} />}
              color="emerald"
              subtitle={`₹${stats.paidRevenue.toLocaleString()} collected`}
            />
            <StatCard
              title="Pending Payments"
              value={`₹${stats.unpaidRevenue.toLocaleString()}`}
              icon={<Clock size={22} />}
              color="amber"
              subtitle={`${stats.unpaidInvoices.length} invoices`}
            />
            <StatCard
              title="This Month Classes"
              value={stats.thisMonthClasses}
              icon={<Calendar size={22} />}
              color="sky"
            />
          </div>

          {/* Charts Row */}
          <div className="charts-row">
            {/* Revenue Chart */}
            <div className="glass card chart-card">
              <div className="chart-header">
                <h4>💰 Revenue Trend</h4>
                <span className="chart-period">Last 6 months</span>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.monthlyRevenue}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                      contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Students */}
            <div className="glass card top-students-card">
              <div className="card-header">
                <h4>🏆 Top Students</h4>
                <span className="card-subtitle">By attendance</span>
              </div>
              <div className="top-list">
                {stats.topStudents.length > 0 ? (
                  stats.topStudents.map((student, idx) => (
                    <div key={student.id} className="top-item">
                      <div className="rank-badge">{idx + 1}</div>
                      <div className="student-avatar">
                        {student.photo ? (
                          <img src={student.photo} alt={student.name} />
                        ) : (
                          <span>{student.name?.[0]}</span>
                        )}
                      </div>
                      <div className="student-info">
                        <strong>{student.name}</strong>
                        <span>{student.count} classes</span>
                      </div>
                      {idx === 0 && <Trophy size={18} className="trophy-icon" />}
                    </div>
                  ))
                ) : (
                  <p className="empty-msg">No attendance data yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="bottom-row">
            {/* Payment Reminders */}
            <div className="glass card reminders-card">
              <div className="card-header">
                <h4>🔔 Payment Reminders</h4>
                <Link to="/invoices" className="view-all-link">View All</Link>
              </div>
              <div className="reminders-list">
                {stats.unpaidInvoices.length > 0 ? (
                  stats.unpaidInvoices.map(inv => (
                    <div key={inv.id} className="reminder-item">
                      <div className="reminder-info">
                        <div className="reminder-avatar">
                          {inv.studentSnapshot?.name?.[0]}
                        </div>
                        <div>
                          <strong>{inv.studentSnapshot?.name}</strong>
                          <span>₹{inv.totalAmount?.toLocaleString()} • #{inv.id.slice(-6).toUpperCase()}</span>
                        </div>
                      </div>
                      <button
                        className="whatsapp-btn"
                        onClick={() => sendWhatsAppReminder(inv)}
                        title="Send WhatsApp Reminder"
                      >
                        <Phone size={14} />
                        Remind
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="all-paid">
                    <span className="all-paid-icon">✅</span>
                    <p>All payments collected!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass card actions-card">
              <h4>⚡ Quick Actions</h4>
              <div className="actions-grid">
                <Link to="/students" className="action-tile indigo">
                  <Plus size={20} />
                  <span>Add Student</span>
                </Link>
                <Link to="/attendance" className="action-tile sky">
                  <Calendar size={20} />
                  <span>Log Attendance</span>
                </Link>
                <Link to="/invoices" className="action-tile emerald">
                  <CreditCard size={20} />
                  <span>Generate Bill</span>
                </Link>
                <Link to="/analytics" className="action-tile violet">
                  <TrendingUp size={20} />
                  <span>View Reports</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx="true">{`
        .dashboard { max-width: 1200px; margin: 0 auto; }

        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 30px;
        }

        .dash-header h2 { margin: 0; font-size: 1.75rem; font-weight: 700; }
        .dash-header p { margin: 4px 0 0; color: var(--text-muted); }

        .sync-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .sync-btn:hover { color: var(--primary); border-color: var(--primary); }

        .loader-full {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          gap: 16px;
          color: var(--text-muted);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card { padding: 24px; background: var(--bg-card); }
        .stat-content { display: flex; align-items: flex-start; gap: 15px; }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.indigo { background: rgba(79, 70, 229, 0.1); color: var(--primary); }
        .stat-icon.emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .stat-icon.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .stat-icon.sky { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; }
        .stat-icon.violet { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

        .stat-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
        .stat-number { font-size: 1.75rem; font-weight: 800; margin: 4px 0 0; }
        .stat-subtitle { font-size: 0.75rem; color: var(--success); font-weight: 600; }

        .charts-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .chart-card { padding: 24px; background: var(--bg-card); }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .chart-header h4 { margin: 0; font-size: 1.1rem; }
        .chart-period { font-size: 0.8rem; color: var(--text-muted); }

        .top-students-card { padding: 24px; background: var(--bg-card); }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .card-header h4 { margin: 0; font-size: 1.1rem; }
        .card-subtitle { font-size: 0.8rem; color: var(--text-muted); }

        .top-list { display: flex; flex-direction: column; gap: 12px; }

        .top-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: var(--bg-secondary);
          border-radius: 10px;
        }

        .rank-badge {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: rgba(79, 70, 229, 0.1);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.75rem;
        }

        .student-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          overflow: hidden;
        }

        .student-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .student-info { flex: 1; }
        .student-info strong { display: block; font-size: 0.9rem; }
        .student-info span { font-size: 0.75rem; color: var(--text-muted); }

        .trophy-icon { color: #f59e0b; }

        .bottom-row {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 24px;
        }

        .reminders-card, .actions-card { padding: 24px; background: var(--bg-card); }

        .view-all-link {
          font-size: 0.85rem;
          color: var(--primary);
          font-weight: 600;
        }

        .reminders-list { display: flex; flex-direction: column; gap: 12px; }

        .reminder-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 10px;
        }

        .reminder-info { display: flex; align-items: center; gap: 12px; }

        .reminder-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #f59e0b;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .reminder-info strong { display: block; font-size: 0.9rem; }
        .reminder-info span { font-size: 0.75rem; color: var(--text-muted); }

        .whatsapp-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #25D366;
          color: white;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.8rem;
        }

        .whatsapp-btn:hover { background: #1da851; }

        .all-paid {
          text-align: center;
          padding: 30px;
          color: var(--success);
        }

        .all-paid-icon { font-size: 2rem; display: block; margin-bottom: 10px; }

        .actions-card h4 { margin: 0 0 20px; font-size: 1.1rem; }

        .actions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .action-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .action-tile.indigo { background: rgba(79, 70, 229, 0.1); color: var(--primary); }
        .action-tile.sky { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; }
        .action-tile.emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .action-tile.violet { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

        .action-tile:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }

        .empty-msg { text-align: center; color: var(--text-muted); padding: 20px; }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .charts-row, .bottom-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
