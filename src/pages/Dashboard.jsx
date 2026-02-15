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
  Phone,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  FileText
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const StatCard = ({ title, value, icon, color, subtitle, trend, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay * 0.1 }}
    whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}
    className="glass card stat-card"
  >
    <div className="stat-content">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-details">
        <span className="stat-label">{title}</span>
        <h3 className="stat-number">{value}</h3>
        {subtitle && (
          <span className={`stat-subtitle ${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : ''}`}>
            {trend === 'up' && <ArrowUpRight size={12} />}
            {trend === 'down' && <ArrowDownRight size={12} />}
            {subtitle}
          </span>
        )}
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
    lastMonthClasses: 0,
    recentInvoices: [],
    unpaidInvoices: [],
    topStudents: [],
    monthlyRevenue: [],
    collectionRate: 0
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

      // Collection rate
      const collectionRate = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;

      // Monthly revenue for chart (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const m = format(d, 'MM');
        const y = format(d, 'yyyy');
        const monthInvoices = allInvoices.filter(inv => inv.month === m && inv.year === y);
        const revenue = monthInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
        const paid = monthInvoices.filter(inv => inv.status === 'Paid').reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
        monthlyData.push({
          month: format(d, 'MMM'),
          revenue: revenue,
          paid: paid,
          invoices: monthInvoices.length
        });
      }

      // 3. Get attendance
      const now = new Date();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentYear = String(now.getFullYear());
      const lastMonth = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0');
      const lastMonthYear = now.getMonth() === 0 ? String(now.getFullYear() - 1) : currentYear;

      const attSnap = await getDocs(collection(db, 'monthly_attendance'));
      let thisMonthClasses = 0;
      let lastMonthClasses = 0;
      const studentAttendance = {};

      attSnap.forEach(doc => {
        const d = doc.data();
        if (d.month === currentMonth && d.year === currentYear) {
          thisMonthClasses += d.classCount || 0;
        }
        if (d.month === lastMonth && d.year === lastMonthYear) {
          lastMonthClasses += d.classCount || 0;
        }
        if (!studentAttendance[d.studentId]) {
          studentAttendance[d.studentId] = 0;
        }
        studentAttendance[d.studentId] += d.classCount || 0;
      });

      // Top Students by attendance — only include students that still exist
      const topStudents = Object.entries(studentAttendance)
        .map(([studentId, count]) => {
          const student = allStudents.find(s => s.id === studentId);
          if (!student) return null; // Skip orphaned attendance records
          return {
            id: studentId,
            name: student.name || 'Unknown',
            photo: student.photo,
            course: student.course,
            count
          };
        })
        .filter(Boolean) // Remove nulls
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        studentCount: allStudents.length,
        totalRevenue,
        paidRevenue,
        unpaidRevenue,
        invoiceCount: allInvoices.length,
        thisMonthClasses,
        lastMonthClasses,
        recentInvoices: allInvoices.slice(0, 5),
        unpaidInvoices: unpaidInvoices.slice(0, 5),
        topStudents,
        monthlyRevenue: monthlyData,
        collectionRate
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', emoji: '☀️' };
    if (hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
    return { text: 'Good Evening', emoji: '🌙' };
  };

  const classesTrend = stats.thisMonthClasses >= stats.lastMonthClasses ? 'up' : 'down';
  const classesDiff = stats.thisMonthClasses - stats.lastMonthClasses;
  const greeting = getGreeting();

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div>
          <motion.h2
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {greeting.emoji} {greeting.text}
          </motion.h2>
          <p>Here's what's happening with your academy today</p>
        </div>
        <div className="dash-header-actions">
          <Link to="/invoices" className="btn-primary quick-action-btn">
            <Plus size={18} />
            <span className="desk-text">New Invoice</span>
          </Link>
          <button className="sync-btn" onClick={fetchDashboardData} title="Refresh data">
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loader-full">
          <Loader2 className="animate-spin" size={48} style={{ color: '#2563eb' }} />
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
              delay={0}
            />
            <StatCard
              title="Total Revenue"
              value={`₹${stats.totalRevenue.toLocaleString()}`}
              icon={<DollarSign size={22} />}
              color="emerald"
              subtitle={`${stats.collectionRate}% collected`}
              trend="up"
              delay={1}
            />
            <StatCard
              title="Pending Payments"
              value={`₹${stats.unpaidRevenue.toLocaleString()}`}
              icon={<Clock size={22} />}
              color="amber"
              subtitle={`${stats.unpaidInvoices.length} invoices`}
              delay={2}
            />
            <StatCard
              title="This Month Classes"
              value={stats.thisMonthClasses}
              icon={<Calendar size={22} />}
              color="sky"
              subtitle={`${classesDiff >= 0 ? '+' : ''}${classesDiff} vs last month`}
              trend={classesTrend}
              delay={3}
            />
          </div>

          {/* Charts Row */}
          <div className="charts-row">
            {/* Revenue Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass card chart-card"
            >
              <div className="chart-header">
                <div>
                  <h4>💰 Revenue Trend</h4>
                  <span className="chart-period">Last 6 months</span>
                </div>
                <div className="chart-legend">
                  <span className="legend-item"><span className="legend-dot revenue" /> Total</span>
                  <span className="legend-item"><span className="legend-dot paid" /> Paid</span>
                </div>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.monthlyRevenue}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} stroke="var(--border-color)" />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} stroke="var(--border-color)" tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip
                      formatter={(value, name) => [`₹${value.toLocaleString()}`, name === 'revenue' ? 'Total' : 'Paid']}
                      contentStyle={{
                        borderRadius: 12,
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)'
                      }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="paid" stroke="#10b981" fillOpacity={1} fill="url(#colorPaid)" strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Top Students */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass card top-students-card"
            >
              <div className="card-header">
                <h4>🏆 Top Students</h4>
                <span className="card-subtitle">By attendance</span>
              </div>
              <div className="top-list">
                {stats.topStudents.length > 0 ? (
                  stats.topStudents.map((student, idx) => (
                    <motion.div
                      key={student.id}
                      className="top-item"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.08 }}
                    >
                      <div className={`rank-badge rank-${idx + 1}`}>{idx + 1}</div>
                      <div className="student-avatar">
                        {student.photo ? (
                          <img src={student.photo} alt={student.name} />
                        ) : (
                          <span>{student.name?.[0]}</span>
                        )}
                      </div>
                      <div className="student-info">
                        <strong>{student.name}</strong>
                        <span>{student.count} classes{student.course ? ` • ${student.course}` : ''}</span>
                      </div>
                      {idx === 0 && <Trophy size={18} className="trophy-icon" />}
                    </motion.div>
                  ))
                ) : (
                  <p className="empty-msg">No attendance data yet</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Bottom Row */}
          <div className="bottom-row">
            {/* Payment Reminders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass card reminders-card"
            >
              <div className="card-header">
                <h4>🔔 Payment Reminders</h4>
                <Link to="/invoices" className="view-all-link">
                  View All <ArrowRight size={14} />
                </Link>
              </div>
              <div className="reminders-list">
                {stats.unpaidInvoices.length > 0 ? (
                  stats.unpaidInvoices.map((inv, idx) => (
                    <motion.div
                      key={inv.id}
                      className="reminder-item"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                    >
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
                    </motion.div>
                  ))
                ) : (
                  <div className="all-paid">
                    <span className="all-paid-icon">✅</span>
                    <p>All payments collected!</p>
                    <span className="all-paid-sub">Great job keeping up with invoices</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass card actions-card"
            >
              <h4>⚡ Quick Actions</h4>
              <div className="actions-grid">
                <Link to="/students" className="action-tile indigo">
                  <div className="action-icon-circle indigo">
                    <Plus size={20} />
                  </div>
                  <span>Add Student</span>
                </Link>
                <Link to="/attendance" className="action-tile sky">
                  <div className="action-icon-circle sky">
                    <Calendar size={20} />
                  </div>
                  <span>Log Attendance</span>
                </Link>
                <Link to="/invoices" className="action-tile emerald">
                  <div className="action-icon-circle emerald">
                    <CreditCard size={20} />
                  </div>
                  <span>Generate Bill</span>
                </Link>
                <Link to="/analytics" className="action-tile violet">
                  <div className="action-icon-circle violet">
                    <TrendingUp size={20} />
                  </div>
                  <span>View Reports</span>
                </Link>
              </div>

              {/* Collection Rate Mini */}
              <div className="collection-rate-section">
                <div className="collection-header">
                  <Sparkles size={16} />
                  <span>Collection Rate</span>
                  <strong>{stats.collectionRate}%</strong>
                </div>
                <div className="collection-bar-bg">
                  <motion.div
                    className="collection-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.collectionRate}%` }}
                    transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}

      <style jsx="true">{`
        .dashboard { max-width: 1200px; margin: 0 auto; }

        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .dash-header h2 { margin: 0; font-size: 1.65rem; font-weight: 700; }
        .dash-header p { margin: 6px 0 0; color: var(--text-muted); font-size: 0.9rem; }

        .dash-header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .quick-action-btn {
          padding: 10px 20px;
          font-size: 0.9rem;
        }

        .sync-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.2s;
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
          gap: 18px;
          margin-bottom: 22px;
        }

        .stat-card { padding: 22px; background: var(--bg-card); transition: all 0.25s ease; }
        .stat-content { display: flex; align-items: flex-start; gap: 14px; }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon.indigo { background: rgba(37, 99, 235, 0.1); color: var(--primary); }
        .stat-icon.emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .stat-icon.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .stat-icon.sky { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; }
        .stat-icon.violet { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

        .stat-label { font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
        .stat-number { font-size: 1.65rem; font-weight: 800; margin: 4px 0 2px; }
        .stat-subtitle { 
          font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 3px;
          color: var(--text-muted);
        }
        .stat-subtitle.trend-up { color: var(--success); }
        .stat-subtitle.trend-down { color: var(--danger); }

        .charts-row {
          display: grid;
          grid-template-columns: 1.8fr 1fr;
          gap: 22px;
          margin-bottom: 22px;
        }

        .chart-card { padding: 24px; background: var(--bg-card); }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 18px;
        }
        .chart-header h4 { margin: 0; font-size: 1.05rem; }
        .chart-period { font-size: 0.78rem; color: var(--text-muted); }

        .chart-legend {
          display: flex;
          gap: 14px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-dot.revenue { background: #2563eb; }
        .legend-dot.paid { background: #10b981; }

        .top-students-card { padding: 24px; background: var(--bg-card); }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }
        .card-header h4 { margin: 0; font-size: 1.05rem; }
        .card-subtitle { font-size: 0.78rem; color: var(--text-muted); }

        .top-list { display: flex; flex-direction: column; gap: 10px; }

        .top-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: var(--bg-secondary);
          border-radius: 12px;
          transition: all 0.2s;
        }

        .top-item:hover {
          background: var(--bg-hover);
          transform: translateX(3px);
        }

        .rank-badge {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.72rem;
          flex-shrink: 0;
        }

        .rank-1 { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; }
        .rank-2 { background: linear-gradient(135deg, #94a3b8, #64748b); color: white; }
        .rank-3 { background: linear-gradient(135deg, #d97706, #b45309); color: white; }
        .rank-4, .rank-5 { background: rgba(37, 99, 235, 0.1); color: var(--primary); }

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
          flex-shrink: 0;
        }

        .student-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .student-info { flex: 1; min-width: 0; }
        .student-info strong { display: block; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .student-info span { font-size: 0.72rem; color: var(--text-muted); }

        .trophy-icon { color: #f59e0b; flex-shrink: 0; }

        .bottom-row {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 22px;
        }

        .reminders-card, .actions-card { padding: 24px; background: var(--bg-card); }

        .view-all-link {
          font-size: 0.82rem;
          color: var(--primary);
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: gap 0.2s;
        }

        .view-all-link:hover { gap: 8px; }

        .reminders-list { display: flex; flex-direction: column; gap: 10px; }

        .reminder-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(245, 158, 11, 0.06);
          border: 1px solid rgba(245, 158, 11, 0.15);
          border-radius: 12px;
          transition: all 0.2s;
        }

        .reminder-item:hover {
          border-color: rgba(245, 158, 11, 0.3);
          transform: translateX(2px);
        }

        .reminder-info { display: flex; align-items: center; gap: 10px; min-width: 0; }

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
          flex-shrink: 0;
        }

        .reminder-info strong { display: block; font-size: 0.88rem; }
        .reminder-info span { font-size: 0.72rem; color: var(--text-muted); }

        .whatsapp-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #25D366;
          color: white;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.78rem;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .whatsapp-btn:hover { background: #1da851; transform: translateY(-1px); }

        .all-paid {
          text-align: center;
          padding: 30px;
          color: var(--success);
        }

        .all-paid-icon { font-size: 2.2rem; display: block; margin-bottom: 10px; }
        .all-paid-sub { font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 4px; }

        .actions-card h4 { margin: 0 0 18px; font-size: 1.05rem; }

        .actions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }

        .action-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 20px 12px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 0.82rem;
          transition: all 0.2s;
        }

        .action-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .action-tile:hover .action-icon-circle {
          transform: scale(1.1);
        }

        .action-tile.indigo { background: rgba(37, 99, 235, 0.06); color: var(--primary); }
        .action-tile.sky { background: rgba(14, 165, 233, 0.06); color: #0ea5e9; }
        .action-tile.emerald { background: rgba(16, 185, 129, 0.06); color: #10b981; }
        .action-tile.violet { background: rgba(139, 92, 246, 0.06); color: #8b5cf6; }

        .action-icon-circle.indigo { background: rgba(37, 99, 235, 0.12); }
        .action-icon-circle.sky { background: rgba(14, 165, 233, 0.12); }
        .action-icon-circle.emerald { background: rgba(16, 185, 129, 0.12); }
        .action-icon-circle.violet { background: rgba(139, 92, 246, 0.12); }

        .action-tile:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }

        /* Collection Rate */
        .collection-rate-section {
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 12px;
        }

        .collection-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 0.82rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .collection-header strong {
          margin-left: auto;
          color: var(--primary);
          font-size: 1rem;
        }

        .collection-header svg {
          color: var(--primary);
        }

        .collection-bar-bg {
          width: 100%;
          height: 6px;
          border-radius: 6px;
          background: var(--border-color);
          overflow: hidden;
        }

        .collection-bar-fill {
          height: 100%;
          border-radius: 6px;
          background: linear-gradient(90deg, var(--primary), var(--accent-purple));
        }

        .empty-msg { text-align: center; color: var(--text-muted); padding: 20px; }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .charts-row, .bottom-row { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: 1fr; }
          .dash-header h2 { font-size: 1.3rem; }
          .desk-text { display: none; }
          .quick-action-btn { padding: 10px 14px; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
