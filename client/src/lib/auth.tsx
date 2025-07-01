import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '../hooks/use-toast';
import { queryClient } from './queryClient';

// Define the User interface
interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  businessName: string;
  businessType: string;
  role: string;
}

// Define auth token and session data
interface AuthToken {
  token: string;
  expiresAt: number; // Unix timestamp when token expires
  user: User;
}

// Define the AuthContext interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => boolean; // Returns true if session is valid
  refreshSession: () => Promise<boolean>; // Returns true if refresh was successful
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Constants for token management
const TOKEN_KEY = 'islandloaf_auth_token';
const TOKEN_EXPIRY_DAYS = 7; // Default token expiry in days
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check session every minute

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true to check localStorage
  const { toast } = useToast();

  // Function to save auth token to localStorage
  const saveToken = (token: string, user: User, rememberMe: boolean = false) => {
    const expiryDays = rememberMe ? TOKEN_EXPIRY_DAYS : 1; // 1 day if not remember me
    const expiresAt = Date.now() + (expiryDays * 24 * 60 * 60 * 1000);
    
    const authToken: AuthToken = {
      token,
      expiresAt,
      user
    };
    
    localStorage.setItem(TOKEN_KEY, JSON.stringify(authToken));
  };

  // Function to get token from localStorage
  const getToken = (): AuthToken | null => {
    const tokenStr = localStorage.getItem(TOKEN_KEY);
    if (!tokenStr) return null;
    
    try {
      return JSON.parse(tokenStr) as AuthToken;
    } catch (e) {
      console.error('Failed to parse auth token', e);
      return null;
    }
  };

  // Function to remove token from localStorage
  const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY);
  };

  // Check if session is valid
  const checkSession = (): boolean => {
    const authToken = getToken();
    if (!authToken) return false;
    
    // Check if token is expired
    return authToken.expiresAt > Date.now();
  };

  // Refresh the session token
  const refreshSession = async (): Promise<boolean> => {
    const authToken = getToken();
    if (!authToken) return false;
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newAuthToken: AuthToken = {
          token: data.token,
          expiresAt: Date.now() + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
          user: authToken.user
        };
        
        localStorage.setItem(TOKEN_KEY, JSON.stringify(newAuthToken));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh session', error);
      return false;
    }
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = () => {
      const authToken = getToken();
      if (!authToken || authToken.expiresAt <= Date.now()) {
        setUser(null);
        removeToken();
      } else {
        setUser(authToken.user);
      }
      setIsLoading(false);
    };
    
    loadUser();
    
    // Set up periodic session check
    const intervalId = setInterval(() => {
      if (!checkSession()) {
        // Session expired, log out the user
        setUser(null);
        removeToken();
        toast({
          title: "Session expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
      }
    }, SESSION_CHECK_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [toast]);

  // Login function
  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      const { token, user: userData } = data;
      
      // Save token and user to localStorage
      saveToken(token, userData, rememberMe);
      
      // Update state
      setUser(userData);
      
      toast({
        title: "Logged in",
        description: "You have been successfully logged in",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid email or password",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      
      const authToken = getToken();
      if (authToken) {
        // Call logout endpoint to invalidate token on server
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken.token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          console.error('Failed to call logout endpoint:', error);
        }
      }
      
      // Remove token from localStorage
      removeToken();
      
      // Update state
      setUser(null);
      
      // Clear all query cache
      queryClient.clear();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    checkSession,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}