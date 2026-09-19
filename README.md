# PrintBridge 🖨️

**Automated Print Management System** — Real-time job delivery, multi-printer support, and cross-platform desktop app.

[![Status](https://img.shields.io/badge/status-active-brightgreen.svg)]()
[![Version](https://img.shields.io/badge/version-1.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

---

## What is PrintBridge?

PrintBridge is an enterprise-grade print management system that automates document printing across your organization.

**Problem:** Manual printing, no tracking, coordination headaches.  
**Solution:** Upload once → Automatic delivery to all printers → Real-time status.

---

## Features

✅ **Admin Dashboard** — Upload PDFs, manage devices and printers  
✅ **Real-Time Sync** — Jobs deliver in < 2 seconds  
✅ **Cross-Platform** — Windows, macOS, Linux  
✅ **Smart Printing** — IPP printer protocol with discovery  
✅ **Live Tracking** — Monitor job status in real-time  
✅ **Offline Ready** — Jobs queue locally, sync when online  
✅ **Secure** — JWT authentication + encrypted credentials  
✅ **Modern UI** — Dark theme with Control Room design  

---

## Quick Start

### Backend

```bash
cd server
npm install
npm start
```

**Opens at:** `http://localhost:3001`

### Admin Dashboard

URL: http://localhost:3001
Username: admin
Password: admin123


### Flutter App

```bash
cd flutter_app
flutter pub get
flutter run -d windows
```

### Setup Device

1. Enter server URL: `http://localhost:3001`
2. Register device
3. Add printer IP
4. Ready to print! ✅

---

## How It Works

Admin Dashboard
↓ (Upload PDF)
Backend Server
↓ (WebSocket Push)
Flutter App
↓ (IPP Protocol)
Printer
↓
Job Printed ✅


---

## Project Structure

printbridge/
├── server/ # Backend + Admin Dashboard
│ ├── src/
│ │ ├── db.js # SQLite database
│ │ ├── routes/ # REST APIs
│ │ └── websocket/ # Real-time push
│ └── public/ # Admin dashboard
│
├── flutter_app/ # Desktop Application
│ ├── lib/
│ │ ├── screens/ # UI screens
│ │ ├── services/ # Services
│ │ └── theme/ # Dark/Light theme
│ └── build/windows/ # Built .exe
│
└── README.md


---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js + Express |
| Database | SQLite |
| Real-Time | WebSocket |
| Desktop App | Flutter |
| Printing | IPP Protocol |
| Auth | JWT + bcrypt |

---

## API Endpoints

POST /api/auth/register-device Register device
POST /api/auth/admin-login Admin login
POST /api/jobs Create job
GET /api/jobs List jobs
PATCH /api/jobs/:id/status Update status
GET /api/devices List devices
GET /api/printers List printers


---

## Deployment

### Local (Free)
```bash
npm start
# Runs at: http://your-pc-ip:3001
```

### Cloud (Heroku)
```bash
heroku create printbridge-app
git push heroku main
```

### DigitalOcean ($5/month)
- 24/7 uptime
- Easy setup

---

## Environment Variables

Create `.env` file in `server/` folder:

```env
PORT=3001
JWT_SECRET=your-secret-key-here
ADMIN_DEFAULT_PASSWORD=admin123
```

---

## Build & Share

### Build Windows App
```bash
cd flutter_app
flutter build windows --release
```

**Output:** `flutter_app/build/windows/x64/runner/Release/flutter_app.exe`

### Share with Team
1. Copy entire `Release` folder (with DLLs)
2. Zip it
3. Share via Google Drive / Email / USB
4. Team runs `flutter_app.exe`
5. Done! ✅

---

## Example Workflow

**Admin Upload**

Dashboard → PDF Upload → Select Device & Printer → Submit


**Instant Delivery**

Device receives job via WebSocket (< 2 seconds)


**Auto Print**

App connects to printer → Sends job → Prints


**Status Update**

Dashboard shows: COMPLETED ✅


---

## Testing

```bash
# Start backend
cd server
npm start

# Run Flutter app (in another terminal)
cd flutter_app
flutter run -d windows

# Test workflow:
1. Upload PDF from admin dashboard
2. Job appears in Flutter app (< 2 seconds)
3. Select printer
4. Status: PENDING → COMPLETED ✅
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| App won't connect | Check backend running at `http://192.168.100.6:3001` |
| Printer not found | Verify printer IP and network connection |
| Jobs stuck PENDING | Check printer is online, review Logs tab |
| WebSocket fails | Restart backend, check firewall |

---

## Performance

| Metric | Value |
|--------|-------|
| Job Delivery | < 2 seconds |
| API Response | < 500ms |
| Backend Startup | < 5 seconds |
| App Startup | < 10 seconds |

---

## License

MIT License - Free to use and modify.

---

## Contributing

```bash
git checkout -b feature/your-feature
git commit -m "Add feature"
git push origin feature/your-feature
```

---

## Support

- 📧 GitHub Issues
- 📚 Docs: See `DEPLOYMENT_SUMMARY.md`

---

<div align="center">

**Made with ❤️ for Automated Printing**

**v1.0** — September 2026

</div>