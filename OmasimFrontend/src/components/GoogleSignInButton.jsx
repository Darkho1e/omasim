import { useNavigate } from 'react-router-dom'
import { signInWithGoogle } from '../services/authService'  // פונקציית דמה או אמיתית
import { setUserIdLocal } from '../services/authService'

function GoogleSignInButton() {
  const navigate = useNavigate()

  const handleGoogleSignIn = async () => {
    try {
      // בדמו, אנחנו פשוט קוראים לפונקציה signInWithGoogle.
      // במציאות, היית מקבל "token" כלשהו מ-Google, ושולח לשרת שלך לאימות.
      const userId = await signInWithGoogle()
      setUserIdLocal(userId)

      // מעבר לעמוד הבית
      navigate('/home')
    } catch (error) {
      alert('התחברות עם Google נכשלה')
      console.error(error)
    }
  }

  return (
    <button onClick={handleGoogleSignIn} style={{ marginTop: '0.5rem' }}>
      התחבר עם Google
    </button>
  )
}

export default GoogleSignInButton
