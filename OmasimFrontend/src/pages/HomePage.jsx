import React, { useEffect, useState } from "react";
import axios from "axios";
import HelloUser from "../components/HelloUser";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const HomePage = () => {
  const [branches, setBranches] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [userName, setUserName] = useState("משתמש");
  const [userLocation, setUserLocation] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [closestBranch, setClosestBranch] = useState(null);

  /** 🚀 שליפת שם המשתמש מהשרת */
  useEffect(() => {
    const fetchUserName = async () => {
      const phone = localStorage.getItem("phone") || "";
      const email = localStorage.getItem("email") || "";

      if (!phone && !email) return;

      try {
        const response = await axios.get(`${API_BASE_URL}/users`, { params: { phone, email } });
        if (response.data?.name) {
          setUserName(response.data.name);
          localStorage.setItem("userName", response.data.name);
        }
      } catch (error) {
        console.error("⚠️ שגיאה בשליפת שם המשתמש:", error);
      }
    };

    fetchUserName();
  }, []);

  /** 📍 שליפת רשימת הסניפים */
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

  /** 📍 שליפת מיקום המשתמש */
  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const response = await axios.post(
          `https://www.googleapis.com/geolocation/v1/geolocate?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
        );
        const { lat, lng } = response.data.location;
        setUserLocation({ latitude: lat, longitude: lng });
      } catch (error) {
        console.error("⚠️ שגיאה בקבלת מיקום המשתמש:", error);
      }
    };

    fetchUserLocation();
  }, []);

  /** 📌 מציאת הסניף הקרוב ביותר */
  useEffect(() => {
    if (userLocation && branches.length > 0) {
      const closest = branches.reduce((prev, curr) => {
        const prevDist = Math.hypot(prev.latitude - userLocation.latitude, prev.longitude - userLocation.longitude);
        const currDist = Math.hypot(curr.latitude - userLocation.latitude, curr.longitude - userLocation.longitude);
        return currDist < prevDist ? curr : prev;
      });

      setClosestBranch(closest);
      setSelectedBranch(closest.branch_name);
    }
  }, [userLocation, branches]);

  /** 📊 שליפת דיווחים ובדיקת חסימה */
  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports`);
      if (response.data?.isBlocked !== undefined) {
        setIsBlocked(response.data.isBlocked);
      }

      if (Array.isArray(response.data) && response.data.length > 0) {
        // קיבוץ דיווחים לפי סניף וחישוב ממוצע
        const groupedReports = response.data.reduce((acc, report) => {
          if (!acc[report.branch_id]) {
            acc[report.branch_id] = {
              branch_name: report.branch_name,
              total_people: report.people_count,
              count: 1,
              last_reported: report.reported_at,
            };
          } else {
            acc[report.branch_id].total_people += report.people_count;
            acc[report.branch_id].count += 1;
            acc[report.branch_id].last_reported = report.reported_at;
          }
          return acc;
        }, {});

        const averagedReports = Object.values(groupedReports).map(report => ({
          branch_name: report.branch_name,
          people_count: Math.round(report.total_people / report.count),
          reported_at: report.last_reported
        }));

        setReports(averagedReports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("⚠️ שגיאה בטעינת הדיווחים:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 9000);
    return () => clearInterval(interval);
  }, []);

  /** 📩 שליחת דיווח */
  const handleSubmitReport = async () => {
    if (!selectedBranch || peopleCount.trim() === "" || isBlocked) {
      return alert("🚫 אינך יכול לדווח כרגע! אנא נסה מאוחר יותר.");
    }

    try {
      const selectedBranchData = branches.find((branch) => branch.branch_name === selectedBranch);
      if (!selectedBranchData) return alert("⚠️ שגיאה: לא נמצא סניף שנבחר.");

      const ipResponse = await axios.get("https://api64.ipify.org?format=json");
      const userIP = ipResponse.data.ip;

      const data = {
        branch_id: selectedBranchData.id,
        people_count: parseInt(peopleCount, 10),
        ip_address: userIP,
      };

      const response = await axios.post(`${API_BASE_URL}/reports`, data);

      if (response.status === 200 || response.status === 201) {
        alert("✅ הדיווח נשלח בהצלחה!");
        setShowReportModal(false);
        fetchReports();
      }
    } catch (error) {
      console.error("⚠️ שגיאה בשליחת הדיווח:", error.response?.data || error.message);
    }
  };

  return (
    <div className="container">
      <HelloUser userName={userName} />
      <h2>מצב עומסים</h2>

      {closestBranch && <p>📍 הסניף הקרוב ביותר: {closestBranch.branch_name}</p>}

      <div className="reports-list">
        {loading ? (
          <p>🔄 טוען נתונים...</p>
        ) : reports.length === 0 ? (
          <p>✅ אין דיווחים זמינים</p>
        ) : (
          reports.map((report, index) => (
            <div key={index} className="report-card" style={{
              backgroundColor: report.people_count < 6 ? "green" :
                              report.people_count <= 15 ? "yellow" : "red"
            }}>
              <p>📍 {report.branch_name}</p>
              <p>👥 מספר אנשים לפני: {report.people_count}</p>
              <p>⏳ עדכון אחרון: {new Date(report.reported_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>

      <button onClick={() => !isBlocked && setShowReportModal(true)}>📢 דווח עומס</button>

      {showReportModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>📢 דווח עומס</h2>
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              <option value="">בחר סניף</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.branch_name}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
            <input type="number" placeholder="👥 מספר אנשים לפניך" min="1" max="85"
                   value={peopleCount} onChange={(e) => setPeopleCount(e.target.value)} />
            <button onClick={handleSubmitReport}>📩 שלח דיווח</button>
            <button onClick={() => setShowReportModal(false)}>❌ סגור</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
