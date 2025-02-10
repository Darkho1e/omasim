import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const LoginPage = () => {
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [method, setMethod] = useState('phone');
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            if ((method === 'phone' && !phone) || (method === 'google' && !email)) {
                alert("📌 יש להזין מספר טלפון או אימייל");
                return;
            }

            const payload = method === 'phone' ? { method, phone } : { method, email };
            console.log("📤 שליחת בקשת התחברות:", payload);

            const response = await axios.post(`${API_BASE_URL}/login`, payload);

            // ✅ שמירת הנתונים ב-localStorage
            
            if (method === 'phone') {
                localStorage.setItem('phone', phone);
                console.log("📌 מספר טלפון נשמר:", phone);
            } else {
                localStorage.setItem('email', email);
                console.log("📌 אימייל נשמר:", email);
            }

            // ניקוי שדות קלט
            setPhone('');
            setEmail('');

            // ניתוב לעמוד הבית
            navigate('/verify');

        } catch (error) {
            console.error('❌ Login error:', error.response?.data || error.message);
            alert("⚠️ שגיאה בהתחברות: " + (error.response?.data?.error || "נסה שנית"));
        }
    };

    return (
        <div className="login-container">
            <h2>התחברות</h2>
            <div>
                <button onClick={() => setMethod('phone')}>📱 מספר טלפון</button>
                <button onClick={() => setMethod('google')}>📧 Google</button>
            </div>
            {method === 'phone' && (
                <input 
                    type="tel" 
                    placeholder="📞 מספר טלפון" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                />
            )}
            {method === 'google' && (
                <input 
                    type="email" 
                    placeholder="✉️ אימייל" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                />
            )}
            <button onClick={handleLogin}>🚀 המשך</button>
            <p> אין משתמש? <span className="link" onClick={() => navigate("/register")}>הירשם כאן</span></p>

        </div>
    );
};

export default LoginPage;