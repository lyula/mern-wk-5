import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();


export function SocketProvider({ children }) {
  const { token, user, logout } = useAuth();
  const socketRef = useRef();
  const [ready, setReady] = useState(false);
  // Track online users globally if needed
  // const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    setReady(false);
    if (token && user) {
      socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
      });

      // On connect, emit login and online
      socketRef.current.on('connect', () => {
        socketRef.current.emit('login', { userId: user._id }, (ack) => {
          if (ack && ack.success) {
            setReady(true);
            socketRef.current.emit('userOnline', { userId: user._id });
          }
        });
      });

      // Listen for forced logout (e.g., token expired)
      socketRef.current.on('forceLogout', () => {
        if (typeof logout === 'function') logout();
      });

      // Optionally, listen for online/offline events
      // socketRef.current.on('userOnline', ({ userId }) => {
      //   setOnlineUsers(prev => [...new Set([...prev, userId])]);
      // });
      // socketRef.current.on('userOffline', ({ userId }) => {
      //   setOnlineUsers(prev => prev.filter(id => id !== userId));
      // });

      // On disconnect, emit offline
      socketRef.current.on('disconnect', () => {
        if (user && user._id) {
          socketRef.current.emit('userOffline', { userId: user._id });
        }
        setReady(false);
      });

      // Clean up listeners and disconnect on unmount or user/token change
      return () => {
        if (socketRef.current) {
          socketRef.current.emit('userOffline', { userId: user?._id });
          socketRef.current.off('connect');
          socketRef.current.off('forceLogout');
          // socketRef.current.off('userOnline');
          // socketRef.current.off('userOffline');
          socketRef.current.off('disconnect');
          socketRef.current.disconnect();
        }
      };
    }
  }, [token, user, logout]);

  return (
    <SocketContext.Provider value={ready ? socketRef.current : null}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
