import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Menu from '../pages/Menu/Menu';
import Login from '../pages/Login/Login';
import Cadastro from '../pages/Cadastro/Cadastro';
import Home from '../pages/Home/Home';
import Configuracoes from '../pages/Configuracoes/Configuracoes';
import Quartos from '../features/quarto/pages/Quartos';
import RegisterQuarto from '../features/quarto/pages/RegisterQuarto';
import TiposQuarto from '../features/quarto/pages/TiposQuarto';
import ReservasAdmin from '../features/reserva/pages/ReservasAdmin';
import MinhasReservas from '../pages/MinhasReservas/MinhasReservas';
import Servicos from '../pages/Servicos/Servicos';
import Contato from '../pages/Contato/Contato';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return isAdmin ? children : <Navigate to="/home" replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter basename="/20261prj5/hotel">
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        {/* Cliente */}
        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/configuracoes" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />
        <Route path="/reservas" element={<PrivateRoute><MinhasReservas /></PrivateRoute>} />
        {/* Admin */}
        <Route path="/admin/quartos" element={<AdminRoute><Quartos /></AdminRoute>} />
        <Route path="/admin/quartos/novo" element={<AdminRoute><RegisterQuarto /></AdminRoute>} />
        <Route path="/admin/quartos/:id/editar" element={<AdminRoute><RegisterQuarto /></AdminRoute>} />
        <Route path="/admin/tipos-quarto" element={<AdminRoute><TiposQuarto /></AdminRoute>} />
        <Route path="/admin/reservas" element={<AdminRoute><ReservasAdmin /></AdminRoute>} />
        {/* Públicas */}
        <Route path="/servicos" element={<Servicos />} />
        <Route path="/contato" element={<Contato />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
