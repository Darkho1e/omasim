import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportLoad } from '../services/api';

function BranchDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [peopleCount, setPeopleCount] = useState(0);
  const [reporterName, setReporterName] = useState('');

  const handleReport = async () => {
    try {
      await reportLoad(id, peopleCount, reporterName);
      alert('דיווח נשלח בהצלחה!');
      navigate('/home');
    } catch (error) {
      console.error('שגיאה בשליחת דיווח:', error);
      alert('שגיאה בשליחת דיווח');
    }
  };

  return (
    <div>
      <h2>דיווח עומס לסניף {id}</h2>
      <input
        type="number"
        value={peopleCount}
        onChange={(e) => setPeopleCount(e.target.value)}
        placeholder="מספר אנשים בתור"
      />
      <input
        type="text"
        value={reporterName}
        onChange={(e) => setReporterName(e.target.value)}
        placeholder="שם המדווח"
      />
      <button onClick={handleReport}>שלח דיווח</button>
    </div>
  );
}

export default BranchDetailsPage;
