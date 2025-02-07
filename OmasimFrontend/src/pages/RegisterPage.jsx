import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "http://localhost:3001";

const RegisterPage = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleRegister = async () => {
        if (!name || !email || !phone) {
            return setError("⚠️ יש למלא את כל השדות!");
        }
        
        try {
            const response = await axios.post(`${API_BASE_URL}/register`, { name, email, phone });
            alert("✅ ההרשמה הושלמה בהצלחה! כעת ניתן להתחבר.");
            navigate("/login"); // העברה לדף התחברות
        } catch (error) {
            console.error("❌ שגיאה בהרשמה:", error);
            setError("⚠️ שגיאה בהרשמה. ייתכן שהאימייל או הטלפון כבר רשומים במערכת.");
        }
    };

    return (
        <div className="register-container">
            <h2>🚀 הרשמה</h2>
            {error && <p className="error-message">{error}</p>}
            <input type="text" placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="email" placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="tel" placeholder="מספר טלפון" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button onClick={handleRegister}>📩 הירשם</button>
            <p>כבר רשום? <span className="link" onClick={() => navigate("/login")}>התחבר כאן</span></p>
        </div>
    );
};

export default RegisterPage;