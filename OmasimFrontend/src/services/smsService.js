import { setUserIdLocal } from './authService'

/**
 * שליחת OTP למספר טלפון (דמה).
 * במקום לקרוא ל-API אמיתי, אנחנו רק מדפיסים בקונסול.
 */
export async function sendOtp(phone) {
  console.log('נשלח קוד (דמה) למספר:', phone)
  // כאן היית עושה:
  // await axios.post('/api/send-otp', { phone })
  return Promise.resolve(true)
}

/**
 * אימות קוד שהתקבל (דמה).
 * אם הצליח - נשמור מזהה משתמש (לדוגמה phone-<phone>) ב-LocalStorage.
 */
export async function verifyOtp(phone, otpCode) {
  console.log('מנסה לאמת קוד:', otpCode, 'למספר:', phone)

  // בדמה, נאמר שכל קוד עובר 
  // (במציאות תבדוק מול השרת אם הקוד תואם).
  const userId = `phone-${phone}`
  setUserIdLocal(userId)

  return Promise.resolve(userId)
}