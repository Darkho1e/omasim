import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // ייבוא מפורש של axios
import { Line, Pie } from "react-chartjs-2";
import "chart.js/auto";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const ManageLogins = () => {
  const [stats, setStats] = useState({
    newUsers: 0,
    returningUsers: 0,
    reportedUsers: 0,
    engagementRate: 0,
    trend: [0, 0, 0],
  });

  const [users, setUsers] = useState([]);
  const [timeRange, setTimeRange] = useState("30");
  const [error, setError] = useState(null); // מדינה חדשה עבור שגיאות
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    console.log("userId ב-ManageLogins:", userId); // לוג לאיתור בעיות

    // אם אין userId, שלח להתחברות
    if (!userId) {
      navigate("/login");
      return;
    }

    // שליפת סטטיסטיקות ונתונים ללא בדיקת role (כי כבר הסרנו את החיוב)
    fetchStats(userId);
    fetchLatestLogins(userId);
  }, [timeRange, navigate]);

  const fetchStats = (userId) => {
    axios.get(`${API_BASE_URL}/login-stats?range=${timeRange}`, {
      headers: { "user-id": userId },
    })
      .then((res) => setStats(res.data))
      .catch((error) => {
        console.error("שגיאה בשליפת סטטיסטיקות ב-ManageLogins:", error);
        setError("שגיאה בטעינת הסטטיסטיקות. אנא התחבר מחדש.");
      });
  };

  const fetchLatestLogins = (userId) => {
    axios.get(`${API_BASE_URL}/latest-logins`, {
      headers: { "user-id": userId },
    })
      .then((res) => setUsers(res.data))
      .catch((error) => {
        console.error("שגיאה בשליפת ההתחברויות האחרונות ב-ManageLogins:", error);
        setError("שגיאה בטעינת ההתחברויות. אנא התחבר מחדש.");
        navigate("/login");
      });
  };

  if (error) return <h2>{error}</h2>;

  const chartData = {
    labels: ["משתמשים חדשים", "משתמשים חוזרים", "משתמשים שדיווחו"],
    datasets: [
      {
        label: "כמות",
        data: [stats.newUsers, stats.returningUsers, stats.reportedUsers],
        backgroundColor: ["#36A2EB", "#FF6384", "#4CAF50"],
      },
    ],
  };

  const trendData = {
    labels: ["לפני 3 שבועות", "לפני שבועיים", "שבוע אחרון"],
    datasets: [
      {
        label: "מגמות התחברות",
        data: stats.trend || [0, 0, 0],
        borderColor: "#FFA500",
        fill: false,
      },
    ],
  };

  return (
    <div className="admin-dashboard">
      <h1>📊 ניהול התחברויות</h1>
      <label>📅 סנן לפי טווח זמן:</label>
      <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
        <option value="30">30 ימים</option>
        <option value="7">7 ימים</option>
        <option value="1">24 שעות</option>
      </select>

      <h2>🔢 סטטיסטיקות התחברות</h2>
      <ul>
        <li>🆕 משתמשים חדשים: <b>{stats.newUsers}</b></li>
        <li>🔄 משתמשים חוזרים/פעילים: <b>{stats.returningUsers}</b></li>
        <li>📌 משתמשים שדיווחו: <b>{stats.reportedUsers}</b></li>
        <li>📈 אחוזי מעורבות: <b>{stats.engagementRate}%</b></li>
      </ul>

      <div className="charts">
        <div className="chart-container">
          <h3>📊 פילוח משתמשים</h3>
          <Pie data={chartData} />
        </div>
        <div className="chart-container">
          <h3>📈 מגמות התחברות</h3>
          <Line data={trendData} />
        </div>
      </div>

      <h2>🕵️‍♂️ התחברויות אחרונות</h2>
      <table>
        <thead>
          <tr>
            <th>שם</th>
            <th>אימייל</th>
            <th>טלפון</th>
            <th>תאריך התחברות</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email || "לא זמין"}</td>
              <td>{user.phone || "לא זמין"}</td>
              <td>{new Date(user.last_login).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManageLogins;