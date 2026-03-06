import { Navigate, Outlet } from 'react-router-dom';

// Simple mock auth for demonstration purposes
const ProtectedRoute = () => {
    // In a real implementation we would check the Supabase Session Context here
    const isAuthenticated = localStorage.getItem('mock_token') !== null;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
