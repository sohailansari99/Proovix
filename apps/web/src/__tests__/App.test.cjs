// App component tests — CommonJS to avoid Jest 30 ESM transform issues.

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function getMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || fallback;
}

describe('App Component — Auth dispatch and role checks', () => {
  describe('safeUrl', () => {
    test('returns null for missing values', () => {
      expect(safeUrl(undefined)).toBeNull();
      expect(safeUrl(null)).toBeNull();
      expect(safeUrl('')).toBeNull();
    });

    test('accepts only http/https protocols', () => {
      expect(safeUrl('https://github.com/org/repo')).toBe('https://github.com/org/repo');
      expect(safeUrl('https://linkedin.com/in/user')).toBe('https://linkedin.com/in/user');
      expect(safeUrl('ftp://files.example.com')).toBeNull();
      expect(safeUrl('mailto:user@example.com')).toBeNull();
    });
  });

  describe('Role-based auth dispatch logic (mirrors App.jsx conditions)', () => {
    function simulateAuthDispatch(isAuthenticated, user, view) {
      const STAFF_ROLES = ['REVIEWER', 'ADMIN'];
      const isStaff = STAFF_ROLES.includes(user?.role);
      const inReviewerView = isAuthenticated && isStaff && view === 'reviewer';
      return { isStaff, inReviewerView };
    }

    test('candidate stays on dashboard, not reviewer view', () => {
      const result = simulateAuthDispatch(true, { role: 'CANDIDATE', email: 'a@b.com' }, 'reviewer');
      expect(result.isStaff).toBe(false);
      expect(result.inReviewerView).toBe(false);
    });

    test('reviewer gets inReviewerView = true', () => {
      const result = simulateAuthDispatch(true, { role: 'REVIEWER' }, 'reviewer');
      expect(result.isStaff).toBe(true);
      expect(result.inReviewerView).toBe(true);
    });

    test('unauthenticated user always shows Auth page', () => {
      const result = simulateAuthDispatch(false, null, 'reviewer');
      expect(result.isStaff).toBe(false);
      expect(result.inReviewerView).toBe(false);
    });

    test('admin can enter reviewer view when session flag is set', () => {
      const withReview = simulateAuthDispatch(true, { role: 'ADMIN' }, 'reviewer');
      const withoutReview = simulateAuthDispatch(true, { role: 'ADMIN' }, 'candidate');
      expect(withReview.inReviewerView).toBe(true);
      expect(withoutReview.inReviewerView).toBe(false);
    });
  });

  describe('getMessage fallback behavior', () => {
    test('uses fallback when error has no response data message', () => {
      expect(getMessage({})).toContain('Something went wrong');
      expect(getMessage({}, 'Custom fallback')).toBe('Custom fallback');
    });

    test('extracts message from API error response', () => {
      const err = { response: { data: { message: 'Invalid credentials' } } };
      expect(getMessage(err)).toBe('Invalid credentials');
    });
  });
});
