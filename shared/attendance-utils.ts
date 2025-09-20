// Attendance calculation utilities

// Shift time definitions (Indonesian SPBU shift standards)
const SHIFT_SCHEDULES = {
  pagi: { start: '07:00', end: '15:00' },
  siang: { start: '15:00', end: '23:00' },
  malam: { start: '23:00', end: '07:00' }
};

// Day boundary reset at 3 AM WIB (Indonesia business standard)
const DAY_RESET_HOUR = 3;

// Convert time string (HH:MM) to minutes since day reset (3 AM)
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;
  
  // Adjust for 3 AM day reset
  // Times from 03:00 - 23:59 are positive
  // Times from 00:00 - 02:59 are considered next day (+24 hours)
  if (hours < DAY_RESET_HOUR) {
    totalMinutes += 24 * 60; // Add 24 hours for next day
  }
  
  // Normalize to start from 3 AM = 0
  totalMinutes -= DAY_RESET_HOUR * 60;
  
  return totalMinutes;
}

// Convert minutes since midnight to time string (HH:MM)
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Auto-detect shift based on check-in time
export function detectShift(checkInTime: string): string {
  const checkInMinutes = timeToMinutes(checkInTime);
  
  // With 3 AM reset:
  // 3 AM = 0 minutes, 7 AM = 240 minutes, 15 PM = 720 minutes, 23 PM = 1200 minutes
  // 1 AM (next day) = 1320 minutes, 2 AM (next day) = 1380 minutes
  
  // Pagi shift: 05:00 - 13:00 (120 - 600 minutes from 3 AM)
  if (checkInMinutes >= 120 && checkInMinutes < 600) { // 5:00 - 13:00
    return 'pagi';
  }
  
  // Siang shift: 13:00 - 21:00 (600 - 1080 minutes from 3 AM)
  if (checkInMinutes >= 600 && checkInMinutes < 1080) { // 13:00 - 21:00
    return 'siang';
  }
  
  // Malam shift: 21:00 - 05:00 (1080+ minutes or early morning 0-120 minutes)
  return 'malam';
}

// Calculate lateness in minutes
export function calculateLateness(checkInTime: string, shift: string): number {
  const checkInMinutes = timeToMinutes(checkInTime);
  const shiftStartMinutes = timeToMinutes(SHIFT_SCHEDULES[shift as keyof typeof SHIFT_SCHEDULES].start);
  
  // With 3 AM reset, all calculations are simpler:
  // Pagi: 7 AM = 240 minutes, Siang: 3 PM = 720 minutes, Malam: 11 PM = 1200 minutes
  
  return Math.max(0, checkInMinutes - shiftStartMinutes);
}

// Calculate overtime in minutes
export function calculateOvertime(checkOutTime: string, shift: string): number {
  if (!checkOutTime) return 0;
  
  const shiftStart = timeToMinutes(SHIFT_SCHEDULES[shift as keyof typeof SHIFT_SCHEDULES].start);
  let shiftEnd = timeToMinutes(SHIFT_SCHEDULES[shift as keyof typeof SHIFT_SCHEDULES].end);
  let checkOut = timeToMinutes(checkOutTime);
  
  // Handle wrap-around shifts (night shift: 23:00-07:00)
  // For shifts where end < start, normalize to continuous timeline
  if (shiftEnd <= shiftStart) {
    shiftEnd += 1440; // Add 24 hours to end time
  }
  
  // If checkout is before shift start, it's part of next day
  if (checkOut < shiftStart) {
    checkOut += 1440; // Add 24 hours to checkout time
  }
  
  return Math.max(0, checkOut - shiftEnd);
}

// Get current month's day count
export function getCurrentMonthDays(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return new Date(year, month + 1, 0).getDate();
}

// Format attendance data for display
export function formatAttendanceData(attendance: {
  checkIn: string;
  checkOut: string | null;
  shift: string;
  latenessMinutes: number;
  overtimeMinutes: number;
}) {
  return {
    jamMasuk: attendance.checkIn,
    jamKeluar: attendance.checkOut || '-',
    shift: attendance.shift,
    telat: `${attendance.latenessMinutes} menit`,
    lembur: `${attendance.overtimeMinutes} menit`
  };
}