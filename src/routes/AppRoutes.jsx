import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ParticipantDashboardPage from '../pages/dashboard/ParticipantDashboardPage';
import NotFoundPage from '../pages/not-found/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';

export const AppRoutes = () => {
  const { isAuthenticated, role } = useAuth();

  return (
    <Routes>
      {/* Root Route: Shows strictly Participant Login Form (or redirects if already logged in) */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            role === 'participant' ? (
              <Navigate to="/participant-dashboard" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <LoginPage mode="participant" />
          )
        }
      />

      {/* /login aliases to root participant portal */}
      <Route path="/login" element={<Navigate to="/" replace />} />

      {/* Dedicated Admin Portal Route (/admin-pannel-9234) */}
      <Route
        path="/admin-pannel-9234"
        element={
          isAuthenticated && role === 'admin' ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage mode="admin" />
          )
        }
      />
      {/* Single-n typo alias */}
      <Route
        path="/admin-panel-9234"
        element={<Navigate to="/admin-pannel-9234" replace />}
      />

      {/* Public Auth Helpers */}
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Authenticated Management / Admin Dashboard Route */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Authenticated Participant / Student Dashboard Route */}
      <Route
        path="/participant-dashboard"
        element={
          <ProtectedRoute requiredRole="participant">
            <ParticipantDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
