import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { isLoggedIn, logout } from '../services/authService';

function Navbar() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  useEffect(() => {
    const handleStorageChange = () => {
      setLoggedIn(isLoggedIn());
    };

    // מאזין לשינויים ב-localStorage כדי לתפוס עדכונים בהתחברות/התנתקות
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    navigate('/login');
  };

  return (
    <nav style={{ background: '#eee', padding: '1rem' }}>
      <Link to="/home">🏠 בית</Link> | {" "}
      {loggedIn ? (
        <Link onClick={handleLogout}>🚪 התנתק</Link>
      ) : (
        <Link to="/login">🔑 התחבר</Link>
      )}
    </nav>
  );
}

export default Navbar;
