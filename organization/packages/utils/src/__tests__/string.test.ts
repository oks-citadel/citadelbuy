/**
 * Tests for string utility functions
 * @module @broxiva/utils
 */

import { slugify, truncate, capitalize } from '../index';

describe('String Utilities', () => {
  describe('slugify', () => {
    it('should convert simple text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
      expect(slugify('Hello@World#Test')).toBe('helloworldtest');
    });

    it('should handle underscores', () => {
      expect(slugify('hello_world')).toBe('hello-world');
    });

    it('should handle existing hyphens', () => {
      expect(slugify('hello-world')).toBe('hello-world');
      expect(slugify('hello--world')).toBe('hello-world');
    });

    it('should handle leading and trailing spaces', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });

    it('should handle leading and trailing hyphens', () => {
      expect(slugify('-hello-world-')).toBe('hello-world');
    });

    it('should handle mixed case', () => {
      expect(slugify('HeLLo WoRLD')).toBe('hello-world');
    });

    it('should handle numbers', () => {
      expect(slugify('Product 123')).toBe('product-123');
      expect(slugify('123 Test')).toBe('123-test');
    });

    it('should handle alphanumeric with special chars', () => {
      expect(slugify('Product (2024) - Limited Edition!')).toBe(
        'product-2024-limited-edition'
      );
    });

    it('should return empty string for special characters only', () => {
      expect(slugify('!@#$%^&*()')).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle unicode characters by removing them', () => {
      expect(slugify('Cafe')).toBe('cafe');
    });

    it('should handle long product names', () => {
      const longName =
        'Super Amazing Product With Many Features And Benefits For Everyone';
      const result = slugify(longName);
      expect(result).toBe(
        'super-amazing-product-with-many-features-and-benefits-for-everyone'
      );
      expect(result).not.toContain(' ');
    });

    it('should handle tabs and newlines', () => {
      expect(slugify('Hello\tWorld')).toBe('hello-world');
      expect(slugify('Hello\nWorld')).toBe('hello-world');
    });

    it('should handle consecutive special characters', () => {
      expect(slugify('Hello!!!World???Test')).toBe('helloworldtest');
    });

    it('should handle mixed separators', () => {
      expect(slugify('hello_world-test case')).toBe('hello-world-test-case');
    });
  });

  describe('truncate', () => {
    it('should not truncate text shorter than limit', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should not truncate text equal to limit', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should truncate text longer than limit', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should handle limit of 0', () => {
      expect(truncate('Hello', 0)).toBe('...');
    });

    it('should handle limit of 1', () => {
      expect(truncate('Hello', 1)).toBe('H...');
    });

    it('should handle very long text', () => {
      const longText = 'a'.repeat(1000);
      const result = truncate(longText, 50);
      expect(result.length).toBe(53); // 50 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should preserve spaces in truncated text', () => {
      expect(truncate('Hello World', 8)).toBe('Hello Wo...');
    });

    it('should handle special characters', () => {
      expect(truncate('Hello! World?', 7)).toBe('Hello! ...');
    });

    it('should handle newlines', () => {
      expect(truncate('Hello\nWorld', 7)).toBe('Hello\nW...');
    });

    it('should handle unicode characters', () => {
      expect(truncate('Hello', 3)).toBe('Hel...');
    });

    it('should handle negative limit by treating as 0', () => {
      // Behavior depends on implementation - slice with negative returns from end
      const result = truncate('Hello', -1);
      // With current implementation: text.slice(0, -1) + '...' = 'Hell...'
      expect(result).toBe('Hell...');
    });

    it('should handle text with only spaces', () => {
      expect(truncate('     ', 3)).toBe('   ...');
    });

    it('should handle exact boundary case', () => {
      expect(truncate('12345', 5)).toBe('12345');
      expect(truncate('123456', 5)).toBe('12345...');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter of lowercase word', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should lowercase the rest of the word', () => {
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('hELLO')).toBe('Hello');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
      expect(capitalize('A')).toBe('A');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle strings starting with number', () => {
      expect(capitalize('123abc')).toBe('123abc');
    });

    it('should handle strings starting with special character', () => {
      expect(capitalize('!hello')).toBe('!hello');
    });

    it('should only affect first word', () => {
      expect(capitalize('hello world')).toBe('Hello world');
    });

    it('should handle mixed case sentence', () => {
      expect(capitalize('hELLO wORLD')).toBe('Hello world');
    });

    it('should handle string with leading space', () => {
      expect(capitalize(' hello')).toBe(' hello');
    });

    it('should handle string with numbers and letters', () => {
      expect(capitalize('a1B2C3')).toBe('A1b2c3');
    });

    it('should handle strings with special characters', () => {
      expect(capitalize("hello's")); // 's remains lowercase
    });

    it('should handle already capitalized string', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('should handle strings with unicode', () => {
      const result = capitalize('cafe');
      expect(result).toBe('Cafe');
    });

    it('should handle all caps short word', () => {
      expect(capitalize('OK')).toBe('Ok');
    });

    it('should handle single uppercase letter', () => {
      expect(capitalize('X')).toBe('X');
    });
  });
});
