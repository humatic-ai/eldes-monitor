# ELDES ESIM364 Monitor

A modern Next.js application for monitoring and controlling ELDES ESIM364 alarm systems via the ELDES Cloud API.

## 📋 About

This project is a fork and enhancement of existing ELDES monitoring solutions, combining the best features from the community to provide a comprehensive monitoring and control interface for ELDES ESIM364 alarm systems.

## 🙏 Acknowledgments

This project is inspired by and builds upon the excellent work of:

- **[augustas2/eldes](https://github.com/augustas2/eldes)** - Original ELDES monitoring implementation
- **[tanelvakker/eldes-cloud-api](https://github.com/tanelvakker/eldes-cloud-api)** - ELDES Cloud API client library

We extend our sincere thanks to the original authors for their contributions to the ELDES ecosystem. This project would not have been possible without their pioneering work.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Features

- **Device Monitoring**: Real-time status monitoring for all ESIM364 devices
- **Temperature Tracking**: Historical temperature data with charts
- **Zone Management**: View and monitor zone statuses
- **Remote Control**: Arm/disarm partitions remotely
- **Secure Credentials**: Encrypted storage of ELDES Cloud API credentials
- **Automated Fetching**: Hourly automatic device status updates
- **Mobile-First Design**: Responsive UI optimized for all devices

## Setup

### 1. Install Dependencies

```bash
cd /home/bitnami/eldes
npm install
```

### 2. Build the Application

**Important**: This project requires Node.js v22 or higher. The build process must use the correct Node.js version to prevent native module compilation errors.

#### Option A: Using the Correct PATH (Recommended)

Ensure the correct Node.js version is in your PATH before building:

```bash
export PATH="/opt/bitnami/node/bin:$PATH"
cd /home/bitnami/eldes
npm run build
```

#### Option B: Using the Start Script (Also Handles Build)

The `start.sh` script automatically sets the correct PATH:

```bash
chmod +x start.sh
export PATH="/opt/bitnami/node/bin:$PATH"
npm run build
```

#### Build Process Details

The build process will:
1. Compile TypeScript to JavaScript
2. Bundle Next.js application
3. Rebuild `better-sqlite3` native module (via `postinstall` script)
4. Optimize assets for production

**Note**: If you encounter `ERR_DLOPEN_FAILED` or `NODE_MODULE_VERSION` errors, ensure you're using Node.js v22+ and rebuild:

```bash
export PATH="/opt/bitnami/node/bin:$PATH"
npm rebuild better-sqlite3
npm run build
```

### 3. Set Environment Variables

Create a `.env.local` file (optional, defaults are used if not set):

```bash
ELDES_ENCRYPTION_KEY=your-secure-encryption-key-here
```

### 4. Start the Application

The application runs on port 3600 by default. You must use the correct Node.js version to prevent native module errors.

#### Option A: Using PM2 (Recommended for Production)

PM2 provides process management, auto-restart, and log management:

```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Use the PM2 management script
chmod +x pm2-manager.sh
./pm2-manager.sh start

# Other PM2 commands:
./pm2-manager.sh stop      # Stop the application
./pm2-manager.sh restart   # Restart the application
./pm2-manager.sh reload    # Zero-downtime reload
./pm2-manager.sh status    # Show status
./pm2-manager.sh logs      # View logs
```

**⚠️ Important**: The script will warn you if PM2 startup is not configured. To enable auto-start on system reboot:

```bash
pm2 startup
# Follow the instructions to run the generated command
pm2 save
```

#### Option B: Using the Start Script

The `start.sh` script automatically sets the correct PATH:

```bash
chmod +x start.sh
./start.sh
```

#### Option C: Manual Start with PATH

Set the PATH environment variable before starting:

```bash
export PATH="/opt/bitnami/node/bin:$PATH"
cd /home/bitnami/eldes
npm start
```

**Important**: Always ensure `/opt/bitnami/node/bin` is in your PATH before running `npm start` or `npm run build` to prevent `better-sqlite3` native module errors.

### 5. Apache Configuration

The Apache configuration has been updated to proxy `/eldes` to the Next.js application running on port 3600.

To apply the Apache configuration changes:

```bash
sudo /opt/bitnami/apache/bin/httpd -t  # Test configuration
sudo /opt/bitnami/ctlscript.sh restart apache  # Restart Apache
```

## Usage

1. **Add Credentials**: Navigate to `/eldes/credentials` and add your ELDES Cloud API credentials
2. **View Devices**: The dashboard automatically fetches and displays all devices
3. **Monitor Status**: Click on any device to view detailed status, temperature history, and zones
4. **Control Devices**: Use the arm/disarm buttons to control partitions remotely

## API Endpoints

- `GET /eldes/api/credentials` - List all credentials
- `POST /eldes/api/credentials` - Add new credentials
- `DELETE /eldes/api/credentials?id={id}` - Delete credentials
- `GET /eldes/api/devices` - List all devices (add `?refresh=true` to force refresh)
- `GET /eldes/api/devices/[deviceId]` - Get device details
- `POST /eldes/api/devices/[deviceId]/control` - Control device (arm/disarm)
- `POST /eldes/api/cron/start` - Start hourly cron job

## Database

The application uses SQLite (`eldes.db`) to store:
- User credentials (encrypted)
- Device information
- Device status history
- Temperature history

## Security

- Passwords are encrypted using AES-256-GCM
- Credentials are stored securely in the database
- All API endpoints are protected

## Development

### Prerequisites

- Node.js v22.0.0 or higher (required for `better-sqlite3` native module)
- Ensure `/opt/bitnami/node/bin` is in your PATH
- PM2 (optional, for production process management): `npm install -g pm2`

### Development Commands

```bash
# Start development server (port 3600)
npm run dev

# Build for production
npm run build

# Start production server (port 3600)
npm start

# Or use the start script (handles PATH automatically)
./start.sh
```

### Production Management with PM2

For production deployments, use PM2 for process management:

```bash
# Start application
./pm2-manager.sh start

# Stop application
./pm2-manager.sh stop

# Restart application
./pm2-manager.sh restart

# Zero-downtime reload (graceful restart)
./pm2-manager.sh reload

# View status
./pm2-manager.sh status

# View logs
./pm2-manager.sh logs

# Configure auto-start on system reboot
pm2 startup
# (Follow instructions to run the generated command)
pm2 save
```

**Note**: The PM2 management script will warn you if startup configuration is missing and prompt before continuing.

### Troubleshooting Build/Start Errors

#### Error: `ERR_DLOPEN_FAILED` or `NODE_MODULE_VERSION mismatch`

This occurs when `better-sqlite3` was compiled with a different Node.js version. Fix:

```bash
# 1. Ensure correct Node.js version is in PATH
export PATH="/opt/bitnami/node/bin:$PATH"

# 2. Verify Node.js version (should be v22+)
node --version

# 3. Rebuild the native module
npm rebuild better-sqlite3

# 4. Rebuild the application
npm run build
```

#### Error: `EADDRINUSE: address already in use :::3600`

Port 3600 is already in use. Find and kill the process:

```bash
# Find the process
lsof -i :3600
# Or
ss -tlnp | grep 3600

# Kill the process (replace PID with actual process ID)
kill -9 <PID>
# Or kill all node processes
pkill -f "next"
```

## Notes

- The hourly cron job automatically fetches device statuses
- Manual refresh is available via the refresh button
- The application is configured with `basePath: "/eldes"` for subdirectory deployment


## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

This project is inspired by and builds upon the excellent work of:

- **[augustas2/eldes](https://github.com/augustas2/eldes)** - Original ELDES monitoring implementation
- **[tanelvakker/eldes-cloud-api](https://github.com/tanelvakker/eldes-cloud-api)** - ELDES Cloud API client library (Python)

We extend our sincere thanks to the original authors for their contributions to the ELDES ecosystem.
