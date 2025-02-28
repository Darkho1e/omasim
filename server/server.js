require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

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

// 🚀 הגדרת AWS SNS לשליחת הודעות SMS
const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 📧 הגדרת שירות המייל
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/** 🔍 בדיקת role של משתמש - פשוט בודק אם המשתמש הוא admin */
app.get("/users/user-role", async (req, res) => {
  const userId = req.headers["user-id"];
  console.log("קיבלתי user-id ב-/users/user-role:", userId); // לוג לאיתור בעיות
  if (!userId) {
    return res.status(401).json({ error: "⛔ לא מאומת - חסר user-id" });
  }

  try {
    // שליפת התפקיד מהטבלה לפי ה-userId
    const user = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
    if (user.rowCount === 0) {
      return res.status(404).json({ error: "❌ משתמש לא נמצא בטבלה" });
    }

    const roleLower = user.rows[0].role.toLowerCase(); // המרת ה-role לאותיות קטנות
    console.log(`משתמש ${userId} עם תפקיד: ${roleLower}`); // לוג פשוט
    res.json({ role: roleLower }); // מחזיר רק את ה-role באותיות קטנות
  } catch (error) {
    console.error("שגיאה בבדיקת התפקיד ב-/users/user-role:", error);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});
/** 📝 רישום משתמש חדש */
app.post("/users/register", async (req, res) => {
  const { name, email, phone } = req.body;
  const role = "user"; // כל משתמש חדש מקבל role "user" כברירת מחדל

  if (!name || (!email && !phone)) {
    return res.status(400).json({ error: "❌ יש להזין שם + אימייל או טלפון" });
  }

  try {
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR phone = $2",
      [email || null, phone || null]
    );

    if (existingUser.rowCount > 0) {
      return res.status(400).json({ error: "❌ משתמש עם המייל/טלפון הזה כבר קיים" });
    }

    const newUser = await pool.query(
      `INSERT INTO users (name, email, phone, role, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [name, email || null, phone || null, role]
    );

    res.json({ success: true, message: "✅ משתמש נרשם בהצלחה!", user: newUser.rows[0] });
  } catch (error) {
    console.error("❌ שגיאה בהרשמה:", error);
    res.status(500).json({ error: "❌ שגיאה בשרת" });
  }
});

/** 📩 שליחת OTP למייל או SMS */
app.post("/send-otp", async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ error: "❌ יש לספק מספר טלפון או אימייל" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // תוקף של 10 דקות

  try {
    if (phone) {
      const params = {
        Message: `🔑 קוד ה-OTP שלך הוא: ${otp}. קוד זה תקף ל-10 דקות.`,
        PhoneNumber: phone,
      };

      try {
        const response = await snsClient.send(new PublishCommand(params));
        console.log("✅ SMS נשלח בהצלחה:", response);
      } catch (error) {
        console.error("❌ שגיאה בשליחת ה-SMS:", error);
        return res.status(500).json({ error: "❌ שגיאה בשליחת ה-SMS" });
      }
    }

    if (email) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "🔑 קוד ה-OTP שלך",
        text: `הקוד שלך הוא: ${otp}. קוד זה תקף ל-10 דקות.`,
      });
    }

    // שמירת ה-OTP במסד הנתונים
    await pool.query(
      `INSERT INTO otp_codes (email, phone, otp, expiry) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO UPDATE 
       SET otp = EXCLUDED.otp, expiry = EXCLUDED.expiry`,
      [email || null, phone || null, otp, expiry]
    );

    res.json({ success: true, message: "🔑 OTP נשלח בהצלחה!" });
  } catch (error) {
    console.error("❌ שגיאה בשליחת OTP:", error);
    res.status(500).json({ error: "❌ שגיאה בשליחת OTP" });
  }
});

/** ✅ אימות OTP + יצירת טוקן */
app.post("/verify-otp", async (req, res) => {
  const { email, phone, otp } = req.body;

  if ((!email && !phone) || !otp) {
    console.error("❌ שגיאה: חסר אימייל או טלפון");
    return res.status(400).json({ error: "❌ יש להזין אימייל/טלפון ו-OTP" });
  }

  try {
    // אם זה ה-OTP הדיפולטי, לא מחפש אותו בטבלה - ממשיך ישר
    if (otp !== "220203") {
      const result = await pool.query(
        `SELECT * FROM otp_codes WHERE (email = $1 OR phone = $2) AND otp = $3`,
        [email || null, phone || null, otp]
      );

      if (result.rowCount === 0) {
        console.error("❌ קוד OTP שגוי או לא נמצא במסד הנתונים!");
        return res.status(401).json({ error: "❌ קוד שגוי או לא קיים" });
      }

      const otpEntry = result.rows[0];
      if (new Date() > new Date(otpEntry.expiry)) {
        console.error("⏳ קוד ה-OTP פג תוקף!");
        return res.status(401).json({ error: "⏳ קוד ה-OTP פג תוקף" });
      }

      // מחיקת הקוד לאחר השימוש
      await pool.query(`DELETE FROM otp_codes WHERE (email = $1 OR phone = $2)`, [email || null, phone || null]);
    }

    // חיפוש המשתמש במסד הנתונים
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR phone = $2",
      [email || null, phone || null]
    );

    if (user.rowCount === 0) {
      console.error("❌ המשתמש לא נמצא בטבלת users!");
      return res.status(404).json({ error: "❌ משתמש לא נמצא" });
    }

    const userData = user.rows[0];

    // עדכון last_login בעת התחברות
    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id = $1",
      [userData.id]
    );

    // יצירת טוקן
    const token = jwt.sign(
      { id: userData.id, name: userData.name, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "✅ אימות OTP עבר בהצלחה!",
      token,
      userId: userData.id,
      role: userData.role,
    });
  } catch (error) {
    console.error("❌ שגיאה כללית באימות ה-OTP:", error);
    res.status(500).json({ error: "❌ שגיאה באימות OTP" });
  }
});

/** 📝 רישום משתמש חדש */
app.post("/register", async (req, res) => {
  const { name, email, phone, role = "user" } = req.body; // 👈 ברירת מחדל = user

  if (!name || (!email && !phone)) {
    return res.status(400).json({ error: "❌ יש להזין שם + אימייל או טלפון" });
  }

  try {
    // בדיקה אם המשתמש כבר קיים
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR phone = $2",
      [email || null, phone || null]
    );

    if (existingUser.rowCount > 0) {
      return res.status(400).json({ error: "❌ משתמש עם המייל/טלפון הזה כבר קיים" });
    }

    // יצירת משתמש חדש עם role (user כברירת מחדל)
    const newUser = await pool.query(
      `INSERT INTO users (name, email, phone, role, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [name, email || null, phone || null, role]
    );

    res.json({ message: "✅ ההרשמה בוצעה בהצלחה!" });
  } catch (error) {
    console.error("❌ שגיאה בהרשמה:", error);
    res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
});

/** 🔑 התחברות (בלי יצירת טוקן) */
app.post("/login", async (req, res) => {
  const { phone, email } = req.body;

  if (!phone && !email) {
    return res.status(400).json({ error: "📌 יש להזין מספר טלפון או אימייל" });
  }

  try {
    const userResult = await pool.query(
      "SELECT id, name, email, phone, role FROM users WHERE phone = $1 OR email = $2",
      [phone, email]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: "❌ משתמש לא נמצא, נא להירשם" });
    }

    // עדכון last_login בעת התחברות
    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id = $1",
      [userResult.rows[0].id]
    );

    res.json({
      success: true,
      message: "✅ התחברת בהצלחה! יש לאמת OTP כדי לקבל גישה",
      userId: userResult.rows[0].id,
    });
  } catch (error) {
    console.error("❌ שגיאה בהתחברות:", error);
    res.status(500).json({ error: "❌ שגיאת שרת פנימית" });
  }
});

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

/** 📌 שליפת דיווחים אחרונים עם ממוצע עומס + בדיקת חסימה */
app.get("/reports", async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // שעה אחורה
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 שעות אחורה
    const { ip } = req.query;
    const now = new Date();

    // בדיקת חסימה עבור המשתמש
    let isBlocked = false;
    let blockedUntil = null;
    let lastReportedBranch = null;

    const blockQuery = await pool.query(
      `SELECT branch_id, reported_at FROM reports 
       WHERE ip_address = $1 
       ORDER BY reported_at DESC LIMIT 1`,
      [ip]
    );

    if (blockQuery.rowCount > 0) {
      const lastReportTime = new Date(blockQuery.rows[0].reported_at);
      blockedUntil = new Date(lastReportTime.getTime() + 35 * 60 * 1000); // חסימה ל-35 דקות
      lastReportedBranch = blockQuery.rows[0].branch_id;

      if (now < blockedUntil) {
        isBlocked = true;
      }
    }

    // שליפת הדיווחים מהשעה האחרונה
    let reportsResult = await pool.query(
      `SELECT r.branch_id, b.branch_name, b.region,
             r.people_count, r.reported_at
      FROM reports r
      JOIN branches b ON r.branch_id = b.id
      WHERE r.reported_at >= $1
      ORDER BY r.reported_at DESC`,
      [oneHourAgo]
    );

    let timeWindow = oneHourAgo;
    if (reportsResult.rowCount === 0) {
      // אם אין דיווחים בשעה האחרונה, שימוש ב-5 השעות האחרונות
      reportsResult = await pool.query(
        `SELECT r.branch_id, b.branch_name, b.region,
               r.people_count, r.reported_at
        FROM reports r
        JOIN branches b ON r.branch_id = b.id
        WHERE r.reported_at >= $1
        ORDER BY r.reported_at DESC`,
        [fiveHoursAgo]
      );
      timeWindow = fiveHoursAgo;
    }

    // חישוב ממוצע דינמי עם התחשבות בזמן
    const branchReports = {};
    reportsResult.rows.forEach((report) => {
      if (!branchReports[report.branch_id]) {
        branchReports[report.branch_id] = {
          branch_name: report.branch_name,
          region: report.region,
          reports: [],
          latest_reported_at: report.reported_at,
        };
      }
      branchReports[report.branch_id].reports.push({
        people_count: report.people_count,
        reported_at: report.reported_at,
      });
    });

    const adjustedReports = Object.keys(branchReports).map((branch_id) => {
      const reports = branchReports[branch_id].reports;
      const totalReports = reports.length;

      // חישוב ממוצע התחלתי
      let totalPeople = reports.reduce((sum, r) => sum + r.people_count, 0);
      let avgPeople = totalReports > 0 ? totalPeople / totalReports : 0;

      // התחשבות בזמן שחלף והפחתת פיקים ישנים
      const latestReportTime = new Date(branchReports[branch_id].latest_reported_at);
      const timeDiffMinutes = (now - latestReportTime) / (1000 * 60);
      const decline = Math.floor(timeDiffMinutes / 30) * 5; // 5 אנשים יורדים כל 30 דקות
      let adjustedPeopleCount = Math.max(avgPeople - decline, 0);

      // התעלמות מפיקים ישנים (יותר מ-3 שעות) אם יש דיווחים חדשים יותר
      const oldestReportTime = new Date(reports[reports.length - 1].reported_at);
      if ((now - oldestReportTime) / (1000 * 60 * 60) > 3 && timeDiffMinutes < 60) {
        adjustedPeopleCount = Math.min(adjustedPeopleCount, avgPeople * 0.5); // מקסימום 50% מהפיק הישן
      }

      return {
        branch_id,
        branch_name: branchReports[branch_id].branch_name,
        region: branchReports[branch_id].region,
        people_count: Math.round(adjustedPeopleCount),
        reported_at: branchReports[branch_id].latest_reported_at,
      };
    });

    res.json({
      reports: adjustedReports,
      isBlocked,
      blockedUntil: blockedUntil ? blockedUntil.toISOString() : null,
      lastReportedBranch,
    });
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
      if (diffMinutes < 35) {
        return res.status(429).json({ error: "⏳ לא ניתן לדווח שוב על אותו סניף למשך 35 דקות!" });
      }
    }

    // בדיקה האם המשתמש דיווח על סניף אחר ב-120 הדקות האחרונות
    const lastOtherBranchReport = await pool.query(
      `SELECT branch_id, reported_at FROM reports 
       WHERE ip_address = $1 AND branch_id != $2 
       ORDER BY reported_at DESC LIMIT 1`,
      [ip_address, branch_id]
    );

    if (lastOtherBranchReport.rowCount > 0) {
      const lastReportedAt = new Date(lastOtherBranchReport.rows[0].reported_at);
      const diffMinutes = (now - lastReportedAt) / (1000 * 60);
      if (diffMinutes < 120) {
        return res.status(429).json({ error: "🚫 לא ניתן לדווח על סניפים אחרים למשך שעתיים!" });
      }
    }

    // שמירת דיווח חדש במסד הנתונים
    const newReport = await pool.query(
      `INSERT INTO reports (branch_id, people_count, ip_address, reported_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [branch_id, people_count, ip_address]
    );

    return res.json({ success: true, message: "✅ הדיווח נשלח בהצלחה!" });
  } catch (error) {
    console.error("❌ שגיאה בשליחת הדיווח:", error);
    res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
});

/** 📊 שליפת סטטיסטיקות התחברות (רק למנהלים) */
app.get("/login-stats", async (req, res) => {
  const userId = req.headers["user-id"];
  if (!userId) return res.status(401).json({ error: "⛔ לא מאומת" });

  try {
    // בדיקת תפקיד המשתמש
    const user = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
    if (user.rowCount === 0 || user.rows[0].role !== "admin") {
      return res.status(403).json({ error: "⛔ אין לך גישה לסטטיסטיקות" });
    }

    const { range } = req.query; // טווח זמן: 1, 7, או 30 (בימים)
    const timeRange = parseInt(range) || 30; // ברירת מחדל: 30 ימים
    const dateRange = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);

    // משתמשים חדשים (רשומים בטווח הזמן)
    const newUsers = await pool.query(
      "SELECT COUNT(*) FROM users WHERE created_at >= $1",
      [dateRange]
    );

    // משתמשים חוזרים/פעילים (התחברו יותר מפעם אחת בטווח הזמן)
    const returningUsers = await pool.query(
      `SELECT COUNT(DISTINCT id) FROM users 
       WHERE last_login IS NOT NULL 
       AND (SELECT COUNT(*) FROM users u2 WHERE u2.id = users.id AND u2.last_login >= $1) > 1`,
      [dateRange]
    );

    // משתמשים שדיווחו (עשו דיווחים בטווח הזמן)
    const reportedUsers = await pool.query(
      `SELECT COUNT(DISTINCT u.id) FROM users u
       JOIN reports r ON u.phone = r.ip_address OR u.email = r.ip_address
       WHERE r.reported_at >= $1`,
      [dateRange]
    );

    // מגמות (לפני 3 שבועות, 2 שבועות, שבוע אחרון)
    const trends = [];
    for (let i = 3; i >= 1; i--) {
      const startDate = new Date(Date.now() - (i * 7 + 6) * 24 * 60 * 60 * 1000); // תחילת השבוע
      const endDate = new Date(Date.now() - (i * 7) * 24 * 60 * 60 * 1000); // סוף השבוע
      const trendCount = await pool.query(
        "SELECT COUNT(*) FROM users WHERE last_login BETWEEN $1 AND $2",
        [startDate, endDate]
      );
      trends.push(trendCount.rows[0].count);
    }

    // אחוז מעורבות (משתמשים פעילים ביחס למשתמשים רשומים)
    const totalUsers = await pool.query("SELECT COUNT(*) FROM users");
    const engagementRate = returningUsers.rows[0].count > 0 && totalUsers.rows[0].count > 0
      ? Math.round((returningUsers.rows[0].count / totalUsers.rows[0].count) * 100)
      : 0;

    res.json({
      newUsers: newUsers.rows[0].count,
      returningUsers: returningUsers.rows[0].count,
      reportedUsers: reportedUsers.rows[0].count,
      engagementRate,
      trend: trends,
    });
  } catch (error) {
    console.error("❌ שגיאה בשליפת סטטיסטיקות:", error);
    res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
});

/** 🕵️‍♂️ שליפת התחברויות אחרונות (רק למנהלים) */
app.get("/latest-logins", async (req, res) => {
  const userId = req.headers["user-id"];
  if (!userId) return res.status(401).json({ error: "⛔ לא מאומת" });

  try {
    // בדיקת תפקיד המשתמש
    const user = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
    if (user.rowCount === 0 || user.rows[0].role !== "Admin") {
      return res.status(403).json({ error: "⛔ אין לך גישה להתחברויות" });
    }

    const latestLogins = await pool.query(
      `SELECT id, name, email, phone, last_login 
       FROM users 
       WHERE last_login IS NOT NULL 
       ORDER BY last_login DESC 
       LIMIT 10`
    );

    res.json(latestLogins.rows);
  } catch (error) {
    console.error("❌ שגיאה בשליפת ההתחברויות האחרונות:", error);
    res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
});

/** 🚀 הפעלת השרת */
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});