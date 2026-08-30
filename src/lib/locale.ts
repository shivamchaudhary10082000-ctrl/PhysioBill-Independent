import { getSupabaseClient } from '@/lib/supabase';

export const SUPPORTED_LOCALES = ['en-IN', 'hi-IN', 'gu-IN'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en-IN';

const supportedLocaleSet = new Set<string>(SUPPORTED_LOCALES);

export function normalizeLocale(value: unknown): SupportedLocale {
  return typeof value === 'string' && supportedLocaleSet.has(value)
    ? (value as SupportedLocale)
    : DEFAULT_LOCALE;
}

export const communicationEventMessageKeys = {
  appointment_requested: 'communications.appointment.requested',
  appointment_reschedule_requested: 'communications.appointment.rescheduleRequested',
  appointment_accepted: 'communications.appointment.accepted',
  appointment_rejected: 'communications.appointment.rejected',
  appointment_cancelled: 'communications.appointment.cancelled',
  appointment_reminder_24h: 'communications.appointment.reminder24h',
  appointment_reminder_2h: 'communications.appointment.reminder2h',
} as const;

export const professionalNavigationMessageKeys = {
  ariaLabel: 'navigation.professional.ariaLabel',
  overview: 'navigation.professional.overview',
  requests: 'navigation.professional.requests',
  availability: 'navigation.professional.availability',
  discoveryProfile: 'navigation.professional.discoveryProfile',
  analytics: 'navigation.professional.analytics',
  communications: 'navigation.professional.communications',
  telephysiotherapy: 'navigation.professional.telephysiotherapy',
  paymentDestinations: 'navigation.professional.paymentDestinations',
} as const;

export type CommunicationEventType = keyof typeof communicationEventMessageKeys;
export type CommunicationMessageKey = (typeof communicationEventMessageKeys)[CommunicationEventType];
export type ProfessionalNavigationMessageKey =
  (typeof professionalNavigationMessageKeys)[keyof typeof professionalNavigationMessageKeys];
export type MessageKey = CommunicationMessageKey | ProfessionalNavigationMessageKey;

const messages: Record<SupportedLocale, Record<MessageKey, string>> = {
  'en-IN': {
    'communications.appointment.requested': 'Appointment requested',
    'communications.appointment.rescheduleRequested': 'Appointment reschedule requested',
    'communications.appointment.accepted': 'Appointment accepted',
    'communications.appointment.rejected': 'Appointment declined',
    'communications.appointment.cancelled': 'Appointment cancelled',
    'communications.appointment.reminder24h': 'Appointment reminder: 24 hours',
    'communications.appointment.reminder2h': 'Appointment reminder: 2 hours',
    'navigation.professional.ariaLabel': 'Professional workspace quick navigation',
    'navigation.professional.overview': 'Overview',
    'navigation.professional.requests': 'Requests',
    'navigation.professional.availability': 'Availability',
    'navigation.professional.discoveryProfile': 'Discovery profile',
    'navigation.professional.analytics': 'Analytics',
    'navigation.professional.communications': 'Communications',
    'navigation.professional.telephysiotherapy': 'Telephysiotherapy',
    'navigation.professional.paymentDestinations': 'Payment destinations',
  },
  'hi-IN': {
    'communications.appointment.requested': 'अपॉइंटमेंट का अनुरोध भेजा गया',
    'communications.appointment.rescheduleRequested': 'अपॉइंटमेंट का समय बदलने का अनुरोध भेजा गया',
    'communications.appointment.accepted': 'अपॉइंटमेंट स्वीकार किया गया',
    'communications.appointment.rejected': 'अपॉइंटमेंट स्वीकार नहीं किया गया',
    'communications.appointment.cancelled': 'अपॉइंटमेंट रद्द किया गया',
    'communications.appointment.reminder24h': 'अपॉइंटमेंट रिमाइंडर: 24 घंटे',
    'communications.appointment.reminder2h': 'अपॉइंटमेंट रिमाइंडर: 2 घंटे',
    'navigation.professional.ariaLabel': 'प्रोफेशनल वर्कस्पेस त्वरित नेविगेशन',
    'navigation.professional.overview': 'ओवरव्यू',
    'navigation.professional.requests': 'अनुरोध',
    'navigation.professional.availability': 'उपलब्धता',
    'navigation.professional.discoveryProfile': 'डिस्कवरी प्रोफ़ाइल',
    'navigation.professional.analytics': 'एनालिटिक्स',
    'navigation.professional.communications': 'संचार',
    'navigation.professional.telephysiotherapy': 'टेलीफिजियोथेरेपी',
    'navigation.professional.paymentDestinations': 'भुगतान गंतव्य',
  },
  'gu-IN': {
    'communications.appointment.requested': 'અપોઇન્ટમેન્ટ માટે વિનંતી મોકલાઈ',
    'communications.appointment.rescheduleRequested': 'અપોઇન્ટમેન્ટનો સમય બદલવા વિનંતી મોકલાઈ',
    'communications.appointment.accepted': 'અપોઇન્ટમેન્ટ સ્વીકારાઈ',
    'communications.appointment.rejected': 'અપોઇન્ટમેન્ટ સ્વીકારાઈ નથી',
    'communications.appointment.cancelled': 'અપોઇન્ટમેન્ટ રદ કરાઈ',
    'communications.appointment.reminder24h': 'અપોઇન્ટમેન્ટ રિમાઇન્ડર: 24 કલાક',
    'communications.appointment.reminder2h': 'અપોઇન્ટમેન્ટ રિમાઇન્ડર: 2 કલાક',
    'navigation.professional.ariaLabel': 'પ્રોફેશનલ વર્કસ્પેસ ઝડપી નેવિગેશન',
    'navigation.professional.overview': 'ઓવરવ્યૂ',
    'navigation.professional.requests': 'વિનંતીઓ',
    'navigation.professional.availability': 'ઉપલબ્ધતા',
    'navigation.professional.discoveryProfile': 'ડિસ્કવરી પ્રોફાઇલ',
    'navigation.professional.analytics': 'એનલિટિક્સ',
    'navigation.professional.communications': 'સંદેશાવ્યવહાર',
    'navigation.professional.telephysiotherapy': 'ટેલીફિઝિયોથેરાપી',
    'navigation.professional.paymentDestinations': 'ચુકવણી ગંતવ્ય',
  },
};

export function message(locale: SupportedLocale, key: MessageKey): string {
  return messages[locale][key] ?? messages[DEFAULT_LOCALE][key];
}

export function communicationEventLabel(locale: SupportedLocale, eventType: string): string {
  if (!(eventType in communicationEventMessageKeys)) return eventType;
  return message(locale, communicationEventMessageKeys[eventType as CommunicationEventType]);
}

export async function loadPreferredLocale(): Promise<SupportedLocale> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('app_users')
    .select('preferred_locale')
    .single();

  if (error) throw error;
  return normalizeLocale(data?.preferred_locale);
}

export async function savePreferredLocale(locale: SupportedLocale): Promise<SupportedLocale> {
  const normalized = normalizeLocale(locale);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('app_users')
    .update({ preferred_locale: normalized })
    .select('preferred_locale')
    .single();

  if (error) throw error;
  return normalizeLocale(data?.preferred_locale);
}
