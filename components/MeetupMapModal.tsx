import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  X,
  MapPin,
  Search,
  Calendar,
  Clock,
  Users,
  Navigation,
  Plus,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Check,
  Flag,
  Pencil,
  Trash2,
  LogIn,
  AlertTriangle,
  Loader2,
  Globe,
  Filter,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle } from '../firebase';
import { EmailAuthForm } from './EmailAuthForm';
import { searchVenuesWithMaps, MapPlace } from '../geminiService';
import { sound } from '../soundManager';
import { CEFR_LEVELS, SUPPORTED_LANGUAGES, getCefrText, isAdminUser } from '../constants';
import { CEFRLevel, Language } from '../types';
import {
  Meetup,
  MeetupVenueType,
  MeetupReportReason,
  PUBLIC_VENUE_TYPES,
  MEETUP_REPORT_REASONS,
  CITY_COORDINATES,
  DEFAULT_MAP_CENTER,
  findCityCoordinates,
  validateMeetupInput,
  checkBackendServerAvailable,
  getGoogleMapsApiKey,
  subscribeToMeetups,
  createMeetup,
  updateMeetup,
  deleteMeetup,
  joinMeetup,
  leaveMeetup,
  reportMeetup,
  filterMeetups,
  haversineKm,
} from '../meetupService';
import { tx, txt, langName } from '../i18n/runtime';

export interface MeetupMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
  isRTL?: boolean;
  defaultTargetLanguage?: Language;
  defaultCefrLevel?: CEFRLevel;
}

const getVenueTypeMeta = (type: MeetupVenueType, isRTL: boolean) => {
  const found = PUBLIC_VENUE_TYPES.find((v) => v.id === type) || PUBLIC_VENUE_TYPES[0];
  return {
    emoji: found.emoji,
    label: tx(isRTL, found.labelFa, found.labelEn),
  };
};

const getLanguageLabel = (code: string, isRTL: boolean) => {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  if (!found) return code.toUpperCase();
  return langName(found, isRTL);
};

interface MapCameraTarget {
  lat: number;
  lng: number;
  zoom?: number;
  nonce: number;
}

interface PlaceSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

// Inner component using useMap & Places API (New) to pan smoothly and search cities/public venues
const MapCameraAndPlacesBridge: React.FC<{
  target: MapCameraTarget | null;
  citySearchRequest: { query: string; nonce: number } | null;
  onCityResolved: (coords: { lat: number; lng: number; label?: string }) => void;
  venueSearchRequest: { query: string; nonce: number } | null;
  onVenueResults: (results: PlaceSearchResult[]) => void;
}> = ({
  target,
  citySearchRequest,
  onCityResolved,
  venueSearchRequest,
  onVenueResults,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    if (typeof target.zoom === 'number') {
      map.setZoom(target.zoom);
    }
  }, [map, target]);

  // Resolve typed city via Places API (New) Place.searchByText
  useEffect(() => {
    if (!citySearchRequest || !citySearchRequest.query.trim()) return;
    let cancelled = false;

    const run = async () => {
      const q = citySearchRequest.query.trim();
      if (placesLib && (placesLib as any).Place?.searchByText) {
        try {
          const { places } = await (placesLib as any).Place.searchByText({
            textQuery: q,
            fields: ['displayName', 'location'],
            maxResultCount: 1,
          });
          if (!cancelled && places && places.length > 0 && places[0].location) {
            const loc = places[0].location;
            const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
            const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
              onCityResolved({ lat, lng, label: places[0].displayName || q });
              return;
            }
          }
        } catch {
          // Fallback to built-in city dictionary below
        }
      }

      if (!cancelled) {
        const localCity = findCityCoordinates(q);
        if (localCity) {
          onCityResolved({ lat: localCity.lat, lng: localCity.lng, label: localCity.nameEn });
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [citySearchRequest, placesLib, onCityResolved]);

  // Search public venues (café/library/park) via Places API (New) when creating a meetup
  useEffect(() => {
    if (!venueSearchRequest || !venueSearchRequest.query.trim()) return;
    let cancelled = false;

    const run = async () => {
      if (!placesLib || !(placesLib as any).Place?.searchByText) {
        if (!cancelled) onVenueResults([]);
        return;
      }
      try {
        const { places } = await (placesLib as any).Place.searchByText({
          textQuery: venueSearchRequest.query.trim(),
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
          maxResultCount: 5,
        });
        if (!cancelled && Array.isArray(places)) {
          const mapped: PlaceSearchResult[] = places
            .filter((p: any) => p?.location)
            .map((p: any) => ({
              placeId: String(p.id || ''),
              name: String(p.displayName || ''),
              address: String(p.formattedAddress || ''),
              lat: typeof p.location.lat === 'function' ? p.location.lat() : Number(p.location.lat),
              lng: typeof p.location.lng === 'function' ? p.location.lng() : Number(p.location.lng),
            }));
          onVenueResults(mapped);
        }
      } catch {
        if (!cancelled) onVenueResults([]);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [venueSearchRequest, placesLib, onVenueResults]);

  return null;
};

// Individual meetup marker using AdvancedMarker + Pin + InfoWindow
const MeetupPinMarker: React.FC<{
  meetup: Meetup;
  isSelected: boolean;
  isRTL: boolean;
  onSelect: () => void;
  onCloseInfo: () => void;
}> = ({ meetup, isSelected, isRTL, onSelect, onCloseInfo }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  if (typeof meetup.lat !== 'number' || typeof meetup.lng !== 'number') return null;

  const venueMeta = getVenueTypeMeta(meetup.venueType, isRTL);
  const isFull = meetup.participants.length >= meetup.capacity;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: meetup.lat, lng: meetup.lng }}
        onClick={onSelect}
        title={meetup.venueName}
      >
        <Pin
          background={isSelected ? '#2347C5' : isFull ? '#94A3B8' : '#12B5A4'}
          borderColor="#FFFFFF"
          glyphColor="#FFFFFF"
        />
      </AdvancedMarker>
      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo}>
          <div className="max-w-[220px] p-1 space-y-1 text-slate-900" dir={((isRTL ? 'rtl' : 'ltr'))}>
            <div className="font-bold text-xs flex items-center gap-1">
              <span>{venueMeta.emoji}</span>
              <span className="truncate">{meetup.venueName}</span>
            </div>
            <div className="text-[11px] text-slate-600">
              {meetup.city}
              {meetup.area ? `، ${meetup.area}` : ''}
            </div>
            <div className="flex flex-wrap gap-1 pt-0.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                {getLanguageLabel(meetup.targetLanguage, isRTL)} • {meetup.cefrLevel}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                {meetup.participants.length}/{meetup.capacity}
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              {meetup.date} • {meetup.time}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const MeetupMapModal: React.FC<MeetupMapModalProps> = ({
  isOpen,
  onClose,
  language = 'fa',
  isRTL: isRTLProp,
  defaultTargetLanguage = 'en',
  defaultCefrLevel = 'A1',
}) => {
  const isRTL = typeof isRTLProp === 'boolean' ? isRTLProp : language === 'fa' || language === 'ar' || language === 'ur';
  const mapsApiKey = useMemo(() => getGoogleMapsApiKey(), []);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [authGateReason, setAuthGateReason] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Meetups from Firestore
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loadingMeetups, setLoadingMeetups] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Filters & Location (NEVER auto-requested; only on explicit user click)
  const [cityInput, setCityInput] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Local-only user coordinates used strictly for map panning and approximate distance sorting (NEVER stored or shared)
  const [localUserCoords, setLocalUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'requesting' | 'granted' | 'declined'>('idle');
  const [locationHint, setLocationHint] = useState<string | null>(null);

  // Map camera & selection
  const [cameraTarget, setCameraTarget] = useState<MapCameraTarget | null>(null);
  const [citySearchRequest, setCitySearchRequest] = useState<{ query: string; nonce: number } | null>(null);
  const [selectedMeetupId, setSelectedMeetupId] = useState<string | null>(null);

  // Server-only Gemini + Google Maps venue suggestion availability (hidden on GitHub Pages)
  const [serverAvailable, setServerAvailable] = useState<boolean>(false);
  const [loadingAiVenues, setLoadingAiVenues] = useState(false);
  const [aiVenueResults, setAiVenueResults] = useState<{ text: string; places: MapPlace[] } | null>(null);
  const [aiVenueError, setAiVenueError] = useState<string | null>(null);

  // Create / Edit Meetup form state
  const [showForm, setShowForm] = useState(false);
  const [editingMeetup, setEditingMeetup] = useState<Meetup | null>(null);
  const [formVenueName, setFormVenueName] = useState('');
  const [formVenueType, setFormVenueType] = useState<MeetupVenueType>('cafe');
  const [formCity, setFormCity] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formLat, setFormLat] = useState<number | null>(DEFAULT_MAP_CENTER.lat);
  const [formLng, setFormLng] = useState<number | null>(DEFAULT_MAP_CENTER.lng);
  const [formPlaceId, setFormPlaceId] = useState<string | null>(null);
  const [formTargetLang, setFormTargetLang] = useState<Language>(defaultTargetLanguage);
  const [formCefrLevel, setFormCefrLevel] = useState<CEFRLevel>(defaultCefrLevel);
  const [formDate, setFormDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [formTime, setFormTime] = useState('18:00');
  const [formCapacity, setFormCapacity] = useState(6);
  const [formNotes, setFormNotes] = useState('');
  const [formPublicConfirmed, setFormPublicConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Public venue search helper inside form (via Places API New)
  const [venueSearchRequest, setVenueSearchRequest] = useState<{ query: string; nonce: number } | null>(null);
  const [venueSuggestions, setVenueSuggestions] = useState<PlaceSearchResult[]>([]);

  // Action states (Join/Leave, Delete confirmation, Report)
  const [busyMeetupId, setBusyMeetupId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [reportingMeetup, setReportingMeetup] = useState<Meetup | null>(null);
  const [reportReason, setReportReason] = useState<MeetupReportReason>('private_address');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auth subscription
  useEffect(() => {
    if (!isOpen) return;
    setCurrentUser(auth.currentUser);
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setAuthGateReason(null);
      }
    });
    return () => unsub();
  }, [isOpen]);

  // Firestore real-time meetups subscription (open to everyone)
  useEffect(() => {
    if (!isOpen) return;
    setLoadingMeetups(true);
    setFirestoreError(null);
    const unsub = subscribeToMeetups(
      (items) => {
        setMeetups(items);
        setLoadingMeetups(false);
      },
      () => {
        setLoadingMeetups(false);
        setFirestoreError(
          tx(isRTL, 'دریافت فهرست دورهمی‌ها با خطا روبه‌رو شد. لطفاً اتصال اینترنت را بررسی کنید.', 'Could not load meetups from the server. Please check your connection.')
        );
      }
    );
    return () => unsub();
  }, [isOpen, isRTL]);

  // Detect whether backend server (/api/meetups/search-venues) exists (automatically false on GitHub Pages)
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    checkBackendServerAvailable().then((available) => {
      if (active) setServerAvailable(available);
    });
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Filtered and distance-sorted meetups
  const visibleMeetups = useMemo(() => {
    const filtered = filterMeetups(meetups, {
      cityQuery: cityInput,
      targetLanguage: filterLanguage,
      cefrLevel: filterLevel,
    });
    if (!localUserCoords) return filtered;
    return [...filtered].sort((a, b) => {
      const distA =
        typeof a.lat === 'number' && typeof a.lng === 'number'
          ? haversineKm(localUserCoords, { lat: a.lat, lng: a.lng })
          : Number.POSITIVE_INFINITY;
      const distB =
        typeof b.lat === 'number' && typeof b.lng === 'number'
          ? haversineKm(localUserCoords, { lat: b.lat, lng: b.lng })
          : Number.POSITIVE_INFINITY;
      return distA - distB;
    });
  }, [meetups, cityInput, filterLanguage, filterLevel, localUserCoords]);

  const handleCityResolved = useCallback(
    (coords: { lat: number; lng: number; label?: string }) => {
      setCameraTarget({ lat: coords.lat, lng: coords.lng, zoom: 12, nonce: Date.now() });
      setLocationHint(null);
    },
    []
  );

  const handleVenueResults = useCallback((results: PlaceSearchResult[]) => {
    setVenueSuggestions(results);
  }, []);

  if (!isOpen) return null;

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Request user's location ONLY when they explicitly click the location button
  const handleRequestLocation = () => {
    sound.playClick();
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationState('declined');
      setLocationHint(
        tx(isRTL, 'مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند. لطفاً نام شهر را تایپ کنید.', 'Your browser does not support geolocation. Please type a city instead.')
      );
      return;
    }

    setLocationState('requesting');
    setLocationHint(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocalUserCoords(coords);
        setLocationState('granted');
        setCameraTarget({ lat: coords.lat, lng: coords.lng, zoom: 12, nonce: Date.now() });
        setLocationHint(
          tx(isRTL, 'نقشه روی محدودهٔ شهر شما تنظیم شد (موقعیت دقیق شما هرگز ذخیره یا به دیگران نشان داده نمی‌شود).', 'Map centered near your area (your exact location is never saved or shown to others).')
        );
      },
      () => {
        setLocationState('declined');
        setLocationHint(
          tx(isRTL, 'دسترسی به موقعیت داده نشد. مشکلی نیست — کافی است نام شهر خود را در کادر جستجو بنویسید.', 'Location permission declined. No problem — just type your city in the search box.')
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  const handleCitySearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sound.playClick();
    const q = cityInput.trim();
    if (!q) return;

    const localMatch = findCityCoordinates(q);
    if (localMatch) {
      setCameraTarget({ lat: localMatch.lat, lng: localMatch.lng, zoom: 12, nonce: Date.now() });
      setLocationHint(null);
    }

    if (mapsApiKey) {
      setCitySearchRequest({ query: q, nonce: Date.now() });
    } else if (!localMatch) {
      setLocationHint(
        txt(isRTL, 'دورهمی‌ها بر اساس «{0}» فیلتر شدند.', 'Meetups filtered by "{0}".', [q])
      );
    }
  };

  const handleQuickCity = (cityName: string, lat: number, lng: number) => {
    sound.playClick();
    setCityInput(cityName);
    setCameraTarget({ lat, lng, zoom: 12, nonce: Date.now() });
  };

  const handleAiSuggestVenues = async () => {
    if (!serverAvailable) return;
    sound.playClick();
    setLoadingAiVenues(true);
    setAiVenueError(null);
    try {
      const targetCity = cityInput.trim() || (tx(isRTL, 'تهران', 'Amsterdam'));
      const latLng = localUserCoords
        ? { latitude: localUserCoords.lat, longitude: localUserCoords.lng }
        : undefined;
      const result = await searchVenuesWithMaps(targetCity, latLng, undefined, ((language as string) || 'en'));
      setAiVenueResults(result);
    } catch (err: any) {
      setAiVenueError(
        err?.message ||
          (tx(isRTL, 'دریافت پیشنهاد مکان انجام نشد.', 'Could not fetch venue suggestions.'))
      );
    } finally {
      setLoadingAiVenues(false);
    }
  };

  const requireSignedIn = (reasonFa: string, reasonEn: string): User | null => {
    if (currentUser) return currentUser;
    setAuthGateReason(tx(isRTL, reasonFa, reasonEn));
    return null;
  };

  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        setCurrentUser(user);
        setAuthGateReason(null);
      }
    } catch (err: any) {
      setAuthError(
        err?.message ||
          (tx(isRTL, 'ورود با گوگل انجام نشد. می‌توانید از ورود با ایمیل استفاده کنید.', 'Google sign-in failed. You can also sign in with email.'))
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const openCreateForm = (prefillVenueName?: string) => {
    sound.playClick();
    if (!requireSignedIn('برای ساخت دورهمی تازه، ابتدا وارد حساب خود شوید (با گوگل یا ایمیل).', 'Sign in with Google or email to create a meetup.')) {
      return;
    }
    setEditingMeetup(null);
    setFormVenueName(prefillVenueName || '');
    setFormVenueType('cafe');
    const cityDefault = cityInput.trim();
    setFormCity(cityDefault);
    setFormArea('');
    const matchedCity = findCityCoordinates(cityDefault);
    setFormLat(matchedCity?.lat ?? localUserCoords?.lat ?? DEFAULT_MAP_CENTER.lat);
    setFormLng(matchedCity?.lng ?? localUserCoords?.lng ?? DEFAULT_MAP_CENTER.lng);
    setFormPlaceId(null);
    setFormTargetLang(defaultTargetLanguage);
    setFormCefrLevel(defaultCefrLevel);
    setFormDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    setFormTime('18:00');
    setFormCapacity(6);
    setFormNotes('');
    setFormPublicConfirmed(false);
    setFormError(null);
    setVenueSuggestions([]);
    setShowForm(true);
  };

  const openEditForm = (meetup: Meetup) => {
    sound.playClick();
    if (!currentUser) return;
    setEditingMeetup(meetup);
    setFormVenueName(meetup.venueName);
    setFormVenueType(meetup.venueType);
    setFormCity(meetup.city);
    setFormArea(meetup.area);
    setFormLat(meetup.lat ?? DEFAULT_MAP_CENTER.lat);
    setFormLng(meetup.lng ?? DEFAULT_MAP_CENTER.lng);
    setFormPlaceId(meetup.placeId ?? null);
    setFormTargetLang(meetup.targetLanguage);
    setFormCefrLevel(meetup.cefrLevel);
    setFormDate(meetup.date);
    setFormTime(meetup.time);
    setFormCapacity(meetup.capacity);
    setFormNotes(meetup.notes);
    setFormPublicConfirmed(true);
    setFormError(null);
    setVenueSuggestions([]);
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const user = requireSignedIn(
      'برای ذخیرهٔ دورهمی، وارد حساب خود شوید.',
      'Please sign in to save this meetup.'
    );
    if (!user) return;

    // Resolve city center coordinates if user didn't pick a pin explicitly
    let resolvedLat = formLat;
    let resolvedLng = formLng;
    const cityMatch = findCityCoordinates(formCity);
    if (cityMatch && resolvedLat === DEFAULT_MAP_CENTER.lat && resolvedLng === DEFAULT_MAP_CENTER.lng) {
      resolvedLat = cityMatch.lat;
      resolvedLng = cityMatch.lng;
    }

    if (editingMeetup) {
      if (formCapacity < editingMeetup.participants.length) {
        setFormError(
          txt(isRTL, 'ظرفیت نمی‌تواند کمتر از تعداد شرکت‌کننده‌های فعلی ({0}) باشد.', 'Capacity cannot be less than current participants ({0}).', [editingMeetup.participants.length])
        );
        return;
      }
      const updatePayload = {
        venueName: formVenueName,
        venueType: formVenueType,
        city: formCity,
        area: formArea,
        lat: resolvedLat,
        lng: resolvedLng,
        placeId: formPlaceId,
        targetLanguage: formTargetLang,
        cefrLevel: formCefrLevel,
        date: formDate,
        time: formTime,
        capacity: Number(formCapacity),
        notes: formNotes,
      };
      const validationErr = validateMeetupInput(updatePayload, isRTL);
      if (validationErr) {
        setFormError(validationErr);
        return;
      }
      setFormSubmitting(true);
      try {
        await updateMeetup(editingMeetup.id, updatePayload);
        sound.playCorrect();
        setShowForm(false);
        setEditingMeetup(null);
        showToast('success', tx(isRTL, 'تغییرات دورهمی ذخیره شد.', 'Meetup updated.'));
      } catch {
        setFormError(tx(isRTL, 'ذخیرهٔ تغییرات انجام نشد.', 'Could not update meetup.'));
      } finally {
        setFormSubmitting(false);
      }
    } else {
      const createPayload = {
        venueName: formVenueName,
        venueType: formVenueType,
        city: formCity,
        area: formArea,
        lat: resolvedLat,
        lng: resolvedLng,
        placeId: formPlaceId,
        targetLanguage: formTargetLang,
        cefrLevel: formCefrLevel,
        date: formDate,
        time: formTime,
        capacity: Number(formCapacity),
        notes: formNotes,
        publicVenueConfirmed: formPublicConfirmed,
      };
      const validationErr = validateMeetupInput(createPayload, isRTL);
      if (validationErr) {
        setFormError(validationErr);
        return;
      }
      setFormSubmitting(true);
      try {
        const newId = await createMeetup(createPayload, user);
        sound.playCorrect();
        setShowForm(false);
        setSelectedMeetupId(newId);
        if (typeof resolvedLat === 'number' && typeof resolvedLng === 'number') {
          setCameraTarget({ lat: resolvedLat, lng: resolvedLng, zoom: 13, nonce: Date.now() });
        }
        showToast('success', tx(isRTL, 'دورهمی عمومی شما با موفقیت ثبت شد!', 'Your public meetup is live!'));
      } catch {
        setFormError(tx(isRTL, 'ثبت دورهمی انجام نشد. لطفاً دوباره تلاش کنید.', 'Could not create meetup. Please try again.'));
      } finally {
        setFormSubmitting(false);
      }
    }
  };

  const handleToggleJoin = async (meetup: Meetup) => {
    sound.playClick();
    const user = requireSignedIn(
      'برای پیوستن به دورهمی، ابتدا با گوگل یا ایمیل وارد شوید.',
      'Sign in with Google or email to join this meetup.'
    );
    if (!user) return;

    const alreadyJoined = meetup.participants.includes(user.uid);
    if (!alreadyJoined && meetup.participants.length >= meetup.capacity) {
      showToast('error', tx(isRTL, 'ظرفیت این دورهمی تکمیل است.', 'This meetup is already full.'));
      return;
    }

    setBusyMeetupId(meetup.id);
    try {
      if (alreadyJoined) {
        await leaveMeetup(meetup, user);
        showToast('success', tx(isRTL, 'از این دورهمی خارج شدید.', 'You left the meetup.'));
      } else {
        await joinMeetup(meetup, user);
        sound.playCorrect();
        showToast('success', tx(isRTL, 'با موفقیت به دورهمی پیوستید!', 'You joined the meetup!'));
      }
    } catch {
      showToast('error', tx(isRTL, 'تغییر عضویت انجام نشد.', 'Could not update participation.'));
    } finally {
      setBusyMeetupId(null);
    }
  };

  const handleDeleteMeetup = async (meetupId: string) => {
    sound.playClick();
    setBusyMeetupId(meetupId);
    try {
      await deleteMeetup(meetupId);
      setConfirmDeleteId(null);
      if (selectedMeetupId === meetupId) setSelectedMeetupId(null);
      showToast('success', tx(isRTL, 'دورهمی حذف شد.', 'Meetup deleted.'));
    } catch {
      showToast('error', tx(isRTL, 'حذف دورهمی انجام نشد.', 'Could not delete meetup.'));
    } finally {
      setBusyMeetupId(null);
    }
  };

  const handleOpenReport = (meetup: Meetup) => {
    sound.playClick();
    if (!requireSignedIn('برای ثبت گزارش تخلف یا نشانی خصوصی، ابتدا وارد حساب خود شوید.', 'Please sign in to report a meetup.')) {
      return;
    }
    setReportingMeetup(meetup);
    setReportReason('private_address');
    setReportDetails('');
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingMeetup || !currentUser) return;
    setReportSubmitting(true);
    try {
      await reportMeetup(reportingMeetup.id, reportReason, reportDetails, currentUser);
      setReportingMeetup(null);
      setReportDetails('');
      showToast(
        'success',
        tx(isRTL, 'گزارش شما ثبت شد و برای بررسی ارسال گردید. سپاس از کمک به امنیت جمع!', 'Your report has been submitted for review. Thank you for keeping the community safe!')
      );
    } catch {
      showToast('error', tx(isRTL, 'ثبت گزارش انجام نشد.', 'Could not submit report.'));
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleFocusMeetupOnMap = (meetup: Meetup) => {
    sound.playClick();
    setSelectedMeetupId(meetup.id);
    if (typeof meetup.lat === 'number' && typeof meetup.lng === 'number') {
      setCameraTarget({ lat: meetup.lat, lng: meetup.lng, zoom: 14, nonce: Date.now() });
    }
  };

  const handleMapClick = (event: any) => {
    if (!showForm) return;
    const latLng = event?.detail?.latLng;
    if (latLng && typeof latLng.lat === 'number' && typeof latLng.lng === 'number') {
      setFormLat(latLng.lat);
      setFormLng(latLng.lng);
    }
  };

  const inputClass =
    'w-full h-10 px-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--lapis)] transition-colors';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs animate-fade-in font-ui"
      dir={((isRTL ? 'rtl' : 'ltr'))}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={tx(isRTL, 'دورهمی‌های اطراف روی نقشه', 'Nearby Language Meetups Map')}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] bg-[var(--panel)] border border-[var(--line)] rounded-[24px] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-gradient-to-l from-[var(--turq)]/10 via-[var(--panel)] to-[var(--lapis)]/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--turq)] text-white flex items-center justify-center shadow-sm shrink-0">
              <MapPin size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm sm:text-base text-[var(--ink)] truncate">
                {tx(isRTL, 'دورهمی‌های عمومی اطراف', 'Nearby Public Meetups')}
              </h2>
              <p className="text-[11px] text-[var(--mute)] font-semibold truncate">
                {tx(isRTL, 'یافتن و ساخت قرار بازی حضوری زبان در کافه‌ها، کتابخانه‌ها و پارک‌ها', 'Find and host in-person language game meetups at cafés, libraries & parks')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={tx(isRTL, 'بستن', 'Close')}
            className="w-9 h-9 rounded-full bg-[var(--bg)] hover:bg-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* SAFETY & PRIVACY NOTICE */}
        <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-900 dark:text-emerald-200 font-semibold">
          <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {tx(isRTL, 'امنیت و حریم خصوصی: فقط مکان‌های عمومی (کافه، کتابخانه، پارک). نشانی خانه یا موقعیت دقیق کاربران هرگز نمایش داده نمی‌شود.', 'Safety & Privacy: Public venues only (cafés, libraries, parks). Home addresses and users’ exact locations are never shown.')}
          </span>
        </div>

        {/* STATUS TOAST */}
        {statusBanner && (
          <div
            role="status"
            className={`px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 border-b ${
              statusBanner.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-200'
            }`}
          >
            <span>{statusBanner.text}</span>
            <button type="button" onClick={() => setStatusBanner(null)} className="cursor-pointer opacity-75 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
          {/* INLINE AUTH GATE WHEN GUEST TRIES TO CREATE / JOIN / REPORT */}
          {authGateReason && !currentUser && (
            <div className="p-4 rounded-2xl bg-[var(--bg)] border-2 border-[var(--lapis)]/40 space-y-3 animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LogIn size={17} className="text-[var(--lapis)] shrink-0" />
                  <p className="text-xs font-bold text-[var(--ink)]">{authGateReason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthGateReason(null)}
                  className="text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                  aria-label={tx(isRTL, 'بستن', 'Dismiss')}
                >
                  <X size={15} />
                </button>
              </div>

              {authError && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{authError}</p>
              )}

              <button
                type="button"
                disabled={authBusy}
                onClick={handleGoogleLogin}
                className="w-full h-10 rounded-full bg-[var(--lapis)] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {authBusy ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
                <span>{tx(isRTL, 'ورود با حساب گوگل', 'Continue with Google')}</span>
              </button>

              <EmailAuthForm
                isRTL={isRTL}
                onSignedIn={(u) => {
                  setCurrentUser(u);
                  setAuthGateReason(null);
                  showToast('success', tx(isRTL, 'با موفقیت وارد شدید!', 'Signed in successfully!'));
                }}
              />
            </div>
          )}

          {/* SEARCH CITY + PERMISSION-GATED LOCATION + FILTERS */}
          <div className="space-y-2.5">
            <form onSubmit={handleCitySearchSubmit} className="flex flex-wrap sm:flex-nowrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search
                  size={15}
                  className={`absolute top-1/2 -translate-y-1/2 text-[var(--mute)] ${
                    ((isRTL ? 'right-3' : 'left-3'))
                  }`}
                />
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder={
                    tx(isRTL, 'نام شهر یا محله را بنویسید (مثلاً آمستردام، تهران...)', 'Type a city or area (e.g. Amsterdam, Utrecht, Berlin...)')
                  }
                  className={`${inputClass} ${((isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'))}`}
                />
              </div>

              <button
                type="submit"
                className="h-10 px-3.5 rounded-xl bg-[var(--lapis)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-95 shrink-0"
              >
                <Search size={14} />
                <span>{tx(isRTL, 'جستجو', 'Search')}</span>
              </button>

              <button
                type="button"
                onClick={handleRequestLocation}
                disabled={locationState === 'requesting'}
                className="h-10 px-3 rounded-xl bg-[var(--bg)] hover:bg-[var(--line)]/60 border border-[var(--line)] text-[var(--ink)] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
                title={
                  tx(isRTL, 'تنها با اجازهٔ شما، برای تنظیم نقشه روی محدودهٔ شهرتان استفاده می‌شود', 'Only with your permission, used locally to center the map near your city')
                }
              >
                {locationState === 'requesting' ? (
                  <Loader2 size={14} className="animate-spin text-[var(--turq)]" />
                ) : (
                  <Navigation size={14} className="text-[var(--turq)]" />
                )}
                <span>{tx(isRTL, 'نزدیک من', 'Near me')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowFilters((prev) => !prev);
                }}
                aria-expanded={showFilters}
                className={`h-10 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  showFilters || filterLanguage !== 'all' || filterLevel !== 'all'
                    ? 'bg-[var(--turq)]/15 border-[var(--turq)] text-[var(--turq)]'
                    : 'bg-[var(--bg)] border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)]'
                }`}
              >
                <Filter size={14} />
                <span>{tx(isRTL, 'فیلتر', 'Filter')}</span>
              </button>
            </form>

            {/* Quick City Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-[var(--mute)]">
                {tx(isRTL, 'شهرهای پرطرفدار:', 'Popular cities:')}
              </span>
              {CITY_COORDINATES.slice(0, 7).map((c) => {
                const label = tx(isRTL, c.nameFa, c.nameEn);
                return (
                  <button
                    key={c.nameEn}
                    type="button"
                    onClick={() => handleQuickCity(label, c.lat, c.lng)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg)] hover:bg-[var(--lapis)]/10 border border-[var(--line)] text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-colors"
                  >
                    {label}
                  </button>
                );
              })}
              {cityInput && (
                <button
                  type="button"
                  onClick={() => setCityInput('')}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                >
                  {tx(isRTL, 'پاک کردن', 'Clear')}
                </button>
              )}
            </div>

            {locationHint && (
              <p className="text-[11px] font-semibold text-[var(--mute)] bg-[var(--bg)] px-3 py-1.5 rounded-xl border border-[var(--line)]">
                {locationHint}
              </p>
            )}

            {/* Language & CEFR Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-[var(--bg)] border border-[var(--line)]">
                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mute)] block">
                    {tx(isRTL, 'زبان هدف', 'Target language')}
                  </span>
                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className={inputClass}
                  >
                    <option value="all">{tx(isRTL, 'همهٔ زبان‌ها', 'All languages')}</option>
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {txt(isRTL, '{2} ({0})', '{0} ({1})', [l.name, l.nativeName, l.persianName])}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mute)] block">
                    {tx(isRTL, 'سطح CEFR', 'CEFR level')}
                  </span>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className={inputClass}
                  >
                    <option value="all">{tx(isRTL, 'همهٔ سطح‌ها', 'All levels')}</option>
                    {CEFR_LEVELS.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.id} — {getCefrText(lvl.name, ((language as string) || 'en'))}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* REAL GOOGLE MAP (Maps JavaScript API via @vis.gl/react-google-maps) */}
          <div className="rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--bg)] shadow-xs">
            {mapsApiKey ? (
              <APIProvider apiKey={mapsApiKey} language={((language as string) || 'en')}>
                <div className="w-full h-[260px] sm:h-[320px] relative">
                  <GoogleMap
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    defaultCenter={DEFAULT_MAP_CENTER}
                    defaultZoom={11}
                    gestureHandling="greedy"
                    streetViewControl={false}
                    mapTypeControl={false}
                    onClick={handleMapClick}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <MapCameraAndPlacesBridge
                      target={cameraTarget}
                      citySearchRequest={citySearchRequest}
                      onCityResolved={handleCityResolved}
                      venueSearchRequest={venueSearchRequest}
                      onVenueResults={handleVenueResults}
                    />

                    {visibleMeetups.map((m) => (
                      <MeetupPinMarker
                        key={m.id}
                        meetup={m}
                        isSelected={selectedMeetupId === m.id}
                        isRTL={isRTL}
                        onSelect={() => setSelectedMeetupId(m.id)}
                        onCloseInfo={() => setSelectedMeetupId(null)}
                      />
                    ))}

                    {/* Draft pin when user is creating/editing a meetup */}
                    {showForm && typeof formLat === 'number' && typeof formLng === 'number' && (
                      <AdvancedMarker position={{ lat: formLat, lng: formLng }}>
                        <Pin background="#F5B52E" borderColor="#15204A" glyphColor="#15204A" />
                      </AdvancedMarker>
                    )}
                  </GoogleMap>
                </div>
              </APIProvider>
            ) : (
              <div className="p-5 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-[var(--lapis)]/10 text-[var(--lapis)] flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <p className="text-xs font-bold text-[var(--ink)]">
                  {tx(isRTL, 'نقشهٔ تعاملی Google Maps پس از تنظیم کلید VITE_GOOGLE_MAPS_API_KEY فعال می‌شود.', 'Interactive Google Map activates once VITE_GOOGLE_MAPS_API_KEY is configured.')}
                </p>
                <p className="text-[11px] text-[var(--mute)]">
                  {tx(isRTL, 'همچنان می‌توانید فهرست دورهمی‌ها را ببینید، جستجو کنید، دورهمی بسازید یا به آن‌ها بپیوندید.', 'You can still browse, search, create, and join meetups below.')}
                </p>
              </div>
            )}
          </div>

          {/* ACTION ROW: CREATE MEETUP + SERVER-ONLY GEMINI VENUE SUGGESTIONS (HIDDEN ON GITHUB PAGES) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => openCreateForm()}
              className="h-10 px-4 rounded-xl bg-[var(--turq)] hover:opacity-95 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus size={16} />
              <span>{tx(isRTL, 'ساخت دورهمی عمومی تازه', 'Create Public Meetup')}</span>
            </button>

            {/* Hidden automatically on GitHub Pages / static hosts where no Express server exists */}
            {serverAvailable && (
              <div data-testid="ai-venue-suggestions-section">
                <button
                  type="button"
                  onClick={handleAiSuggestVenues}
                  disabled={loadingAiVenues}
                  data-testid="ai-venue-suggest-btn"
                  className="h-10 px-3.5 rounded-xl bg-[var(--saffron)]/20 hover:bg-[var(--saffron)]/30 border border-[var(--saffron)]/60 text-[var(--ink)] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {loadingAiVenues ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} className="text-amber-600" />
                  )}
                  <span>
                    {tx(isRTL, 'پیشنهاد مکان عمومی با Gemini + Maps', 'Suggest Public Venues (Gemini + Maps)')}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* GEMINI + MAPS PUBLIC VENUE SUGGESTIONS PANEL (SERVER ONLY) */}
          {serverAvailable && (aiVenueError || aiVenueResults) && (
            <div className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-[var(--ink)] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>{tx(isRTL, 'مکان‌های عمومی پیشنهادی', 'Suggested Public Venues')}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setAiVenueResults(null);
                    setAiVenueError(null);
                  }}
                  className="text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {aiVenueError && <p className="text-xs text-rose-600 font-semibold">{aiVenueError}</p>}

              {aiVenueResults && (
                <>
                  {aiVenueResults.text && (
                    <p className="text-xs text-[var(--ink)]/85 whitespace-pre-line leading-relaxed">
                      {aiVenueResults.text}
                    </p>
                  )}
                  {aiVenueResults.places.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {aiVenueResults.places.map((place, idx) => (
                        <div
                          key={`${place.uri}-${idx}`}
                          className="p-2.5 rounded-xl bg-[var(--panel)] border border-[var(--line)] flex items-center justify-between gap-2"
                        >
                          <a
                            href={place.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[var(--lapis)] hover:underline flex items-center gap-1 min-w-0 truncate"
                          >
                            <ExternalLink size={12} className="shrink-0" />
                            <span className="truncate">{place.title}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => openCreateForm(place.title)}
                            className="px-2 py-1 rounded-lg bg-[var(--turq)]/15 text-[var(--turq)] text-[11px] font-bold shrink-0 cursor-pointer hover:bg-[var(--turq)]/25"
                          >
                            {tx(isRTL, 'انتخاب', 'Use')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* CREATE / EDIT MEETUP FORM */}
          {showForm && (
            <form
              onSubmit={handleFormSubmit}
              className="p-4 rounded-2xl bg-[var(--bg)] border-2 border-[var(--turq)]/40 space-y-3 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[var(--ink)]">
                  {editingMeetup
                    ? tx(isRTL, 'ویرایش دورهمی عمومی', 'Edit Public Meetup')
                    : tx(isRTL, 'ساخت دورهمی عمومی تازه', 'Create a New Public Meetup')}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingMeetup(null);
                  }}
                  className="text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Venue Type Pills */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mute)] block">
                  {tx(isRTL, 'نوع مکان عمومی (الزامی)', 'Public Venue Type (Required)')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PUBLIC_VENUE_TYPES.map((vt) => (
                    <button
                      key={vt.id}
                      type="button"
                      onClick={() => setFormVenueType(vt.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        formVenueType === vt.id
                          ? 'bg-[var(--lapis)] text-white border-[var(--lapis)]'
                          : 'bg-[var(--panel)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--lapis)]'
                      }`}
                    >
                      {vt.emoji} {tx(isRTL, vt.labelFa, vt.labelEn)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--mute)] block">
                    {tx(isRTL, 'نام مکان عمومی *', 'Public Venue Name *')}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={formVenueName}
                      onChange={(e) => setFormVenueName(e.target.value)}
                      placeholder={
                        tx(isRTL, 'مثلاً کافه کتاب اندیشه یا پارک لاله', 'e.g. OBA Public Library, Café de Jaren')
                      }
                      className={inputClass}
                    />
                    {mapsApiKey && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!formVenueName.trim()) return;
                          const q = `${formVenueName.trim()} ${formCity.trim()}`.trim();
                          setVenueSearchRequest({ query: q, nonce: Date.now() });
                        }}
                        className="h-10 px-2.5 rounded-xl bg-[var(--panel)] border border-[var(--line)] text-[var(--lapis)] text-[11px] font-bold shrink-0 cursor-pointer hover:border-[var(--lapis)]"
                        title={tx(isRTL, 'یافتن روی نقشه', 'Find on map')}
                      >
                        <MapPin size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--mute)] block">
                    {tx(isRTL, 'شهر *', 'City *')}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder={tx(isRTL, 'مثلاً آمستردام یا تهران', 'e.g. Amsterdam')}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--mute)] block">
                    {tx(isRTL, 'محله / منطقه (بدون نشانی خانه)', 'Neighborhood / Area (no home address)')}
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    placeholder={tx(isRTL, 'مثلاً مرکز شهر، ونک، انقلاب', 'e.g. Centrum, De Pijp')}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--mute)] block">
                    {tx(isRTL, 'ظرفیت (نفر)', 'Capacity (people)')}
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    required
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--mute)] block">
                    {tx(isRTL, 'زبان هدف', 'Target Language')}
                  </label>
                  <select
                    value={formTargetLang}
                    onChange={(e) => setFormTargetLang(e.target.value as Language)}
                    className={inputClass}
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {txt(isRTL, '{2} ({0})', '{0} ({1})', [l.name, l.nativeName, l.persianName])}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--mute)] block">
                    {tx(isRTL, 'سطح CEFR', 'CEFR Level')}
                  </label>
                  <select
                    value={formCefrLevel}
                    onChange={(e) => setFormCefrLevel(e.target.value as CEFRLevel)}
                    className={inputClass}
                  >
                    {CEFR_LEVELS.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.id} — {getCefrText(lvl.name, ((language as string) || 'en'))}
                      </option>
                    ))}
                    <option value="all">{tx(isRTL, 'همهٔ سطح‌ها', 'All levels')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--mute)] block">
                    {tx(isRTL, 'تاریخ *', 'Date *')}
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--mute)] block">
                    {tx(isRTL, 'ساعت *', 'Time *')}
                  </label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Places API (New) venue suggestions dropdown */}
              {venueSuggestions.length > 0 && (
                <div className="p-2.5 rounded-xl bg-[var(--panel)] border border-[var(--line)] space-y-1.5">
                  <p className="text-[11px] font-bold text-[var(--mute)]">
                    {tx(isRTL, 'یکی از مکان‌های عمومی زیر را برای تنظیم پین نقشه انتخاب کنید:', 'Pick a public venue to set the map pin:')}
                  </p>
                  {venueSuggestions.map((s) => (
                    <button
                      key={s.placeId || s.name}
                      type="button"
                      onClick={() => {
                        setFormVenueName(s.name);
                        setFormLat(s.lat);
                        setFormLng(s.lng);
                        setFormPlaceId(s.placeId || null);
                        setCameraTarget({ lat: s.lat, lng: s.lng, zoom: 15, nonce: Date.now() });
                        setVenueSuggestions([]);
                      }}
                      className="w-full text-start p-2 rounded-lg hover:bg-[var(--bg)] text-xs flex flex-col cursor-pointer"
                    >
                      <span className="font-bold text-[var(--ink)]">{s.name}</span>
                      <span className="text-[11px] text-[var(--mute)] truncate">{s.address}</span>
                    </button>
                  ))}
                </div>
              )}

              {mapsApiKey && (
                <p className="text-[11px] text-[var(--mute)]">
                  {tx(isRTL, 'نکته: می‌توانید روی نقشهٔ بالا کلیک کنید تا پین زرد مکان عمومی را جابه‌جا کنید.', 'Tip: You can click anywhere on the map above to position the yellow public venue pin.')}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--mute)] block">
                  {tx(isRTL, 'یادداشت (اختیاری)', 'Notes (optional)')}
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={
                    tx(isRTL, 'مثلاً: دورهمی دوستانه برای تمرین مکالمه و بازی دور؛ همه سطح‌ها خوش‌آمدند.', 'e.g. Friendly table to practice speaking with Dour cards; beginners welcome.')
                  }
                  className="w-full p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--lapis)]"
                />
              </div>

              {!editingMeetup && (
                <label className="flex items-start gap-2 text-xs text-[var(--ink)] font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPublicConfirmed}
                    onChange={(e) => setFormPublicConfirmed(e.target.checked)}
                    className="mt-0.5 accent-[var(--turq)]"
                  />
                  <span>
                    {tx(isRTL, 'تأیید می‌کنم این دورهمی در یک مکان عمومی برگزار می‌شود و هیچ نشانی خانه یا مکان خصوصی وارد نکرده‌ام.', 'I confirm this meetup is at a public venue and contains no private or home address.')}
                  </span>
                </label>
              )}

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 h-10 rounded-xl bg-[var(--lapis)] hover:opacity-95 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {formSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                  <span>
                    {editingMeetup
                      ? tx(isRTL, 'ذخیرهٔ تغییرات', 'Save Changes')
                      : tx(isRTL, 'انتشار دورهمی عمومی', 'Publish Public Meetup')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingMeetup(null);
                  }}
                  className="h-10 px-4 rounded-xl bg-[var(--panel)] border border-[var(--line)] text-xs font-bold text-[var(--mute)] cursor-pointer"
                >
                  {tx(isRTL, 'انصراف', 'Cancel')}
                </button>
              </div>
            </form>
          )}

          {/* REPORT DIALOG */}
          {reportingMeetup && (
            <form
              onSubmit={handleSubmitReport}
              className="p-4 rounded-2xl bg-rose-500/5 border-2 border-rose-500/35 space-y-3 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <Flag size={15} />
                  <span>
                    {txt(isRTL, 'گزارش دورهمی «{0}»', 'Report "{0}"', [reportingMeetup.venueName])}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setReportingMeetup(null)}
                  className="text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1.5">
                {MEETUP_REPORT_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)] cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="meetup_report_reason"
                      checked={reportReason === r.id}
                      onChange={() => setReportReason(r.id)}
                      className="accent-rose-600"
                    />
                    <span>{tx(isRTL, r.labelFa, r.labelEn)}</span>
                  </label>
                ))}
              </div>

              <textarea
                rows={2}
                maxLength={500}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder={tx(isRTL, 'توضیح تکمیلی (اختیاری)...', 'Additional details (optional)...')}
                className="w-full p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-rose-500"
              />

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {reportSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>{tx(isRTL, 'ارسال گزارش', 'Submit Report')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportingMeetup(null)}
                  className="h-9 px-3 rounded-xl bg-[var(--panel)] border border-[var(--line)] text-xs font-bold text-[var(--mute)] cursor-pointer"
                >
                  {tx(isRTL, 'انصراف', 'Cancel')}
                </button>
              </div>
            </form>
          )}

          {/* MEETUPS LIST */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-[var(--ink)] flex items-center gap-1.5">
                <Users size={15} className="text-[var(--lapis)]" />
                <span>
                  {txt(isRTL, 'دورهمی‌های فعال ({0})', 'Active Meetups ({0})', [visibleMeetups.length])}
                </span>
              </h3>
              {!currentUser && (
                <span className="text-[11px] text-[var(--mute)] font-semibold">
                  {tx(isRTL, 'دیدن آزاد است • پیوستن و ساخت با حساب', 'Public view • Account needed to join/create')}
                </span>
              )}
            </div>

            {firestoreError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-700 dark:text-rose-300">
                {firestoreError}
              </div>
            )}

            {loadingMeetups ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-[var(--mute)]">
                <Loader2 size={22} className="animate-spin text-[var(--turq)]" />
                <span className="text-xs font-semibold">
                  {tx(isRTL, 'در حال بارگذاری دورهمی‌ها...', 'Loading meetups...')}
                </span>
              </div>
            ) : visibleMeetups.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[var(--bg)] border border-dashed border-[var(--line)] text-center space-y-2">
                <p className="text-xs font-bold text-[var(--ink)]">
                  {tx(isRTL, 'هنوز دورهمی فعالی در این شهر ثبت نشده است.', 'No active meetups found for this search yet.')}
                </p>
                <p className="text-[11px] text-[var(--mute)]">
                  {tx(isRTL, 'شما می‌توانید نخستین دورهمی زبان در یک کافه، کتابخانه یا پارک را بسازید!', 'Be the first to host a language game meetup at a local café, library, or park!')}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {visibleMeetups.map((meetup) => {
                  const venueMeta = getVenueTypeMeta(meetup.venueType, isRTL);
                  const isJoined = Boolean(currentUser && meetup.participants.includes(currentUser.uid));
                  const isCreator = Boolean(currentUser && meetup.creatorUid === currentUser.uid);
                  const canManage = isCreator || Boolean(currentUser && isAdminUser(currentUser.email));
                  const isFull = meetup.participants.length >= meetup.capacity;
                  const fillPercent = Math.min(
                    100,
                    Math.round((meetup.participants.length / Math.max(1, meetup.capacity)) * 100)
                  );
                  const approxKm =
                    localUserCoords && typeof meetup.lat === 'number' && typeof meetup.lng === 'number'
                      ? haversineKm(localUserCoords, { lat: meetup.lat, lng: meetup.lng })
                      : null;

                  const participantList = meetup.participants.map(
                    (uid) => meetup.participantNames?.[uid] || (tx(isRTL, 'بازیکن', 'Player'))
                  );

                  return (
                    <article
                      key={meetup.id}
                      className={`p-3.5 rounded-2xl bg-[var(--bg)] border transition-all space-y-2.5 ${
                        selectedMeetupId === meetup.id
                          ? 'border-[var(--lapis)] ring-2 ring-[var(--lapis)]/15'
                          : 'border-[var(--line)] hover:border-[var(--lapis)]/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleFocusMeetupOnMap(meetup)}
                          className="text-start min-w-0 flex-1 cursor-pointer space-y-1"
                        >
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg bg-[var(--turq)]/15 text-[var(--turq)] text-[10px] font-bold">
                              {venueMeta.emoji} {venueMeta.label}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-[var(--lapis)]/12 text-[var(--lapis)] text-[10px] font-bold">
                              {getLanguageLabel(meetup.targetLanguage, isRTL)}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                              {meetup.cefrLevel}
                            </span>
                            {approxKm !== null && (
                              <span className="text-[10px] font-semibold text-[var(--mute)]">
                                ~{approxKm < 1 ? '<1' : Math.round(approxKm)} km
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-black text-[var(--ink)]">{meetup.venueName}</h4>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--mute)] font-semibold">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-[var(--turq)] shrink-0" />
                              {meetup.city}
                              {meetup.area ? ` — ${meetup.area}` : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-[var(--lapis)] shrink-0" />
                              {meetup.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} className="text-[var(--lapis)] shrink-0" />
                              {meetup.time}
                            </span>
                          </div>
                        </button>

                        {/* Report button on EVERY meetup */}
                        <button
                          type="button"
                          data-testid={`report-meetup-${meetup.id}`}
                          onClick={() => handleOpenReport(meetup)}
                          aria-label={tx(isRTL, 'گزارش دورهمی', 'Report meetup')}
                          title={tx(isRTL, 'گزارش مکان خصوصی یا تخلف', 'Report private address or issue')}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--mute)] hover:text-rose-600 hover:bg-rose-500/10 flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                        >
                          <Flag size={12} />
                          <span>{tx(isRTL, 'گزارش', 'Report')}</span>
                        </button>
                      </div>

                      {meetup.notes && (
                        <p className="text-xs text-[var(--ink)]/80 leading-relaxed">{meetup.notes}</p>
                      )}

                      {/* Capacity Bar & Participants */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-[var(--mute)]">
                            {txt(isRTL, 'میزبان: {0}', 'Host: {0}', [meetup.creatorName])}
                          </span>
                          <span className={isFull ? 'text-rose-600' : 'text-[var(--turq)]'}>
                            {txt(isRTL, 'ظرفیت: {0} از {1} نفر', '{0} / {1} spots', [meetup.participants.length, meetup.capacity])}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[var(--line)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isFull ? 'bg-rose-500' : 'bg-[var(--turq)]'
                            }`}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                        {participantList.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {participantList.map((name, idx) => (
                              <span
                                key={`${meetup.id}-p-${idx}`}
                                className="px-2 py-0.5 rounded-md bg-[var(--panel)] border border-[var(--line)] text-[10px] font-semibold text-[var(--ink)]"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Actions: Join/Leave + Creator Edit/Delete */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          disabled={busyMeetupId === meetup.id || (!isJoined && isFull)}
                          onClick={() => handleToggleJoin(meetup)}
                          className={`h-9 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 ${
                            isJoined
                              ? 'bg-[var(--panel)] border border-rose-500/40 text-rose-600 hover:bg-rose-500/10'
                              : isFull
                                ? 'bg-[var(--line)] text-[var(--mute)] cursor-not-allowed'
                                : 'bg-[var(--lapis)] hover:opacity-95 text-white'
                          }`}
                        >
                          {busyMeetupId === meetup.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : isJoined ? (
                            <X size={14} />
                          ) : (
                            <Check size={14} />
                          )}
                          <span>
                            {isJoined
                              ? tx(isRTL, 'خروج از دورهمی', 'Leave Meetup')
                              : isFull
                                ? tx(isRTL, 'ظرفیت تکمیل', 'Full')
                                : tx(isRTL, 'پیوستن به دورهمی', 'Join Meetup')}
                          </span>
                        </button>

                        {canManage && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditForm(meetup)}
                              className="h-9 px-2.5 rounded-xl bg-[var(--panel)] border border-[var(--line)] hover:border-[var(--lapis)] text-xs font-bold text-[var(--ink)] flex items-center gap-1 cursor-pointer"
                            >
                              <Pencil size={13} />
                              <span>{tx(isRTL, 'ویرایش', 'Edit')}</span>
                            </button>

                            {confirmDeleteId === meetup.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={busyMeetupId === meetup.id}
                                  onClick={() => handleDeleteMeetup(meetup.id)}
                                  className="h-9 px-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                                >
                                  {tx(isRTL, 'تأیید حذف', 'Confirm')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="h-9 px-2 rounded-xl bg-[var(--panel)] border border-[var(--line)] text-xs font-bold text-[var(--mute)] cursor-pointer"
                                >
                                  {tx(isRTL, 'لغو', 'Cancel')}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(meetup.id)}
                                className="h-9 px-2.5 rounded-xl bg-[var(--panel)] border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>{tx(isRTL, 'حذف', 'Delete')}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetupMapModal;
