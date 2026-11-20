import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  validatePublicVenueInput,
  isStaticHostingEnvironment,
  detectBackendServerAvailable,
  resetServerAvailabilityCache,
  lookupFallbackCityCoords,
  Meetup,
} from '../meetupService';
import SetupScreen from '../screens/SetupScreen';
import { MeetupMapModal } from '../components/MeetupMapModal';
import { DEFAULT_SETTINGS } from '../constants';
import * as firestore from 'firebase/firestore';

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: any) => <div data-testid="mock-api-provider">{children}</div>,
  Map: ({ children }: any) => <div data-testid="mock-google-map">{children}</div>,
  AdvancedMarker: ({ children }: any) => <div data-testid="mock-marker">{children}</div>,
  Pin: () => <div data-testid="mock-pin" />,
  InfoWindow: ({ children }: any) => <div data-testid="mock-infowindow">{children}</div>,
  useAdvancedMarkerRef: () => [vi.fn(), null],
  useMap: () => null,
  useMapsLibrary: () => null,
}));

const SAMPLE_MEETUP: Meetup = {
  id: 'meetup_test_1',
  venueName: 'کافه کتاب اندیشه',
  venueType: 'cafe',
  city: 'تهران',
  area: 'انقلاب',
  lat: 35.701,
  lng: 51.391,
  placeId: null,
  targetLanguage: 'nl',
  cefrLevel: 'A1+',
  date: '2026-12-01',
  time: '17:30',
  capacity: 6,
  participants: ['creator_1'],
  participantNames: { creator_1: 'مریم' },
  notes: 'دورهمی دوستانه برای تمرین هلندی سطح A1+',
  creatorUid: 'creator_1',
  creatorName: 'مریم',
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
};

describe('Public Meetups Safety, Server Detection & UI', () => {
  beforeEach(() => {
    resetServerAvailabilityCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows valid public venues (café, library, park) and rejects private/home addresses & phones', () => {
    const valid = validatePublicVenueInput({
      venueName: 'Central Public Library',
      venueType: 'library',
      city: 'Amsterdam',
      area: 'Oosterdok',
      date: '2026-12-05',
      time: '18:00',
      capacity: 6,
      notes: 'Bring a smile!',
    });
    expect(valid.valid).toBe(true);

    const persianHome = validatePublicVenueInput({
      venueName: 'منزل ما',
      venueType: 'cafe',
      city: 'تهران',
      area: 'پلاک ۱۲ واحد ۴',
      date: '2026-12-05',
      time: '18:00',
      capacity: 4,
    });
    expect(persianHome.valid).toBe(false);

    const englishApt = validatePublicVenueInput({
      venueName: 'My Home Apartment 4B',
      venueType: 'park',
      city: 'Amsterdam',
      area: 'Center',
      date: '2026-12-05',
      time: '18:00',
      capacity: 4,
    });
    expect(englishApt.valid).toBe(false);

    const withPhone = validatePublicVenueInput({
      venueName: 'کافه کتاب',
      venueType: 'cafe',
      city: 'تهران',
      area: 'ونک',
      notes: 'زنگ بزنید 09123456789',
      date: '2026-12-05',
      time: '18:00',
      capacity: 4,
    });
    expect(withPhone.valid).toBe(false);
  });

  it('identifies GitHub Pages as static hosting and resolves fallback city coordinates', () => {
    expect(
      isStaticHostingEnvironment({
        hostname: 'maryamjaberi.github.io',
        protocol: 'https:',
      })
    ).toBe(true);
    expect(
      isStaticHostingEnvironment({
        hostname: 'localhost',
        protocol: 'http:',
      })
    ).toBe(false);

    expect(lookupFallbackCityCoords('آمستردام')?.labelEn).toBe('Amsterdam');
    expect(lookupFallbackCityCoords('Tehran')?.labelFa).toBe('تهران');
  });

  it('detectBackendServerAvailable returns true when /api/health succeeds and false on 404', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'ok' }),
    } as any);

    expect(await detectBackendServerAvailable()).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/api/health', expect.any(Object));

    resetServerAvailabilityCache();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      headers: new Headers({ 'content-type': 'text/html' }),
      json: async () => ({}),
    } as any);

    expect(await detectBackendServerAvailable()).toBe(false);
  });

  it('shows Nearby Meetups tab next to Online Room in SetupScreen (Persian RTL and English LTR)', () => {
    const { rerender } = render(
      <SetupScreen
        settings={{ ...DEFAULT_SETTINGS, language: 'fa', nativeLanguage: 'fa' }}
        onSave={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onOpenOnline={vi.fn()}
      />
    );

    const nearbyTabFa = screen.getByTestId('party-tab-nearby');
    expect(nearbyTabFa).toHaveTextContent('دورهمی اطراف');
    fireEvent.click(nearbyTabFa);
    expect(screen.getByTestId('nearby-meetups-callout')).toBeInTheDocument();
    expect(screen.getByTestId('open-nearby-meetups-btn')).toBeInTheDocument();

    rerender(
      <SetupScreen
        settings={{ ...DEFAULT_SETTINGS, language: 'en', nativeLanguage: 'en', targetLanguages: ['nl'] }}
        onSave={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onOpenOnline={vi.fn()}
      />
    );
    expect(screen.getByTestId('party-tab-nearby')).toHaveTextContent('Nearby Meetups');
  });

  it('does not auto-request geolocation, hides AI venue button without server, shows Report button, and prompts auth on join', async () => {
    const geoSpy = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: geoSpy },
    });

    // Simulate no backend server (like GitHub Pages)
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No server'));

    // Return a sample meetup from onSnapshot
    vi.mocked(firestore.onSnapshot).mockImplementation((_q: any, onNext: any) => {
      onNext({
        forEach: (cb: any) => cb({ id: SAMPLE_MEETUP.id, data: () => SAMPLE_MEETUP }),
      });
      return vi.fn();
    });

    render(
      <MeetupMapModal
        isOpen={true}
        onClose={vi.fn()}
        language="fa"
        isRTL={true}
        defaultTargetLanguage="nl"
        defaultCefrLevel="A1+"
      />
    );

    // 1. Privacy: geolocation MUST NOT be requested automatically on mount
    expect(geoSpy).not.toHaveBeenCalled();

    // 2. Meetup renders with Report button and CEFR A1+
    expect(await screen.findByText('کافه کتاب اندیشه')).toBeInTheDocument();
    expect(screen.getByText('A1+')).toBeInTheDocument();
    expect(screen.getByTestId(`report-meetup-${SAMPLE_MEETUP.id}`)).toHaveTextContent('گزارش');

    // 3. Server-only AI venue suggestions button is hidden when server is absent
    await waitFor(() => {
      expect(screen.queryByTestId('ai-venue-suggestions-section')).not.toBeInTheDocument();
    });

    // 4. Signed-out user clicking Join sees Google & Email auth options
    fireEvent.click(screen.getByText('پیوستن به دورهمی'));
    expect(screen.getByText('ورود با حساب گوگل')).toBeInTheDocument();
    expect(screen.getByText(/ورود یا ثبت‌نام با ایمیل/)).toBeInTheDocument();
  });

  it('shows AI Public Venue Suggestions button when backend server is available', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'ok' }),
    } as any);

    render(
      <MeetupMapModal
        isOpen={true}
        onClose={vi.fn()}
        language="en"
        isRTL={false}
      />
    );

    expect(await screen.findByTestId('ai-venue-suggest-btn')).toBeInTheDocument();
  });
});
