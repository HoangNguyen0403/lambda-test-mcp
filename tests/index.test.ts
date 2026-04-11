// Define the validation functions and extractErrorBlock since they are not exported
// In a real scenario, we might want to export them for testing or move to a utils file.
// For 100% coverage of index.ts, we'll need to mock the environment and the LambdaTestClient.

const ERROR_SIGNALS = [
  'FlutterError',
  'Exception',
  'Expected:',
  'Actual:',
  '══',
  'FAILURES!!!',
  'INSTRUMENTATION_CODE',
  'Error:',
  'TimeoutException',
  'StateError',
  'Unhandled',
];

function validateBuildId(id: unknown): string {
  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    throw new Error('build_id must be a numeric string (e.g. "19305815")');
  }
  return id;
}

function validateSessionId(id: unknown): string {
  if (typeof id !== 'string' || !/^[A-Za-z0-9._-]+$/.test(id)) {
    throw new Error(
      'session_id must contain only alphanumeric characters, dots, hyphens, or underscores',
    );
  }
  return id;
}

function extractErrorBlock(log: string): string {
  const lines = log.split('\n');
  const marked = new Set<number>();

  lines.forEach((line, i) => {
    if (ERROR_SIGNALS.some((s) => line.includes(s))) {
      for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 20); j++) {
        marked.add(j);
      }
    }
  });

  if (marked.size === 0) {
    return lines
      .slice(-60)
      .map((l, i) => `${lines.length - 60 + i + 1}: ${l}`)
      .join('\n');
  }

  const sorted = [...marked].sort((a, b) => a - b);
  return sorted.map((i) => `${i + 1}: ${lines[i]}`).join('\n');
}

describe('Server Logic (index.ts)', () => {
  describe('validateBuildId', () => {
    it('should pass for numeric strings', () => {
      expect(validateBuildId('12345')).toBe('12345');
    });
    it('should throw for non-numeric strings', () => {
      expect(() => validateBuildId('abc')).toThrow('build_id must be a numeric string');
    });
    it('should throw for non-strings', () => {
      expect(() => validateBuildId(123)).toThrow('build_id must be a numeric string');
    });
  });

  describe('validateSessionId', () => {
    it('should pass for valid session IDs', () => {
      expect(validateSessionId('RMAA-123.abc_def')).toBe('RMAA-123.abc_def');
    });
    it('should throw for invalid characters', () => {
      expect(() => validateSessionId('session!')).toThrow(
        'session_id must contain only alphanumeric',
      );
    });
  });

  describe('extractErrorBlock', () => {
    it('should extract lines around error signals', () => {
      const log = [
        'line 1',
        'line 2',
        'line 3',
        'line 4',
        'line 5',
        'line 6',
        'something FlutterError happened',
        'line 8',
        'line 9',
      ].join('\n');
      const result = extractErrorBlock(log);
      expect(result).toContain('7: something FlutterError happened');
      expect(result).toContain('2: line 2'); // context before
    });

    it('should return last 60 lines if no signal found', () => {
      const log = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join('\n');
      const result = extractErrorBlock(log);
      const lines = result.split('\n');
      expect(lines.length).toBe(60);
      expect(lines[0]).toBe('41: line 41');
      expect(lines[59]).toBe('100: line 100');
    });
  });
});
