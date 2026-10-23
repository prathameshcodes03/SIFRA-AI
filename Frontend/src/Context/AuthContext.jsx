/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // LOGIN
  // ==========================================

  const login = (userData) => {
    setUser(userData);

    localStorage.setItem(
      "user",
      JSON.stringify(userData)
    );
  };

  // ==========================================
  // UPDATE USER
  // ==========================================

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);

    localStorage.setItem(
      "user",
      JSON.stringify(updatedUser)
    );
  }, []);

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
    }

    setUser(null);
    localStorage.removeItem("user");
  };

  // ==========================================
  // CHECK SESSION
  // ==========================================

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/api/auth/me");

        console.log(
          "AUTH USER:",
          response.data
        );

        if (response.data.success) {
          setUser(response.data.user);

          localStorage.setItem(
            "user",
            JSON.stringify(response.data.user)
          );
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error(
            "AUTH SESSION CHECK ERROR:",
            error
          );
        }

        setUser(null);
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // ==========================================
  // CONTEXT
  // ==========================================

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        setUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () =>
  useContext(AuthContext);