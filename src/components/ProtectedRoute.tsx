import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return <LoadingScreen fullScreen message="Kimlik doğrulanıyor..." />;
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
