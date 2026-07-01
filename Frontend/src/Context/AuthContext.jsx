import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);

    const [token, setToken] = useState(
        localStorage.getItem("token") || ""
    );

    const login = (userData, jwtToken) => {

        setUser(userData);
        setToken(jwtToken);

        localStorage.setItem("token", jwtToken);

    };

    const logout = () => {

        setUser(null);
        setToken("");

        localStorage.removeItem("token");

    };

    useEffect(() => {

        const savedToken = localStorage.getItem("token");

        if (savedToken) {
            setToken(savedToken);
        }

    }, []);

    return (

        <AuthContext.Provider
            value={{
                user,
                token,
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