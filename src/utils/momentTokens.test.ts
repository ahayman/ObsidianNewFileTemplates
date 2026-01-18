/**
 * Tests for momentTokens.ts
 */

import {
  parseFormatString,
  filterTokens,
  getTokensByCategory,
  MOMENT_TOKENS,
  TOKEN_MAP,
  TOKENS_BY_LENGTH,
} from './momentTokens';

describe('MOMENT_TOKENS', () => {
  it('should contain common tokens', () => {
    expect(TOKEN_MAP.has('YYYY')).toBe(true);
    expect(TOKEN_MAP.has('MM')).toBe(true);
    expect(TOKEN_MAP.has('DD')).toBe(true);
    expect(TOKEN_MAP.has('HH')).toBe(true);
    expect(TOKEN_MAP.has('mm')).toBe(true);
    expect(TOKEN_MAP.has('ss')).toBe(true);
  });

  it('should have valid token info', () => {
    const yyyy = TOKEN_MAP.get('YYYY');
    expect(yyyy).toBeDefined();
    expect(yyyy?.description).toBe('4-digit year');
    expect(yyyy?.category).toBe('year');
    expect(yyyy?.example).toBe('2026');
  });
});

describe('TOKENS_BY_LENGTH', () => {
  it('should be sorted by token length descending', () => {
    for (let i = 1; i < TOKENS_BY_LENGTH.length; i++) {
      expect(TOKENS_BY_LENGTH[i - 1].token.length).toBeGreaterThanOrEqual(
        TOKENS_BY_LENGTH[i].token.length
      );
    }
  });

  it('should have MMMM before MMM before MM before M', () => {
    const monthTokens = TOKENS_BY_LENGTH.filter(t =>
      ['MMMM', 'MMM', 'MM', 'Mo', 'M'].includes(t.token)
    );
    expect(monthTokens[0].token).toBe('MMMM');
    expect(monthTokens[1].token).toBe('MMM');
    expect(monthTokens[2].token).toBe('MM');
  });
});

describe('parseFormatString', () => {
  it('should parse a simple date format', () => {
    const parts = parseFormatString('YYYY-MM-DD');

    expect(parts).toHaveLength(5);

    expect(parts[0]).toEqual({
      type: 'token',
      value: 'YYYY',
      start: 0,
      end: 4,
      tokenInfo: TOKEN_MAP.get('YYYY'),
    });

    expect(parts[1]).toEqual({
      type: 'literal',
      value: '-',
      start: 4,
      end: 5,
    });

    expect(parts[2]).toEqual({
      type: 'token',
      value: 'MM',
      start: 5,
      end: 7,
      tokenInfo: TOKEN_MAP.get('MM'),
    });

    expect(parts[3]).toEqual({
      type: 'literal',
      value: '-',
      start: 7,
      end: 8,
    });

    expect(parts[4]).toEqual({
      type: 'token',
      value: 'DD',
      start: 8,
      end: 10,
      tokenInfo: TOKEN_MAP.get('DD'),
    });
  });

  it('should parse full month name format', () => {
    const parts = parseFormatString('MMMM DD, YYYY');

    expect(parts).toHaveLength(5);
    expect(parts[0].value).toBe('MMMM');
    expect(parts[0].type).toBe('token');
    expect(parts[1].value).toBe(' ');
    expect(parts[1].type).toBe('literal');
    expect(parts[2].value).toBe('DD');
    expect(parts[2].type).toBe('token');
    expect(parts[3].value).toBe(', ');
    expect(parts[3].type).toBe('literal');
    expect(parts[4].value).toBe('YYYY');
    expect(parts[4].type).toBe('token');
  });

  it('should merge adjacent literals', () => {
    // Use characters that don't match any tokens
    const parts = parseFormatString('foo :: bar');

    // Count how many literals exist - they should be merged where adjacent
    const literals = parts.filter(p => p.type === 'literal');
    // Multiple literals may exist due to interspersed tokens, but adjacent ones should merge
    expect(literals.length).toBeGreaterThanOrEqual(1);

    // Test with pure non-token characters
    const parts2 = parseFormatString('---:::---');
    const literals2 = parts2.filter(p => p.type === 'literal');
    expect(literals2).toHaveLength(1);
    expect(literals2[0].value).toBe('---:::---');
  });

  it('should handle adjacent tokens', () => {
    const parts = parseFormatString('YYYYMMDD');

    expect(parts).toHaveLength(3);
    expect(parts.every(p => p.type === 'token')).toBe(true);
    expect(parts[0].value).toBe('YYYY');
    expect(parts[1].value).toBe('MM');
    expect(parts[2].value).toBe('DD');
  });

  it('should handle time format with AM/PM', () => {
    const parts = parseFormatString('h:mm A');

    expect(parts).toHaveLength(5);
    expect(parts[0]).toMatchObject({ type: 'token', value: 'h' });
    expect(parts[1]).toMatchObject({ type: 'literal', value: ':' });
    expect(parts[2]).toMatchObject({ type: 'token', value: 'mm' });
    expect(parts[3]).toMatchObject({ type: 'literal', value: ' ' });
    expect(parts[4]).toMatchObject({ type: 'token', value: 'A' });
  });

  it('should handle 24-hour time format', () => {
    const parts = parseFormatString('HH:mm:ss');

    expect(parts).toHaveLength(5);
    expect(parts[0]).toMatchObject({ type: 'token', value: 'HH' });
    expect(parts[2]).toMatchObject({ type: 'token', value: 'mm' });
    expect(parts[4]).toMatchObject({ type: 'token', value: 'ss' });
  });

  it('should handle empty string', () => {
    const parts = parseFormatString('');
    expect(parts).toHaveLength(0);
  });

  it('should handle string with only literals (no token chars)', () => {
    // Use characters that don't match any moment.js tokens
    const parts = parseFormatString('---/---');
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({
      type: 'literal',
      value: '---/---',
    });
  });

  it('should parse regular words that contain token characters', () => {
    // 'hello world' contains h, e, d, wo which are tokens
    const parts = parseFormatString('hello world');
    // Should have mix of tokens and literals
    expect(parts.some(p => p.type === 'token')).toBe(true);
    expect(parts.some(p => p.type === 'literal')).toBe(true);
  });

  it('should match longer tokens first (MMMM before MMM)', () => {
    const parts = parseFormatString('MMMM');
    expect(parts).toHaveLength(1);
    expect(parts[0].value).toBe('MMMM');

    const parts2 = parseFormatString('MMM');
    expect(parts2).toHaveLength(1);
    expect(parts2[0].value).toBe('MMM');
  });

  it('should handle day of week tokens', () => {
    const parts = parseFormatString('dddd, MMMM Do YYYY');

    expect(parts[0]).toMatchObject({ type: 'token', value: 'dddd' });
    expect(parts[2]).toMatchObject({ type: 'token', value: 'MMMM' });
    expect(parts[4]).toMatchObject({ type: 'token', value: 'Do' });
    expect(parts[6]).toMatchObject({ type: 'token', value: 'YYYY' });
  });

  it('should handle timezone tokens', () => {
    const parts = parseFormatString('HH:mm Z');

    expect(parts).toHaveLength(5);
    expect(parts[0]).toMatchObject({ type: 'token', value: 'HH' });
    expect(parts[1]).toMatchObject({ type: 'literal', value: ':' });
    expect(parts[2]).toMatchObject({ type: 'token', value: 'mm' });
    expect(parts[3]).toMatchObject({ type: 'literal', value: ' ' });
    expect(parts[4]).toMatchObject({ type: 'token', value: 'Z' });
  });

  it('should handle week and quarter tokens', () => {
    const parts = parseFormatString('Q-ww');

    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatchObject({ type: 'token', value: 'Q' });
    expect(parts[2]).toMatchObject({ type: 'token', value: 'ww' });
  });

  it('should provide correct positions', () => {
    const format = 'YYYY-MM-DD HH:mm';
    const parts = parseFormatString(format);

    for (const part of parts) {
      expect(format.substring(part.start, part.end)).toBe(part.value);
    }
  });
});

describe('filterTokens', () => {
  it('should return all tokens when query is empty', () => {
    const result = filterTokens('');
    expect(result).toEqual(MOMENT_TOKENS);
  });

  it('should filter by token prefix', () => {
    const result = filterTokens('M');

    // Should include MM, MMM, MMMM, Mo, M, mm, m
    expect(result.some(t => t.token === 'MM')).toBe(true);
    expect(result.some(t => t.token === 'MMMM')).toBe(true);
    expect(result.some(t => t.token === 'mm')).toBe(true);
  });

  it('should filter case-insensitively', () => {
    const result = filterTokens('yyyy');
    expect(result.some(t => t.token === 'YYYY')).toBe(true);
  });

  it('should filter by description', () => {
    const result = filterTokens('month');
    expect(result.some(t => t.category === 'month')).toBe(true);
  });

  it('should filter by partial description', () => {
    const result = filterTokens('ordinal');
    expect(result.some(t => t.token === 'Do')).toBe(true);
    expect(result.some(t => t.token === 'Mo')).toBe(true);
  });
});

describe('getTokensByCategory', () => {
  it('should group tokens by category', () => {
    const byCategory = getTokensByCategory();

    expect(byCategory.has('year')).toBe(true);
    expect(byCategory.has('month')).toBe(true);
    expect(byCategory.has('day')).toBe(true);
    expect(byCategory.has('hour')).toBe(true);
    expect(byCategory.has('minute')).toBe(true);
    expect(byCategory.has('second')).toBe(true);
    expect(byCategory.has('ampm')).toBe(true);
    expect(byCategory.has('timezone')).toBe(true);
    expect(byCategory.has('other')).toBe(true);
  });

  it('should have year tokens in year category', () => {
    const byCategory = getTokensByCategory();
    const yearTokens = byCategory.get('year')!;

    expect(yearTokens.some(t => t.token === 'YYYY')).toBe(true);
    expect(yearTokens.some(t => t.token === 'YY')).toBe(true);
  });

  it('should have all tokens accounted for', () => {
    const byCategory = getTokensByCategory();
    let total = 0;
    byCategory.forEach(tokens => {
      total += tokens.length;
    });

    expect(total).toBe(MOMENT_TOKENS.length);
  });
});
