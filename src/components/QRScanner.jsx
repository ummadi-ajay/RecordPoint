import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, QrCode, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QRScanner = ({ isOpen, onClose }) => {
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const scannerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && !scannerRef.current) {
            const scanner = new Html5QrcodeScanner('qr-reader', {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
            });

            scanner.render(
                (decodedText) => {
                    // Check if it's an invoice URL
                    if (decodedText.includes('/invoice/')) {
                        setScanResult(decodedText);
                        scanner.clear();
                    } else {
                        setError('This QR code is not a valid invoice');
                        setTimeout(() => setError(null), 3000);
                    }
                },
                (err) => {
                    // Ignore errors during scanning
                }
            );

            scannerRef.current = scanner;
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(() => { });
                scannerRef.current = null;
            }
        };
    }, [isOpen]);

    const handleOpenInvoice = () => {
        if (scanResult) {
            // Extract invoice ID from URL
            const invoiceId = scanResult.split('/invoice/')[1];
            if (invoiceId) {
                onClose();
                navigate(`/invoice/${invoiceId}`);
            } else {
                window.open(scanResult, '_blank');
            }
        }
    };

    const handleReset = () => {
        setScanResult(null);
        setError(null);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="scanner-overlay" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="scanner-modal"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="scanner-header">
                        <div className="scanner-title">
                            <QrCode size={24} />
                            <h3>Scan Invoice QR</h3>
                        </div>
                        <button className="close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="scanner-body">
                        {!scanResult ? (
                            <>
                                <div id="qr-reader" className="qr-reader" />
                                {error && (
                                    <div className="scan-error">
                                        {error}
                                    </div>
                                )}
                                <p className="scan-hint">
                                    <Camera size={16} />
                                    Point your camera at an invoice QR code
                                </p>
                            </>
                        ) : (
                            <div className="scan-success">
                                <div className="success-icon">✅</div>
                                <h4>Invoice Found!</h4>
                                <p className="scanned-url">{scanResult}</p>
                                <div className="success-actions">
                                    <button className="btn-primary" onClick={handleOpenInvoice}>
                                        <ExternalLink size={18} />
                                        Open Invoice
                                    </button>
                                    <button className="reset-btn" onClick={handleReset}>
                                        Scan Another
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            <style jsx="true">{`
        .scanner-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .scanner-modal {
          width: 100%;
          max-width: 420px;
          background: var(--bg-card);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
        }

        .scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .scanner-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--primary);
        }

        .scanner-title h3 {
          margin: 0;
          font-size: 1.2rem;
          color: var(--text-main);
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover { color: var(--danger); }

        .scanner-body {
          padding: 24px;
        }

        .qr-reader {
          border-radius: 12px;
          overflow: hidden;
        }

        #qr-reader video {
          border-radius: 12px;
        }

        #qr-reader__dashboard {
          padding: 10px 0 0 !important;
        }

        #qr-reader__dashboard button {
          background: var(--primary) !important;
          border: none !important;
          border-radius: 8px !important;
          padding: 10px 20px !important;
          color: white !important;
          font-weight: 600 !important;
          font-size: 0.9rem !important;
        }

        .scan-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .scan-error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 12px 20px;
          border-radius: 10px;
          text-align: center;
          margin-top: 15px;
          font-weight: 600;
        }

        .scan-success {
          text-align: center;
          padding: 30px 0;
        }

        .success-icon {
          font-size: 3rem;
          margin-bottom: 15px;
        }

        .scan-success h4 {
          margin: 0 0 10px;
          font-size: 1.3rem;
        }

        .scanned-url {
          font-size: 0.85rem;
          color: var(--text-muted);
          word-break: break-all;
          background: var(--bg-secondary);
          padding: 12px 16px;
          border-radius: 10px;
          margin: 15px 0 25px;
        }

        .success-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .success-actions .btn-primary {
          width: 100%;
          padding: 14px;
          font-size: 1rem;
        }

        .reset-btn {
          background: none;
          color: var(--text-muted);
          font-weight: 600;
          padding: 10px;
        }

        .reset-btn:hover { color: var(--primary); }
      `}</style>
        </AnimatePresence>
    );
};

export default QRScanner;
