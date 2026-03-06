import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import QCPackagingStation from './pages/QCPackagingStation';
import Warehouse from './pages/Warehouse';
import Orders from './pages/Orders';
import Packaging from './pages/Packaging';
import Reports from './pages/Reports';
import Track from './pages/Track';
import Users from './pages/Users';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Public: Müşteri sipariş takibi */}
          <Route path="/track/:orderId" element={<Track />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scan" element={<Scanner />} />
            <Route path="/station/qc" element={<QCPackagingStation />} />
            <Route path="/warehouse" element={<Warehouse />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/packaging" element={<Packaging />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
