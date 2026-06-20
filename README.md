# SheRights — Women's Legal Aid Platform 🇧🇩

A full-stack web application empowering women across Bangladesh with accessible legal aid,
legal education, real-time consultation, and anonymous community safety reporting.

🔗 Live Demo: https://sherights-women-legal-app-production.up.railway.app

---

## ✨ Features

- 🔐 **Secure Authentication** — phone number + PIN login, JWT-based sessions, bcrypt-hashed passwords
- 📁 **Case Management** — file legal cases, upload evidence, track real-time status timelines
- 🎮 **Gamified Legal Education** — comics, stories, quizzes, and a points-based reward system
- 💬 **24/7 Legal Help** — real-time chat powered by WebSockets, AI bot with human lawyer hand-off
- 🗺️ **Anonymous Incident Reporting** — geotagged community safety reports on an interactive map
- 🌐 **Fully Bilingual** — seamless English ⇄ Bangla toggle across the entire interface

---

## 🛠️ Tech Stack

**Frontend:** HTML5, CSS3 (custom design system), Vanilla JavaScript, MapLibre GL JS, Socket.io Client
**Backend:** Node.js, Express.js, Socket.io
**Database:** MySQL
**Auth & Security:** JWT, bcryptjs
**File Storage:** Multer + Cloudinary
**Deployment:** Railway (unified single-service deployment)

---

## 📐 Architecture

```
Browser (HTML / CSS / JS)
          │
          ▼
   Express.js Server
          │
          ├── REST API    → /api/auth, /api/cases, /api/learn,
          │                  /api/reports, /api/chat
          │
          ├── Socket.io   → real-time chat
          │
          ├── MySQL Database   (16 normalized tables)
          │
          └── Cloudinary        (file storage)
```

---

## 🗄️ Database Schema

16 tables across 5 domains:

1. **Identity & Access** — `users`, `citizen_profiles`, `professional_profiles`
2. **Case Management** — `cases`, `case_evidences`, `case_tracking_logs`
3. **Gamified Education** — `learning_modules`, `quizzes`, `quiz_questions`, `quiz_options`, `user_achievements`
4. **Legal Help** — `chat_sessions`, `chat_messages`, `consultation_appointments`
5. **Geospatial Reporting** — `incident_reports`, `report_media`

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18+)
- MySQL (or XAMPP)
- A Cloudinary account (free tier)

### Installation

```bash
# Clone the repository
git clone https://github.com/TurtleWisher/SheRights-Women-Legal-App.git
cd SheRights-Women-Legal-App/Backend

# Install dependencies
npm install

# Set up environment variables
# Create a .env file with:
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=sherights_db
PORT=5000
JWT_SECRET=your_secret_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Create the database and import the schema (see /Backend/sql/schema.sql)

# Run the development server
npm run dev
```

The app will be available at `http://localhost:5000`, serving both the API and the frontend.

---

## 📁 Project Structure

```
SheRights-Women-Legal-App/
├── package.json          # Root dispatcher for deployment
├── Backend/
│   ├── config/            # Database & Cloudinary configuration
│   ├── controllers/       # Business logic per domain
│   ├── routes/            # Express route definitions
│   ├── middleware/        # JWT auth middleware
│   └── server.js          # Entry point — Express + Socket.io + static frontend
└── Frontend/
    ├── css/style.css       # Global design system
    ├── js/                 # API client, language toggle
    ├── auth.html
    ├── dashboard.html
    ├── cases.html
    ├── learn.html
    ├── report.html
    └── chat.html
```

---

## 🔐 Security Highlights

- Passwords hashed with bcrypt (10 salt rounds) — never stored or recoverable in plaintext
- JWT-based stateless authentication with role-based route protection
- Anonymous incident reports store `NULL` for the reporter ID at the database level
- Environment variables for all secrets — never committed to version control

---

## 🗺️ Roadmap

- [ ] Admin dashboard for case assignment and report verification
- [ ] Lawyer/consultant portal
- [ ] Consultation appointment booking UI
- [ ] Password reset flow
- [ ] Live incident heatmap visualization

---

## 👤 Author

**Samiul Sakib** — CSE Student
GitHub: https://github.com/TurtleWisher

---

📄 License

This project is not allowed to be copied or re-touched.