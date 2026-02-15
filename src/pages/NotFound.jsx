import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, SearchX } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound = () => {
    return (
        <div className="not-found-page">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="not-found-content"
            >
                <div className="glitch-container">
                    <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="icon-float"
                    >
                        <SearchX size={64} strokeWidth={1.5} />
                    </motion.div>
                </div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="error-code"
                >
                    404
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="error-message"
                >
                    Oops! The page you're looking for doesn't exist or has been moved.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="error-actions"
                >
                    <Link to="/" className="btn-primary home-btn">
                        <Home size={18} />
                        Go to Dashboard
                    </Link>
                    <button className="back-btn" onClick={() => window.history.back()}>
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                </motion.div>

                {/* Floating orbs */}
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />
            </motion.div>

            <style jsx="true">{`
        .not-found-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          position: relative;
          overflow: hidden;
        }

        .not-found-content {
          text-align: center;
          max-width: 480px;
          position: relative;
          z-index: 2;
        }

        .glitch-container {
          margin-bottom: 24px;
        }

        .icon-float {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 120px;
          height: 120px;
          border-radius: 32px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(139, 92, 246, 0.15) 100%);
          color: var(--primary);
          box-shadow: 0 8px 32px rgba(37, 99, 235, 0.15);
        }

        .error-code {
          font-size: 7rem;
          font-weight: 900;
          line-height: 1;
          margin: 0 0 16px;
          background: linear-gradient(135deg, var(--primary), var(--accent-purple), var(--accent-pink));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          letter-spacing: -4px;
        }

        .error-message {
          font-size: 1.1rem;
          color: var(--text-muted);
          margin: 0 0 36px;
          line-height: 1.7;
        }

        .error-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .home-btn {
          padding: 14px 28px;
          font-size: 0.95rem;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: var(--bg-card);
          color: var(--text-muted);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .back-btn:hover {
          color: var(--text-main);
          border-color: var(--text-muted);
          transform: translateY(-2px);
        }

        /* Floating orbs */
        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          pointer-events: none;
          z-index: 0;
        }

        .orb-1 {
          width: 300px;
          height: 300px;
          background: var(--primary);
          top: 10%;
          left: 10%;
          animation: float1 8s ease-in-out infinite;
        }

        .orb-2 {
          width: 250px;
          height: 250px;
          background: var(--accent-purple);
          bottom: 15%;
          right: 10%;
          animation: float2 10s ease-in-out infinite;
        }

        .orb-3 {
          width: 200px;
          height: 200px;
          background: var(--accent-pink);
          top: 50%;
          left: 60%;
          animation: float3 12s ease-in-out infinite;
        }

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }

        @keyframes float2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-25px, 25px); }
        }

        @keyframes float3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 20px); }
        }
      `}</style>
        </div>
    );
};

export default NotFound;
