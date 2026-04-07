import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Yükleniyor...', fullScreen = false }) => {
    const containerStyle: React.CSSProperties = fullScreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)',
        backgroundImage: 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)',
        backgroundAttachment: 'fixed',
        zIndex: 9999,
        gap: '1.5rem',
        color: 'white'
    } : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        gap: '1rem',
        width: '100%'
    };

    return (
        <div style={containerStyle} className="animate-fade-in">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ 
                    position: 'absolute', 
                    width: '100px', height: '100px', 
                    borderRadius: '50%', 
                    border: '2px solid var(--primary)', 
                    opacity: 0.15,
                    animation: 'pulse 2s infinite' 
                }} />
                <Loader2 className="animate-spin" size={40} color="var(--primary)" />
            </div>
            <p style={{ 
                fontSize: '0.9rem', 
                fontWeight: 500, 
                color: fullScreen ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                letterSpacing: '0.5px'
            }}>{message}</p>
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(1.6); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
