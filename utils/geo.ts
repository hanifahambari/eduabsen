/**
 * Geolocation & Haversine Distance Calculation Utilities
 * Calculates distance between two coordinates in meters using Haversine formula
 */
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d);
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/**
 * Attempts to get user's current GPS position
 */
export function getCurrentPosition(): Promise<GeoLocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser Anda tidak mendukung Geolocation GPS.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        let msg = 'Gagal membaca lokasi GPS.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Izin lokasi (GPS) ditolak oleh browser. Android: 🔒 di bilah URL → Setelan Situs → Lokasi → "Izinkan". iPhone: Pengaturan → Safari → Lokasi → "Izinkan". Lalu refresh halaman.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Informasi lokasi tidak tersedia. Coba di area terbuka, pastikan GPS HP aktif (Mode Akurasi Tinggi), dan tidak di mode penerbangan.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Permintaan GPS timeout (10s). Coba di area terbuka, pastikan sinyal GPS kuat, lalu tekan "Perbarui GPS" lagi.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  });
}

/**
 * Play a crisp success beep using Web Audio API
 */
export function playSuccessBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Ignore audio autoplay restrictions gracefully
  }
}

/**
 * Play a soft warning beep
 */
export function playWarningBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.setValueAtTime(280, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignore
  }
}
