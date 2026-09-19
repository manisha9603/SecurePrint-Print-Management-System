## PrintBridge Deployment Complete ✅

### Backend (Node.js + SQLite)

- Status: Ready for deployment
- Heroku URL: `https://printbridge-app.herokuapp.com` after deployment
- Fallback: `cd server && npm start`
- Admin Dashboard: `http://backend-url:3001`
- Admin Login: `admin` / `admin123`

Heroku commands:

```bash
cd server
heroku create printbridge-app
heroku config:set JWT_SECRET="$(openssl rand -hex 32)" ADMIN_DEFAULT_PASSWORD="change-this-password" PORT=3001
git push heroku main
```

Heroku uses an ephemeral filesystem, so SQLite data in `server/data` is not durable across dyno replacement. Use a persistent database before production data matters.

### Flutter Desktop App

- Windows: `flutter_app/build/windows/x64/runner/Release/flutter_app.exe`
- macOS: `flutter_app/build/macos/Build/Products/Release/printbridge_agent.app`
- Linux: `flutter_app/build/linux/x64/release/bundle/printbridge_agent`
- First run: enter `http://your-server:3001` or `https://printbridge-app.herokuapp.com`
- The app auto-registers the device and connects by WebSocket.

### Admin Dashboard

- Served by backend at `http://backend-url:3001`
- Standalone copy: `admin-dashboard/`
- Upload jobs, view devices/printers, and receive live status updates.

### Setup for End Users

1. Run the Windows executable or the equivalent macOS/Linux bundle.
2. Enter the backend server URL on first launch.
3. The device registers automatically.
4. Open Printers and add the network printer by IP if needed.
5. Upload jobs from the admin dashboard.
6. Jobs print automatically to the assigned printer.

### Testing Before Full Deployment

- Test `http://localhost:3001` and confirm the admin dashboard loads.
- Register the desktop app and confirm **Connected**.
- Upload a job and verify queue, retry, cancel, and status updates.
- Stop and restart the backend to verify offline recovery.