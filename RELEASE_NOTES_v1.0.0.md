# Release 1.0.0

**Release Date:** November 23, 2025

## 🎉 First Stable Release

This is the first stable release of ELDES ESIM364 Monitor - a modern Next.js application for monitoring and controlling ELDES ESIM364 alarm systems via the ELDES Cloud API.

## ✨ Key Features

### Core Functionality
- **Device Monitoring**: Real-time monitoring of ELDES ESIM364 alarm systems
- **Temperature Tracking**: Multi-sensor temperature monitoring with historical graphs
- **Device Control**: Arm/disarm partitions remotely
- **Multi-User Support**: Secure credential management with user isolation
- **Automatic Data Collection**: Hourly cron jobs for device status and temperature data

### User Interface
- **Modern Dark Theme**: Beautiful, responsive UI matching HumaticAI design system
- **Temperature Graphs**: Interactive charts with multiple time periods (1h, 24h, 1w, 1m, 1y, 2y, All)
- **Custom Modals**: Replaced browser dialogs with styled modal components
- **Toast Notifications**: User-friendly error and success notifications
- **Mobile Responsive**: Fully responsive design with mobile navigation

### Security & Authentication
- **Session Management**: Database-backed session persistence
- **Credential Isolation**: Users only see their own devices
- **Secure Storage**: Encrypted credential storage
- **Demo Mode**: Demo credentials for testing without real API access

## 🔧 Technical Improvements

### Architecture
- **Next.js 15.5.6**: Latest Next.js with App Router
- **TypeScript**: Full type safety
- **SQLite Database**: Local data storage with better-sqlite3
- **PM2 Process Management**: Production-ready process management
- **Cron Jobs**: Automated hourly data collection

### Code Quality
- **Component Organization**: Clean component structure in `app/components/`
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **API Rate Limiting**: Graceful handling of ELDES API rate limits
- **Demo Credentials Protection**: Prevents demo credentials from hitting real API

## 🐛 Bug Fixes

- Fixed device filtering to prevent users from seeing other users' devices
- Fixed demo device credential association
- Fixed login with stored credentials to avoid rate limiting
- Fixed min/max temperature display format
- Fixed authentication redirects for direct device links
- Fixed temperature graph period calculations
- Fixed page reload on period changes (now updates in-place)

## 📦 Components

### New Components
- `Modal.tsx` - Reusable modal component
- `ConfirmDialog.tsx` - Confirmation dialog with promise-based API
- `ConfirmDialogProvider.tsx` - Global confirm dialog provider
- `Header.tsx` - Application header with navigation
- `Footer.tsx` - Application footer

### API Routes
- `/api/auth/*` - Authentication endpoints
- `/api/devices` - Device listing and refresh
- `/api/devices/[deviceId]` - Device details and temperature history
- `/api/devices/[deviceId]/control` - Device control (arm/disarm)
- `/api/credentials` - Credential management

## 📚 Documentation

- Comprehensive README with setup instructions
- Demo data generation script
- GitHub repository with screenshots
- MIT License with proper attribution

## 🚀 Deployment

- PM2 process manager integration
- Systemd service for automatic startup
- Apache ProxyPass configuration support
- Production build optimization

## 🎯 Demo Features

- Demo credentials: `demo@eldes.demo` / `demo`
- Demo device with realistic temperature data
- Vilnius climate-based temperature simulation
- 1 month of historical data

## 📝 Acknowledgments

This project is a fork of:
- [augustas2/eldes](https://github.com/augustas2/eldes) - Original ELDES monitoring implementation
- [tanelvakker/eldes-cloud-api](https://github.com/tanelvakker/eldes-cloud-api) - ELDES Cloud API client library

## 🔗 Links

- **Repository**: https://github.com/humatic-ai/eldes-monitor
- **Issues**: https://github.com/humatic-ai/eldes-monitor/issues
- **License**: MIT

## 📊 Statistics

- **Total Commits**: 20+
- **Components**: 5 reusable components
- **API Routes**: 8 endpoints
- **Pages**: 4 main pages (Dashboard, Login, Credentials, Device Details)

---

**Thank you for using ELDES ESIM364 Monitor!**

For support, please open an issue on GitHub.

