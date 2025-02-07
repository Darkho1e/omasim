import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { isLoggedIn } from '../services/authService'

// פונקציה לחישוב מרחק בין 2 נקודות (latitude/longitude)
function getDistanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// כתובת בסיס ל-API (משתנה סביבה או ברירת מחדל ל-3000)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

function SelectBranchPage() {
  const navigate = useNavigate()

  // כאן נשמור את כל הסניפים מהשרת
  const [allBranches, setAllBranches] = useState([])

  // כאן נשמור את הסניפים המסוננים לפי region
  const [filteredBranches, setFilteredBranches] = useState([])

  // כאן נשמור את האזור שנבחר (לרשימת options בצד)
  const [region, setRegion] = useState('צפון')

  // כאן נשמור את הסניף הקרוב ביותר (אם נבצע איתור אוטומטי)
  const [nearestBranch, setNearestBranch] = useState(null)

  // בעת טעינת העמוד, אם המשתמש לא מחובר - חזרה ללוגין,
  // אחרת נטען את רשימת הסניפים מהשרת
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/')
    } else {
      fetchBranches()
    }
  }, [navigate])

  // פונקציה שמביאה את הסניפים מה-Backend
  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/branches`)
      // נניח שהשרת מחזיר [{id, name, address, lat, lon, region}, ...]
      setAllBranches(res.data)
    } catch (error) {
      console.error('שגיאה בטעינת סניפים:', error)
      alert('לא ניתן לטעון רשימת סניפים מהשרת')
    }
  }

  // בכל פעם ש-allBranches משתנה או שהמשתמש בוחר region אחר,
  // נסנן את הרשימה
  useEffect(() => {
    if (!allBranches.length) return
    const byRegion = allBranches.filter((b) => b.region === region)
    setFilteredBranches(byRegion)
  }, [region, allBranches])

  // --- פונקציה למציאת הסניף הקרוב ע"י GPS ---
  const handleFindNearest = () => {
    if (!('geolocation' in navigator)) {
      alert('דפדפן זה לא תומך ב-Geolocation')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude
        const userLon = pos.coords.longitude
        console.log('מיקום משתמש:', userLat, userLon)

        if (!allBranches.length) {
          alert('אין רשימת סניפים כלשהי מהשרת')
          return
        }

        let minDist = Infinity
        let closest = null

        for (let branch of allBranches) {
          const dist = getDistanceInKm(userLat, userLon, branch.lat, branch.lon)
          if (dist < minDist) {
            minDist = dist
            closest = branch
          }
        }

        setNearestBranch(closest)
        alert(`הסניף הקרוב הוא: ${closest?.name} (כ-${minDist.toFixed(1)} ק"מ)`)
        // אפשר לנתב אוטומטית לפרטי הסניף:
        if (closest) {
          navigate(`/branch/${closest.id}`)
        }
      },
      (error) => {
        console.error('Geo error:', error)
        alert('לא הצלחנו לאתר מיקום. ניתן לבחור סניף ידנית.')
      }
    )
  }

  // --- בחירה ידנית בסניף ---
  const handleSelectBranch = (branch) => {
    navigate(`/branch/${branch.id}`)
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
      <h2>בחירת סניף</h2>

      {/* --- כפתור איתור אוטומטי --- */}
      <button onClick={handleFindNearest} style={{ marginBottom: '1rem' }}>
        מצא סניף קרוב אליי
      </button>

      <hr />

      {/* --- בחירה ידנית (לפי אזור) --- */}
      <h3>או בחר ידנית לפי אזור</h3>
      <select value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="צפון">צפון</option>
        <option value="מרכז">מרכז</option>
        <option value="דרום">דרום</option>
      </select>

      <ul style={{ listStyle: 'none', marginTop: '1rem' }}>
        {filteredBranches.map((b) => (
          <li key={b.id} style={{ marginBottom: '0.5rem' }}>
            <button onClick={() => handleSelectBranch(b)}>
              {b.name} - {b.address}
            </button>
          </li>
        ))}
      </ul>

      {nearestBranch && (
        <p>הסניף הקרוב שנמצא לאחרונה: {nearestBranch.name}</p>
      )}
    </div>
  )
}

export default SelectBranchPage
