# React Debugging Setup

This document explains how to debug React components in the browser.

## Browser Setup

### 1. Install React DevTools Extension

Install the React Developer Tools browser extension:

- **Chrome/Edge**: [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- **Firefox**: [React Developer Tools](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)
- **Safari**: Available through standalone app or browser extension

### 2. Enable Source Maps

Source maps are **automatically enabled in development mode**. This allows you to:
- See original TypeScript/React code in browser DevTools
- Set breakpoints in your source files
- See meaningful stack traces

### 3. Production Source Maps (Optional)

To enable source maps in production builds (useful for debugging production issues):

```bash
# Set environment variable before building
export ENABLE_SOURCE_MAPS=true
npm run build
```

**Note**: Production source maps increase build time and bundle size. Only enable when needed for debugging.

## Debugging Techniques

### 1. Using Browser DevTools

1. Open your browser's Developer Tools (F12 or Right-click → Inspect)
2. Go to the **Sources** tab (Chrome) or **Debugger** tab (Firefox)
3. Navigate to your source files:
   - Look for `webpack://` → `.` → `app/` or `lib/`
   - Or use `Ctrl+P` (Cmd+P on Mac) to search for files
4. Set breakpoints by clicking on line numbers
5. Refresh the page to trigger breakpoints

### 2. Using React DevTools

1. Open React DevTools (should appear as a tab in your browser DevTools)
2. **Components** tab: Inspect component tree, props, state, and hooks
3. **Profiler** tab: Analyze component performance and render times

### 3. Console Debugging

Add `console.log`, `console.debug`, or `debugger` statements in your code:

```typescript
// In your React component
useEffect(() => {
  console.log('Component mounted', { deviceId, temperaturePeriod });
  debugger; // Pauses execution if DevTools is open
}, [deviceId, temperaturePeriod]);
```

### 4. Network Tab

- Monitor API calls in the **Network** tab
- Check request/response payloads
- Verify authentication headers and cookies

## Development vs Production

### Development Mode (`npm run dev`)
- Source maps: ✅ Enabled automatically
- Minification: ❌ Disabled
- React DevTools: ✅ Full support
- Hot reload: ✅ Enabled

### Production Mode (`npm run build` + `npm start`)
- Source maps: ⚠️ Disabled by default (can enable with `ENABLE_SOURCE_MAPS=true`)
- Minification: ✅ Enabled
- React DevTools: ✅ Works (but less useful without source maps)
- Hot reload: ❌ Disabled

## Troubleshooting

### Source Maps Not Working?

1. **Clear browser cache** and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. **Check DevTools settings**:
   - Chrome: Settings → Preferences → Sources → Enable "Enable JavaScript source maps"
   - Firefox: Settings → Advanced → Enable "Show original sources"
3. **Verify build**: Make sure you're running `npm run dev` for development

### React DevTools Not Showing Components?

1. Make sure the extension is installed and enabled
2. Refresh the page
3. Check if you're on a React page (not a static HTML page)
4. Try restarting the browser

### Breakpoints Not Hitting?

1. Make sure source maps are enabled
2. Check that you're setting breakpoints in the **original source files**, not the bundled/minified code
3. Verify the code path is actually being executed
4. Try using `debugger;` statements instead

## Best Practices

1. **Use React DevTools** for component inspection and state debugging
2. **Use browser DevTools** for network requests, performance profiling, and JavaScript debugging
3. **Add meaningful console logs** with context (component name, props, state)
4. **Use TypeScript** - it helps catch errors before runtime
5. **Test in development first** before debugging production issues

## Example: Debugging a Component

```typescript
// app/devices/[deviceId]/page.tsx
export default function DeviceDetailPage() {
  const [temperaturePeriod, setTemperaturePeriod] = useState("1h");
  
  useEffect(() => {
    // Debug: Log when period changes
    console.log('[DeviceDetailPage] Period changed:', temperaturePeriod);
    debugger; // Pause here to inspect state
    
    fetchDeviceDetails(temperaturePeriod);
  }, [temperaturePeriod]);
  
  // ... rest of component
}
```

Then in browser DevTools:
1. Open Console tab to see logs
2. Open Sources tab to see the breakpoint
3. Inspect variables in the Scope panel
4. Step through code using debug controls

