import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = "http://localhost:3001"; // כתובת השרת
const DEFAULT_OTP = "220203"; // 📌 קוד OTP דיפולטי

const VerifyPage = () => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleVerify = async () => {
        setError('');

        const phone = localStorage.getItem('phone');
        const email = localStorage.getItem('email');

        if (!phone && !email) {
            setError('❌ שגיאה: לא נמצא אימייל או מספר טלפון לאימות.');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/verify-otp`, { 
                email, 
                phone, 
                otp: otp === DEFAULT_OTP ? DEFAULT_OTP : otp  // שליחה תמידית לשרת
            });

            if (response.data.success) {

                // ✅ שמירת הטוקן שהתקבל מהשרת
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user_id', response.data.userId);
                localStorage.setItem('role', response.data.role || "user");

                navigate('/home');  // ✅ העברה לדף הבית
            } else {
                setError(response.data.error || '❌ קוד שגוי, נסה שנית.');
            }
        } catch (err) {
            setError('❌ שגיאה באימות הקוד.');
            console.error("❌ שגיאה באימות:", err);
        }
    };

    return (
        <div className="verify-container">
            <h2>אימות קוד OTP</h2>
            <input 
                type="text" 
                placeholder="📩 הזן את הקוד שקיבלת" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button onClick={handleVerify}>✅ אשר</button>
        </div>
    );
};

export default VerifyPage;
