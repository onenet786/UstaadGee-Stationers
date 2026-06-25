# Deployment Instructions for UstaadGee Stationers (aaPanel)

## Prerequisites on the aaPanel Server
1. **Node.js** (v20+ recommended) installed via aaPanel's **Software Store**.
2. **pm2** (process manager) – will be installed globally.
3. Access to the **aaPanel control panel** and **SSH** (root or a sudo user).
4. PostgreSQL database reachable from the server (already created in aaPanel's **Database** section). Keep the connection string handy.

## Step‑by‑Step Guide
### 1. Upload Project Files
- **Option A – Git**: In aaPanel → **Site → Create Site** → set the root to `/home/wwwroot/ustaadgee` (or any preferred folder). Then SSH in and run:
  ```bash
  cd /home/wwwroot/ustaadgee
  git clone https://github.com/yourusername/UstaadGee-Stationers.git .
  ```
- **Option B – FTP/SFTP**: Compress the repository (`zip -r UstaadGee-Stationers.zip .`) and upload via **File → Upload**. Extract inside the site root.

### 2. Install Project Dependencies
```bash
cd /home/wwwroot/ustaadgee   # adjust to the actual path
npm install               # installs express, pg, tsx, dotenv, etc.
npm install -D tsx        # ensure the dev runner is present (already in package.json)
npm install -g pm2        # install pm2 globally for process management
```

### 3. Configure Environment Variables
Create a `.env` file in the project root (same folder as `package.json`). Example content:
```dotenv
# PostgreSQL connection – replace with your actual credentials
DATABASE_URL=postgres://db_user:db_password@db_host:5432/db_name

# Optional – port (default 3000)
PORT=3000
```
> **Important:** The `HOST` part must be reachable from the server. If you use aaPanel’s internal database, the host is usually `127.0.0.1`.

### 4. Build Front‑end (Vite) – optional for production
If you want to serve the built UI through the same Node process:
```bash
npm run build   # creates the `dist` folder
```
The server script automatically serves `dist` when `NODE_ENV=production`.

### 5. Set Production Environment
```bash
export NODE_ENV=production
```
You can place this line in the **Startup Script** (see step 6) or in the aaPanel **Site → Set Environment Variables** section.

### 6. Create a PM2 Startup Script
Create a file `ecosystem.config.js` in the root:
```javascript
module.exports = {
  apps: [{
    name: "ustaadgee-backend",
    script: "node",
    args: "dist/server.cjs", // use compiled file in production
    interpreter: "node",
    env: {
      NODE_ENV: "production",
      PORT: "3000"
    },
    watch: false,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    combine_logs: true
  }]
};
```
If you prefer to run via `tsx` (development mode), set `script: "tsx", args: "server.ts"`.

Start the app with PM2 and enable auto‑start on reboot:
```bash
pm2 start ecosystem.config.js
pm2 save            # persists the process list
pm2 startup systemd # generates the systemd unit and prints a command
# Run the printed command, e.g.:
# sudo env PATH=$PATH:/usr/local/bin pm2 startup systemd -u www -i max
```

### 7. Configure Nginx Reverse Proxy (aaPanel UI)
1. In aaPanel → **Website → Add Site** (or edit the existing one).
2. Set **Domain** (e.g., `ustaadgee.example.com`).
3. Under **Proxy**, enable **Reverse Proxy** and point to `http://127.0.0.1:3000`.
4. Save – aaPanel will generate the Nginx config and reload.

### 8. Open Firewall Ports (if needed)
```bash
# aaPanel provides a firewall UI; open port 3000 (or the PORT you set)
# Example via command line (CentOS/Ubuntu):
sudo firewall-cmd --add-port=3000/tcp --permanent   # CentOS
sudo ufw allow 3000/tcp                         # Ubuntu
sudo systemctl reload firewalld                 # or sudo ufw reload
```

### 9. Verify Deployment
- Open the domain in a browser: `https://your-domain.com/api/health`
- Expected JSON response:
  ```json
  {"status":"ok","store":"UstaadGee Stationers","live":true}
  ```
- Check PM2 logs for errors:
  ```bash
  pm2 logs ustaadgee-backend
  ```

### 10. Maintenance Tips
- **Update code**: `git pull` (or re‑upload) → `npm install` → `pm2 restart ustaadgee-backend`.
- **Database migrations**: The app runs `initializeDb()` on startup; ensure the DB user has permission to CREATE tables.
- **Logs**: Stored in `./logs/` (as defined in `ecosystem.config.js`). Rotate them with logrotate if they grow large.
- **Backup**: Periodically dump the PostgreSQL DB (aaPanel → Database → Export).

---
**File created:** `DEPLOYMENT.md` in the project root.
