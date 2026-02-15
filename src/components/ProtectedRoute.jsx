import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import { FileText } from 'lucide-react';

const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) return (
        <div className="splash-screen">
            <div className="splash-content">
                <div className="splash-logo-container">
                    <div className="splash-logo">
                        <FileText size={28} />
                    </div>
                    <div className="splash-pulse" />
                </div>
                <h2 className="splash-title">EduBill</h2>
                <div className="splash-loader">
                    <div className="splash-loader-bar" />
                </div>
                <p className="splash-text">Loading your workspace...</p>
            </div>

            <style jsx="true">{`
                .splash-screen {
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-main);
                    flex-direction: column;
                }

                .splash-content {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }

                .splash-logo-container {
                    position: relative;
                    margin-bottom: 8px;
                }

                .splash-logo {
                    width: 72px;
                    height: 72px;
                    border-radius: 22px;
                    background: linear-gradient(135deg, var(--primary), var(--primary-hover));
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 30px rgba(37, 99, 235, 0.3);
                    position: relative;
                    z-index: 1;
                    animation: splashBreath 2s ease-in-out infinite;
                }

                .splash-pulse {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 72px;
                    height: 72px;
                    border-radius: 22px;
                    background: var(--primary);
                    animation: splashPulse 2s ease-in-out infinite;
                    z-index: 0;
                }

                @keyframes splashBreath {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                @keyframes splashPulse {
                    0% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(1.8); }
                }

                .splash-title {
                    font-size: 1.6rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, var(--primary), var(--accent-purple));
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    margin: 0;
                    letter-spacing: -0.02em;
                }

                .splash-loader {
                    width: 120px;
                    height: 3px;
                    border-radius: 4px;
                    background: var(--border-color);
                    overflow: hidden;
                }

                .splash-loader-bar {
                    width: 40%;
                    height: 100%;
                    border-radius: 4px;
                    background: linear-gradient(90deg, var(--primary), var(--accent-purple));
                    animation: splashSlide 1.2s ease-in-out infinite;
                }

                @keyframes splashSlide {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(350%); }
                }

                .splash-text {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    margin: 0;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Layout>
            <Outlet />
        </Layout>
    );
};

export default ProtectedRoute;
