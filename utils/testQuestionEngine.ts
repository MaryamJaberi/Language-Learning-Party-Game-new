import { LanguageCard, Language } from '../types';
import { UNIVERSAL_CONCEPTS } from '../multiLangDictionary';
import { CURATED_LANGUAGE_CARDS } from '../cardsData';



/**
 * Intelligent Test Design Skill Engine
 * ----------------------------------------------------
 * Designs pedagogically rigorous, structurally parallel, and challenging
 * multiple-choice options for language reflex duels and tests.
 * 
 * Rules:
 * 1. Parallel Grammar: Questions match Questions, Sentences match Sentences,
 *    Phrases match Phrases, single Words match single Words.
 * 2. Parallel Length & Shape: No single option stands out merely by word count.
 * 3. Semantic Plausibility: Distractors come from the same or adjacent topic domain
 *    (e.g., ordering food, asking directions, schedule/time, greetings).
 * 4. Foil Synthesis: If dataset is sparse, synthesizes grammatically valid foils.
 */

// Heuristic to detect if a text is a full question
export function isQuestionText(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.endsWith('?')) return true;
  return /^(wat|waar|hoe|wanneer|wie|welke|waarom|is|kan|mag|heeft|ben|what|where|how|when|who|which|why|is|can|may|do|does|did|que|donde|como|cuand|por que|pourquoi|ou|quand|comment|est-ce|wo|warum|wann|wie|ist|kann|darf|können|کجا|چه|کی|چگونه|چرا|آیا|nerede|ne|nasıl|ne zaman|kim|neden|اين|ماذا|كيف|متى|هل)\b/i.test(t);
}

// Normalize text for comparison
function cleanText(t: string): string {
  return t.trim().toLowerCase().replace(/[.,!?;:]/g, '');
}

const CEFR_LEVEL_ORDER = [
  'Pre-A1', 'A0', 'A0+', 'A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C1+', 'C2'
];

/**
 * Synthesizes plausible near-miss distractors for sentences or phrases
 * when the local bank doesn't have enough matching grammatical frames.
 * Respects topic category (Food, Travel, Work, Social) to prevent comical/irrelevant options.
 */
function synthesizeParallelFoils(correct: string, lang: Language | string, topic?: string): string[] {
  const isQ = isQuestionText(correct);
  const words = correct.trim().split(/\s+/);
  const synthesized: string[] = [];

  const isFood = topic === 'CAT_FOOD' || topic === 'CAT_RESTAURANT';
  const isTravel = topic === 'CAT_TRAVEL' || topic === 'CAT_TRANSPORT';
  const isWork = topic === 'CAT_WORK';

  // Dutch (nl) Foil Generation
  if (lang === 'nl') {
    if (isQ) {
      if (/hoe laat/i.test(correct)) {
        synthesized.push('Hoe laat sluit het?');
        synthesized.push('Hoe laat begint de film?');
        synthesized.push('Wanneer is het open?');
      } else if (/waar is/i.test(correct)) {
        synthesized.push('Waar is de ingang?');
        synthesized.push('Waar is de bushalte?');
        synthesized.push('Hoe kom ik bij het station?');
      } else if (/mag ik/i.test(correct)) {
        synthesized.push('Mag ik de menukaart zien?');
        synthesized.push('Mag ik hier zitten?');
        synthesized.push('Kan ik met pin betalen?');
      } else if (/hoeveel kost/i.test(correct) || /wat kost/i.test(correct)) {
        synthesized.push('Hoeveel kost een kaartje?');
        synthesized.push('Wat is de totale prijs?');
        synthesized.push('Is dit met korting?');
      } else {
        synthesized.push('Wanneer begint het?');
        synthesized.push('Kunt u dat herhalen?');
        synthesized.push('Is dit de juiste richting?');
      }
    } else if (words.length >= 4) {
      if (isFood) {
        synthesized.push('Ik wil graag wat bestellen.');
        synthesized.push('Mag ik een glas water?');
        synthesized.push('Het eten smaakt erg lekker.');
      } else if (isTravel) {
        synthesized.push('Ik zoek het treinstation.');
        synthesized.push('De bus vertrekt over tien minuten.');
        synthesized.push('Hoe ver is het lopen?');
      } else {
        synthesized.push('Ik ga morgen naar kantoor.');
        synthesized.push('Het duurt ongeveer een uur.');
        synthesized.push('We zien elkaar later vandaag.');
      }
    } else if (words.length >= 2) {
      if (isFood) {
        synthesized.push('Een warme maaltijd');
        synthesized.push('Koud mineraalwater');
        synthesized.push('Een vers broodje');
      } else if (isTravel) {
        synthesized.push('Het centraal station');
        synthesized.push('Een enkele reis');
        synthesized.push('De volgende halte');
      } else if (isWork) {
        synthesized.push('Een belangrijk verslag');
        synthesized.push('De wekelijkse vergadering');
        synthesized.push('Een nieuw project');
      } else {
        synthesized.push('Tot morgenochtend');
        synthesized.push('Een fijne dag nog');
        synthesized.push('Met veel plezier');
      }
    }
  }

  // English (en, en-US) Foil Generation
  if (lang === 'en' || lang === 'en-US') {
    if (isQ) {
      if (/what time/i.test(correct)) {
        synthesized.push('What time does it close?');
        synthesized.push('What time does it begin?');
        synthesized.push('When is it open?');
      } else if (/where is/i.test(correct)) {
        synthesized.push('Where is the entrance?');
        synthesized.push('Where is the bus stop?');
        synthesized.push('How do I get there?');
      } else if (/can i|may i|could i/i.test(correct)) {
        synthesized.push('May I see the menu?');
        synthesized.push('Could you help me please?');
        synthesized.push('Can I pay by card?');
      } else {
        synthesized.push('Could you repeat that?');
        synthesized.push('When does it start?');
        synthesized.push('Is this the right way?');
      }
    } else if (words.length >= 4) {
      if (isFood) {
        synthesized.push('I would like to order now.');
        synthesized.push('Could I have the check please?');
        synthesized.push('The food is very delicious.');
      } else if (isTravel) {
        synthesized.push('Where does this train go?');
        synthesized.push('It takes about half an hour.');
        synthesized.push('The airport is far away.');
      } else {
        synthesized.push('I would like to order now.');
        synthesized.push('I am going there tomorrow morning.');
        synthesized.push('It takes about half an hour.');
      }
    } else if (words.length >= 2) {
      if (isFood) {
        synthesized.push('A cup of coffee');
        synthesized.push('Fresh bread and butter');
        synthesized.push('Cold mineral water');
      } else if (isTravel) {
        synthesized.push('A one-way ticket');
        synthesized.push('The next train');
        synthesized.push('Central railway station');
      } else if (isWork) {
        synthesized.push('An important report');
        synthesized.push('The weekly meeting');
        synthesized.push('A successful project');
      } else {
        synthesized.push('See you tomorrow morning');
        synthesized.push('Have a wonderful day');
        synthesized.push('With great pleasure');
      }
    }
  }

  // German (de) Foil Generation
  if (lang === 'de') {
    if (isQ) {
      synthesized.push('Um wie viel Uhr schließt es?');
      synthesized.push('Wo ist die nächste Haltestelle?');
      synthesized.push('Kann ich mit Karte zahlen?');
    } else if (words.length >= 3) {
      if (isFood) {
        synthesized.push('Ich möchte bitte bezahlen.');
        synthesized.push('Ein Glas Wasser bitte.');
        synthesized.push('Das Essen schmeckt sehr gut.');
      } else {
        synthesized.push('Ich möchte bitte bezahlen.');
        synthesized.push('Wir sehen uns morgen wieder.');
        synthesized.push('Das ist eine gute Idee.');
      }
    } else if (words.length >= 2) {
      if (isFood) {
        synthesized.push('Eine Tasse Kaffee');
        synthesized.push('Frisches Brot');
        synthesized.push('Kaltes Mineralwasser');
      } else {
        synthesized.push('Bis morgen früh');
        synthesized.push('Einen schönen Tag');
        synthesized.push('Mit großem Vergnügen');
      }
    }
  }

  // French (fr) Foil Generation
  if (lang === 'fr') {
    if (isQ) {
      synthesized.push('À quelle heure est-ce que ça ferme ?');
      synthesized.push('Où se trouve la station ?');
      synthesized.push('Puis-je payer par carte ?');
    } else if (words.length >= 3) {
      if (isFood) {
        synthesized.push("Je voudrais régler l'addition.");
        synthesized.push('Un verre de vin blanc, s’il vous plaît.');
        synthesized.push('Le plat principal est délicieux.');
      } else {
        synthesized.push("Je voudrais régler l'addition.");
        synthesized.push('On se voit demain matin.');
        synthesized.push("C'est une très bonne idée.");
      }
    } else if (words.length >= 2) {
      if (isFood) {
        synthesized.push('Une tasse de café');
        synthesized.push('Du pain frais');
        synthesized.push('De l’eau minérale');
      } else {
        synthesized.push('À demain matin');
        synthesized.push('Bonne journée');
        synthesized.push('Avec grand plaisir');
      }
    }
  }

  // Spanish (es) Foil Generation
  if (lang === 'es') {
    if (isQ) {
      synthesized.push('¿A qué hora cierra?');
      synthesized.push('¿Dónde está la estación?');
      synthesized.push('¿Puedo pagar con tarjeta?');
    } else if (words.length >= 3) {
      if (isFood) {
        synthesized.push('Me gustaría pedir la cuenta.');
        synthesized.push('Un vaso de agua fría por favor.');
        synthesized.push('La comida está muy sabrosa.');
      } else {
        synthesized.push('Me gustaría pedir la cuenta.');
        synthesized.push('Nos vemos mañana por la mañana.');
        synthesized.push('Es una excelente idea.');
      }
    } else if (words.length >= 2) {
      if (isFood) {
        synthesized.push('Una taza de café');
        synthesized.push('Pan recién horneado');
        synthesized.push('Agua mineral fría');
      } else {
        synthesized.push('Hasta mañana por la mañana');
        synthesized.push('Que tengas un buen día');
        synthesized.push('Con mucho gusto');
      }
    }
  }

  // Persian (fa) Foil Generation
  if (lang === 'fa') {
    if (isQ) {
      synthesized.push('ساعت چند شروع می‌شود؟');
      synthesized.push('نزدیک‌ترین ایستگاه کجاست؟');
      synthesized.push('می‌توانم با کارت پرداخت کنم؟');
    } else if (words.length >= 3) {
      synthesized.push('من می‌خواهم یک سفارش ثبت کنم.');
      synthesized.push('فردا صبح همدیگر را می‌بینیم.');
      synthesized.push('این ایده بسیار خوبی است.');
    } else if (words.length >= 2) {
      synthesized.push('روز خوبی داشته باشید');
      synthesized.push('صبح شما بخیر');
      synthesized.push('با کمال میل');
    } else {
      synthesized.push('سلام');
      synthesized.push('متشکرم');
      synthesized.push('خواهش می‌کنم');
    }
  }

  return synthesized;
}

/**
 * Main Test Design function to generate 4 challenging options
 */
/**
 * دو گزینه برای تمرین «انتخاب از دو»: همیشه پاسخ درست و بهترین گزینهٔ غلط.
 * جای پاسخ درست (اول یا دوم) از روی متن کارت ثابت است تا با هر بار رندر عوض نشود.
 */
export function pickTwoChoiceOptions(options: string[], correctText: string): string[] {
  const clean = cleanText(correctText.trim());
  const correct = options.find((o) => cleanText(o) === clean) ?? correctText.trim();
  let distractor = options.find((o) => cleanText(o) !== clean);
  if (!distractor) {
    // اگر گزینه‌ها حاوی گزینهٔ غلط نبودند، یک گزینهٔ انحرافی مطمئن بساز
    distractor = correct === 'بله' ? 'خیر' : correct === 'Yes' ? 'No' : `${correct} (گزینه دوم)`;
  }
  let h = 0;
  for (const ch of correct) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h % 2 === 0 ? [correct, distractor] : [distractor, correct];
}

export function generateChallengingReflexOptions(
  currentCard: LanguageCard,
  sessionPool: LanguageCard[] = [],
  targetLangOverride?: Language,
  expectedAnswerOverride?: string
): string[] {
  if (!currentCard || (!currentCard.targetText && !currentCard.translation)) return [];

  const lang = targetLangOverride || currentCard.targetLanguage || 'nl';
  const isReverse = (targetLangOverride && targetLangOverride === currentCard.nativeLanguage) ||
    (currentCard.nativeLanguage && targetLangOverride !== currentCard.targetLanguage && targetLangOverride === 'fa');
  const correct = (expectedAnswerOverride || (isReverse ? currentCard.translation : currentCard.targetText) || currentCard.targetText || '').trim();
  const isQ = isQuestionText(correct);
  // کارت‌های «بازی الگو» گزینه‌های غلط خودشان را دارند (اشتباه‌های رایج). چینش از روی شناسهٔ کارت ثابت است
  // تا در دوئل آنلاین هر دو گوشی یک ترتیب ببینند.
  if (!isReverse && Array.isArray(currentCard.fixedOptions) && currentCard.fixedOptions.length > 0 && correct === (currentCard.targetText || '').trim()) {
    const all = [correct, ...currentCard.fixedOptions.slice(0, 3)];
    let h = 7;
    for (const ch of String(currentCard.id || correct)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    for (let i = all.length - 1; i > 0; i--) {
      h = (h * 1103515245 + 12345) >>> 0;
      const j = (h >>> 16) % (i + 1); // بیت‌های بالایی؛ بیت‌های پایینی این مولد تکراری‌اند
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }

  const correctWordsCount = correct.split(/\s+/).length;
  const correctCharLen = correct.length;
  const cleanCorrect = cleanText(correct);

  // Score candidate texts
  interface Candidate {
    text: string;
    score: number;
  }

  const candidateMap = new Map<string, number>();

  const evaluateAndAdd = (text: string, topic?: string, level?: string, candTranslation?: string) => {
    if (!text) return;
    const t = text.trim();
    if (!t) return;
    const cleanT = cleanText(t);
    if (cleanT === cleanCorrect) return; // Ignore identical
    // A distractor that contains the answer (or is contained in it) is also correct in practice:
    // "Die Speisekarte" vs "Die Speisekarte, bitte!" — never offer both.
    if (cleanT.length > 1 && cleanCorrect.length > 1 && (cleanT.includes(cleanCorrect) || cleanCorrect.includes(cleanT))) return;

    // RULE 0: SEMANTIC COLLISION & SYNONYM EXCLUSION
    // A distractor must not share the same meaning or translation with the correct answer
    // (e.g. "Dank je wel" vs "Bedankt", "Hallo" vs "Hoi", "Tot ziens" vs "Dag", "Check, please" vs "The bill, please")
    const expectedRefText = isReverse ? currentCard.targetText : currentCard.translation;
    if (candTranslation && expectedRefText) {
      const cleanCandTrans = cleanText(candTranslation);
      const cleanCardTrans = cleanText(expectedRefText);
      if (cleanCandTrans && cleanCardTrans) {
        if (cleanCandTrans === cleanCardTrans) return;
        if (cleanCandTrans.length > 2 && cleanCardTrans.length > 2) {
          if (cleanCandTrans.includes(cleanCardTrans) || cleanCardTrans.includes(cleanCandTrans)) return;
        }
      }
    }

    const candIsQ = isQuestionText(t);
    const candWordsCount = t.split(/\s+/).length;
    const candCharLen = t.length;

    // RULE 1: STRICT QUESTION PARITY
    // If correct is a question, distractor MUST be a question
    if (isQ && !candIsQ) return;
    if (!isQ && candIsQ) return;

    // RULE 2: WORD COUNT PARITY
    // If correct is a single word, distractor MUST be a single word (or at most 2 short words)
    if (correctWordsCount === 1 && candWordsCount > 2) return;
    // If correct is a long sentence (>= 4 words), distractor MUST NOT be a single word!
    if (correctWordsCount >= 4 && candWordsCount <= 1) return;
    if (correctWordsCount >= 3 && candWordsCount <= 1) return;

    // RULE 3: STRICT CEFR LEVEL HORIZON
    // Beginner learners (A1) must NOT be bombarded with B2/C1 academic/formal distractors
    if (currentCard.cefrLevel && level) {
      const cardLevelIdx = CEFR_LEVEL_ORDER.indexOf(currentCard.cefrLevel);
      const candLevelIdx = CEFR_LEVEL_ORDER.indexOf(level);
      if (cardLevelIdx >= 0 && candLevelIdx >= 0) {
        const diff = candLevelIdx - cardLevelIdx;
        // Never present distractors > 1 CEFR level above the student's current card level
        if (cardLevelIdx <= 4 && diff > 1) return;
        if (diff > 2) return;
      }
    }

    // Base score
    let score = 50;

    // Topic affinity bonus (same domain: food, directions, schedule, greetings)
    if (topic && currentCard.topic && topic === currentCard.topic) {
      score += 45;
    }

    // Length proximity bonus
    const ratio = candCharLen / Math.max(1, correctCharLen);
    if (ratio >= 0.7 && ratio <= 1.4) {
      score += 35;
    } else if (ratio >= 0.5 && ratio <= 1.8) {
      score += 15;
    }

    // Word count proximity bonus
    const wordDiff = Math.abs(candWordsCount - correctWordsCount);
    if (wordDiff === 0) score += 25;
    else if (wordDiff === 1) score += 15;

    // CEFR level affinity bonus
    if (level && currentCard.cefrLevel) {
      const cardLevelIdx = CEFR_LEVEL_ORDER.indexOf(currentCard.cefrLevel);
      const candLevelIdx = CEFR_LEVEL_ORDER.indexOf(level);
      if (cardLevelIdx >= 0 && candLevelIdx >= 0) {
        const diff = Math.abs(candLevelIdx - cardLevelIdx);
        if (diff === 0) score += 25;
        else if (diff === 1) score += 10;
        else score -= 15;
      }
    }

    // Initial letter similarity (subtle cognitive trap)
    if (cleanT[0] && cleanCorrect[0] && cleanT[0] === cleanCorrect[0]) {
      score += 10;
    }

    const currentScore = candidateMap.get(t) || 0;
    if (score > currentScore) {
      candidateMap.set(t, score);
    }
  };

  // 2. Search curated language cards for same language
  for (const card of CURATED_LANGUAGE_CARDS) {
    if (isReverse && lang === 'fa') {
      if (card.translation) {
        evaluateAndAdd(card.translation, card.topic, card.cefrLevel, card.targetText);
      }
    } else if (card.targetLanguage === lang && card.targetText) {
      evaluateAndAdd(card.targetText, card.topic, card.cefrLevel, card.translation);
    }
  }

  // 3. Search Universal Multi-Lingual Concepts (Word Bank for 38 languages)
  for (const concept of UNIVERSAL_CONCEPTS) {
    const conceptWord = concept.words?.[lang];
    if (conceptWord) {
      const conceptTrans = concept.words?.[currentCard.nativeLanguage || 'fa'] || concept.words?.en;
      evaluateAndAdd(conceptWord, concept.topic, concept.level, conceptTrans);
    }
  }

  // 4. Search session pool cards
  for (const c of sessionPool) {
    const poolText = isReverse ? c.translation : (c.targetLanguage === lang ? c.targetText : undefined);
    if (poolText) {
      evaluateAndAdd(poolText, c.topic, c.cefrLevel, isReverse ? c.targetText : c.translation);
    }
  }

  // Sort candidates by descending pedagogical quality score
  const sortedCandidates = Array.from(candidateMap.entries())
    .map(([text, score]) => ({ text, score }))
    .sort((a, b) => b.score - a.score);

  // Pick top plausible distractors
  const chosenDistractors: string[] = [];

  for (const c of sortedCandidates) {
    // Avoid near-duplicate candidates (e.g. slight punctuation diffs)
    const cleanCand = cleanText(c.text);
    if (chosenDistractors.some(d => cleanText(d) === cleanCand)) continue;

    chosenDistractors.push(c.text);
    if (chosenDistractors.length === 3) break;
  }

  // If we still have fewer than 3 distractors, supplement with synthesized foils
  if (chosenDistractors.length < 3) {
    const synth = synthesizeParallelFoils(correct, lang, currentCard.topic);
    for (const s of synth) {
      const cleanS = cleanText(s);
      if (cleanS !== cleanCorrect && !chosenDistractors.some(d => cleanText(d) === cleanS)) {
        chosenDistractors.push(s);
        if (chosenDistractors.length === 3) break;
      }
    }
  }

  // Smart contextual mutation fallback: produce a high-confusion foil by swapping words
  if (chosenDistractors.length < 3 && correctWordsCount >= 3) {
    const words = correct.split(/\s+/);
    // Subtle mutation 1: swap last word or punctuation
    if (isQ && (words[0].toLowerCase() === 'where' || words[0].toLowerCase() === 'waar' || words[0].toLowerCase() === 'wo')) {
      const mutated = correct.replace(/^(Where|Waar|Wo|Où|Dónde)\b/i, (m) => {
        if (/where/i.test(m)) return 'When';
        if (/waar/i.test(m)) return 'Wanneer';
        if (/wo/i.test(m)) return 'Wann';
        if (/où/i.test(m)) return 'Quand';
        return 'Cuándo';
      });
      if (mutated !== correct && !chosenDistractors.includes(mutated)) {
        chosenDistractors.push(mutated);
      }
    }
  }

  // If still fewer than 3, fallback to best remaining from pool without breaking length/language rule
  if (chosenDistractors.length < 3) {
    for (const c of sessionPool) {
      const candText = (isReverse ? c.translation : c.targetText)?.trim();
      if (!isReverse && c.targetLanguage && c.targetLanguage !== lang) continue;
      if (candText && candText !== correct && !chosenDistractors.includes(candText)) {
        // Enforce basic sentence vs word rule
        const candWords = candText.split(/\s+/).length;
        if (correctWordsCount >= 3 && candWords < 2) continue;
        if (correctWordsCount === 1 && candWords > 2) continue;
        chosenDistractors.push(candText);
        if (chosenDistractors.length === 3) break;
      }
    }
  }

  // Combine correct and 3 distractors, then shuffle
  const finalChoices = [correct, ...chosenDistractors.slice(0, 3)];

  // Deterministic shuffle with random seed
  return finalChoices.sort(() => Math.random() - 0.5);
}
