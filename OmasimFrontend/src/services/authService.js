import axios from 'axios';

// 📌 כתובת השרת
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * ✅ בדיקה אם המשתמש מחובר
 */
export function isLoggedIn() {
  return !!localStorage.getItem('user_id') && !!localStorage.getItem('token');
}

/**
 * ✅ שמירת פרטי המשתמש בלוקל סטורג'
 */
export function setUserData(userId, token) {
  if (!token || token === "undefined") {
    console.error("❌ טוקן לא תקין - לא ניתן לשמור בלוקל סטורג'", token);
    return;
  }

  console.log("📌 שמירת נתוני משתמש:", { userId, token });

  localStorage.setItem('user_id', userId);
  localStorage.setItem('token', token);
}

/**
 * ✅ קבלת ה-UserId מהלוקל סטורג'
 */
export function getUserIdLocal() {
  return localStorage.getItem('user_id');
}

/**
 * ✅ יציאה מהמערכת - מוחק הכל ולוקח לדף ההתחברות
 */
export function logout() {
  console.log("🚪 התנתקות - מחיקת טוקן וניווט החוצה");

  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  
  // עדכון דף והפעלה מחדש
  window.location.href = '/login'; 
  window.dispatchEvent(new Event("storage")); // גורם לעדכון ה-NAVBAR
}

/**
 * ✅ חסימת חזרה אחורה אם המשתמש מחובר
 */
export function blockBackNavigation() {
  window.history.pushState(null, null, window.location.href);
  window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
  };
}

// ============================
// 📩 **שליחת OTP ב-SMS**
export async function sendOtp(phone) {
  try {
    console.log("📨 שליחת OTP ל:", phone);
    const res = await axios.post(`${API_BASE}/send-otp`, { phone });

    console.log("🔑 תגובת שרת לאחר שליחת OTP:", res.data);
    return res.data;
  } catch (error) {
    console.error("❌ שגיאה בשליחת OTP:", error);
    throw error.response?.data || error.message;
  }
}

// /**
//  * ✅ **אימות OTP ושמירת טוקן**
//  */
// export async function verifyOtp(email, otp) {
//   try {
//     console.log("🛂 שליחת OTP לאימות:", { email, otp });

//     const res = await axios.post(`${API_BASE}/verify-otp`, { email, otp });

//     console.log("🔑 תגובת שרת לאימות OTP:", res.data);

//     if (res.data.success) {
//       const { token, userId } = res.data;

//       if (!token || token === "undefined") {
//         console.error("❌ שגיאה - השרת לא החזיר טוקן תקין!");
//         return { success: false, error: "❌ טוקן לא תקין מהשרת" };
//       }

//       console.log("✅ שמירת טוקן:", token);
//       setUserData(userId, token); // ✅ שמירת המשתמש והטוקן

//       return { success: true, token };
//     } else {
//       return { success: false, error: '❌ קוד לא נכון או פג תוקף' };
//     }
//   } catch (error) {
//     console.error("❌ שגיאה באימות OTP:", error);
//     return { success: false, error: error.response?.data?.error || '❌ שגיאה באימות' };
//   }
// }

/**
 * 🔐 התחברות עם Google
 */
export async function signInWithGoogle(token = 'someGoogleToken') {
  console.log("🔵 התחברות עם Google...");
  
  const res = await axios.post(`${API_BASE}/auth/google`, { googleToken: token });

  if (res.data && res.data.success) {
    setUserData(res.data.userId, res.data.token);
  }

  return res.data;
}

/**
 * 🍏 התחברות עם Apple
 */
export async function signInWithApple(token = 'someAppleToken') {
  console.log("🍏 התחברות עם Apple...");

  const res = await axios.post(`${API_BASE}/auth/apple`, { appleToken: token });

  if (res.data && res.data.success) {
    setUserData(res.data.userId, res.data.token);
  }

  return res.data;
}
export function preventExternalBackNavigation() {
  window.history.pushState(null, null, window.location.href);
  
  window.onpopstate = function (event) {
    console.log("🔄 המשתמש ניסה לחזור אחורה");

    // אם יש טוקן, לא ניתן לחזור אחורה מחוץ לאתר
    if (isLoggedIn()) {
      window.history.pushState(null, null, window.location.href);
    }
  };
}