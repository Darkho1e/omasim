import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// שליחת OTP
export async function sendOtp(phone) {
  const res = await axios.post(`${API_BASE}/send-otp`, { phone });
  return res.data;
}

// אימות OTP
export async function verifyOtp(phone, code) {
  const res = await axios.post(`${API_BASE}/verify-otp`, { phone, code });
  return res.data; // { success: true, userId: ...}
}

// התחברות עם Google
export async function signInWithGoogle(tokenFromClient) {
  const res = await axios.post(`${API_BASE}/auth/google`, {
    googleToken: tokenFromClient
  });
  return res.data;
}

// התחברות עם Apple
export async function signInWithApple(tokenFromClient) {
  const res = await axios.post(`${API_BASE}/auth/apple`, {
    appleToken: tokenFromClient
  });
  return res.data;
}

// שליפת כל הסניפים
export const getBranches = async () => {
  try {
    const response = await axios.get(`${API_BASE}/branches`);
    return response.data;
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw error;
  }
};

// דיווח עומס לסניף
export const reportLoad = async (branchId, peopleCount, reporterName) => {
  try {
    const response = await axios.post(`${API_BASE}/report`, {
      branchId,
      peopleCount,
      reporterName,
    });
    return response.data;
  } catch (error) {
    console.error('Error reporting load:', error);
    throw error;
  }
};
