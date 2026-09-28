import {
  DEFAULT_LOCALE,
  loadPreferredLocale,
  type SupportedLocale,
} from '@/lib/locale';

export type TelephysiotherapyCopy = {
  eyebrow: string;
  patientTitle: string;
  professionalTitle: string;
  description: string;
  refreshAria: string;
  refreshing: string;
  refresh: string;
  unableToLoad: string;
  loading: string;
  emptyTitle: string;
  emptyDescription: string;
  sessionTitle: string;
  starts: string;
  ends: string;
  activationPending: string;
  activationPendingDescription: string;
  sessionId: string;
  checkingAuthority: string;
  accessDenied: string;
  physioDenied: string;
  patientDenied: string;
  openPatientGateway: string;
  openProfessionalWorkspace: string;
  patientAccess: string;
  professionalWorkspace: string;
  backPatient: string;
  backProfessional: string;
};

const copy: Record<SupportedLocale, TelephysiotherapyCopy> = {
  'en-IN': {
    eyebrow: 'Telephysiotherapy',
    patientTitle: 'Your online sessions',
    professionalTitle: 'Online session schedule',
    description: 'Sessions shown here come from accepted telephysiotherapy appointments and are resolved by the database for the signed-in persona only.',
    refreshAria: 'Refresh telephysiotherapy sessions',
    refreshing: 'Refreshing…',
    refresh: 'Refresh',
    unableToLoad: 'Unable to load telephysiotherapy sessions.',
    loading: 'Loading telephysiotherapy sessions…',
    emptyTitle: 'No telephysiotherapy sessions yet',
    emptyDescription: 'A session appears only after the appropriate accepted telephysiotherapy appointment has a session foundation.',
    sessionTitle: 'Scheduled online session',
    starts: 'Starts',
    ends: 'Ends',
    activationPending: 'Video-room activation pending',
    activationPendingDescription: 'This session confirms scheduling authority only. PhysioBill has not created or exposed any provider room, meeting URL, access token, recording, or external account credential.',
    sessionId: 'Session ID',
    checkingAuthority: 'Checking telephysiotherapy session authority…',
    accessDenied: 'Telephysiotherapy session access denied.',
    physioDenied: 'A physiotherapist session cannot enter the patient telephysiotherapy surface.',
    patientDenied: 'A patient session cannot enter the professional telephysiotherapy surface.',
    openPatientGateway: 'Open patient gateway',
    openProfessionalWorkspace: 'Open professional workspace',
    patientAccess: 'Patient access',
    professionalWorkspace: 'Professional workspace',
    backPatient: 'Back to patient gateway',
    backProfessional: 'Back to Overview',
  },
  'hi-IN': {
    eyebrow: 'टेलीफिजियोथेरेपी',
    patientTitle: 'आपके ऑनलाइन सत्र',
    professionalTitle: 'ऑनलाइन सत्र शेड्यूल',
    description: 'यहाँ दिखाए गए सत्र स्वीकार की गई टेलीफिजियोथेरेपी अपॉइंटमेंट से आते हैं और डेटाबेस उन्हें केवल साइन-इन किए गए पर्सोना के लिए तय करता है।',
    refreshAria: 'टेलीफिजियोथेरेपी सत्र रिफ्रेश करें',
    refreshing: 'रिफ्रेश हो रहा है…',
    refresh: 'रिफ्रेश करें',
    unableToLoad: 'टेलीफिजियोथेरेपी सत्र लोड नहीं हो सके।',
    loading: 'टेलीफिजियोथेरेपी सत्र लोड हो रहे हैं…',
    emptyTitle: 'अभी कोई टेलीफिजियोथेरेपी सत्र नहीं है',
    emptyDescription: 'सत्र तभी दिखाई देता है जब उपयुक्त स्वीकार की गई टेलीफिजियोथेरेपी अपॉइंटमेंट के लिए सत्र आधार मौजूद हो।',
    sessionTitle: 'निर्धारित ऑनलाइन सत्र',
    starts: 'शुरू होता है',
    ends: 'समाप्त होता है',
    activationPending: 'वीडियो-रूम सक्रियण लंबित',
    activationPendingDescription: 'यह सत्र केवल शेड्यूलिंग अधिकार की पुष्टि करता है। PhysioBill ने कोई प्रदाता रूम, मीटिंग URL, एक्सेस टोकन, रिकॉर्डिंग या बाहरी खाते का क्रेडेंशियल बनाया या उजागर नहीं किया है।',
    sessionId: 'सत्र ID',
    checkingAuthority: 'टेलीफिजियोथेरेपी सत्र अधिकार जाँचा जा रहा है…',
    accessDenied: 'टेलीफिजियोथेरेपी सत्र एक्सेस अस्वीकृत।',
    physioDenied: 'फिजियोथेरेपिस्ट सत्र मरीज की टेलीफिजियोथेरेपी सतह में प्रवेश नहीं कर सकता।',
    patientDenied: 'मरीज सत्र प्रोफेशनल टेलीफिजियोथेरेपी सतह में प्रवेश नहीं कर सकता।',
    openPatientGateway: 'मरीज गेटवे खोलें',
    openProfessionalWorkspace: 'प्रोफेशनल वर्कस्पेस खोलें',
    patientAccess: 'मरीज एक्सेस',
    professionalWorkspace: 'प्रोफेशनल वर्कस्पेस',
    backPatient: 'मरीज गेटवे पर वापस जाएँ',
    backProfessional: 'ओवरव्यू पर वापस जाएँ',
  },
  'gu-IN': {
    eyebrow: 'ટેલિફિઝિયોથેરાપી',
    patientTitle: 'તમારા ઑનલાઇન સત્રો',
    professionalTitle: 'ઑનલાઇન સત્ર શેડ્યૂલ',
    description: 'અહીં દર્શાવેલા સત્રો સ્વીકારેલી ટેલિફિઝિયોથેરાપી એપોઇન્ટમેન્ટમાંથી આવે છે અને ડેટાબેઝ તેને ફક્ત સાઇન-ઇન કરેલા પર્સોના માટે નક્કી કરે છે.',
    refreshAria: 'ટેલિફિઝિયોથેરાપી સત્રો રિફ્રેશ કરો',
    refreshing: 'રિફ્રેશ થઈ રહ્યું છે…',
    refresh: 'રિફ્રેશ કરો',
    unableToLoad: 'ટેલિફિઝિયોથેરાપી સત્રો લોડ થઈ શક્યા નથી.',
    loading: 'ટેલિફિઝિયોથેરાપી સત્રો લોડ થઈ રહ્યા છે…',
    emptyTitle: 'હજુ કોઈ ટેલિફિઝિયોથેરાપી સત્ર નથી',
    emptyDescription: 'યોગ્ય સ્વીકારેલી ટેલિફિઝિયોથેરાપી એપોઇન્ટમેન્ટ માટે સત્ર આધાર બને ત્યારે જ સત્ર દેખાય છે.',
    sessionTitle: 'નિર્ધારિત ઑનલાઇન સત્ર',
    starts: 'શરૂ થાય છે',
    ends: 'સમાપ્ત થાય છે',
    activationPending: 'વિડિયો-રૂમ સક્રિયકરણ બાકી',
    activationPendingDescription: 'આ સત્ર ફક્ત શેડ્યૂલિંગ અધિકારની પુષ્ટિ કરે છે. PhysioBill એ કોઈ પ્રદાતા રૂમ, મીટિંગ URL, ઍક્સેસ ટોકન, રેકોર્ડિંગ અથવા બાહ્ય ખાતાની ઓળખ માહિતી બનાવી કે જાહેર કરી નથી.',
    sessionId: 'સત્ર ID',
    checkingAuthority: 'ટેલિફિઝિયોથેરાપી સત્ર અધિકાર તપાસાઈ રહ્યો છે…',
    accessDenied: 'ટેલિફિઝિયોથેરાપી સત્ર ઍક્સેસ નકારી.',
    physioDenied: 'ફિઝિયોથેરાપિસ્ટ સત્ર દર્દીની ટેલિફિઝિયોથેરાપી સપાટી પર પ્રવેશી શકતું નથી.',
    patientDenied: 'દર્દી સત્ર પ્રોફેશનલ ટેલિફિઝિયોથેરાપી સપાટી પર પ્રવેશી શકતું નથી.',
    openPatientGateway: 'દર્દી ગેટવે ખોલો',
    openProfessionalWorkspace: 'પ્રોફેશનલ વર્કસ્પેસ ખોલો',
    patientAccess: 'દર્દી ઍક્સેસ',
    professionalWorkspace: 'પ્રોફેશનલ વર્કસ્પેસ',
    backPatient: 'દર્દી ગેટવે પર પાછા જાઓ',
    backProfessional: 'ઓવરવ્યૂ પર પાછા જાઓ',
  },
};

export function telephysiotherapyCopy(locale: SupportedLocale): TelephysiotherapyCopy {
  return copy[locale] ?? copy[DEFAULT_LOCALE];
}

export async function loadTelephysiotherapyLocale(): Promise<SupportedLocale> {
  try {
    return await loadPreferredLocale();
  } catch {
    return DEFAULT_LOCALE;
  }
}
