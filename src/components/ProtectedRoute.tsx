import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={40} style={{ color: 'var(--primary)' }} />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && profile) {
        const hasRole = profile.roles.includes('ADMIN') || profile.roles.some(r => allowedRoles.includes(r));
        if (!hasRole) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
