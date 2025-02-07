require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3001;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(cors());
app.use(bodyParser.json());

/** 📝 שליפת שם משתמש לפי טלפון/אימייל */
app.get("/users", async (req, res) => {
  const { phone, email } = req.query;

  try {
    const user = await pool.query(
      "SELECT name FROM users WHERE phone = $1 OR email = $2 LIMIT 1",
      [phone, email]
    );

    if (user.rowCount === 0) {
      return res.status(404).json({ error: "משתמש לא נמצא" });
    }

    res.json(user.rows[0]);
  } catch (error) {
    console.error("❌ שגיאה בשליפת המשתמש:", error);
    res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
});

/** 📍 שליפת רשימת הסניפים */
app.get("/branches", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM branches");
    res.json(result.rows);
  } catch (error) {
    console.error("❌ שגיאה בטעינת הסניפים:", error);
    res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
});

/** 📌 שליפת דיווחים אחרונים */
app.get("/reports", async (req, res) => {
    try {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      
      const query = `
        SELECT r.id, r.branch_id, r.people_count, r.reported_at, r.ip_address, 
               b.branch_name, b.region
        FROM reports r
        JOIN branches b ON r.branch_id = b.id
        WHERE r.reported_at >= $1
        ORDER BY r.reported_at DESC
      `;
  
      const result = await pool.query(query, [fiveHoursAgo]);
  

      res.json(result.rows);
    } catch (error) {
      console.error("❌ שגיאה בשליפת הדיווחים:", error);
      res.status(500).json({ error: "שגיאת שרת פנימית" });
    }
  });
  
/** 📩 יצירת דיווח */
app.post("/reports", async (req, res) => {
  try {
    const { branch_id, people_count, ip_address } = req.body;

    if (!branch_id || people_count === undefined || !ip_address) {
      return res.status(400).json({ error: "חסרים נתונים בדיווח" });
    }

    const now = new Date();

    // בדיקה האם המשתמש דיווח באותו סניף ב-35 הדקות האחרונות
    const lastBranchReport = await pool.query(
      `SELECT reported_at FROM reports 
       WHERE ip_address = $1 AND branch_id = $2 
       ORDER BY reported_at DESC LIMIT 1`,
      [ip_address, branch_id]
    );

    if (lastBranchReport.rowCount > 0) {
      const lastReportedAt = new Date(lastBranchReport.rows[0].reported_at);
      const diffMinutes = (now - lastReportedAt) / (1000 * 60);
      if (diffMinutes < 0.5) {
        return res.status(429).json({ error: "⏳ לא ניתן לדווח שוב על אותו סניף למשך 35 דקות!" });
      }
    }

    // בדיקה האם המשתמש דיווח על סניפים אחרים ב-120 דקות האחרונות
    const lastOtherBranchReport = await pool.query(
      `SELECT reported_at FROM reports 
       WHERE ip_address = $1 AND branch_id != $2 
       ORDER BY reported_at DESC LIMIT 1`,
      [ip_address, branch_id]
    );

    if (lastOtherBranchReport.rowCount > 0) {
      const lastReportedAt = new Date(lastOtherBranchReport.rows[0].reported_at);
      const diffMinutes = (now - lastReportedAt) / (1000 * 60);
      if (diffMinutes < 1) {
        return res.status(429).json({ error: "🚫 לא ניתן לדווח על סניפים אחרים למשך שעתיים!" });
      }
    }

    // שמירת דיווח חדש במסד הנתונים
    const newReport = await pool.query(
      `INSERT INTO reports (branch_id, people_count, ip_address, reported_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [branch_id, people_count, ip_address]
    );

    console.log("✅ דיווח חדש נשלח:", newReport.rows[0]);

    return res.json({ success: true, message: "✅ הדיווח נשלח בהצלחה!" });

  } catch (error) {
    console.error("❌ שגיאה בשליחת הדיווח:", error);
    res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
});

/** 🚀 הפעלת השרת */
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
