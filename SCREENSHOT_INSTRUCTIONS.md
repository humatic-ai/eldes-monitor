# Taking Screenshot of Demo Temperature Graph

## Important Note

The demo credentials (`demo@eldes.demo` / `demo`) are stored in the database but **cannot be used for login** because the application authenticates against the real ELDES Cloud API. 

However, the demo device with ID `999999999999999` has been associated with your existing credentials and contains **2,160 temperature records** (30 days of data from 3 sensors).

## Steps to Take Screenshot

1. **Log in with your real ELDES Cloud API credentials**
   - Go to: https://humaticai.com/eldes/login
   - Use your actual ELDES Cloud API credentials

2. **Navigate to the demo device**
   - After logging in, go to: https://humaticai.com/eldes/devices/999999999999999
   - Or find "Demo ELDES Device" in your device list

3. **Select a time period**
   - Choose a period that shows good data (e.g., "24h", "1w", or "All")
   - Wait for the graph to load

4. **Take the screenshot**
   - Use your browser's screenshot tool or a screen capture application
   - Save as: `docs/images/temperature-graph.png`

5. **Add to repository**
   ```bash
   cd /home/bitnami/eldes
   git add docs/images/temperature-graph.png
   git commit -m "Add temperature graph screenshot with demo data"
   git push origin main
   ```

## Demo Data Details

- **Device ID:** 999999999999999
- **Device Name:** Demo ELDES Device
- **Temperature Records:** 2,160 (30 days × 24 hours × 3 sensors)
- **Sensors:** Sensor 1, Sensor 2, Sensor 3
- **Time Range:** Last 30 days with realistic day/night variations
