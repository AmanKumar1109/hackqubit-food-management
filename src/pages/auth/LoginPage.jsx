import React from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import LoginForm from '../../components/auth/LoginForm';

export const LoginPage = ({ mode = 'participant' }) => {
  return (
    <AuthLayout>
      <LoginForm mode={mode} />
    </AuthLayout>
  );
};

export default LoginPage;
