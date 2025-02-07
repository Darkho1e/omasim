import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = "http://localhost:3001";

const ReportPage = () => {
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState("");
    const [peopleCount, setPeopleCount] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/branches`);
                setBranches(response.data);
            } catch (error) {
                console.error("⚠️ שגיאה בטעינת הסניפים:", error);
            }
        };
        fetchBranches();
    }, []);

    const handleSubmitReport = async () => {
        if (!selectedBranch || peopleCount === "") return alert("אנא בחר סניף והזן מספר אנשים");

        try {
            const response = await axios.post(`${API_BASE_URL}/report`, {
                branch: selectedBranch,
                people: peopleCount,
                user: "משתמש לדוגמה"
            });
            setMessage("✅ הדיווח נשלח בהצלחה!");
            setSelectedBranch("");
            setPeopleCount("");
        } catch (error) {
            console.error("❌ שגיאה בשליחת הדיווח:", error);
            setMessage("⚠️ שגיאה בשליחת הדיווח. נסה שנית.");
        }
    };

    return (
        <div className="container">
            <h2>📢 דווח עומס</h2>

            {message && <p className="success-message">{message}</p>}

            <select onChange={(e) => setSelectedBranch(e.target.value)} value={selectedBranch}>
                <option value="">בחר סניף</option>
                {branches.length > 0 ? (
                    branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                            {branch.branch_name}
                        </option>
                    ))
                ) : (
                    <option disabled>אין סניפים זמינים</option>
                )}
            </select>

            <input
                type="number"
                placeholder="👥 מספר אנשים לפניך"
                min="1"
                max="85"
                value={peopleCount}
                onChange={(e) => setPeopleCount(e.target.value)}
            />

            <button onClick={handleSubmitReport}>🚀 שלח דיווח</button>
        </div>
    );
};

export default ReportPage;
