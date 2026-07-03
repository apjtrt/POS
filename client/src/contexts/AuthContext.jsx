import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const login = async (username, password, photoBase64, latitude, longitude) => {
    const res = await api.post('/auth/login', { username, password, photoBase64, latitude, longitude });
    localStorage.setItem('token', res.data.token);
    if (res.data.sessionId) {
      localStorage.setItem('sessionId', res.data.sessionId);
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    setUser(res.data.user);
  };

  const logout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    
    if (sessionId) {
      // Create a promise to handle GPS fetch with a timeout so we don't hang logout forever
      const getPosition = () => new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000, maximumAge: 0 }
        );
      });

      const coords = await getPosition();
      
      try {
        await api.post('/auth/logout', { 
          sessionId, 
          latitude: coords?.lat || null, 
          longitude: coords?.lng || null 
        });
      } catch (err) {
        console.error('Failed to log out session on server', err);
      }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('sessionId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
