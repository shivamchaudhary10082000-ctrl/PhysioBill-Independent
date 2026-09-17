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

export const communicationUiMessageKeys = {
  eyebrow: 'communications.ui.eyebrow',
  title: 'communications.ui.title',
  description: 'communications.ui.description',
  refresh: 'communications.ui.refresh',
  eventHistory: 'communications.ui.eventHistory',
  eventHistoryDescription: 'communications.ui.eventHistoryDescription',
  upcoming: 'communications.ui.upcoming',
  upcomingDescription: 'communications.ui.upcomingDescription',
  loading: 'communications.ui.loading',
  emptyTitle: 'communications.ui.emptyTitle',
  emptyDescription: 'communications.ui.emptyDescription',
  appointmentPrefix: 'communications.ui.appointmentPrefix',
  unableToLoad: 'communications.ui.unableToLoad',
  homeVisit: 'communications.ui.homeVisit',
  telephysiotherapy: 'communications.ui.telephysiotherapy',
  preferencesTitle: 'communications.preferences.title',
  preferencesDescription: 'communications.preferences.description',
  preferencesLoading: 'communications.preferences.loading',
  updatesTitle: 'communications.preferences.updatesTitle',
  updatesDescription: 'communications.preferences.updatesDescription',
  remindersTitle: 'communications.preferences.remindersTitle',
  remindersDescription: 'communications.preferences.remindersDescription',
  channelLegend: 'communications.preferences.channelLegend',
  chooseChannel: 'communications.preferences.chooseChannel',
  savedNotice: 'communications.preferences.savedNotice',
  inAppNotice: 'communications.preferences.inAppNotice',
  save: 'communications.preferences.save',
  saving: 'communications.preferences.saving',
  updateFailed: 'communications.preferences.updateFailed',
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
export type CommunicationUiMessageKey =
  (typeof communicationUiMessageKeys)[keyof typeof communicationUiMessageKeys];
export type ProfessionalNavigationMessageKey =
  (typeof professionalNavigationMessageKeys)[keyof typeof professionalNavigationMessageKeys];
export type MessageKey = CommunicationMessageKey | CommunicationUiMessageKey | ProfessionalNavigationMessageKey;

const messages: Record<SupportedLocale, Record<MessageKey, string>> = {
  'en-IN': {
    'communications.appointment.requested': 'Appointment requested',
    'communications.appointment.rescheduleRequested': 'Appointment reschedule requested',
    'communications.appointment.accepted': 'Appointment accepted',
    'communications.appointment.rejected': 'Appointment declined',
    'communications.appointment.cancelled': 'Appointment cancelled',
    'communications.appointment.reminder24h': 'Appointment reminder: 24 hours',
    'communications.appointment.reminder2h': 'Appointment reminder: 2 hours',
    'communications.ui.eyebrow': 'Communications',
    'communications.ui.title': 'Reminders & appointment updates',
    'communications.ui.description': "In-app appointment events from PhysioBill's database authority. SMS and WhatsApp delivery are not active here and remain provider-dependent.",
    'communications.ui.refresh': 'Refresh',
    'communications.ui.eventHistory': 'Event history',
    'communications.ui.eventHistoryDescription': 'Most recent persona-authorized events returned by the database.',
    'communications.ui.upcoming': 'Upcoming',
    'communications.ui.upcomingDescription': 'Events scheduled for now or later. This is not proof that an external message was delivered.',
    'communications.ui.loading': 'Loading secure communications…',
    'communications.ui.emptyTitle': 'No appointment communications yet',
    'communications.ui.emptyDescription': 'Events will appear here when appointment state changes or reminder events are scheduled.',
    'communications.ui.appointmentPrefix': 'Appointment',
    'communications.ui.unableToLoad': 'Unable to load communications.',
    'communications.ui.homeVisit': 'Home visit',
    'communications.ui.telephysiotherapy': 'Telephysiotherapy',
    'communications.preferences.title': 'External communication preferences',
    'communications.preferences.description': 'Opt in only to appointment-related external messages. SMS and WhatsApp delivery remain inactive until a provider is separately approved and configured.',
    'communications.preferences.loading': 'Loading preferences…',
    'communications.preferences.updatesTitle': 'Appointment updates',
    'communications.preferences.updatesDescription': 'Requests, acceptance, rejection, cancellation and rescheduling updates.',
    'communications.preferences.remindersTitle': 'Appointment reminders',
    'communications.preferences.remindersDescription': 'Reminder eligibility only. Saving this does not prove or trigger provider delivery.',
    'communications.preferences.channelLegend': 'Preferred external channel',
    'communications.preferences.chooseChannel': 'Choose SMS or WhatsApp before enabling external updates or reminders.',
    'communications.preferences.savedNotice': 'Communication preferences saved. Provider delivery is still not active.',
    'communications.preferences.inAppNotice': 'In-app appointment events stay available regardless of these external-message preferences.',
    'communications.preferences.save': 'Save preferences',
    'communications.preferences.saving': 'Saving…',
    'communications.preferences.updateFailed': 'Unable to update communication preferences.',
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
    'communications.ui.eyebrow': 'संचार',
    'communications.ui.title': 'रिमाइंडर और अपॉइंटमेंट अपडेट',
    'communications.ui.description': 'PhysioBill के डेटाबेस-अधिकृत इन-ऐप अपॉइंटमेंट इवेंट। SMS और WhatsApp डिलीवरी यहां सक्रिय नहीं है और प्रदाता पर निर्भर रहेगी।',
    'communications.ui.refresh': 'रिफ्रेश',
    'communications.ui.eventHistory': 'इवेंट इतिहास',
    'communications.ui.eventHistoryDescription': 'डेटाबेस से लौटाए गए हाल के, पर्सोना-अधिकृत इवेंट।',
    'communications.ui.upcoming': 'आगामी',
    'communications.ui.upcomingDescription': 'अभी या बाद के लिए निर्धारित इवेंट। यह बाहरी संदेश की डिलीवरी का प्रमाण नहीं है।',
    'communications.ui.loading': 'सुरक्षित संचार लोड हो रहा है…',
    'communications.ui.emptyTitle': 'अभी कोई अपॉइंटमेंट संचार नहीं',
    'communications.ui.emptyDescription': 'अपॉइंटमेंट की स्थिति बदलने या रिमाइंडर इवेंट निर्धारित होने पर इवेंट यहां दिखाई देंगे।',
    'communications.ui.appointmentPrefix': 'अपॉइंटमेंट',
    'communications.ui.unableToLoad': 'संचार लोड नहीं हो सका।',
    'communications.ui.homeVisit': 'होम विज़िट',
    'communications.ui.telephysiotherapy': 'टेलीफिजियोथेरेपी',
    'communications.preferences.title': 'बाहरी संचार प्राथमिकताएं',
    'communications.preferences.description': 'केवल अपॉइंटमेंट से जुड़े बाहरी संदेशों के लिए सहमति दें। प्रदाता की अलग मंजूरी और कॉन्फ़िगरेशन तक SMS और WhatsApp डिलीवरी निष्क्रिय रहेगी।',
    'communications.preferences.loading': 'प्राथमिकताएं लोड हो रही हैं…',
    'communications.preferences.updatesTitle': 'अपॉइंटमेंट अपडेट',
    'communications.preferences.updatesDescription': 'अनुरोध, स्वीकृति, अस्वीकृति, रद्दीकरण और समय बदलने के अपडेट।',
    'communications.preferences.remindersTitle': 'अपॉइंटमेंट रिमाइंडर',
    'communications.preferences.remindersDescription': 'केवल रिमाइंडर पात्रता। इसे सेव करना प्रदाता डिलीवरी को साबित या शुरू नहीं करता।',
    'communications.preferences.channelLegend': 'पसंदीदा बाहरी चैनल',
    'communications.preferences.chooseChannel': 'बाहरी अपडेट या रिमाइंडर चालू करने से पहले SMS या WhatsApp चुनें।',
    'communications.preferences.savedNotice': 'संचार प्राथमिकताएं सेव हो गईं। प्रदाता डिलीवरी अभी भी सक्रिय नहीं है।',
    'communications.preferences.inAppNotice': 'इन बाहरी-संदेश प्राथमिकताओं से स्वतंत्र, इन-ऐप अपॉइंटमेंट इवेंट उपलब्ध रहेंगे।',
    'communications.preferences.save': 'प्राथमिकताएं सेव करें',
    'communications.preferences.saving': 'सेव हो रहा है…',
    'communications.preferences.updateFailed': 'संचार प्राथमिकताएं अपडेट नहीं हो सकीं।',
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
    'communications.ui.eyebrow': 'સંદેશાવ્યવહાર',
    'communications.ui.title': 'રિમાઇન્ડર અને અપોઇન્ટમેન્ટ અપડેટ',
    'communications.ui.description': 'PhysioBillના ડેટાબેઝ અધિકાર પરથી મળતા ઇન-ઍપ અપોઇન્ટમેન્ટ ઇવેન્ટ. SMS અને WhatsApp ડિલિવરી અહીં સક્રિય નથી અને પ્રદાતા પર નિર્ભર રહેશે.',
    'communications.ui.refresh': 'રિફ્રેશ',
    'communications.ui.eventHistory': 'ઇવેન્ટ ઇતિહાસ',
    'communications.ui.eventHistoryDescription': 'ડેટાબેઝ દ્વારા પરત કરાયેલા તાજેતરના, પર્સોના-અધિકૃત ઇવેન્ટ.',
    'communications.ui.upcoming': 'આગામી',
    'communications.ui.upcomingDescription': 'હમણાં અથવા પછી માટે નક્કી કરાયેલા ઇવેન્ટ. આ બાહ્ય સંદેશ પહોંચ્યાનો પુરાવો નથી.',
    'communications.ui.loading': 'સુરક્ષિત સંદેશાવ્યવહાર લોડ થઈ રહ્યો છે…',
    'communications.ui.emptyTitle': 'હજુ કોઈ અપોઇન્ટમેન્ટ સંદેશાવ્યવહાર નથી',
    'communications.ui.emptyDescription': 'અપોઇન્ટમેન્ટની સ્થિતિ બદલાય અથવા રિમાઇન્ડર ઇવેન્ટ નક્કી થાય ત્યારે ઇવેન્ટ અહીં દેખાશે.',
    'communications.ui.appointmentPrefix': 'અપોઇન્ટમેન્ટ',
    'communications.ui.unableToLoad': 'સંદેશાવ્યવહાર લોડ થઈ શક્યો નથી.',
    'communications.ui.homeVisit': 'હોમ વિઝિટ',
    'communications.ui.telephysiotherapy': 'ટેલીફિઝિયોથેરાપી',
    'communications.preferences.title': 'બાહ્ય સંદેશાવ્યવહાર પસંદગીઓ',
    'communications.preferences.description': 'ફક્ત અપોઇન્ટમેન્ટ સંબંધિત બાહ્ય સંદેશાઓ માટે સંમતિ આપો. પ્રદાતાની અલગ મંજૂરી અને ગોઠવણી સુધી SMS અને WhatsApp ડિલિવરી નિષ્ક્રિય રહેશે.',
    'communications.preferences.loading': 'પસંદગીઓ લોડ થઈ રહી છે…',
    'communications.preferences.updatesTitle': 'અપોઇન્ટમેન્ટ અપડેટ',
    'communications.preferences.updatesDescription': 'વિનંતી, સ્વીકાર, અસ્વીકાર, રદ અને સમય બદલવાના અપડેટ.',
    'communications.preferences.remindersTitle': 'અપોઇન્ટમેન્ટ રિમાઇન્ડર',
    'communications.preferences.remindersDescription': 'ફક્ત રિમાઇન્ડર પાત્રતા. આ સેવ કરવાથી પ્રદાતા ડિલિવરી સાબિત કે શરૂ થતી નથી.',
    'communications.preferences.channelLegend': 'પસંદગીનું બાહ્ય ચેનલ',
    'communications.preferences.chooseChannel': 'બાહ્ય અપડેટ અથવા રિમાઇન્ડર ચાલુ કરતાં પહેલાં SMS અથવા WhatsApp પસંદ કરો.',
    'communications.preferences.savedNotice': 'સંદેશાવ્યવહાર પસંદગીઓ સેવ થઈ. પ્રદાતા ડિલિવરી હજુ સક્રિય નથી.',
    'communications.preferences.inAppNotice': 'આ બાહ્ય-સંદેશ પસંદગીઓથી સ્વતંત્ર રીતે ઇન-ઍપ અપોઇન્ટમેન્ટ ઇવેન્ટ ઉપલબ્ધ રહેશે.',
    'communications.preferences.save': 'પસંદગીઓ સેવ કરો',
    'communications.preferences.saving': 'સેવ થઈ રહ્યું છે…',
    'communications.preferences.updateFailed': 'સંદેશાવ્યવહાર પસંદગીઓ અપડેટ થઈ શકી નથી.',
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
