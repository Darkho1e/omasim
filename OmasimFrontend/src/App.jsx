import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PhoneVerificationPage from './pages/PhoneVerificationPage';
import HomePage from './pages/HomePage';
import ReportPage from './pages/ReportPage';
import NotFoundPage from './pages/NotFoundPage';
import Navbar from './components/Navbar';
import './styles/global.css';

const ProtectedRoute = ({ children }) => {
    const navigate = useNavigate();
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
        }
    }, [navigate]);
    return children;
};

const App = () => {
    return (
        <Router>
            {/* <Navbar /> */}
            <div className="container">
                <Routes>
                    <Route path="/" element={<RegisterPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/verify" element={<PhoneVerificationPage />} />
                    <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;