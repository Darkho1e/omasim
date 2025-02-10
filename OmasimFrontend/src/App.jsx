import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PhoneVerificationPage from "./pages/PhoneVerificationPage";
import HomePage from "./pages/HomePage";
import ReportPage from "./pages/ReportPage";
import NotFoundPage from "./pages/NotFoundPage";
import "./styles/global.css";

/**
 * ✅ קומפוננטה להגנה על ראוטים מוגנים עם בדיקה כל 5 שניות
 */
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkToken = () => {
      if (!localStorage.getItem("token")) {
        navigate("/login"); // 🔄 אם אין טוקן -> שליחה להתחברות
      }
    };

    checkToken(); // בדיקה ראשונית
    const interval = setInterval(checkToken, 3000); // רענון כל 3 שניות

    return () => clearInterval(interval); // ניקוי האינטרוול כאשר הקומפוננטה מתנתקת
  }, [navigate]);

  return children;
};

/**
 * ✅ ניהול ניווט חכם - חסימת חזרה לדפי התחברות אם יש טוקן
 */
const AuthRedirect = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      navigate("/home"); // ✅ אם יש טוקן - שולח לדף הבית
    }

    // חסימת חזרה לדף לוגין או הרשמה אם יש טוקן
    window.history.pushState(null, null, window.location.href);
    window.addEventListener("popstate", () => {
      if (localStorage.getItem("token")) {
        navigate("/home");
      }
    });
  }, [navigate]);

  return children;
};

/**
 * ✅ קומפוננטת האפליקציה עם ניהול נכון של ראוטים
 */
const App = () => {
  return (
    <Router>
      <div className="container">
        <Routes>
          {/* ראוטים של התחברות - אם יש טוקן, עובר ל-Home */}
          <Route path="/" element={<AuthRedirect><RegisterPage /></AuthRedirect>} />
          <Route path="/register" element={<AuthRedirect><RegisterPage /></AuthRedirect>} />
          <Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />
          <Route path="/verify" element={<AuthRedirect><PhoneVerificationPage /></AuthRedirect>} />

          {/* ראוטים פנימיים - דורשים טוקן עם בדיקה כל 5 שניות */}
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />

          {/* דף 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
