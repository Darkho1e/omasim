import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VerifyPage = () => {
    const [otp, setOtp] = useState('');
    const navigate = useNavigate();

    const handleVerify = () => {
        if (otp === '220203') { // קוד זמני לדוגמה
            navigate('/home');  // העברה לדף הבית אם הקוד תקין
        } else {
            alert('קוד שגוי');
        }
    };

    return (
        <div className="verify-container">
            <h2>אימות קוד OTP</h2>
            <input 
                type="text" 
                placeholder="הזן את הקוד שקיבלת" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
            />
            <button onClick={handleVerify}>אשר</button>
        </div>
    );
};

export default VerifyPage;
