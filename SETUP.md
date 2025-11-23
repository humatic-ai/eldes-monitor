# Setup Instructions

## Quick Start

1. **Install Dependencies**
   ```bash
   cd /home/bitnami/eldes
   npm install
   ```

2. **Set Encryption Key (Optional but Recommended)**
   ```bash
   # Generate a secure key
   openssl rand -base64 32
   # Add to .env.local or export as environment variable
   export ELDES_ENCRYPTION_KEY="your-generated-key-here"
   ```

3. **Build the Application**
   ```bash
   npm run build
   ```

4. **Test Apache Configuration**
   ```bash
   sudo /opt/bitnami/apache/bin/httpd -t
   ```

5. **Restart Apache**
   ```bash
   sudo /opt/bitnami/ctlscript.sh restart apache
   ```

6. **Start the Next.js Application**
   ```bash
   npm start
   # Or use the startup script:
   ./start.sh
   ```

7. **Access the Application**
   - Open https://humaticai.com/eldes in your browser
   - Add your ELDES Cloud API credentials
   - Start monitoring your devices!

## Running as a Service (Optional)

To run the application as a background service, you can use PM2 or systemd:

### Using PM2
```bash
npm install -g pm2
pm2 start npm --name "eldes-monitor" -- start
pm2 save
pm2 startup
```

### Using systemd
Create `/etc/systemd/system/eldes-monitor.service`:
```ini
[Unit]
Description=ELDES ESIM364 Monitor
After=network.target

[Service]
Type=simple
User=bitnami
WorkingDirectory=/home/bitnami/eldes
Environment="ELDES_ENCRYPTION_KEY=your-key-here"
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable eldes-monitor
sudo systemctl start eldes-monitor
```

## Troubleshooting

### Apache Configuration Issues
- Check Apache error logs: `/opt/bitnami/apache/logs/error_log`
- Verify proxy modules are loaded: `sudo /opt/bitnami/apache/bin/httpd -M | grep proxy`

### Next.js Application Issues
- Check if port 3001 is available: `netstat -tuln | grep 3001`
- Check application logs in the terminal where it's running
- Verify database file permissions: `ls -la eldes.db`

### Database Issues
- The database is automatically created on first run
- Location: `/home/bitnami/eldes/eldes.db`
- To reset: Delete `eldes.db` and restart the application

## Notes

- The application fetches device data hourly automatically
- Manual refresh is available via the refresh button
- All credentials are encrypted before storage
- The database stores historical data for 24+ hours (temperature history)

