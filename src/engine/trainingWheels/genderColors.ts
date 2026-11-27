import { GrammaticalGender, GenderVisualConfig } from './types';
import { Language } from '../../../types';

/**
 * Universal Gender Colors & Shapes (Colorblind-Safe)
 * 1. neuter = red + square (■) -> Dutch het, German das, Ukrainian/Polish neuter
 * 2. masculine = lapis blue + triangle (▲) -> German der, French le, Spanish el, Italian il, Portuguese o, Arabic/Hindi masculine
 * 3. feminine = saffron + circle (●) -> German die, French la, Spanish la, Portuguese a, Arabic/Hindi feminine
 * 4. common gender = turquoise + diamond (◆) -> Dutch de
 */
export const GENDER_VISUAL_MAP: Record<GrammaticalGender, GenderVisualConfig> = {
  neuter: {
    gender: 'neuter',
    color: '#EF4444', // Red / Crimson
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/15 text-red-700 dark:text-red-300',
    borderColor: 'border-red-500',
    shape: 'square',
    symbol: '■',
    labelFa: 'خنثی (Neuter)',
    labelEn: 'Neuter'
  },
  masculine: {
    gender: 'masculine',
    color: '#2563EB', // Lapis Blue
    textColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-500',
    shape: 'triangle',
    symbol: '▲',
    labelFa: 'مذکر (Masculine)',
    labelEn: 'Masculine'
  },
  feminine: {
    gender: 'feminine',
    color: '#F59E0B', // Saffron
    textColor: 'text-amber-700 dark:text-amber-400', // روی زمینهٔ روشن تیره‌تر، تا خوانا باشد
    bgColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-500',
    shape: 'circle',
    symbol: '●',
    labelFa: 'مؤنث (Feminine)',
    labelEn: 'Feminine'
  },
  common: {
    gender: 'common',
    color: '#06B6D4', // Turquoise
    textColor: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-cyan-500',
    shape: 'diamond',
    symbol: '◆',
    labelFa: 'مشترک (Common / de)',
    labelEn: 'Common'
  }
};

/**
 * Resolves grammatical gender STRICTLY from the dataset's separate `article` field.
 * RULE: NEVER guess a gender if the article field is absent or not recognized.
 */
export function resolveGenderFromArticle(
  language: Language | string,
  rawArticle?: string
): GrammaticalGender | null {
  if (!rawArticle) return null;
  const art = rawArticle.trim().toLowerCase();

  switch (language) {
    case 'nl': {
      // Dutch: het = neuter, de = common gender
      if (art === 'het') return 'neuter';
      if (art === 'de') return 'common';
      return null;
    }
    case 'de': {
      // German: das = neuter, der = masculine, die / eine = feminine
      if (art === 'das') return 'neuter';
      if (art === 'der') return 'masculine';
      if (art === 'die' || art === 'eine') return 'feminine';
      return null;
    }
    case 'fr': {
      if (art === 'le' || art === 'un') return 'masculine';
      if (art === 'la' || art === 'une') return 'feminine';
      return null;
    }
    case 'es': {
      if (art === 'el' || art === 'un') return 'masculine';
      if (art === 'la' || art === 'una') return 'feminine';
      return null;
    }
    case 'it': {
      if (art === 'il' || art === 'lo' || art === 'un') return 'masculine';
      if (art === 'la' || art === 'una') return 'feminine';
      return null;
    }
    case 'pt': {
      if (art === 'o' || art === 'um') return 'masculine';
      if (art === 'a' || art === 'uma') return 'feminine';
      return null;
    }
    case 'uk':
    case 'pl': {
      if (art === 'neuter' || art === 'n') return 'neuter';
      if (art === 'masculine' || art === 'm') return 'masculine';
      if (art === 'feminine' || art === 'f') return 'feminine';
      return null;
    }
    case 'ar':
    case 'hi': {
      if (art === 'm' || art === 'masculine') return 'masculine';
      if (art === 'f' || art === 'feminine') return 'feminine';
      return null;
    }
    default:
      return null;
  }
}
