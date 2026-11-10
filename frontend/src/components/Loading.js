import React, { useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import "./Loading.css";

export const Loading = () => {
  const navigate = useNavigate();
  const { state } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.user) {
        navigate('/home');  
      } else {
        navigate('/login');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, state.user]);

  return (
    <div className="loading">
      <div className="loading-content">
        <div className="logo">
          <div img src="logo-icon">☕</div>
        </div>
        <div className="loading-spinner-large"></div>
        <p className="loading-text">Loading...</p>
      </div>
    </div>
  );
};