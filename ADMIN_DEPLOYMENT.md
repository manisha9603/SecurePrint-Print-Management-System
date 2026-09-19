# Standalone Admin Dashboard

The static dashboard is in `admin-dashboard/`. It can be hosted by GitHub Pages, Netlify, Vercel static hosting, S3, or any HTTPS web server.

## Configure the backend

Open the standalone login page and enter the backend URL when prompted, or set it in the **Backend URL** field. The value is stored in browser `localStorage` under `printbridge_server_url`. Use `https://printbridge-app.herokuapp.com` for Heroku or `http://localhost:3001` for local development.

The backend must allow CORS from the dashboard host and must expose WebSockets. The included backend already enables CORS and uses `/ws/admin` for live updates.

## GitHub Pages

1. Create a repository and copy the contents of `admin-dashboard/` into its published folder.
2. Enable GitHub Pages from the repository's Pages settings.
3. Open the published URL and configure the backend URL on the login page.

## Netlify

Drag the `admin-dashboard/` folder into Netlify Drop, or configure the folder as the publish directory. No build command is required.

Never commit an admin token or backend `.env` file to the static dashboard repository.