import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  signIn as serviceSignIn,
  signUp as serviceSignUp,
  signOut as serviceSignOut,
  subscribeAuthState,
} from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // 초기 로딩 시 Firebase Auth 세션 복원 전 깜빡임(FOUC) 방어
    const unsubscribe = subscribeAuthState((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => {
    setAuthError(null);
  };

  const login = async (email: string, password: string): Promise<User> => {
    setAuthError(null);
    try {
      const user = await serviceSignIn(email, password);
      setCurrentUser(user);
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다';
      setAuthError(message);
      throw err;
    }
  };

  const register = async (email: string, password: string): Promise<User> => {
    setAuthError(null);
    try {
      const user = await serviceSignUp(email, password);
      setCurrentUser(user);
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : '회원가입에 실패했습니다';
      setAuthError(message);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    setAuthError(null);
    try {
      await serviceSignOut();
      setCurrentUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그아웃에 실패했습니다';
      setAuthError(message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        authError,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
