/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const redirectingRef = useRef(false);

  // ==========================================
  // LOGIN
  // ==========================================

  const login = (userData, token) => {
    redirectingRef.current = false;
    setUser(userData);

    localStorage.setItem(
      "user",
      JSON.stringify(userData)
    );

    if (token) {
      localStorage.setItem("token", token);
    }
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
    } finally {
      redirectingRef.current = false;
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
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
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // ==========================================
  // 401 RESPONSE INTERCEPTOR
  // Redirect to /Login on session expiration (401 from any API call).
  // ==========================================

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && !redirectingRef.current) {
          redirectingRef.current = true;
          setUser(null);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          navigate("/Login", { replace: true });
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, [navigate]);

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