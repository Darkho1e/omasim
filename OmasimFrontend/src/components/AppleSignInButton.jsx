import { useNavigate } from 'react-router-dom'
import { signInWithApple } from '../services/authService'
import { setUserIdLocal } from '../services/authService'

function AppleSignInButton() {
  const navigate = useNavigate()

  const handleAppleSignIn = async () => {
    try {
      const userId = await signInWithApple()
      setUserIdLocal(userId)
      navigate('/home')
    } catch (error) {
      alert('התחברות עם Apple נכשלה')
      console.error(error)
    }
  }

  return (
    <button onClick={handleAppleSignIn} style={{ marginTop: '0.5rem' }}>
      התחבר עם Apple
    </button>
  )
}

export default AppleSignInButton
