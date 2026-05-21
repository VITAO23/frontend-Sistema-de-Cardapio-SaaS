import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import CategoriesPage from '../pages/Categories';
import DashboardPage from '../pages/Dashboard';
import LoginPage from '../pages/Login';
import ProductsPage from '../pages/Products';
import ProfilePage from '../pages/Profile';
import PublicMenuPage from '../pages/PublicMenu';
import RestaurantDataPage from '../pages/RestaurantData';
import RegisterPage from '../pages/Register';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../hooks/useAuth';

export default function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/r/:slug" element={<PublicMenuPage />} />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/restaurant" element={<RestaurantDataPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
