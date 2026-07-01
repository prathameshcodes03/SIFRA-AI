import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(() => {

        const savedUser = localStorage.getItem("user");

        return savedUser ? JSON.parse(savedUser) : null;

    });

    const [token, setToken] = useState(
        localStorage.getItem("token") || ""
    );

    const [loading, setLoading] = useState(true);

    const login = (userData, jwtToken) => {

        setUser(userData);
        setToken(jwtToken);

        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", jwtToken);

    };

    const logout = () => {

        setUser(null);
        setToken("");

        localStorage.removeItem("user");
        localStorage.removeItem("token");

    };

    useEffect(() => {

        const fetchUser = async () => {

            try {

                const response = await axios.get(
                    "http://localhost:3000/api/auth/me",
                    {
                        withCredentials: true,
                    }
                );

                setUser(response.data.user);

                localStorage.setItem(
                    "user",
                    JSON.stringify(response.data.user)
                );

            } catch (error) {

                console.log(error);

                setUser(null);

                localStorage.removeItem("user");
                localStorage.removeItem("token");

            } finally {

                setLoading(false);

            }

        };

        fetchUser();

    }, []);

    return (

        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                login,
                logout,
                setUser,
            }}
        >
            {children}
        </AuthContext.Provider>

    );

};

export const useAuth = () => useContext(AuthContext);