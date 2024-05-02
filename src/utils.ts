import type { HrTime } from '../deps.ts';

const NANOSECOND_DIGITS = 9;
const NANOSECOND_DIGITS_IN_MILLIS = 6;
const MILLISECONDS_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS_IN_MILLIS);

/**
 * Convert hrTime to milliseconds.
 */
export function hrTimeToMilliseconds(time: HrTime): number {
    return time[0] * 1e3 + time[1] / 1e6;
}

/**
 * Converts a number of milliseconds from epoch to HrTime([seconds, remainder in nanoseconds]).
 * @param epochMillis
 */
export function millisToHrTime(epochMillis: number): HrTime {
    const epochSeconds = epochMillis / 1000;
    // Decimals only.
    const seconds = Math.trunc(epochSeconds);
    // Round sub-nanosecond accuracy to nanosecond.
    const nanos = Math.round(
        (epochMillis % 1000) * MILLISECONDS_TO_NANOSECONDS,
    );
    return [seconds, nanos];
}
