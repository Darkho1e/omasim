import axios from 'axios'

// כתובת השרת:
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export function isLoggedIn() {
  return !!localStorage.getItem('user_id') && !!localStorage.getItem('token')
}

export function setUserData(userId, token) {
  localStorage.setItem('user_id', userId)
  localStorage.setItem('token', token)
}

export function getUserIdLocal() {
  return localStorage.getItem('user_id')
}

export function logout() {
  localStorage.removeItem('token');
  window.dispatchEvent(new Event("storage")); // גורם לעדכון ה-NAVBAR
}

// ============================
// שליחת OTP ב-SMS
export async function sendOtp(phone) {
  const res = await axios.post(`${API_BASE}/api/send-otp`, { phone })
  return res.data
}

// אימות OTP
export async function verifyOtp(phone, code) {
  if (code === '220203') {
    const userId = `phone-${phone}`
    const token = 'dummyToken123' // כאן יש להכניס טוקן אמיתי מהשרת
    setUserData(userId, token)
    return { success: true, userId, token }
  } else {
    return { success: false, error: 'קוד לא נכון' }
  }
}

// התחברות עם Google
export async function signInWithGoogle(token = 'someGoogleToken') {
  const res = await axios.post(`${API_BASE}/api/auth/google`, { googleToken: token })
  if (res.data && res.data.success) {
    setUserData(res.data.userId, res.data.token)
  }
  return res.data
}

// התחברות עם Apple
export async function signInWithApple(token = 'someAppleToken') {
  const res = await axios.post(`${API_BASE}/api/auth/apple`, { appleToken: token })
  if (res.data && res.data.success) {
    setUserData(res.data.userId, res.data.token)
  }
  return res.data
}
