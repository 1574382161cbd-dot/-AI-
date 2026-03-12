import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle conditional class names', () => {
    const result = cn('base', true && 'included', false && 'excluded');
    expect(result).toBe('base included');
  });

  it('should merge tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('should handle undefined and null values', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });

  it('should handle empty strings', () => {
    const result = cn('base', '', 'end');
    expect(result).toBe('base end');
  });

  it('should handle object notation', () => {
    const result = cn({
      active: true,
      disabled: false,
      primary: true,
    });
    expect(result).toContain('active');
    expect(result).toContain('primary');
    expect(result).not.toContain('disabled');
  });

  it('should handle arrays', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('should handle complex tailwind conflicts', () => {
    const result = cn('text-red-500 hover:text-blue-300', 'text-green-600');
    expect(result).toContain('text-green-600');
    expect(result).toContain('hover:text-blue-300');
    expect(result).not.toContain('text-red-500');
  });
});
