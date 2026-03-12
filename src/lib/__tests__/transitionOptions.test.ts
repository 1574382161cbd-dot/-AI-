import { describe, it, expect } from 'vitest';
import {
  TRANSITION_OPTIONS,
  getTransitionOption,
  getTransitionLabel,
  type TransitionOption,
} from '@/lib/transitionOptions';

describe('transitionOptions', () => {
  describe('TRANSITION_OPTIONS constant', () => {
    it('should have correct number of options', () => {
      expect(TRANSITION_OPTIONS).toHaveLength(3);
    });

    it('should contain all required transition types', () => {
      const values = TRANSITION_OPTIONS.map(opt => opt.value);
      expect(values).toContain('cut');
      expect(values).toContain('fade');
      expect(values).toContain('zoom');
    });

    it('should have all required properties', () => {
      TRANSITION_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('description');
        expect(option).toHaveProperty('icon');
      });
    });
  });

  describe('getTransitionOption', () => {
    it('should return correct option for "cut"', () => {
      const option = getTransitionOption('cut');
      expect(option).toBeDefined();
      expect(option?.label).toBe('切镜');
    });

    it('should return correct option for "fade"', () => {
      const option = getTransitionOption('fade');
      expect(option).toBeDefined();
      expect(option?.label).toBe('淡入淡出');
    });

    it('should return correct option for "zoom"', () => {
      const option = getTransitionOption('zoom');
      expect(option).toBeDefined();
      expect(option?.label).toBe('缩放');
    });

    it('should return undefined for invalid value', () => {
      const option = getTransitionOption('invalid');
      expect(option).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const option = getTransitionOption('');
      expect(option).toBeUndefined();
    });
  });

  describe('getTransitionLabel', () => {
    it('should return correct label for "cut"', () => {
      expect(getTransitionLabel('cut')).toBe('切镜');
    });

    it('should return correct label for "fade"', () => {
      expect(getTransitionLabel('fade')).toBe('淡入淡出');
    });

    it('should return correct label for "zoom"', () => {
      expect(getTransitionLabel('zoom')).toBe('缩放');
    });

    it('should return original value for invalid transition type', () => {
      expect(getTransitionLabel('invalid')).toBe('invalid');
    });

    it('should return empty string for empty input', () => {
      expect(getTransitionLabel('')).toBe('');
    });
  });
});
