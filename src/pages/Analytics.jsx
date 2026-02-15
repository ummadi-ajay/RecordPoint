import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    Calendar,
    Loader2,
    RefreshCcw,
    DollarSign,
    Users,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Trophy,
    Target,
    PieChart
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, getDay } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { AnalyticsSkeleton } from '../components/Skeleton';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const Analytics = () => {
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [data, setData] = useState({
        students: [],
        invoices: [],
        attendance: [],
        calendarEvents: [],
        monthlyStats: [],
        courseDistribution: [],
        topStudents: []
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [studentsSnap, invoicesSnap, attendanceSnap] = await Promise.all([
                getDocs(collection(db, 'students')),
                getDocs(collection(db, 'invoices')),
                getDocs(collection(db, 'monthly_attendance'))
            ]);

            const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const attendance = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Process calendar events from attendance sessions
            const calendarEvents = [];
            attendance.forEach(att => {
                if (att.sessions) {
                    att.sessions.forEach(session => {
                        const student = students.find(s => s.id === att.studentId);
                        calendarEvents.push({
                            date: session.date,
                            topic: session.topic,
                            location: session.location,
                            studentName: student?.name || 'Unknown',
                            studentId: att.studentId
                        });
                    });
                }
            });

            // Monthly stats for last 6 months
            const monthlyStats = [];
            for (let i = 5; i >= 0; i--) {
                const d = subMonths(new Date(), i);
                const m = format(d, 'MM');
                const y = format(d, 'yyyy');

                const monthInvoices = invoices.filter(inv => inv.month === m && inv.year === y);
                const revenue = monthInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
                const paid = monthInvoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + (i.totalAmount || 0), 0);

                const monthAttendance = attendance.filter(att => att.month === m && att.year === y);
                const classes = monthAttendance.reduce((acc, att) => acc + (att.classCount || 0), 0);

                monthlyStats.push({
                    month: format(d, 'MMM'),
                    fullMonth: format(d, 'MMMM yyyy'),
                    revenue,
                    paid,
                    classes,
                    invoices: monthInvoices.length
                });
            }

            // Course distribution
            const courseCount = { Beginner: 0, Intermediate: 0, Advanced: 0 };
            students.forEach(s => {
                const course = s.course || 'Beginner';
                courseCount[course] = (courseCount[course] || 0) + 1;
            });
            const courseDistribution = Object.entries(courseCount).map(([name, value]) => ({ name, value }));

            // Top students by total classes
            const studentClasses = {};
            attendance.forEach(att => {
                if (!studentClasses[att.studentId]) {
                    studentClasses[att.studentId] = 0;
                }
                studentClasses[att.studentId] += att.classCount || 0;
            });

            const topStudents = Object.entries(studentClasses)
                .map(([id, classes]) => {
                    const student = students.find(s => s.id === id);
                    return { id, name: student?.name || 'Unknown', photo: student?.photo, classes };
                })
                .sort((a, b) => b.classes - a.classes)
                .slice(0, 10);

            setData({
                students,
                invoices,
                attendance,
                calendarEvents,
                monthlyStats,
                courseDistribution,
                topStudents
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Calendar helpers
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = getDay(monthStart);

    const getEventsForDay = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return data.calendarEvents.filter(e => e.date === dateStr);
    };

    // Summary stats
    const totalRevenue = data.invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
    const paidRevenue = data.invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + (i.totalAmount || 0), 0);
    const totalClasses = data.attendance.reduce((acc, a) => acc + (a.classCount || 0), 0);

    return (
        <div className="analytics-page">
            <div className="page-header">
                <div>
                    <h2>📊 Analytics & Reports</h2>
                    <p>Insights into your business performance</p>
                </div>
                <button className="sync-btn" onClick={fetchAllData}>
                    <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <AnalyticsSkeleton />
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="summary-cards">
                        <div className="summary-card revenue">
                            <div className="card-icon"><DollarSign size={24} /></div>
                            <div className="card-content">
                                <span className="card-label">Total Revenue</span>
                                <h3>₹{totalRevenue.toLocaleString()}</h3>
                                <span className="card-sub">₹{paidRevenue.toLocaleString()} collected</span>
                            </div>
                        </div>
                        <div className="summary-card students">
                            <div className="card-icon"><Users size={24} /></div>
                            <div className="card-content">
                                <span className="card-label">Total Students</span>
                                <h3>{data.students.length}</h3>
                                <span className="card-sub">Enrolled</span>
                            </div>
                        </div>
                        <div className="summary-card classes">
                            <div className="card-icon"><BookOpen size={24} /></div>
                            <div className="card-content">
                                <span className="card-label">Total Classes</span>
                                <h3>{totalClasses}</h3>
                                <span className="card-sub">All time</span>
                            </div>
                        </div>
                        <div className="summary-card invoices">
                            <div className="card-icon"><Target size={24} /></div>
                            <div className="card-content">
                                <span className="card-label">Collection Rate</span>
                                <h3>{totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0}%</h3>
                                <span className="card-sub">Of total billed</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="charts-row">
                        {/* Revenue Trend */}
                        <div className="glass card chart-card large">
                            <h4>💰 Revenue Trend (Last 6 Months)</h4>
                            <div className="chart-body">
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart data={data.monthlyStats}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${v / 1000}k`} />
                                        <Tooltip
                                            formatter={(value, name) => [`₹${value.toLocaleString()}`, name === 'revenue' ? 'Total' : 'Paid']}
                                            contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="revenue" stroke="#2563eb" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} name="revenue" />
                                        <Area type="monotone" dataKey="paid" stroke="#10b981" fillOpacity={1} fill="url(#colorPaid)" strokeWidth={2} name="paid" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Course Distribution */}
                        <div className="glass card chart-card">
                            <h4>📚 Course Distribution</h4>
                            <div className="chart-body pie-container">
                                <ResponsiveContainer width="100%" height={200}>
                                    <RePieChart>
                                        <Pie
                                            data={data.courseDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {data.courseDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </RePieChart>
                                </ResponsiveContainer>
                                <div className="pie-legend">
                                    {data.courseDistribution.map((item, idx) => (
                                        <div key={item.name} className="legend-item">
                                            <span className="legend-dot" style={{ background: COLORS[idx] }}></span>
                                            <span>{item.name}: {item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Calendar & Top Students */}
                    <div className="bottom-section">
                        {/* Attendance Calendar */}
                        <div className="glass card calendar-card">
                            <div className="calendar-header">
                                <h4>📅 Attendance Calendar</h4>
                                <div className="calendar-nav">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span>{format(currentMonth, 'MMMM yyyy')}</span>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="calendar-grid">
                                <div className="weekday">Sun</div>
                                <div className="weekday">Mon</div>
                                <div className="weekday">Tue</div>
                                <div className="weekday">Wed</div>
                                <div className="weekday">Thu</div>
                                <div className="weekday">Fri</div>
                                <div className="weekday">Sat</div>

                                {/* Empty cells for start of month */}
                                {[...Array(startDay)].map((_, i) => (
                                    <div key={`empty-${i}`} className="day empty"></div>
                                ))}

                                {/* Days of the month */}
                                {daysInMonth.map(day => {
                                    const events = getEventsForDay(day);
                                    const isToday = isSameDay(day, new Date());
                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={`day ${events.length > 0 ? 'has-events' : ''} ${isToday ? 'today' : ''}`}
                                            title={events.map(e => `${e.studentName}: ${e.topic}`).join('\n')}
                                        >
                                            <span className="day-num">{format(day, 'd')}</span>
                                            {events.length > 0 && (
                                                <span className="event-count">{events.length}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="calendar-legend">
                                <span><span className="dot today"></span> Today</span>
                                <span><span className="dot events"></span> Has Classes</span>
                            </div>
                        </div>

                        {/* Top Students */}
                        <div className="glass card top-students-card">
                            <h4>🏆 Top Students (All Time)</h4>
                            <div className="top-list">
                                {data.topStudents.length > 0 ? (
                                    data.topStudents.map((student, idx) => (
                                        <div key={student.id} className="top-item">
                                            <div className={`rank ${idx < 3 ? 'top-three' : ''}`}>{idx + 1}</div>
                                            <div className="student-avatar">
                                                {student.photo ? (
                                                    <img src={student.photo} alt={student.name} />
                                                ) : (
                                                    <span>{student.name?.[0]}</span>
                                                )}
                                            </div>
                                            <div className="student-info">
                                                <strong>{student.name}</strong>
                                                <span>{student.classes} classes</span>
                                            </div>
                                            {idx === 0 && <Trophy size={20} className="trophy" />}
                                        </div>
                                    ))
                                ) : (
                                    <p className="empty-msg">No attendance data yet</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Monthly Breakdown Table */}
                    <div className="glass card table-card">
                        <h4>📋 Monthly Breakdown</h4>
                        <table className="breakdown-table">
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th>Invoices</th>
                                    <th>Classes</th>
                                    <th>Total Billed</th>
                                    <th>Collected</th>
                                    <th>Pending</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.monthlyStats.map((month) => (
                                    <tr key={month.fullMonth}>
                                        <td><strong>{month.fullMonth}</strong></td>
                                        <td>{month.invoices}</td>
                                        <td>{month.classes}</td>
                                        <td>₹{month.revenue.toLocaleString()}</td>
                                        <td className="text-success">₹{month.paid.toLocaleString()}</td>
                                        <td className="text-warning">₹{(month.revenue - month.paid).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <style jsx="true">{`
        .analytics-page { max-width: 1200px; margin: 0 auto; }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 30px;
        }

        .page-header h2 { margin: 0; font-size: 1.75rem; font-weight: 700; }
        .page-header p { margin: 4px 0 0; color: var(--text-muted); }

        .sync-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: white;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .loader-full {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          gap: 16px;
          color: var(--text-muted);
        }

        /* Summary Cards */
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .summary-card {
          display: flex;
          gap: 15px;
          padding: 24px;
          border-radius: 16px;
          background: white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }

        .card-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .summary-card.revenue .card-icon { background: #f0f4ff; color: #2563eb; }
        .summary-card.students .card-icon { background: #ecfdf5; color: #10b981; }
        .summary-card.classes .card-icon { background: #fef3c7; color: #f59e0b; }
        .summary-card.invoices .card-icon { background: #fef2f2; color: #ef4444; }

        .card-label { font-size: 0.85rem; color: var(--text-muted); }
        .card-content h3 { margin: 4px 0; font-size: 1.75rem; font-weight: 800; }
        .card-sub { font-size: 0.75rem; color: var(--success); }

        /* Charts */
        .charts-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .chart-card { padding: 24px; background: white; }
        .chart-card h4 { margin: 0 0 20px; font-size: 1.1rem; }

        .pie-container { display: flex; flex-direction: column; align-items: center; }
        .pie-legend { display: flex; flex-direction: column; gap: 8px; margin-top: 15px; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
        .legend-dot { width: 12px; height: 12px; border-radius: 3px; }

        /* Bottom Section */
        .bottom-section {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        /* Calendar */
        .calendar-card { padding: 24px; background: white; }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .calendar-header h4 { margin: 0; }

        .calendar-nav {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .calendar-nav button {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f8fafc;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .calendar-nav span { font-weight: 700; min-width: 150px; text-align: center; }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .weekday {
          padding: 8px;
          text-align: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .day {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 0.85rem;
          position: relative;
          cursor: default;
        }

        .day.empty { background: none; }
        .day.today { background: #f0f4ff; color: var(--primary); font-weight: 700; }
        .day.has-events { background: #ecfdf5; }
        .day.has-events.today { background: linear-gradient(135deg, #f0f4ff 50%, #ecfdf5 50%); }

        .event-count {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 16px;
          height: 16px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          font-size: 0.6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .calendar-legend {
          display: flex;
          gap: 20px;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid var(--border-color);
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .calendar-legend .dot {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 4px;
          margin-right: 6px;
        }

        .dot.today { background: #f0f4ff; border: 1px solid var(--primary); }
        .dot.events { background: #ecfdf5; border: 1px solid #10b981; }

        /* Top Students */
        .top-students-card { padding: 24px; background: white; }
        .top-students-card h4 { margin: 0 0 20px; }

        .top-list { display: flex; flex-direction: column; gap: 10px; }

        .top-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: #f8fafc;
          border-radius: 10px;
        }

        .rank {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.75rem;
        }

        .rank.top-three { background: #fef3c7; color: #f59e0b; }

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

        .trophy { color: #f59e0b; }

        /* Table */
        .table-card { padding: 24px; background: white; }
        .table-card h4 { margin: 0 0 20px; }

        .breakdown-table { width: 100%; border-collapse: collapse; }
        .breakdown-table th {
          text-align: left;
          padding: 12px;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted);
          border-bottom: 2px solid var(--border-color);
        }

        .breakdown-table td { padding: 15px 12px; border-bottom: 1px solid var(--border-color); }
        .text-success { color: #10b981; font-weight: 700; }
        .text-warning { color: #f59e0b; font-weight: 700; }

        .empty-msg { text-align: center; color: var(--text-muted); padding: 20px; }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .summary-cards { grid-template-columns: repeat(2, 1fr); }
          .charts-row, .bottom-section { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    );
};

export default Analytics;
