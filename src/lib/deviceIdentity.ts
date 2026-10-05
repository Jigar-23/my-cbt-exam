/**
 * CBT Device Identity & Physical Address Provider
 * 
 * Extracts permanent physical hardware identifier:
 * - Android: ANDROID_ID + Manufacturer + Model (e.g. ANDROID-SAMSUNG-SM-S942B-8a7f9b...)
 * - Desktop (Electron): Physical Network Interface MAC Address (e.g. MAC-3A:4F:C2:91:0A:B4)
 * - Web Browser: Cryptographically persistent hardware UUID in localStorage
 */

const STORAGE_KEY_PHYSICAL_ID = 'cbt_device_physical_id';
const STORAGE_KEY_USER_MOBILE = 'cbt_user_mobile_number';
let cachedDeviceId: string | null = null;
let cachedMobileNumber: string | null = null;

/**
 * Returns the candidate's verified mobile number if set
 */
export function getUserMobileNumber(): string {
  if (cachedMobileNumber) return cachedMobileNumber;
  if (typeof window === 'undefined') return '';
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USER_MOBILE);
    if (stored && stored.trim()) {
      cachedMobileNumber = stored.trim();
      return cachedMobileNumber;
    }
  } catch {}
  return '';
}

/**
 * Saves the candidate's mobile number
 */
export function setUserMobileNumber(phone: string): void {
  const clean = (phone || '').replace(/[^0-9+]/g, '').trim();
  cachedMobileNumber = clean;
  if (typeof window !== 'undefined') {
    try {
      if (clean) {
        localStorage.setItem(STORAGE_KEY_USER_MOBILE, clean);
      } else {
        localStorage.removeItem(STORAGE_KEY_USER_MOBILE);
      }
      window.dispatchEvent(new CustomEvent('cbt_mobile_updated', { detail: { mobileNumber: clean } }));
    } catch {}
  }
}

/**
 * Requests phone permission on Android and attempts reading SIM phone number
 */
export async function requestDevicePhoneNumber(): Promise<{ phoneNumber: string; permissionGranted: boolean }> {
  if (typeof window === 'undefined') {
    return { phoneNumber: '', permissionGranted: false };
  }

  const existing = getUserMobileNumber();
  if (existing) {
    return { phoneNumber: existing, permissionGranted: true };
  }

  const win = window as any;
  if (win.Capacitor?.Plugins?.SystemTheme?.requestPhonePermission) {
    try {
      const res = await win.Capacitor.Plugins.SystemTheme.requestPhonePermission();
      if (res?.phoneNumber && typeof res.phoneNumber === 'string' && res.phoneNumber.trim()) {
        const clean = res.phoneNumber.trim();
        setUserMobileNumber(clean);
        return { phoneNumber: clean, permissionGranted: true };
      }
      return { phoneNumber: '', permissionGranted: Boolean(res?.permissionGranted) };
    } catch (e) {
      console.warn('[DeviceIdentity] Native phone number request error:', e);
    }
  }

  return { phoneNumber: '', permissionGranted: false };
}

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
