/**
 * Tests for date utility functions
 * @module @broxiva/utils
 */

import { vi } from 'vitest';
import { formatDate, formatDateTime, timeAgo } from '../index';

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('should format a Date object with default format', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/Mar 15, 2024/);
    });

    it('should format an ISO string with default format', () => {
      const dateStr = '2024-03-15T10:30:00Z';
      const result = formatDate(dateStr);
      expect(result).toMatch(/Mar 15, 2024/);
    });

    it('should format with custom format string', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      const result = formatDate(date, 'yyyy-MM-dd');
      expect(result).toBe('2024-03-15');
    });

    it('should handle different date formats', () => {
      // Use local date to avoid timezone conversion issues
      const date = new Date(2024, 11, 25, 12, 0, 0); // Dec 25, 2024 noon local time

      expect(formatDate(date, 'dd/MM/yyyy')).toBe('25/12/2024');
      expect(formatDate(date, 'MMMM d, yyyy')).toBe('December 25, 2024');
      expect(formatDate(date, 'EEE, MMM d')).toMatch(/Wed, Dec 25/);
    });

    it('should handle dates at year boundaries', () => {
      // Use local dates to avoid timezone conversion issues
      const newYearEve = new Date(2024, 11, 31, 23, 59, 59); // Dec 31, 2024 local
      const newYearDay = new Date(2025, 0, 1, 12, 0, 0); // Jan 1, 2025 local

      expect(formatDate(newYearEve, 'yyyy')).toBe('2024');
      expect(formatDate(newYearDay, 'yyyy')).toBe('2025');
    });

    it('should handle leap year dates', () => {
      const leapDay = new Date('2024-02-29T12:00:00Z');
      expect(formatDate(leapDay, 'MMM dd, yyyy')).toBe('Feb 29, 2024');
    });

    it('should handle dates with different timezones in ISO string', () => {
      const dateStr = '2024-03-15T10:30:00+05:00';
      const result = formatDate(dateStr);
      expect(result).toContain('Mar');
      expect(result).toContain('2024');
    });

    it('should handle beginning of Unix epoch', () => {
      // Use local date to avoid timezone conversion issues
      const epoch = new Date(1970, 0, 1, 12, 0, 0); // Jan 1, 1970 noon local time
      expect(formatDate(epoch, 'yyyy-MM-dd')).toBe('1970-01-01');
    });

    it('should handle dates in the past', () => {
      const oldDate = new Date('1999-12-31T23:59:59Z');
      expect(formatDate(oldDate, 'yyyy-MM-dd')).toBe('1999-12-31');
    });

    it('should handle dates in the future', () => {
      const futureDate = new Date('2099-06-15T10:00:00Z');
      expect(formatDate(futureDate, 'yyyy-MM-dd')).toBe('2099-06-15');
    });
  });

  describe('formatDateTime', () => {
    it('should format a Date object with date and time', () => {
      const date = new Date('2024-03-15T14:30:00Z');
      const result = formatDateTime(date);
      expect(result).toContain('Mar');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format an ISO string with date and time', () => {
      const dateStr = '2024-03-15T14:30:00Z';
      const result = formatDateTime(dateStr);
      expect(result).toContain('Mar');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should include time component', () => {
      const date = new Date('2024-03-15T14:30:00');
      const result = formatDateTime(date);
      // Should contain time in HH:mm format
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should handle midnight', () => {
      const midnight = new Date('2024-03-15T00:00:00');
      const result = formatDateTime(midnight);
      expect(result).toMatch(/00:00/);
    });

    it('should handle noon', () => {
      const noon = new Date('2024-03-15T12:00:00');
      const result = formatDateTime(noon);
      expect(result).toMatch(/12:00/);
    });

    it('should handle end of day', () => {
      const endOfDay = new Date('2024-03-15T23:59:00');
      const result = formatDateTime(endOfDay);
      expect(result).toMatch(/23:59/);
    });
  });

  describe('timeAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "less than a minute ago" for very recent dates', () => {
      const now = new Date('2024-03-15T10:00:00Z');
      vi.setSystemTime(now);

      const recentDate = new Date('2024-03-15T09:59:30Z');
      const result = timeAgo(recentDate);
      expect(result).toContain('ago');
    });

    it('should return "X minutes ago" for dates within an hour', () => {
      const now = new Date('2024-03-15T10:30:00Z');
      vi.setSystemTime(now);

      const thirtyMinAgo = new Date('2024-03-15T10:00:00Z');
      const result = timeAgo(thirtyMinAgo);
      expect(result).toMatch(/30 minutes ago|about 30 minutes ago/);
    });

    it('should return "X hours ago" for dates within a day', () => {
      const now = new Date('2024-03-15T14:00:00Z');
      vi.setSystemTime(now);

      const fiveHoursAgo = new Date('2024-03-15T09:00:00Z');
      const result = timeAgo(fiveHoursAgo);
      expect(result).toMatch(/5 hours ago|about 5 hours ago/);
    });

    it('should return "X days ago" for dates within a month', () => {
      const now = new Date('2024-03-15T10:00:00Z');
      vi.setSystemTime(now);

      const threeDaysAgo = new Date('2024-03-12T10:00:00Z');
      const result = timeAgo(threeDaysAgo);
      expect(result).toMatch(/3 days ago/);
    });

    it('should return "X months ago" for dates within a year', () => {
      const now = new Date('2024-03-15T10:00:00Z');
      vi.setSystemTime(now);

      const twoMonthsAgo = new Date('2024-01-15T10:00:00Z');
      const result = timeAgo(twoMonthsAgo);
      expect(result).toMatch(/2 months ago|about 2 months ago/);
    });

    it('should return "X years ago" for older dates', () => {
      const now = new Date('2024-03-15T10:00:00Z');
      vi.setSystemTime(now);

      const twoYearsAgo = new Date('2022-03-15T10:00:00Z');
      const result = timeAgo(twoYearsAgo);
      expect(result).toMatch(/2 years ago|about 2 years ago/);
    });

    it('should handle ISO string input', () => {
      const now = new Date('2024-03-15T10:00:00Z');
      vi.setSystemTime(now);

      const result = timeAgo('2024-03-14T10:00:00Z');
      expect(result).toContain('ago');
    });

    it('should handle Date object input', () => {
      const now = new Date('2024-03-15T10:00:00Z');
      vi.setSystemTime(now);

      const yesterdayDate = new Date('2024-03-14T10:00:00Z');
      const result = timeAgo(yesterdayDate);
      expect(result).toContain('ago');
    });

    it('should include "ago" suffix', () => {
      const now = new Date('2024-03-15T10:00:00Z');
      vi.setSystemTime(now);

      const pastDate = new Date('2024-03-14T10:00:00Z');
      const result = timeAgo(pastDate);
      expect(result).toContain('ago');
    });

    it('should handle "in X time" for future dates', () => {
      const now = new Date('2024-03-15T10:00:00Z');
      vi.setSystemTime(now);

      const futureDate = new Date('2024-03-16T10:00:00Z');
      const result = timeAgo(futureDate);
      expect(result).toMatch(/in/);
    });
  });
});
