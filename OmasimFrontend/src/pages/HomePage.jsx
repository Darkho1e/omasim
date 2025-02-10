import React, { useEffect, useState, useRef } from "react";

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
  const [timeLeft, setTimeLeft] = useState(0);
  const [closestBranch, setClosestBranch] = useState(null);
  const countdownInterval = useRef(null); // ✅ הגדרת משתנה לשמירת הטיימר

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
      const ipResponse = await axios.get("https://api64.ipify.org?format=json");
      const userIP = ipResponse.data.ip;

      const response = await axios.get(`${API_BASE_URL}/reports`, {
        params: { ip: userIP },
      });

      if (response.data?.isBlocked !== undefined) {
        setIsBlocked(response.data.isBlocked);

        if (response.data.isBlocked && response.data.blockedUntil) {
          startCountdown(response.data.blockedUntil);
        } else {
          setTimeLeft(0);
        }
      }

      if (Array.isArray(response.data.reports) && response.data.reports.length > 0) {
        const uniqueReports = new Map();
        let lastReportedBranch = null; // נשמור את הסניף האחרון שהמשתמש דיווח עליו

        response.data.reports.forEach((report) => {
          if (!uniqueReports.has(report.branch_id)) {
            uniqueReports.set(report.branch_id, {
              branch_id: report.branch_id,
              branch_name: report.branch_name,

              people_count: report.people_count,
              reported_at: report.reported_at,
              region: report.region,
            });
          }
          lastReportedBranch = report.branch_id; // שמירה של הסניף האחרון שהמשתמש דיווח עליו
        });

        setReports(Array.from(uniqueReports.values()));
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

  /** ⏳ ספירה לאחור לזמן חסימה */
  const startCountdown = (blockedUntil) => {
    const blockedTime = new Date(blockedUntil);
    if (isNaN(blockedTime.getTime())) {
      console.error("❌ זמן חסימה לא תקף:", blockedUntil);
      return;
    }
  
    // console.log("⏳ הפעלת ספירה לאחור:", blockedTime.toLocaleString());
  
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
  
    countdownInterval.current = setInterval(() => {
      const now = new Date();
      const remainingTime = Math.max((blockedTime - now) / 1000, 0);
  
      // console.log("⏱️ זמן שנותר:", remainingTime, "שניות");
  
      if (remainingTime > 0) {
        setTimeLeft(Math.ceil(remainingTime / 60));
        setIsBlocked(true);
      } else {
        setIsBlocked(false);
        setTimeLeft(0);
        clearInterval(countdownInterval.current);
      }
    }, 1000);
  };
  
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

      
      <button
    style={{
        backgroundColor: isBlocked ? "gray" : "red",
        cursor: isBlocked ? "not-allowed" : "pointer",
    }}
    disabled={isBlocked}
    onClick={() => !isBlocked && setShowReportModal(true)}
>
    {isBlocked ? `🚫 חסום - ${timeLeft} דקות נותרו` : "📢 דווח עומס"}
</button>


      {showReportModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>📢 דווח עומס</h2>
            <p>!!שימו לב שאתם מדווחים נכון</p>
            <p> כל דייוח לאותו סניף חוסם את האפשרות לדווח ל 35 דק </p>
            <p>ואת הדיווח לסניפים האחרים למשך שעתיים</p>
            <h5>ניתן לדווח עד 40 אנשים ועד 4 פעמים ביום</h5>
            <h4>דווחו נכון בהצלחה</h4>
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              <option value="">בחר סניף</option>
              {["צפון", "מרכז", "דרום"].map((region) => (
                <optgroup key={region} label={`🌍 ${region}`}>
                  {branches.filter((branch) => branch.region === region).map((branch) => (
                    <option key={branch.id} value={branch.branch_name}>
                      {branch.branch_name}
                    </option>
                  ))}
                </optgroup>
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