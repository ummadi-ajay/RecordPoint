import React, { createContext, useContext, useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const OnlineContext = createContext();

export const useOnline = () => {
    const context = useContext(OnlineContext);
    if (!context) {
        throw new Error('useOnline must be used within an OnlineProvider');
    }
    return context;
};

export const OnlineProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowBanner(true);
            setTimeout(() => setShowBanner(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <OnlineContext.Provider value={{ isOnline }}>
            {children}

            {/* Offline/Online Banner */}
            {showBanner && (
                <div className={`network-banner ${isOnline ? 'online' : 'offline'}`}>
                    {isOnline ? (
                        <>
                            <Wifi size={18} />
                            <span>You're back online!</span>
                        </>
                    ) : (
                        <>
                            <WifiOff size={18} />
                            <span>You're offline. Some features may not work.</span>
                        </>
                    )}
                </div>
            )}

            <style jsx="true">{`
        .network-banner {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 24px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.9rem;
          z-index: 9999;
          animation: slideUp 0.3s ease;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .network-banner.online {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .network-banner.offline {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
        </OnlineContext.Provider>
    );
};
