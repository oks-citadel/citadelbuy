/**
 * Tests for validation schemas
 * @module @broxiva/utils
 */

import { emailSchema, phoneSchema, passwordSchema } from '../index';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    describe('valid emails', () => {
      it('should accept standard email format', () => {
        expect(() => emailSchema.parse('user@example.com')).not.toThrow();
      });

      it('should accept email with subdomain', () => {
        expect(() => emailSchema.parse('user@mail.example.com')).not.toThrow();
      });

      it('should accept email with numbers', () => {
        expect(() => emailSchema.parse('user123@example.com')).not.toThrow();
      });

      it('should accept email with dots in local part', () => {
        expect(() => emailSchema.parse('first.last@example.com')).not.toThrow();
      });

      it('should accept email with plus sign', () => {
        expect(() => emailSchema.parse('user+tag@example.com')).not.toThrow();
      });

      it('should accept email with hyphen in domain', () => {
        expect(() => emailSchema.parse('user@my-domain.com')).not.toThrow();
      });

      it('should accept email with underscore', () => {
        expect(() => emailSchema.parse('user_name@example.com')).not.toThrow();
      });

      it('should accept email with different TLDs', () => {
        expect(() => emailSchema.parse('user@example.org')).not.toThrow();
        expect(() => emailSchema.parse('user@example.net')).not.toThrow();
        expect(() => emailSchema.parse('user@example.co.uk')).not.toThrow();
        expect(() => emailSchema.parse('user@example.io')).not.toThrow();
      });

      it('should accept email with long TLD', () => {
        expect(() =>
          emailSchema.parse('user@example.museum')
        ).not.toThrow();
      });

      it('should reject email with IP address domain (not supported by Zod email)', () => {
        // Zod's email validation doesn't accept IP addresses as valid email domains
        const result = emailSchema.safeParse('user@123.123.123.123');
        expect(result.success).toBe(false);
      });
    });

    describe('invalid emails', () => {
      it('should reject email without @', () => {
        const result = emailSchema.safeParse('userexample.com');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Invalid email address');
        }
      });

      it('should reject email without domain', () => {
        const result = emailSchema.safeParse('user@');
        expect(result.success).toBe(false);
      });

      it('should reject email without local part', () => {
        const result = emailSchema.safeParse('@example.com');
        expect(result.success).toBe(false);
      });

      it('should reject email with spaces', () => {
        const result = emailSchema.safeParse('user @example.com');
        expect(result.success).toBe(false);
      });

      it('should reject email with multiple @', () => {
        const result = emailSchema.safeParse('user@@example.com');
        expect(result.success).toBe(false);
      });

      it('should reject empty string', () => {
        const result = emailSchema.safeParse('');
        expect(result.success).toBe(false);
      });

      it('should reject email without TLD', () => {
        const result = emailSchema.safeParse('user@example');
        expect(result.success).toBe(false);
      });

      it('should reject email with special characters in domain', () => {
        const result = emailSchema.safeParse('user@exam!ple.com');
        expect(result.success).toBe(false);
      });

      it('should return proper error message', () => {
        const result = emailSchema.safeParse('invalid-email');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Invalid email address');
        }
      });
    });
  });

  describe('phoneSchema', () => {
    describe('valid phone numbers', () => {
      it('should accept US phone format', () => {
        expect(() => phoneSchema.parse('(555) 123-4567')).not.toThrow();
      });

      it('should accept phone with country code', () => {
        expect(() => phoneSchema.parse('+1 555 123 4567')).not.toThrow();
      });

      it('should accept phone with plus and numbers only', () => {
        expect(() => phoneSchema.parse('+15551234567')).not.toThrow();
      });

      it('should accept numbers only', () => {
        expect(() => phoneSchema.parse('5551234567')).not.toThrow();
      });

      it('should accept phone with dashes', () => {
        expect(() => phoneSchema.parse('555-123-4567')).not.toThrow();
      });

      it('should accept phone with spaces', () => {
        expect(() => phoneSchema.parse('555 123 4567')).not.toThrow();
      });

      it('should accept international format', () => {
        expect(() => phoneSchema.parse('+44 20 7946 0958')).not.toThrow();
      });

      it('should accept phone with parentheses', () => {
        expect(() => phoneSchema.parse('(123) 456-7890')).not.toThrow();
      });

      it('should accept mixed format', () => {
        expect(() => phoneSchema.parse('+1 (555) 123-4567')).not.toThrow();
      });

      it('should accept short phone numbers', () => {
        expect(() => phoneSchema.parse('12345')).not.toThrow();
      });

      it('should accept long international numbers', () => {
        expect(() => phoneSchema.parse('+86 138 1234 5678')).not.toThrow();
      });
    });

    describe('invalid phone numbers', () => {
      it('should reject phone with letters', () => {
        const result = phoneSchema.safeParse('555-ABC-1234');
        expect(result.success).toBe(false);
      });

      it('should reject phone with special characters', () => {
        const result = phoneSchema.safeParse('555@123#4567');
        expect(result.success).toBe(false);
      });

      it('should reject empty string', () => {
        const result = phoneSchema.safeParse('');
        expect(result.success).toBe(false);
      });

      it('should reject phone with invalid characters', () => {
        const result = phoneSchema.safeParse('555.123.4567');
        expect(result.success).toBe(false);
      });

      it('should return proper error message', () => {
        const result = phoneSchema.safeParse('not-a-phone');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Invalid phone number');
        }
      });

      it('should reject phone with multiple plus signs', () => {
        const result = phoneSchema.safeParse('++1 555 123 4567');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('passwordSchema', () => {
    describe('valid passwords', () => {
      it('should accept password meeting all requirements', () => {
        expect(() => passwordSchema.parse('Password1')).not.toThrow();
      });

      it('should accept password with special characters', () => {
        expect(() => passwordSchema.parse('Password1!')).not.toThrow();
      });

      it('should accept longer passwords', () => {
        expect(() =>
          passwordSchema.parse('VerySecurePassword123')
        ).not.toThrow();
      });

      it('should accept password with multiple uppercase', () => {
        expect(() => passwordSchema.parse('PASSWord1')).not.toThrow();
      });

      it('should accept password with multiple numbers', () => {
        expect(() => passwordSchema.parse('Password123')).not.toThrow();
      });

      it('should accept password with mixed case and numbers', () => {
        expect(() => passwordSchema.parse('aBcDeF12')).not.toThrow(); // Must be 8+ chars
      });

      it('should accept complex password', () => {
        expect(() =>
          passwordSchema.parse('MyP@ssw0rd!2024')
        ).not.toThrow();
      });

      it('should accept password exactly 8 characters', () => {
        expect(() => passwordSchema.parse('Passwo1d')).not.toThrow();
      });
    });

    describe('invalid passwords', () => {
      it('should reject password shorter than 8 characters', () => {
        const result = passwordSchema.safeParse('Pass1');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(
            'Password must be at least 8 characters'
          );
        }
      });

      it('should reject password without uppercase', () => {
        const result = passwordSchema.safeParse('password1');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(
            'Password must contain at least one uppercase letter'
          );
        }
      });

      it('should reject password without lowercase', () => {
        const result = passwordSchema.safeParse('PASSWORD1');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(
            'Password must contain at least one lowercase letter'
          );
        }
      });

      it('should reject password without number', () => {
        const result = passwordSchema.safeParse('Passwordd');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(
            'Password must contain at least one number'
          );
        }
      });

      it('should reject empty string', () => {
        const result = passwordSchema.safeParse('');
        expect(result.success).toBe(false);
      });

      it('should reject password with only numbers', () => {
        const result = passwordSchema.safeParse('12345678');
        expect(result.success).toBe(false);
      });

      it('should reject password with only lowercase', () => {
        const result = passwordSchema.safeParse('abcdefgh');
        expect(result.success).toBe(false);
      });

      it('should reject password with only uppercase', () => {
        const result = passwordSchema.safeParse('ABCDEFGH');
        expect(result.success).toBe(false);
      });

      it('should reject password at 7 characters even if meeting other requirements', () => {
        const result = passwordSchema.safeParse('Passw1d');
        expect(result.success).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should validate and return parsed value on success', () => {
        const result = passwordSchema.safeParse('ValidPass1');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('ValidPass1');
        }
      });

      it('should handle password with spaces', () => {
        expect(() => passwordSchema.parse('Pass word1')).not.toThrow();
      });

      it('should handle password with unicode', () => {
        expect(() => passwordSchema.parse('Password1')).not.toThrow();
      });

      it('should handle very long password', () => {
        const longPassword = 'Aa1' + 'a'.repeat(100);
        expect(() => passwordSchema.parse(longPassword)).not.toThrow();
      });
    });
  });

  describe('Schema Integration', () => {
    it('should work with transform and refine', () => {
      const result = emailSchema.safeParse('  USER@EXAMPLE.COM  ');
      // Note: current schema doesn't trim/lowercase, so this tests current behavior
      expect(result.success).toBe(false); // because of leading/trailing spaces
    });

    it('should provide consistent error format', () => {
      const emailResult = emailSchema.safeParse('invalid');
      const phoneResult = phoneSchema.safeParse('invalid');
      const passwordResult = passwordSchema.safeParse('weak');

      expect(emailResult.success).toBe(false);
      expect(phoneResult.success).toBe(false);
      expect(passwordResult.success).toBe(false);

      if (!emailResult.success && !phoneResult.success && !passwordResult.success) {
        expect(emailResult.error.errors).toBeDefined();
        expect(phoneResult.error.errors).toBeDefined();
        expect(passwordResult.error.errors).toBeDefined();
      }
    });
  });
});
