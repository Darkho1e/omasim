import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOtp } from '../services/api'

function PhoneLoginForm() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const navigate = useNavigate()

  const handleSendOtp = async () => {
    if (!phoneNumber) {
      alert('אנא הזן מספר טלפון')
      return
    }
    try {
      await sendOtp(phoneNumber)  // קריאה לשרת
      navigate(`/verify-phone?phone=${encodeURIComponent(phoneNumber)}`)
    } catch (error) {
      alert('שליחת קוד נכשלה')
      console.error(error)
    }
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <input
        type="tel"
        placeholder="הקלד מספר טלפון"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />
      <button onClick={handleSendOtp}>קבל קוד ב-SMS</button>
    </div>
  )
}

export default PhoneLoginForm
