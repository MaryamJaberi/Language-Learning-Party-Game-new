import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  containsPrivateAddressHint,
  validateMeetupInput,
  isStaticHostWithoutServer,
  filterMeetups,
  Meetup,
} from '../meetupService';

// Mock @vis.gl/react-google-maps so map rendering works cleanly in jsdom
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: any) => <div data-testid="mock-google-maps-provider">{children}</div>,
  Map: ({ children }: any) => <div data-testid="mock-google-map">{children}</div>,
  AdvancedMarker: ({ children }: any) => <div data-testid="mock-marker">{children}</div>,
  Pin: () => <div data-testid="mock-pin" />,
  InfoWindow: ({ children }: any) => <div data-testid="mock-infowindow">{children}</div>,
  useAdvancedMarkerRef: () => [vi.fn(), null],
  useMap: () => null,
  useMapsLibrary: () => null,
}));

const sampleMeetup: Meetup = {
  id: 'meetup-1',
  venueName: 'کافه کتاب اندیشه',
  venueType: 'cafe',
  city: 'تهران',
  area: 'انقلاب',
  lat: 35.701,
  lng: 51.391,
  placeId: null,
  targetLanguage: 'en',
  cefrLevel: 'A2+',
  date: '2026-12-05',
  time: '17:30',
  capacity: 6,
  participants: ['host-1'],
  participantNames: { 'host-1': 'سارا' },
  notes: 'تمرین مکالمه روزمره و بازی دور',
  creatorUid: 'host-1',
  creatorName: 'سارا',
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
};

const mockSubscribeToMeetups = vi.fn((onUpdate: (items: Meetup[]) => void) => {
  onUpdate([sampleMeetup]);
  return () => {};
});

const mockCheckBackendServerAvailable = vi.fn(async () => false);

vi.mock('../meetupService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../meetupService')>();
  return {
    ...actual,
    subscribeToMeetups: (...args: any[]) => (mockSubscribeToMeetups as any)(...args),
    checkBackendServerAvailable: () => mockCheckBackendServerAvailable(),
  };
});

import { MeetupMapModal } from '../components/MeetupMapModal';
import SetupScreen from '../screens/SetupScreen';
import { DEFAULT_SETTINGS } from '../constants';

describe('Public Nearby Meetups & Safety/Privacy Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckBackendServerAvailable.mockResolvedValue(false);
    mockSubscribeToMeetups.mockImplementation((onUpdate: (items: Meetup[]) => void) => {
      onUpdate([sampleMeetup]);
      return () => {};
    });
  });

  test('blocks private home addresses and apartment hints in Persian, English, and Dutch', () => {
    expect(containsPrivateAddressHint('خیابان ولیعصر پلاک ۲۴ واحد ۳')).toBe(true);
    expect(containsPrivateAddressHint('Apartment 4B, my home')).toBe(true);
    expect(containsPrivateAddressHint('mijn huis nummer 12')).toBe(true);
    expect(containsPrivateAddressHint('OBA Public Library Amsterdam')).toBe(false);
    expect(containsPrivateAddressHint('کافه کتاب اندیشه')).toBe(false);

    const errPrivate = validateMeetupInput(
      {
        venueName: 'منزل ما واحد ۴',
        venueType: 'cafe',
        city: 'تهران',
        area: 'ونک',
        targetLanguage: 'en',
        cefrLevel: 'A1',
        date: '2026-12-01',
        time: '18:00',
        capacity: 6,
        notes: '',
        publicVenueConfirmed: true,
      },
      true
    );
    expect(errPrivate).toBeTruthy();

    const errUnconfirmed = validateMeetupInput(
      {
        venueName: 'OBA Public Library',
        venueType: 'library',
        city: 'Amsterdam',
        area: 'Centrum',
        targetLanguage: 'nl',
        cefrLevel: 'A1+',
        date: '2026-12-01',
        time: '18:00',
        capacity: 6,
        notes: '',
        publicVenueConfirmed: false,
      },
      false
    );
    expect(errUnconfirmed).toBeTruthy();

    const validResult = validateMeetupInput(
      {
        venueName: 'OBA Public Library',
        venueType: 'library',
        city: 'Amsterdam',
        area: 'Centrum',
        lat: 52.3759,
        lng: 4.9081,
        targetLanguage: 'nl',
        cefrLevel: 'A1+',
        date: '2026-12-01',
        time: '18:00',
        capacity: 6,
        notes: 'Table near the cafe',
        publicVenueConfirmed: true,
      },
      false
    );
    expect(validResult).toBeNull();
  });

  test('detects GitHub Pages static hosting without backend server', () => {
    expect(isStaticHostWithoutServer({ hostname: 'maryamjaberi.github.io', protocol: 'https:' })).toBe(true);
    expect(isStaticHostWithoutServer({ hostname: 'localhost', protocol: 'http:' })).toBe(false);
    expect(isStaticHostWithoutServer({ hostname: '', protocol: 'file:' })).toBe(true);
  });

  test('filters meetups by city, language, and CEFR level', () => {
    const meetups: Meetup[] = [
      sampleMeetup,
      {
        ...sampleMeetup,
        id: 'meetup-2',
        venueName: 'OBA Library',
        city: 'Amsterdam',
        area: 'Centrum',
        targetLanguage: 'nl',
        cefrLevel: 'B1',
      },
    ];
    expect(filterMeetups(meetups, { cityQuery: 'amsterdam' })).toHaveLength(1);
    expect(filterMeetups(meetups, { targetLanguage: 'nl' })).toHaveLength(1);
    expect(filterMeetups(meetups, { cefrLevel: 'A2+' })).toHaveLength(1);
  });

  test('MeetupMapModal allows guests to view meetups, hides Gemini suggestions when server is unavailable, and gates join/create behind sign-in', async () => {
    render(
      <MeetupMapModal
        isOpen={true}
        onClose={vi.fn()}
        language="fa"
        isRTL={true}
      />
    );

    // Public meetup from Firestore is visible to guests
    expect(await screen.findByText('کافه کتاب اندیشه')).toBeInTheDocument();
    // Safety banner is visible
    expect(screen.getByText(/فقط مکان‌های عمومی/i)).toBeInTheDocument();
    // Report button is visible on the meetup card
    expect(screen.getByRole('button', { name: /گزارش دورهمی/i })).toBeInTheDocument();

    // Server unavailable (GitHub Pages mode) -> Gemini suggestion button is hidden
    await waitFor(() => {
      expect(screen.queryByTestId('ai-venue-suggest-btn')).not.toBeInTheDocument();
    });

    // Clicking Join as a guest opens Google + Email sign-in prompt
    fireEvent.click(screen.getByRole('button', { name: /پیوستن به دورهمی/i }));
    expect(await screen.findByText(/ورود با حساب گوگل/i)).toBeInTheDocument();
    expect(screen.getByText(/ورود یا ثبت‌نام با ایمیل/i)).toBeInTheDocument();
  });

  test('MeetupMapModal shows Gemini venue suggestions button when backend server is available (English LTR)', async () => {
    mockCheckBackendServerAvailable.mockResolvedValue(true);

    render(
      <MeetupMapModal
        isOpen={true}
        onClose={vi.fn()}
        language="en"
        isRTL={false}
      />
    );

    expect(await screen.findByText(/Nearby Public Meetups/i)).toBeInTheDocument();
    expect(await screen.findByTestId('ai-venue-suggest-btn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Report meetup/i })).toBeInTheDocument();
  });

  test('SetupScreen renders Nearby Meetups tab next to Online Room for everyone and opens MeetupMapModal', async () => {
    render(
      <SetupScreen
        settings={{ ...DEFAULT_SETTINGS, language: 'fa' }}
        onSave={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onOpenOnline={vi.fn()}
      />
    );

    const nearbyTab = screen.getByTestId('party-tab-nearby');
    expect(nearbyTab).toBeInTheDocument();

    fireEvent.click(nearbyTab);
    const openMapBtn = await screen.findByTestId('open-nearby-meetups-btn');
    fireEvent.click(openMapBtn);

    expect(await screen.findByRole('dialog', { name: /دورهمی‌های اطراف روی نقشه/i })).toBeInTheDocument();
  });
});
