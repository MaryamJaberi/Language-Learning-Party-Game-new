import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  deleteField,
  getDocFromServer,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, db } from './firebase';
import { CEFRLevel, Language } from './types';

export type MeetupVenueType =
  | 'cafe'
  | 'boardgame_cafe'
  | 'library'
  | 'park'
  | 'community_center';

export type MeetupReportReason =
  | 'private_address'
  | 'unsafe'
  | 'spam'
  | 'inappropriate'
  | 'other';

export interface Meetup {
  id: string;
  venueName: string;
  venueType: MeetupVenueType;
  city: string;
  area: string;
  lat?: number | null;
  lng?: number | null;
  placeId?: string | null;
  targetLanguage: Language;
  cefrLevel: CEFRLevel;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  capacity: number;
  participants: string[];
  participantNames: Record<string, string>;
  notes: string;
  creatorUid: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetupInput {
  venueName: string;
  venueType: MeetupVenueType;
  city: string;
  area: string;
  lat?: number | null;
  lng?: number | null;
  placeId?: string | null;
  targetLanguage: Language;
  cefrLevel: CEFRLevel;
  date: string;
  time: string;
  capacity: number;
  notes: string;
  publicVenueConfirmed: boolean;
}

export interface UpdateMeetupInput {
  venueName: string;
  venueType: MeetupVenueType;
  city: string;
  area: string;
  lat?: number | null;
  lng?: number | null;
  placeId?: string | null;
  targetLanguage: Language;
  cefrLevel: CEFRLevel;
  date: string;
  time: string;
  capacity: number;
  notes: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionChecked = false;
export async function testMeetupFirestoreConnection(): Promise<void> {
  if (connectionChecked) return;
  const mode = (import.meta as any)?.env?.MODE;
  if (typeof window === 'undefined' || mode === 'test') return;
  connectionChecked = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export const PUBLIC_VENUE_TYPES: Array<{
  id: MeetupVenueType;
  labelFa: string;
  labelEn: string;
  emoji: string;
}> = [
  { id: 'cafe', labelFa: 'کافه', labelEn: 'Café', emoji: '☕' },
  { id: 'boardgame_cafe', labelFa: 'کافه بازی', labelEn: 'Board Game Café', emoji: '🎲' },
  { id: 'library', labelFa: 'کتابخانه عمومی', labelEn: 'Public Library', emoji: '📚' },
  { id: 'park', labelFa: 'پارک و فضای باز', labelEn: 'Public Park', emoji: '🌳' },
  { id: 'community_center', labelFa: 'فرهنگسرا / مرکز عمومی', labelEn: 'Community Center', emoji: '🏛️' },
];

export const MEETUP_REPORT_REASONS: Array<{
  id: MeetupReportReason;
  labelFa: string;
  labelEn: string;
}> = [
  { id: 'private_address', labelFa: 'نشانی خانه یا مکان خصوصی است', labelEn: 'Home address or private location' },
  { id: 'unsafe', labelFa: 'مکان نامناسب یا ناامن است', labelEn: 'Unsafe or inappropriate venue' },
  { id: 'spam', labelFa: 'تبلیغات، اسپم یا دورهمی جعلی', labelEn: 'Spam or fake meetup' },
  { id: 'inappropriate', labelFa: 'متن نامناسب یا توهین‌آمیز', labelEn: 'Inappropriate or offensive content' },
  { id: 'other', labelFa: 'دلیل دیگر', labelEn: 'Other reason' },
];

export interface CityCoords {
  nameFa: string;
  nameEn: string;
  aliases: string[];
  lat: number;
  lng: number;
}

export const CITY_COORDINATES: CityCoords[] = [
  { nameFa: 'آمستردام', nameEn: 'Amsterdam', aliases: ['amsterdam', 'آمستردام'], lat: 52.3676, lng: 4.9041 },
  { nameFa: 'روتردام', nameEn: 'Rotterdam', aliases: ['rotterdam', 'روتردام'], lat: 51.9244, lng: 4.4777 },
  { nameFa: 'اوترخت', nameEn: 'Utrecht', aliases: ['utrecht', 'اوترخت'], lat: 52.0907, lng: 5.1214 },
  { nameFa: 'لاهه', nameEn: 'The Hague', aliases: ['den haag', 'the hague', 'hague', 'لاهه'], lat: 52.0705, lng: 4.3007 },
  { nameFa: 'آیندهوون', nameEn: 'Eindhoven', aliases: ['eindhoven', 'آیندهوون'], lat: 51.4416, lng: 5.4697 },
  { nameFa: 'گرونینگن', nameEn: 'Groningen', aliases: ['groningen', 'گرونینگن'], lat: 53.2194, lng: 6.5665 },
  { nameFa: 'تهران', nameEn: 'Tehran', aliases: ['tehran', 'تهران'], lat: 35.6892, lng: 51.389 },
  { nameFa: 'شیراز', nameEn: 'Shiraz', aliases: ['shiraz', 'شیراز'], lat: 29.5918, lng: 52.5837 },
  { nameFa: 'اصفهان', nameEn: 'Isfahan', aliases: ['isfahan', 'esfahan', 'اصفهان'], lat: 32.6546, lng: 51.668 },
  { nameFa: 'مشهد', nameEn: 'Mashhad', aliases: ['mashhad', 'مشهد'], lat: 36.2605, lng: 59.6168 },
  { nameFa: 'تبریز', nameEn: 'Tabriz', aliases: ['tabriz', 'تبریز'], lat: 38.0962, lng: 46.2738 },
  { nameFa: 'برلین', nameEn: 'Berlin', aliases: ['berlin', 'برلین'], lat: 52.52, lng: 13.405 },
  { nameFa: 'مونیخ', nameEn: 'Munich', aliases: ['munich', 'münchen', 'مونیخ'], lat: 48.1351, lng: 11.582 },
  { nameFa: 'لندن', nameEn: 'London', aliases: ['london', 'لندن'], lat: 51.5072, lng: -0.1276 },
  { nameFa: 'پاریس', nameEn: 'Paris', aliases: ['paris', 'پاریس'], lat: 48.8566, lng: 2.3522 },
  { nameFa: 'تورنتو', nameEn: 'Toronto', aliases: ['toronto', 'تورنتو'], lat: 43.6532, lng: -79.3832 },
  { nameFa: 'ونکوور', nameEn: 'Vancouver', aliases: ['vancouver', 'ونکوور'], lat: 49.2827, lng: -123.1207 },
  { nameFa: 'نیویورک', nameEn: 'New York', aliases: ['new york', 'nyc', 'نیویورک'], lat: 40.7128, lng: -74.006 },
  { nameFa: 'استانبول', nameEn: 'Istanbul', aliases: ['istanbul', 'استانبول'], lat: 41.0082, lng: 28.9784 },
  { nameFa: 'دبی', nameEn: 'Dubai', aliases: ['dubai', 'دبی'], lat: 25.2048, lng: 55.2708 },
];

export const DEFAULT_MAP_CENTER = { lat: 52.3676, lng: 4.9041 };

export function findCityCoordinates(queryText: string): CityCoords | null {
  const normalized = queryText.trim().toLowerCase();
  if (!normalized) return null;
  for (const city of CITY_COORDINATES) {
    if (
      city.aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized)) ||
      city.nameEn.toLowerCase() === normalized ||
      city.nameFa === queryText.trim()
    ) {
      return city;
    }
  }
  return null;
}

export function lookupFallbackCityCoords(
  queryText: string
): { lat: number; lng: number; labelFa: string; labelEn: string } | null {
  const match = findCityCoordinates(queryText);
  if (!match) return null;
  return {
    lat: match.lat,
    lng: match.lng,
    labelFa: match.nameFa,
    labelEn: match.nameEn,
  };
}

const PRIVATE_ADDRESS_PATTERNS: RegExp[] = [
  /\b(apt|apartment|flat|suite|unit|house|my home|private residence|dorm|bedroom|my place)\b/i,
  /(?:^|[\s،,.()\-/:])(پلاک|واحد|طبقه|آپارتمان|منزل|خونه|خانهٔ|خانه ی|ساختمان مسکونی|خوابگاه|اتاق من)(?=$|[\s،,.()\-/:])/u,
  /\b(huisnummer|woning|mijn huis|appartement)\b/i,
  /(?:\+?\d[\d\s\-]{7,14}\d)|(?:[۰-۹][\s\-۰-۹]{7,14}[۰-۹])/u,
];

export function containsPrivateAddressHint(text: string): boolean {
  if (!text) return false;
  return PRIVATE_ADDRESS_PATTERNS.some((pattern) => pattern.test(text));
}

export function validatePublicVenueInput(input: {
  venueName: string;
  venueType: MeetupVenueType;
  city: string;
  area?: string;
  date: string;
  time: string;
  capacity: number;
  notes?: string;
  lat?: number | null;
  lng?: number | null;
  isRTL?: boolean;
}): { valid: boolean; error?: string } {
  const err = validateMeetupInput(
    {
      venueName: input.venueName,
      venueType: input.venueType,
      city: input.city,
      area: input.area || '',
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      targetLanguage: 'en',
      cefrLevel: 'A1',
      date: input.date,
      time: input.time,
      capacity: input.capacity,
      notes: input.notes || '',
    },
    Boolean(input.isRTL)
  );
  return err ? { valid: false, error: err } : { valid: true };
}

export function validateMeetupInput(
  input: CreateMeetupInput | UpdateMeetupInput,
  isRTL: boolean
): string | null {
  const venueName = input.venueName.trim();
  const city = input.city.trim();
  const area = (input.area || '').trim();
  const notes = (input.notes || '').trim();

  if (venueName.length < 2 || venueName.length > 120) {
    return isRTL
      ? 'نام مکان عمومی باید بین ۲ تا ۱۲۰ نویسه باشد.'
      : 'Public venue name must be between 2 and 120 characters.';
  }
  if (city.length < 2 || city.length > 80) {
    return isRTL
      ? 'نام شهر باید بین ۲ تا ۸۰ نویسه باشد.'
      : 'City name must be between 2 and 80 characters.';
  }
  if (area.length > 120) {
    return isRTL
      ? 'نام محله نباید بیش از ۱۲۰ نویسه باشد.'
      : 'Neighborhood / area cannot exceed 120 characters.';
  }
  if (!['cafe', 'boardgame_cafe', 'library', 'park', 'community_center'].includes(input.venueType)) {
    return isRTL
      ? 'فقط مکان‌های عمومی (کافه، کافه بازی، کتابخانه، پارک یا فرهنگسرا) مجاز هستند.'
      : 'Only public venues (café, board game café, library, park, or community center) are allowed.';
  }
  if (
    containsPrivateAddressHint(venueName) ||
    containsPrivateAddressHint(city) ||
    containsPrivateAddressHint(area) ||
    containsPrivateAddressHint(notes)
  ) {
    return isRTL
      ? 'برای حفظ امنیت و حریم خصوصی، فقط مکان‌های عمومی مجاز است و نوشتن نشانی خانه، پلاک یا واحد ممنوع است.'
      : 'For safety and privacy, only public venues are allowed. Never enter home addresses, apartment numbers, or private residences.';
  }
  if ('publicVenueConfirmed' in input && !input.publicVenueConfirmed) {
    return isRTL
      ? 'لطفاً تأیید کنید که این دورهمی در یک مکان عمومی برگزار می‌شود.'
      : 'Please confirm that this meetup is held at a public venue.';
  }
  if (!input.date || input.date.trim().length < 4) {
    return isRTL ? 'لطفاً تاریخ دورهمی را انتخاب کنید.' : 'Please select a meetup date.';
  }
  if (!input.time || input.time.trim().length < 3) {
    return isRTL ? 'لطفاً ساعت دورهمی را وارد کنید.' : 'Please enter a meetup time.';
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 2 || input.capacity > 30) {
    return isRTL ? 'ظرفیت باید عددی بین ۲ تا ۳۰ نفر باشد.' : 'Capacity must be between 2 and 30 people.';
  }
  if (notes.length > 500) {
    return isRTL ? 'یادداشت نباید بیش از ۵۰۰ نویسه باشد.' : 'Notes cannot exceed 500 characters.';
  }
  if (
    input.lat != null &&
    (typeof input.lat !== 'number' || Number.isNaN(input.lat) || input.lat < -90 || input.lat > 90)
  ) {
    return isRTL ? 'عرض جغرافیایی مکان معتبر نیست.' : 'Invalid latitude coordinate.';
  }
  if (
    input.lng != null &&
    (typeof input.lng !== 'number' || Number.isNaN(input.lng) || input.lng < -180 || input.lng > 180)
  ) {
    return isRTL ? 'طول جغرافیایی مکان معتبر نیست.' : 'Invalid longitude coordinate.';
  }
  return null;
}

// Detect whether the Express backend (/api/meetups/search-venues) is available.
// On GitHub Pages (*.github.io) or file:// there is no backend server.
let cachedBackendAvailable: boolean | null = null;

export function isStaticHostWithoutServer(loc?: Pick<Location, 'hostname' | 'protocol'>): boolean {
  const targetLoc = loc || (typeof window !== 'undefined' ? window.location : undefined);
  if (!targetLoc) return true;
  const host = (targetLoc.hostname || '').toLowerCase();
  const proto = (targetLoc.protocol || '').toLowerCase();
  if (proto === 'file:') return true;
  if (host.endsWith('.github.io') || host === 'github.io') return true;
  return false;
}

export function resetBackendAvailabilityCache(): void {
  cachedBackendAvailable = null;
}

export async function checkBackendServerAvailable(): Promise<boolean> {
  if (isStaticHostWithoutServer()) {
    cachedBackendAvailable = false;
    return false;
  }
  if (cachedBackendAvailable !== null) {
    return cachedBackendAvailable;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('/api/health', {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      cachedBackendAvailable = false;
      return false;
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      cachedBackendAvailable = false;
      return false;
    }
    const json = await res.json();
    cachedBackendAvailable = json?.status === 'ok';
    return cachedBackendAvailable;
  } catch {
    cachedBackendAvailable = false;
    return false;
  }
}

export const isStaticHostingEnvironment = isStaticHostWithoutServer;
export const resetServerAvailabilityCache = resetBackendAvailabilityCache;
export const detectBackendServerAvailable = checkBackendServerAvailable;

export function getGoogleMapsApiKey(): string {
  try {
    return String((import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  } catch {
    return '';
  }
}

function sanitizeDisplayName(user: User): string {
  const raw = (user.displayName || '').trim();
  if (raw) return raw.slice(0, 80);
  if (user.email) {
    const prefix = user.email.split('@')[0]?.trim();
    if (prefix) return prefix.slice(0, 80);
  }
  return 'Player';
}

export function subscribeToMeetups(
  onUpdate: (meetups: Meetup[]) => void,
  onError?: (err: Error) => void
): () => void {
  testMeetupFirestoreConnection().catch(() => {});
  const meetupsRef = collection(db, 'meetups');
  const q = query(meetupsRef, orderBy('date', 'asc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Meetup[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        items.push({
          id: docSnap.id,
          venueName: String(data.venueName || ''),
          venueType: (data.venueType as MeetupVenueType) || 'cafe',
          city: String(data.city || ''),
          area: String(data.area || ''),
          lat: typeof data.lat === 'number' ? data.lat : null,
          lng: typeof data.lng === 'number' ? data.lng : null,
          placeId: typeof data.placeId === 'string' ? data.placeId : null,
          targetLanguage: (data.targetLanguage as Language) || 'en',
          cefrLevel: (data.cefrLevel as CEFRLevel) || 'A1',
          date: String(data.date || ''),
          time: String(data.time || ''),
          capacity: typeof data.capacity === 'number' ? data.capacity : 6,
          participants: Array.isArray(data.participants) ? data.participants.map(String) : [],
          participantNames:
            data.participantNames && typeof data.participantNames === 'object'
              ? (data.participantNames as Record<string, string>)
              : {},
          notes: String(data.notes || ''),
          creatorUid: String(data.creatorUid || ''),
          creatorName: String(data.creatorName || ''),
          createdAt: String(data.createdAt || ''),
          updatedAt: String(data.updatedAt || ''),
        });
      });
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'meetups');
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function createMeetup(input: CreateMeetupInput, user: User): Promise<string> {
  const displayName = sanitizeDisplayName(user);
  const nowIso = new Date().toISOString();

  const payload: Record<string, unknown> = {
    venueName: input.venueName.trim(),
    venueType: input.venueType,
    city: input.city.trim(),
    area: (input.area || '').trim(),
    lat: typeof input.lat === 'number' ? Number(input.lat.toFixed(6)) : null,
    lng: typeof input.lng === 'number' ? Number(input.lng.toFixed(6)) : null,
    placeId: input.placeId ? String(input.placeId).slice(0, 200) : null,
    targetLanguage: input.targetLanguage,
    cefrLevel: input.cefrLevel,
    date: input.date.trim(),
    time: input.time.trim(),
    capacity: input.capacity,
    participants: [user.uid],
    participantNames: {
      [user.uid]: displayName,
    },
    notes: (input.notes || '').trim(),
    creatorUid: user.uid,
    creatorName: displayName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    const ref = await addDoc(collection(db, 'meetups'), payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'meetups');
  }
}

export async function updateMeetup(
  meetupId: string,
  input: UpdateMeetupInput
): Promise<void> {
  const path = `meetups/${meetupId}`;
  try {
    const docRef = doc(db, 'meetups', meetupId);
    await updateDoc(docRef, {
      venueName: input.venueName.trim(),
      venueType: input.venueType,
      city: input.city.trim(),
      area: (input.area || '').trim(),
      lat: typeof input.lat === 'number' ? Number(input.lat.toFixed(6)) : null,
      lng: typeof input.lng === 'number' ? Number(input.lng.toFixed(6)) : null,
      placeId: input.placeId ? String(input.placeId).slice(0, 200) : null,
      targetLanguage: input.targetLanguage,
      cefrLevel: input.cefrLevel,
      date: input.date.trim(),
      time: input.time.trim(),
      capacity: input.capacity,
      notes: (input.notes || '').trim(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMeetup(meetupId: string): Promise<void> {
  const path = `meetups/${meetupId}`;
  try {
    await deleteDoc(doc(db, 'meetups', meetupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function joinMeetup(meetup: Meetup, user: User): Promise<void> {
  const path = `meetups/${meetup.id}`;
  if (meetup.participants.includes(user.uid)) return;
  const nextUids = [...meetup.participants, user.uid];
  const displayName = sanitizeDisplayName(user);

  try {
    const docRef = doc(db, 'meetups', meetup.id);
    await updateDoc(docRef, {
      participants: nextUids,
      [`participantNames.${user.uid}`]: displayName,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function leaveMeetup(meetup: Meetup, user: User): Promise<void> {
  const path = `meetups/${meetup.id}`;
  if (!meetup.participants.includes(user.uid)) return;
  const nextUids = meetup.participants.filter((uid) => uid !== user.uid);

  try {
    const docRef = doc(db, 'meetups', meetup.id);
    await updateDoc(docRef, {
      participants: nextUids,
      [`participantNames.${user.uid}`]: deleteField(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function reportMeetup(
  meetupId: string,
  reason: MeetupReportReason,
  details: string,
  user: User
): Promise<string> {
  const path = 'meetup_reports';
  try {
    const ref = await addDoc(collection(db, 'meetup_reports'), {
      meetupId,
      reporterUid: user.uid,
      reason,
      details: details.trim().slice(0, 500),
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function filterMeetups(
  meetups: Meetup[],
  options: {
    cityQuery?: string;
    targetLanguage?: string;
    cefrLevel?: string;
  }
): Meetup[] {
  const cityQ = (options.cityQuery || '').trim().toLowerCase();
  const langQ = (options.targetLanguage || '').trim();
  const levelQ = (options.cefrLevel || '').trim();

  return meetups.filter((m) => {
    if (cityQ) {
      const hay = `${m.city} ${m.area} ${m.venueName} ${m.notes}`.toLowerCase();
      if (!hay.includes(cityQ)) return false;
    }
    if (langQ && langQ !== 'all' && m.targetLanguage !== langQ) {
      return false;
    }
    if (levelQ && levelQ !== 'all' && m.cefrLevel !== levelQ) {
      return false;
    }
    return true;
  });
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
