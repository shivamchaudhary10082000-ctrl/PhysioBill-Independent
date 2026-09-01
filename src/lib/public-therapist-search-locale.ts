import { DEFAULT_LOCALE, type SupportedLocale } from '@/lib/locale';
import type { TherapistServiceMode } from '@/lib/therapist-discovery';

export type PublicTherapistSearchCopy = {
  service: string;
  city: string;
  area: string;
  optional: string;
  cityPlaceholder: string;
  areaPlaceholder: string;
  cityRequired: string;
  findPhysiotherapists: string;
  serviceModeLabels: Record<TherapistServiceMode, string>;
};

const copy: Record<SupportedLocale, PublicTherapistSearchCopy> = {
  'en-IN': {
    service: 'Service',
    city: 'City',
    area: 'Area',
    optional: 'optional',
    cityPlaceholder: 'Surat',
    areaPlaceholder: 'Dindoli',
    cityRequired: 'Enter a city to continue.',
    findPhysiotherapists: 'Find physiotherapists',
    serviceModeLabels: {
      home_visit: 'Home visit',
      clinic: 'Clinic visit',
      telephysiotherapy: 'Telephysiotherapy',
    },
  },
  'hi-IN': {
    service: 'सेवा',
    city: 'शहर',
    area: 'इलाका',
    optional: 'वैकल्पिक',
    cityPlaceholder: 'सूरत',
    areaPlaceholder: 'डिंडोली',
    cityRequired: 'आगे बढ़ने के लिए शहर दर्ज करें।',
    findPhysiotherapists: 'फिजियोथेरेपिस्ट खोजें',
    serviceModeLabels: {
      home_visit: 'होम विज़िट',
      clinic: 'क्लिनिक विज़िट',
      telephysiotherapy: 'टेलीफिजियोथेरेपी',
    },
  },
  'gu-IN': {
    service: 'સેવા',
    city: 'શહેર',
    area: 'વિસ્તાર',
    optional: 'વૈકલ્પિક',
    cityPlaceholder: 'સુરત',
    areaPlaceholder: 'ડિંડોલી',
    cityRequired: 'આગળ વધવા માટે શહેર દાખલ કરો.',
    findPhysiotherapists: 'ફિઝિયોથેરાપિસ્ટ શોધો',
    serviceModeLabels: {
      home_visit: 'હોમ વિઝિટ',
      clinic: 'ક્લિનિક વિઝિટ',
      telephysiotherapy: 'ટેલિફિઝિયોથેરાપી',
    },
  },
};

export function publicTherapistSearchCopy(locale: SupportedLocale): PublicTherapistSearchCopy {
  return copy[locale] ?? copy[DEFAULT_LOCALE];
}

export function detectPublicTherapistSearchLocale(languages: readonly string[] | undefined): SupportedLocale {
  for (const raw of languages ?? []) {
    const language = raw.toLowerCase();
    if (language === 'hi' || language.startsWith('hi-')) return 'hi-IN';
    if (language === 'gu' || language.startsWith('gu-')) return 'gu-IN';
    if (language === 'en' || language.startsWith('en-')) return 'en-IN';
  }
  return DEFAULT_LOCALE;
}
