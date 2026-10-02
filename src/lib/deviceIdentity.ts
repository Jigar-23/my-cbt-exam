/**
 * CBT Device Identity & Physical Address Provider
 * 
 * Extracts permanent physical hardware identifier:
 * - Android: ANDROID_ID + Manufacturer + Model (e.g. ANDROID-SAMSUNG-SM-S942B-8a7f9b...)
 * - Desktop (Electron): Physical Network Interface MAC Address (e.g. MAC-3A:4F:C2:91:0A:B4)
 * - Web Browser: Cryptographically persistent hardware UUID in localStorage
 */

const STORAGE_KEY_PHYSICAL_ID = 'cbt_device_physical_id';
let cachedDeviceId: string | null = null;

/**
 * Returns the permanent physical address / hardware ID of the current device.
 */
export async function getDevicePhysicalId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  if (typeof window === 'undefined') {
    return 'SERVER-STATIC-NODE';
  }

  const win = window as any;

  // 1. Check Electron Desktop (Physical MAC Address)
  if (win.electronAPI?.getDevicePhysicalId) {
    try {
      const macId = await win.electronAPI.getDevicePhysicalId();
      if (macId && typeof macId === 'string' && macId.trim()) {
        const id = macId.trim();
        cachedDeviceId = id;
        try {
          localStorage.setItem(STORAGE_KEY_PHYSICAL_ID, id);
        } catch {}
        return id;
      }
    } catch (e) {
      console.warn('[DeviceIdentity] Electron MAC extraction warning:', e);
    }
  }

  // 2. Check Android Native (Capacitor Android ID + Model)
  if (win.Capacitor?.Plugins?.SystemTheme?.getDevicePhysicalId) {
    try {
      const res = await win.Capacitor.Plugins.SystemTheme.getDevicePhysicalId();
      if (res?.physicalId && typeof res.physicalId === 'string' && res.physicalId.trim()) {
        const id = res.physicalId.trim();
        cachedDeviceId = id;
        try {
          localStorage.setItem(STORAGE_KEY_PHYSICAL_ID, id);
        } catch {}
        return id;
      }
    } catch (e) {
      console.warn('[DeviceIdentity] Capacitor Android ID extraction warning:', e);
    }
  }

  // 3. Persistent LocalStorage Cached ID
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PHYSICAL_ID);
    if (stored) {
      const clean = stored.trim();
      if (clean) {
        cachedDeviceId = clean;
        return clean;
      }
    }
  } catch {}

  // 4. Generate persistent hardware UUID for Web / Fallback
  let randomUuid = '';
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    randomUuid = crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
  } else {
    randomUuid = Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString(36).toUpperCase();
  }
  
  const generatedId = `WEB-NODE-${randomUuid}`;
  cachedDeviceId = generatedId;
  try {
    localStorage.setItem(STORAGE_KEY_PHYSICAL_ID, generatedId);
  } catch {}
  return generatedId;
}
