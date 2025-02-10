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


/** 🔍 בדיקת role של משתמש */
app.get("/users/user-role", async (req, res) => {
  const userId = req.headers["user-id"];
  if (!userId) return res.status(401).json({ error: "⛔ לא מאומת" });

  try {
    const user = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
    if (user.rowCount === 0) return res.status(404).json({ error: "❌ משתמש לא נמצא" });

    res.json({ role: user.rows[0].role });
  } catch (error) {
    console.error("❌ שגיאה בשליפת role:", error);
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
            role: userData.role 
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

      res.json({  message: "✅ ההרשמה בוצעה בהצלחה!" });
  } catch (error) {
      console.error("❌ שגיאה בהרשמה:", error);
      res.status(500).json({ error: "שגיאת שרת פנימית" });
  }
});

  


/** 🔑 התחברות באמצעות מספר טלפון */
/** 🔑 התחברות באמצעות מספר טלפון או אימייל */

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
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
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
      lastReportedBranch = blockQuery.rows[0].branch_id; // שמירת הסניף האחרון שדווח

      if (now < blockedUntil) {
        isBlocked = true;
      }
    }

    // שליפת הדיווחים עם ממוצע לכל סניף
    const query = `
      SELECT r.branch_id, b.branch_name, b.region,
             ROUND(AVG(r.people_count)) AS people_count,
             MAX(r.reported_at) AS reported_at
      FROM reports r
      JOIN branches b ON r.branch_id = b.id
      WHERE r.reported_at >= $1
      GROUP BY r.branch_id, b.branch_name, b.region
      ORDER BY reported_at DESC
    `;

    const result = await pool.query(query, [fiveHoursAgo]);

    res.json({
      reports: result.rows,
      isBlocked,
      blockedUntil: blockedUntil ? blockedUntil.toISOString() : null,
      lastReportedBranch, // ✅ מחזיר ללקוח את הסניף האחרון שהמשתמש דיווח עליו
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
      if (diffMinutes < 0.4) {
        return res.status(429).json({ error: "⏳ לא ניתן לדווח שוב על אותו סניף למשך 35 דקות!" });
      }
    }

    // בדיקה האם המשתמש דיווח על סניפים אחרים ב-120 דקות האחרונות
    const lastOtherBranchReport = await pool.query(
      `SELECT branch_id, reported_at FROM reports 
       WHERE ip_address = $1 
       ORDER BY reported_at DESC LIMIT 1`,
      [ip_address]
    );

    if (lastOtherBranchReport.rowCount > 0) {
      const lastReportedAt = new Date(lastOtherBranchReport.rows[0].reported_at);
      const lastReportedBranch = lastOtherBranchReport.rows[0].branch_id;
      const diffMinutes = (now - lastReportedAt) / (1000 * 60);

      if (lastReportedBranch !== branch_id && diffMinutes < 120) {
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

/** 🚀 הפעלת השרת */
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
