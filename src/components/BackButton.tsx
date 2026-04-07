import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
    path?: string;
    onClick?: () => void;
    label?: string;
    variant?: 'default' | 'white';
}

const BackButton: React.FC<BackButtonProps> = ({ 
    path, 
    onClick, 
    label = 'Geri', 
    variant = 'default' 
}) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (onClick) {
            onClick();
        }
        if (path) {
            navigate(path);
        } else if (!onClick) {
            navigate(-1);
        }
    };

    const style: React.CSSProperties = {
        background: 'none',
        border: 'none',
        color: variant === 'white' ? 'white' : 'var(--text-main)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: 500,
        transition: 'all 0.2s ease',
        marginLeft: '-0.75rem' // Align with text below
    };

    return (
        <button 
            onClick={handleClick} 
            style={style}
            className="back-button-hover"
        >
            <ArrowLeft size={18} />
            <span>{label}</span>
            <style>{`
                .back-button-hover:hover {
                    background-color: ${variant === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
                    transform: translateX(-2px);
                }
            `}</style>
        </button>
    );
};

export default BackButton;
