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
      {/* Root redirect: if authenticated go to respective dashboard, otherwise login */}
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
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Authenticated Management / Admin Dashboard Route */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Authenticated Participant / Student Dashboard Route */}
      <Route
        path="/participant-dashboard"
        element={
          <ProtectedRoute>
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

