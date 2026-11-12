const { requireObjectId, optionalHttpUrl, validatePassword } = require('../../src/core/utils/validators');
const AppError = require('../../src/core/errors/AppError');

describe('Validators', () => {
  describe('requireObjectId', () => {
    test('should accept valid ObjectId string', () => {
      expect(() => requireObjectId('507f1f77bcf86cd799439011')).not.toThrow();
    });

    test('should reject null', () => {
      expect(() => requireObjectId(null)).toThrow(AppError);
    });

    test('should reject non-string', () => {
      expect(() => requireObjectId({})).toThrow(AppError);
      expect(() => requireObjectId(123)).toThrow(AppError);
    });

    test('should reject object-shaped input like {$ne: null}', () => {
      expect(() => requireObjectId({ '$ne': null })).toThrow(AppError);
    });

    test('should reject invalid ObjectId format', () => {
      expect(() => requireObjectId('not-an-object-id')).toThrow(AppError);
    });

    test('should include field name in error message', () => {
      expect(() => requireObjectId('bad', 'Skill ID')).toThrow(/Skill ID must be a valid ObjectId/);
    });
  });

  describe('optionalHttpUrl', () => {
    test('should return empty string for undefined', () => {
      expect(optionalHttpUrl(undefined)).toBe('');
    });

    test('should accept valid HTTP URL', () => {
      expect(optionalHttpUrl('http://example.com')).toBe('http://example.com');
    });

    test('should accept valid HTTPS URL', () => {
      expect(optionalHttpUrl('https://github.com/user/repo')).toBe('https://github.com/user/repo');
    });

    test('should reject non-URL strings', () => {
      expect(() => optionalHttpUrl('not-a-url')).toThrow(AppError);
    });

    test('should reject object-shaped input', () => {
      expect(() => optionalHttpUrl({ '$ne': null })).toThrow(AppError);
    });

    test('should trim whitespace', () => {
      expect(optionalHttpUrl('  https://example.com  ')).toBe('https://example.com');
    });
  });

  describe('validatePassword', () => {
    test('should pass strong password', () => {
      expect(validatePassword('StrongPass1!')).toBeNull();
    });

    test('should reject too short password', () => {
      expect(validatePassword('Ab1!')).toBe('Password must be at least 8 characters long');
    });

    test('should reject password without uppercase', () => {
      expect(validatePassword('strongpass1!')).toBe('Password must contain at least one uppercase letter');
    });

    test('should reject password without lowercase', () => {
      expect(validatePassword('STRONGPASS1!')).toBe('Password must contain at least one lowercase letter');
    });

    test('should reject password without number', () => {
      expect(validatePassword('StrongPass!')).toBe('Password must contain at least one number');
    });

    test('should reject password without special character', () => {
      expect(validatePassword('StrongPass1')).toBe('Password must contain at least one special character');
    });

    test('should reject null/undefined', () => {
      expect(validatePassword(null)).toBe('Password is required');
      expect(validatePassword(undefined)).toBe('Password is required');
    });

    test('should reject numeric input', () => {
      expect(validatePassword(123)).toBe('Password is required');
    });
  });
});
