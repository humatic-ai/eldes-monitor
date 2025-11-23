#!/bin/bash
# PM2 Management Script for ELDES Monitor
# Usage: ./pm2-manager.sh [start|stop|restart|reload|status|logs]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="eldes-monitor"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PM2_CONFIG="ecosystem.config.js"

# Ensure correct Node.js version
export PATH="/opt/bitnami/node/bin:$PATH"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}Error: PM2 is not installed${NC}"
    echo "Install it with: npm install -g pm2"
    exit 1
fi

# Check if PM2 startup is configured
check_startup() {
    # Check if PM2 systemd service exists and is enabled
    # This is more reliable than checking pm2 startup output
    local pm2_service_exists=false
    
    # Check for systemd service (most common on Linux)
    if command -v systemctl &> /dev/null; then
        if systemctl list-unit-files 2>/dev/null | grep -qE "pm2.*\.service.*enabled"; then
            pm2_service_exists=true
        fi
    fi
    
    # If service exists, startup is configured - no warning needed
    if [ "$pm2_service_exists" = true ]; then
        return 0
    fi
    
    # If we get here, startup is NOT configured - show warning
    if [ "$pm2_service_exists" = false ]; then
        echo -e "${YELLOW}⚠️  WARNING: PM2 startup script is not configured!${NC}"
        echo ""
        echo "PM2 will NOT automatically start on system reboot."
        echo ""
        echo "To configure PM2 to start on reboot, run:"
        echo "  pm2 startup"
        echo "  (Then follow the instructions to run the generated command as root/sudo)"
        echo "  pm2 save"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check if ecosystem.config.js exists, create if not
create_pm2_config() {
    if [ ! -f "$SCRIPT_DIR/$PM2_CONFIG" ]; then
        echo -e "${YELLOW}Creating PM2 ecosystem config file...${NC}"
        cat > "$SCRIPT_DIR/$PM2_CONFIG" << 'EOF'
module.exports = {
  apps: [{
    name: 'eldes-monitor',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3600',
    cwd: '/home/bitnami/eldes',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PATH: '/opt/bitnami/node/bin:/usr/local/bin:/usr/bin:/bin'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
EOF
        echo -e "${GREEN}✓ Created $PM2_CONFIG${NC}"
    fi
}

# Create logs directory
create_logs_dir() {
    mkdir -p "$SCRIPT_DIR/logs"
}

# Start the application
start_app() {
    echo -e "${GREEN}Starting $APP_NAME...${NC}"
    create_pm2_config
    create_logs_dir
    
    # Check if already running
    if pm2 list | grep -q "$APP_NAME.*online"; then
        echo -e "${YELLOW}$APP_NAME is already running${NC}"
        pm2 status
        return 0
    fi
    
    cd "$SCRIPT_DIR"
    pm2 start "$PM2_CONFIG"
    pm2 save
    echo -e "${GREEN}✓ $APP_NAME started${NC}"
    pm2 status
}

# Stop the application
stop_app() {
    echo -e "${YELLOW}Stopping $APP_NAME...${NC}"
    
    if ! pm2 list | grep -q "$APP_NAME"; then
        echo -e "${YELLOW}$APP_NAME is not running${NC}"
        return 0
    fi
    
    pm2 stop "$APP_NAME"
    pm2 save
    echo -e "${GREEN}✓ $APP_NAME stopped${NC}"
    pm2 status
}

# Restart the application
restart_app() {
    echo -e "${YELLOW}Restarting $APP_NAME...${NC}"
    create_pm2_config
    create_logs_dir
    
    if pm2 list | grep -q "$APP_NAME"; then
        pm2 restart "$APP_NAME"
    else
        cd "$SCRIPT_DIR"
        pm2 start "$PM2_CONFIG"
    fi
    pm2 save
    echo -e "${GREEN}✓ $APP_NAME restarted${NC}"
    pm2 status
}

# Reload the application (zero-downtime)
reload_app() {
    echo -e "${YELLOW}Reloading $APP_NAME (zero-downtime)...${NC}"
    
    if ! pm2 list | grep -q "$APP_NAME.*online"; then
        echo -e "${RED}Error: $APP_NAME is not running${NC}"
        echo "Use 'start' or 'restart' instead"
        exit 1
    fi
    
    pm2 reload "$APP_NAME"
    pm2 save
    echo -e "${GREEN}✓ $APP_NAME reloaded${NC}"
    pm2 status
}

# Show status
show_status() {
    echo -e "${GREEN}PM2 Status:${NC}"
    pm2 status
    echo ""
    echo -e "${GREEN}Application Info:${NC}"
    pm2 info "$APP_NAME" 2>/dev/null || echo "Application not running"
}

# Show logs
show_logs() {
    echo -e "${GREEN}Showing logs for $APP_NAME (Ctrl+C to exit)...${NC}"
    pm2 logs "$APP_NAME"
}

# Main command handler
case "${1:-}" in
    start)
        check_startup
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        check_startup
        restart_app
        ;;
    reload)
        reload_app
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    test-warning)
        # Test mode: Force show warning (for testing)
        echo -e "${YELLOW}⚠️  WARNING: PM2 startup script is not configured!${NC}"
        echo ""
        echo "PM2 will NOT automatically start on system reboot."
        echo ""
        echo "To configure PM2 to start on reboot, run:"
        echo "  pm2 startup"
        echo "  (Then follow the instructions to run the generated command as root/sudo)"
        echo "  pm2 save"
        ;;
    *)
        echo "PM2 Management Script for ELDES Monitor"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start    - Start the application"
        echo "  stop     - Stop the application"
        echo "  restart  - Restart the application"
        echo "  reload   - Reload the application (zero-downtime)"
        echo "  status   - Show application status"
        echo "  logs     - Show application logs"
        echo ""
        echo "Examples:"
        echo "  $0 start      # Start the app"
        echo "  $0 restart    # Restart the app"
        echo "  $0 reload     # Zero-downtime reload"
        echo "  $0 logs       # View logs"
        exit 1
        ;;
esac

