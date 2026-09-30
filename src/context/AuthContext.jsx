import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check initial user in storage
    const savedUser = authService.getCurrentUser() || JSON.parse(sessionStorage.getItem('arcana_auth_user') || 'null');
    if (savedUser) {
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    setError(null);
    try {
      const loggedIn = await authService.signIn(credentials);
      setUser(loggedIn);
      return loggedIn;
    } catch (err) {
      setError(err.message || 'Failed to sign in');
      throw err;
    }
  };

  const register = async (data) => {
    setError(null);
    try {
      const newUser = await authService.signUp(data);
      setUser(newUser);
      return newUser;
    } catch (err) {
      setError(err.message || 'Failed to sign up');
      throw err;
    }
  };

  const socialLogin = async (provider) => {
    setError(null);
    try {
      const loggedIn = await authService.socialSignIn(provider);
      setUser(loggedIn);
      return loggedIn;
    } catch (err) {
      setError(err.message || 'Social sign-in failed');
      throw err;
    }
  };

  const claimMeal = async (specialId, mealType) => {
    try {
      const updated = await authService.claimMeal(specialId, mealType, user);
      setUser(updated);
      return updated;
    } catch (err) {
      console.error('Failed to claim meal:', err);
    }
  };

  const logout = async () => {
    await authService.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        loading,
        error,
        setError,
        login,
        register,
        socialLogin,
        claimMeal,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isParticipant: user?.role === 'participant'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
