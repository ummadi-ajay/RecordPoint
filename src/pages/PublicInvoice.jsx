import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Printer,
  Loader2,
  MessageCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

import { INSTITUTE_DETAILS } from '../config/institute';

const numberToWords = (num) => {
  const a = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' THOUSAND' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' LAKH' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return 'WAY TOO BIG';
  };

  const roundedNum = Math.floor(num);
  return (convert(roundedNum) + ' RUPEES ONLY').trim();
};

const PublicInvoice = () => {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [labDetails, setLabDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const invoiceRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Invoice
        const invRef = doc(db, 'invoices', invoiceId);
        const invSnap = await getDoc(invRef);

        if (!invSnap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const invData = { id: invSnap.id, ...invSnap.data() };
        setInvoice(invData);

        // 2. Fetch Lab Details from settings
        const settingsRef = doc(db, 'settings', 'business');
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          const settings = settingsSnap.data();
          const firstBank = settings.bankAccounts?.[0] || INSTITUTE_DETAILS.bank;
          setLabDetails({
            name: settings.businessName || INSTITUTE_DETAILS.name,
            tagline: settings.tagline || INSTITUTE_DETAILS.tagline,
            address: settings.address || INSTITUTE_DETAILS.address,
            email: settings.email || INSTITUTE_DETAILS.email,
            phone: settings.phone || INSTITUTE_DETAILS.phone,
            website: settings.website || INSTITUTE_DETAILS.website,
            gstin: settings.gstin || INSTITUTE_DETAILS.gstin,
            pan: settings.pan || INSTITUTE_DETAILS.pan,
            bank: invData.bankSnapshot || firstBank,
            upiId: invData.bankSnapshot?.upiId || firstBank.upiId || settings.upiId || INSTITUTE_DETAILS.bank.upiId
          });
        } else {
          setLabDetails(INSTITUTE_DETAILS);
        }

      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [invoiceId]);

  if (loading) return (
    <div className="loader-screen">
      <Loader2 className="animate-spin" size={48} style={{ color: '#f97316' }} />
      <p>Loading invoice...</p>
    </div>
  );

  if (notFound) return (
    <div className="error-screen">
      <div className="error-card">
        <h2>Invoice Not Found</h2>
        <p>This invoice may have been deleted or the link is incorrect.</p>
      </div>
    </div>
  );

  const student = invoice.studentSnapshot;
  const isPaid = invoice.status === 'Paid';
  const createdAt = new Date(invoice.createdAt);
  const dueDate = addDays(createdAt, 7);

  const handlePrint = () => window.print();

  const shareOnWhatsApp = () => {
    const message = `Invoice for ${student.name}: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
      {/* Action Bar */}
      <div className="action-bar no-print">
        <div className="bar-inner">
          <div className={`status-pill ${isPaid ? 'paid' : 'unpaid'}`}>
            {isPaid ? <CheckCircle size={16} /> : <Clock size={16} />}
            {isPaid ? 'PAID' : 'UNPAID'}
          </div>
          <div className="actions">
            <button onClick={shareOnWhatsApp} className="btn-wa"><MessageCircle size={18} /> Share</button>
            <button onClick={handlePrint} className="btn-sec"><Printer size={18} /> Print</button>
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="invoice-paper" ref={invoiceRef}>
        {/* Header Section */}
        <div className="doc-header">
          <div className="header-left">
            <h1 className="main-title">Invoice for MakerWorks Robotics Program</h1>
            <div className="meta-grid">
              <div className="meta-item">
                <span className="label">Invoice No #</span>
                <span className="value strong">{invoice.customInvoiceNo || invoice.id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="meta-item">
                <span className="label">Invoice Date</span>
                <span className="value">{format(createdAt, 'MMM dd, yyyy')}</span>
              </div>
              <div className="meta-item">
                <span className="label">Due Date</span>
                <span className="value">{format(dueDate, 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <div className="logo-box">
              <span className="logo-main">Maker</span>
              <span className="logo-sub">Works</span>
              <div className="logo-tag">MAKE ANYTHING HERE</div>
            </div>
          </div>
        </div>

        {/* Addresses Section */}
        <div className="address-section">
          <div className="address-box">
            <h3 className="box-title">Billed By</h3>
            <div className="box-content">
              <strong>{labDetails?.name}</strong>
              <p>{labDetails?.address}</p>
              {labDetails?.gstin && <p><strong>GSTIN:</strong> {labDetails.gstin}</p>}
              {labDetails?.pan && <p><strong>PAN:</strong> {labDetails.pan}</p>}
              {labDetails?.email && <p><strong>Email:</strong> {labDetails.email}</p>}
              {labDetails?.phone && <p><strong>Phone:</strong> {labDetails.phone}</p>}
              {labDetails?.website && <p><strong>Website:</strong> {labDetails.website}</p>}
            </div>
          </div>
          <div className="address-box">
            <h3 className="box-title">Billed To</h3>
            <div className="box-content">
              <strong>{student.parentName || student.name}</strong>
              <p>{student.address || 'Not Provided'}</p>
              <p><strong>Email:</strong> {student.email || '-'}</p>
              <p><strong>Phone:</strong> {student.phone || '-'}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th width="50">#</th>
                <th>Item</th>
                <th width="100">Hours</th>
                <th width="120">Rate/Hour</th>
                <th width="120">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1.</td>
                <td>
                  <div className="item-name">MakerWorks Foundation Level Maker Program</div>
                  <div className="item-desc">Fee Period : {format(createdAt, 'dd MMM yyyy')} - {format(addDays(createdAt, 22), 'dd MMM yyyy')}</div>
                </td>
                <td>{invoice.classCount || 8}</td>
                <td>₹{invoice.ratePerClass || 999}</td>
                <td>₹{invoice.totalAmount?.toLocaleString()}.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Details */}
        <div className="doc-footer">
          <div className="footer-left">
            <div className="bank-card">
              <h4 className="footer-title">Bank Details</h4>
              <div className="bank-grid">
                <span className="label">Account Name</span> <span className="value strong">{labDetails?.bank?.accountName}</span>
                <span className="label">Account Number</span> <span className="value strong">{labDetails?.bank?.accountNumber}</span>
                <span className="label">IFSC</span> <span className="value strong">{labDetails?.bank?.ifsc}</span>
                <span className="label">Account Type</span> <span className="value">{labDetails?.bank?.accountType}</span>
                <span className="label">Bank</span> <span className="value">{labDetails?.bank?.bankName}</span>
              </div>
            </div>
          </div>

          <div className="footer-mid">
            <div className="upi-box">
              <span className="upi-label">Scan to pay via UPI</span>
              <div className="qr-container">
                <QRCodeSVG
                  value={`upi://pay?pa=${labDetails?.upiId}&pn=${labDetails?.name}&am=${invoice.totalAmount}&cu=INR`}
                  size={100}
                />
              </div>
              <span className="upi-id">{labDetails?.upiId}</span>
              <span className="upi-hint">Maximum of 1 lakh can be transferred via upi in a single day</span>
            </div>
          </div>

          <div className="footer-right">
            <div className="summary-block">
              <div className="total-row">
                <span className="total-label">Sub Total</span>
                <span className="total-value">₹{(invoice.totalAmount - (invoice.adjustment || 0)).toLocaleString()}.00</span>
              </div>
              {invoice.adjustment !== 0 && (
                <div className="total-row adjustment">
                  <span className="total-label">{invoice.adjLabel || (invoice.adjustment > 0 ? 'Additional Fee' : 'Discount')}</span>
                  <span className="total-value">{invoice.adjustment > 0 ? '+' : ''}{invoice.adjustment?.toLocaleString()}.00</span>
                </div>
              )}
              <div className="total-row main-total">
                <span className="total-label">Total (INR)</span>
                <span className="total-value">₹{invoice.totalAmount?.toLocaleString()}.00</span>
              </div>
            </div>

            <div className="words-box">
              <span className="words-label">Total in words:</span>
              <span className="words-value">{numberToWords(invoice.totalAmount)}</span>
            </div>

            <div className="sig-section">
              <div className="sig-line"></div>
              <span className="sig-text">Authorised Signatory</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .page-container {
          min-height: 100vh;
          background: #f8fafc;
          padding: 100px 15px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .action-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: auto;
          min-height: 70px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          box-shadow: 0 1px 10px rgba(0,0,0,0.05);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 0;
        }

        .bar-inner {
          width: 100%;
          max-width: 1000px;
          padding: 0 20px;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 99px;
          font-weight: 700;
          font-size: 0.9rem;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }
        .status-pill.paid { background: #dcfce7; color: #166534; }
        .status-pill.unpaid { background: #fee2e2; color: #991b1b; }

        .actions { 
          display: flex; 
          gap: 10px; 
          flex-wrap: wrap;
          justify-content: center;
        }
        .btn-pri, .btn-sec, .btn-wa { 
          padding: 10px 18px; 
          border-radius: 10px; 
          font-weight: 600; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          transition: all 0.2s;
          font-size: 0.9rem;
          border: none;
        }
        .btn-pri { background: #f97316; color: white; }
        .btn-pri:hover { background: #ea580c; transform: translateY(-1px); }
        .btn-sec { background: white; border: 1px solid #e2e8f0; color: #475569; }
        .btn-sec:hover { background: #f8fafc; border-color: #cbd5e1; }
        .btn-wa { background: #22c55e; color: white; }
        .btn-wa:hover { background: #16a34a; transform: translateY(-1px); }

        .invoice-paper {
          width: 100%;
          max-width: 210mm;
          min-height: 297mm;
          background: white;
          padding: 15mm;
          box-shadow: 0 20px 50px rgba(0,0,0,0.08);
          position: relative;
          color: #1e293b;
          margin-bottom: 40px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 2px solid #f97316;
          padding-bottom: 30px;
          gap: 20px;
        }

        .header-left { 
          flex: 1; 
        }

        .header-right {
          flex-shrink: 0;
        }

        .main-title {
          font-size: clamp(1.5rem, 4vw, 2.2rem);
          color: #f97316;
          margin: 0 0 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 15px 30px;
        }

        .meta-item { display: flex; flex-direction: column; }
        .meta-item .label { color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .meta-item .value { font-size: 1rem; font-weight: 600; color: #0f172a; }
        .meta-item .strong { color: #f97316; font-size: 1.2rem; }

        .logo-box {
          text-align: right;
          background: #0f172a;
          color: white;
          padding: 15px 25px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 180px;
          flex-shrink: 0;
        }

        .logo-main { font-size: 2.2rem; font-weight: 900; line-height: 0.8; letter-spacing: -1.5px; }
        .logo-sub { font-size: 2.2rem; font-weight: 900; line-height: 0.8; letter-spacing: -1.5px; margin-bottom: 8px; color: #f97316; }
        .logo-tag { font-size: 0.6rem; letter-spacing: 1.5px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 6px; width: 100%; text-align: center; }

        .address-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .address-box {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }

        .box-title {
          color: #f97316;
          margin: 0 0 12px;
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .box-content { font-size: 0.95rem; line-height: 1.6; color: #334155; }
        .box-content strong { color: #0f172a; }
        .box-content p { margin: 2px 0; }

        .table-container { margin-bottom: 40px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .items-table {
          width: 100%;
          min-width: 600px;
          border-collapse: separate;
          border-spacing: 0;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .items-table th {
          background: #0f172a;
          color: white;
          padding: 14px;
          text-align: left;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .items-table td {
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.95rem;
        }

        .item-name { font-weight: 700; color: #0f172a; margin-bottom: 4px; font-size: 1rem; }
        .item-desc { font-size: 0.85rem; color: #64748b; font-style: italic; }

        .doc-footer {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 25px;
          align-items: start;
        }

        .bank-card {
          background: #fff7ed;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #ffedd5;
        }

        .footer-title { color: #c2410c; margin: 0 0 15px; font-size: 0.95rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        
        .bank-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 8px 12px;
          font-size: 0.85rem;
        }
        .bank-grid .label { color: #9a3412; font-weight: 600; }
        .bank-grid .value { color: #1e293b; }

        .upi-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: white;
          padding: 15px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .upi-label { color: #0f172a; font-size: 0.85rem; font-weight: 700; margin-bottom: 10px; text-transform: uppercase; }
        .qr-container { padding: 10px; background: white; border: 1.5px solid #f1f5f9; border-radius: 10px; margin-bottom: 10px; }
        .upi-id { font-size: 0.95rem; font-weight: 700; color: #f97316; margin-bottom: 6px; }
        .upi-hint { font-size: 0.65rem; color: #64748b; line-height: 1.4; max-width: 180px; }

        .summary-block {
          background: #0f172a;
          color: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .total-row.main-total { border-top: 1px solid #334155; padding-top: 12px; margin-top: 12px; }
        
        .total-label { font-size: 0.85rem; color: #94a3b8; font-weight: 500; }
        .total-value { font-size: 1rem; font-weight: 600; }
        .main-total .total-label { font-size: 1.1rem; color: white; font-weight: 800; }
        .main-total .total-value { font-size: 1.6rem; color: #f97316; font-weight: 900; }

        .words-box {
          margin-bottom: 30px;
          text-align: right;
          padding: 0 5px;
        }
        .words-label { display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
        .words-value { font-size: 0.85rem; color: #1e293b; font-weight: 700; font-style: italic; line-height: 1.4; }

        .sig-section {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-top: 45px;
          text-align: right;
        }
        .sig-line { width: 220px; border-bottom: 2px solid #0f172a; margin-bottom: 8px; }
        .sig-text { font-size: 0.85rem; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }

        @media screen and (max-width: 768px) {
          .page-container { padding-top: 140px; }
          .invoice-paper { padding: 8mm; margin-bottom: 20px; }
          .meta-grid { grid-template-columns: 1fr 1fr; }
          .logo-box { order: -1; width: 100%; text-align: center; align-items: center; }
          .doc-header { flex-direction: column; align-items: flex-start; }
          .doc-footer { grid-template-columns: 1fr; }
          .header-right { width: 100%; }
        }

        @media screen and (max-width: 480px) {
          .meta-grid { grid-template-columns: 1fr; }
          .main-title { font-size: 1.4rem; }
          .actions .btn-pri, .actions .btn-sec, .actions .btn-wa { padding: 8px 12px; font-size: 0.8rem; }
          .status-pill { font-size: 0.8rem; padding: 6px 12px; }
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .page-container { 
            padding: 0 !important; 
            background: white !important; 
            display: block !important;
            min-height: auto !important;
          }
          .invoice-paper { 
            box-shadow: none !important; 
            margin: 0 !important; 
            width: 210mm !important; 
            height: 297mm !important; 
            padding: 10mm 12mm !important;
            box-sizing: border-box !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            display: block !important;
            overflow: hidden !important;
          }
          .doc-header { 
            margin-bottom: 20px !important; 
            padding-bottom: 20px !important; 
            gap: 20px !important;
          }
          .main-title { font-size: 1.8rem !important; margin-bottom: 10px !important; }
          .logo-box { padding: 12px 24px !important; min-width: 150px !important; }
          .logo-main, .logo-sub { font-size: 2rem !important; }
          
          .address-section { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr !important; 
            margin-bottom: 25px !important;
            gap: 20px !important;
          }
          .address-box { padding: 15px 18px !important; }
          .box-title { font-size: 1rem !important; margin-bottom: 10px !important; }
          .box-content { font-size: 0.9rem !important; }

          .table-container { margin-bottom: 25px !important; }
          .items-table th { padding: 12px !important; font-size: 0.8rem !important; }
          .items-table td { padding: 15px 12px !important; font-size: 0.9rem !important; }
          .item-name { font-size: 1rem !important; }

          .doc-footer { 
            display: grid !important; 
            grid-template-columns: 1.1fr 0.9fr 1.5fr !important; 
            margin-top: 0 !important; 
            gap: 20px !important;
            padding-top: 15px !important;
          }
          .bank-card { padding: 15px !important; }
          .summary-block { padding: 15px !important; margin-bottom: 10px !important; }
          .main-total .total-value { font-size: 1.4rem !important; }
          .upi-box { padding: 10px !important; }
          .qr-container { padding: 8px !important; margin-bottom: 5px !important; }
          .qr-container svg { width: 80px !important; height: 80px !important; }
          
          .words-box { margin-bottom: 20px !important; text-align: right !important; }
          .words-value { font-size: 0.75rem !important; }
          .sig-section { 
            margin-top: 45px !important; 
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
            text-align: right !important;
          }
          .sig-line { width: 220px !important; }
        }
      `}</style>
    </motion.div>
  );
};

export default PublicInvoice;

