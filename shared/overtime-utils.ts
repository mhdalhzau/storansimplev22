// Overtime calculation utilities for proper 60-minute/1-hour increments

export interface OvertimeCalculation {
  totalMinutes: number;
  totalHours: number;
  hourlyRate?: number;
  overtimePay?: number;
}

/**
 * Calculate overtime from minutes, ensuring proper 60-minute increments
 * @param minutes Total overtime minutes
 * @param hourlyRate Optional hourly rate for pay calculation
 * @returns Overtime calculation with proper rounding
 */
export function calculateOvertimeFromMinutes(
  minutes: number, 
  hourlyRate?: number
): OvertimeCalculation {
  // Ensure non-negative input
  const totalMinutes = Math.max(0, Math.floor(minutes));
  
  // Calculate hours with proper rounding (to 2 decimal places)
  const totalHours = Math.round(totalMinutes / 60 * 100) / 100;
  
  const result: OvertimeCalculation = {
    totalMinutes,
    totalHours
  };
  
  // Calculate pay if hourly rate is provided
  if (hourlyRate && hourlyRate > 0) {
    result.hourlyRate = hourlyRate;
    // Overtime pay is typically 1.5x the regular hourly rate
    result.overtimePay = Math.round(totalHours * hourlyRate * 1.5 * 100) / 100;
  }
  
  return result;
}

/**
 * Calculate overtime from hours, ensuring proper increments
 * @param hours Total overtime hours
 * @param hourlyRate Optional hourly rate for pay calculation
 * @returns Overtime calculation
 */
export function calculateOvertimeFromHours(
  hours: number, 
  hourlyRate?: number
): OvertimeCalculation {
  // Ensure non-negative input and round to 2 decimal places
  const totalHours = Math.max(0, Math.round(hours * 100) / 100);
  const totalMinutes = Math.round(totalHours * 60);
  
  const result: OvertimeCalculation = {
    totalMinutes,
    totalHours
  };
  
  // Calculate pay if hourly rate is provided
  if (hourlyRate && hourlyRate > 0) {
    result.hourlyRate = hourlyRate;
    result.overtimePay = Math.round(totalHours * hourlyRate * 1.5 * 100) / 100;
  }
  
  return result;
}

/**
 * Format overtime duration for display
 * @param minutes Total minutes
 * @returns Formatted string (e.g., "2 jam 30 menit" or "1.5 jam")
 */
export function formatOvertimeDuration(minutes: number): string {
  const totalMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes} menit`;
  }
  
  if (remainingMinutes === 0) {
    return `${hours} jam`;
  }
  
  // Show both hours and minutes if there are remainders
  return `${hours} jam ${remainingMinutes} menit`;
}

/**
 * Format overtime hours for display (decimal format)
 * @param hours Total hours as decimal
 * @returns Formatted string (e.g., "2.5 jam")
 */
export function formatOvertimeHours(hours: number): string {
  const totalHours = Math.max(0, Math.round(hours * 100) / 100);
  return `${totalHours} jam`;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 * @param timeString Time in HH:MM format
 * @returns Minutes since midnight
 */
export function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + minutes;
}

/**
 * Detect shift based on check-in time
 * @param checkInTime Check-in time in HH:MM format
 * @returns Shift type ('pagi', 'siang', 'malam')
 */
export function detectShiftFromTime(checkInTime: string): string {
  const checkInMinutes = timeStringToMinutes(checkInTime);
  
  // Shift detection logic aligned with actual shift schedules:
  // Pagi: 05:00 - 13:00 (300 - 780 minutes)
  if (checkInMinutes >= 300 && checkInMinutes < 780) {
    return 'pagi';
  }
  
  // Siang: 13:00 - 22:00 (780 - 1320 minutes)
  if (checkInMinutes >= 780 && checkInMinutes < 1320) {
    return 'siang';
  }
  
  // Malam: 22:00 - 05:00 (1320+ minutes or early morning 0-300 minutes)
  return 'malam';
}

/**
 * Calculate overtime based on shift schedule
 * @param checkIn Check-in time (HH:MM)
 * @param checkOut Check-out time (HH:MM)
 * @param shift Shift type ('pagi', 'siang', 'malam')
 * @returns Overtime calculation
 */
export function calculateShiftOvertime(
  checkIn: string,
  checkOut: string,
  shift: string
): OvertimeCalculation {
  const shiftSchedules = {
    pagi: { start: '08:00', end: '17:00', crossMidnight: false },
    siang: { start: '12:00', end: '21:00', crossMidnight: false },
    malam: { start: '22:00', end: '07:00', crossMidnight: true }
  };
  
  const schedule = shiftSchedules[shift as keyof typeof shiftSchedules];
  if (!schedule) {
    return { totalMinutes: 0, totalHours: 0 };
  }
  
  if (schedule.crossMidnight) {
    // Night shift crosses midnight (22:00 to 07:00 next day)
    // Use Date objects for proper cross-midnight calculation
    const baseDate = new Date('2024-01-01');
    const nextDate = new Date('2024-01-02');
    
    // Parse times with proper date context
    const checkInTime = new Date(`${baseDate.toDateString()} ${checkIn}`);
    const checkOutTime = checkOut < '12:00' 
      ? new Date(`${nextDate.toDateString()} ${checkOut}`) // Next day morning
      : new Date(`${baseDate.toDateString()} ${checkOut}`); // Same day evening
    
    // Shift end is always next day morning at 07:00
    const shiftEndTime = new Date(`${nextDate.toDateString()} ${schedule.end}`);
    
    // Calculate overtime only after shift end (07:00 next day)
    const overtimeMs = Math.max(0, checkOutTime.getTime() - shiftEndTime.getTime());
    const overtimeMinutes = Math.floor(overtimeMs / (1000 * 60));
    
    return calculateOvertimeFromMinutes(overtimeMinutes);
  } else {
    // Regular day shift - same day calculation
    const checkOutMinutes = timeStringToMinutes(checkOut);
    const shiftEndMinutes = timeStringToMinutes(schedule.end);
    
    const overtimeMinutes = Math.max(0, checkOutMinutes - shiftEndMinutes);
    return calculateOvertimeFromMinutes(overtimeMinutes);
  }
}