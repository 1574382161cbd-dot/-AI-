import { describe, it, expect } from 'vitest';
import {
  VOICE_OPTIONS,
  VOICE_CATEGORIES,
  EMOTION_OPTIONS,
  filterVoicesByCategory,
  filterVoicesByGender,
  getVoiceById,
  type VoiceOption,
} from '@/lib/voiceOptions';

describe('voiceOptions', () => {
  describe('VOICE_OPTIONS constant', () => {
    it('should have voice options available', () => {
      expect(VOICE_OPTIONS.length).toBeGreaterThan(0);
    });

    it('should have all required properties', () => {
      VOICE_OPTIONS.forEach(voice => {
        expect(voice).toHaveProperty('id');
        expect(voice).toHaveProperty('name');
        expect(voice).toHaveProperty('category');
        expect(voice).toHaveProperty('gender');
        expect(voice).toHaveProperty('description');
      });
    });

    it('should have valid category values', () => {
      const validCategories = ['general', 'audiobook', 'video', 'roleplay'];
      VOICE_OPTIONS.forEach(voice => {
        expect(validCategories).toContain(voice.category);
      });
    });

    it('should have valid gender values', () => {
      const validGenders = ['male', 'female', 'child'];
      VOICE_OPTIONS.forEach(voice => {
        expect(validGenders).toContain(voice.gender);
      });
    });
  });

  describe('VOICE_CATEGORIES', () => {
    it('should have all category labels', () => {
      expect(VOICE_CATEGORIES.general).toBe('通用');
      expect(VOICE_CATEGORIES.audiobook).toBe('有声读物');
      expect(VOICE_CATEGORIES.video).toBe('视频配音');
      expect(VOICE_CATEGORIES.roleplay).toBe('角色扮演');
    });
  });

  describe('EMOTION_OPTIONS', () => {
    it('should have emotion options available', () => {
      expect(EMOTION_OPTIONS.length).toBeGreaterThan(0);
    });

    it('should have all required properties', () => {
      EMOTION_OPTIONS.forEach(emotion => {
        expect(emotion).toHaveProperty('id');
        expect(emotion).toHaveProperty('name');
        expect(emotion).toHaveProperty('description');
      });
    });
  });

  describe('filterVoicesByCategory', () => {
    it('should filter voices by "general" category', () => {
      const voices = filterVoicesByCategory('general');
      expect(voices.length).toBeGreaterThan(0);
      voices.forEach(voice => {
        expect(voice.category).toBe('general');
      });
    });

    it('should filter voices by "roleplay" category', () => {
      const voices = filterVoicesByCategory('roleplay');
      expect(voices.length).toBeGreaterThan(0);
      voices.forEach(voice => {
        expect(voice.category).toBe('roleplay');
      });
    });

    it('should return empty array for category with no voices', () => {
      const voices = filterVoicesByCategory('nonexistent' as any);
      expect(voices).toHaveLength(0);
    });
  });

  describe('filterVoicesByGender', () => {
    it('should filter voices by "male" gender', () => {
      const voices = filterVoicesByGender('male');
      expect(voices.length).toBeGreaterThan(0);
      voices.forEach(voice => {
        expect(voice.gender).toBe('male');
      });
    });

    it('should filter voices by "female" gender', () => {
      const voices = filterVoicesByGender('female');
      expect(voices.length).toBeGreaterThan(0);
      voices.forEach(voice => {
        expect(voice.gender).toBe('female');
      });
    });

    it('should filter voices by "child" gender', () => {
      const voices = filterVoicesByGender('child');
      voices.forEach(voice => {
        expect(voice.gender).toBe('child');
      });
    });
  });

  describe('getVoiceById', () => {
    it('should return correct voice for valid id', () => {
      const voice = getVoiceById('zh_female_xiaohe_uranus_bigtts');
      expect(voice).toBeDefined();
      expect(voice?.name).toBe('小禾');
    });

    it('should return undefined for invalid id', () => {
      const voice = getVoiceById('invalid_id');
      expect(voice).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const voice = getVoiceById('');
      expect(voice).toBeUndefined();
    });
  });
});
