import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Download,
  Printer,
  Loader2,
  MessageCircle,
  Clock,
  CheckCircle,
  FileText
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import html2pdf from 'html2pdf.js';

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
  const [downloading, setDownloading] = useState(false);
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

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const element = invoiceRef.current;
      const opt = {
        margin: 5,
        filename: `Invoice_${invoiceId.slice(-6).toUpperCase()}_${student.name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
      alert('PDF generation failed.');
    } finally {
      setDownloading(false);
    }
  };

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
            <button onClick={handleDownloadPDF} disabled={downloading} className="btn-pri">
              {downloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              {downloading ? 'Please wait...' : 'Download PDF'}
            </button>
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
                <span>Account Name</span> <span className="strong">{labDetails?.bank?.accountName}</span>
                <span>Account Number</span> <span className="strong">{labDetails?.bank?.accountNumber}</span>
                <span>IFSC</span> <span className="strong">{labDetails?.bank?.ifsc}</span>
                <span>Account Type</span> <span>{labDetails?.bank?.accountType}</span>
                <span>Bank</span> <span>{labDetails?.bank?.bankName}</span>
              </div>
            </div>
          </div>

          <div className="footer-mid">
            <div className="upi-box">
              <span className="upi-label">Scan to pay via UPI</span>
              <span className="upi-hint">Maximum of 1 lakh can be transferred via upi in a single day</span>
              <div className="qr-container">
                <QRCodeSVG
                  value={`upi://pay?pa=${labDetails?.upiId}&pn=${labDetails?.name}&am=${invoice.totalAmount}&cu=INR`}
                  size={100}
                />
              </div>
              <span className="upi-id">{labDetails?.upiId}</span>
            </div>
          </div>

          <div className="footer-right">
            <div className="total-block">
              <div className="total-row main">
                <span>Total (INR)</span>
                <span className="amount">₹{invoice.totalAmount?.toLocaleString()}.00</span>
              </div>
            </div>

            <div className="sig-section">
              <div className="sig-line"></div>
              <span>Authorised Signatory</span>
            </div>

            <div className="words-box">
              <strong>Total (in words) : </strong>
              <span>{numberToWords(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .page-container {
          min-height: 100vh;
          background: #f1f5f9;
          padding: 80px 20px 40px;
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
          height: 64px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bar-inner {
          width: 100%;
          max-width: 900px;
          padding: 0 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-radius: 99px;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .status-pill.paid { background: #dcfce7; color: #15803d; }
        .status-pill.unpaid { background: #fee2e2; color: #b91c1c; }

        .actions { display: flex; gap: 12px; }
        .btn-pri { background: #f97316; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-sec { background: white; border: 1px solid #e2e8f0; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-wa { background: #25d366; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }

        .invoice-paper {
          width: 100%;
          max-width: 900px;
          background: white;
          padding: 50px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.05);
          position: relative;
          color: #374151;
        }

        .doc-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }

        .main-title {
          font-size: 2.2rem;
          color: #f97316;
          margin: 0 0 20px;
          font-weight: 400;
        }

        .meta-grid {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .meta-item { display: flex; gap: 10px; font-size: 1.1rem; }
        .meta-item .label { color: #6b7280; width: 120px; }
        .meta-item .strong { font-weight: 700; color: #111827; }

        .logo-box {
          text-align: right;
          background: black;
          color: white;
          padding: 15px 25px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 180px;
        }

        .logo-main { 
          font-size: 2.8rem; 
          font-weight: 900; 
          line-height: 0.9; 
          letter-spacing: -1px;
        }
        
        .logo-sub { 
          font-size: 2.8rem; 
          font-weight: 900; 
          line-height: 0.9; 
          letter-spacing: -1px;
          margin-bottom: 5px;
        }
        .logo-tag { font-size: 0.6rem; letter-spacing: 0.1em; color: #9ca3af; border-top: 1px solid #374151; padding-top: 5px; }

        .address-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }

        .address-box {
          background: #fff7ed;
          border-radius: 8px;
          padding: 24px;
        }

        .box-title {
          color: #f97316;
          margin: 0 0 15px;
          font-size: 1.5rem;
          font-weight: 500;
        }

        .box-content { font-size: 0.95rem; line-height: 1.6; }
        .box-content p { margin: 2px 0; }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }

        .items-table th {
          background: #f97316;
          color: white;
          padding: 12px 15px;
          text-align: left;
          font-size: 1.1rem;
          font-weight: 500;
        }

        .items-table td {
          padding: 20px 15px;
          border-bottom: 1px solid #f97316;
          background: #fffafa;
        }

        .item-name { font-size: 1.1rem; font-weight: 500; margin-bottom: 8px; }
        .item-desc { font-size: 0.9rem; color: #6b7280; }

        .doc-footer {
          display: flex;
          gap: 20px;
        }

        .footer-left { flex: 1.2; }
        .footer-mid { flex: 0.8; display: flex; justify-content: center; }
        .footer-right { flex: 1.5; text-align: right; }

        .bank-card {
          background: #fff7ed;
          padding: 20px;
          border-radius: 8px;
        }

        .footer-title { color: #f97316; margin: 0 0 15px; font-size: 1.1rem; }
        
        .bank-grid {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 5px 10px;
          font-size: 0.9rem;
        }

        .upi-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .upi-label { color: #f97316; font-size: 0.9rem; margin-bottom: 4px; }
        .upi-hint { font-size: 0.65rem; color: #6b7280; max-width: 140px; margin-bottom: 10px; }
        .qr-container { padding: 10px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px; }
        .upi-id { font-size: 0.9rem; font-weight: 500; }

        .total-block {
          border-top: 2px solid black;
          border-bottom: 2px solid black;
          padding: 15px 0;
          margin-bottom: 30px;
        }

        .total-row { display: flex; justify-content: space-between; font-size: 1.4rem; font-weight: 700; }
        
        .sig-section {
          margin-bottom: 30px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .sig-line { width: 250px; border-bottom: 1px solid black; margin-bottom: 8px; }
        .sig-section span { font-size: 0.9rem; color: #374151; font-weight: 500; }

        .words-box {
          font-size: 0.85rem;
          line-height: 1.4;
          text-transform: uppercase;
        }

        @media print {
          .no-print { display: none !important; }
          .page-container { padding: 0; background: white; }
          .invoice-paper { box-shadow: none; max-width: none; padding: 20px; width: 210mm; min-height: 297mm; }
        }
      `}</style>
    </motion.div>
  );
};

export default PublicInvoice;

