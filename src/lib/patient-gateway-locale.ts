import { DEFAULT_LOCALE, normalizeLocale, type SupportedLocale } from '@/lib/locale';

export type PatientGatewayMessageKey =
  | 'publicHomeAria'
  | 'resolvingIdentity'
  | 'identityError'
  | 'signOutError'
  | 'signOut'
  | 'signingOut'
  | 'authenticatedPatient'
  | 'headline'
  | 'description'
  | 'publicPatientIdentifier'
  | 'workspaceAria'
  | 'findPhysio'
  | 'appointmentRequests'
  | 'updatesReminders'
  | 'telephysiotherapy'
  | 'linkedClinicalCare'
  | 'financialSummary'
  | 'publicHome';

const messages: Record<SupportedLocale, Record<PatientGatewayMessageKey, string>> = {
  'en-IN': {
    publicHomeAria: 'PhysioBill public home',
    resolvingIdentity: 'Resolving patient identity…',
    identityError: 'Patient identity could not be resolved safely.',
    signOutError: 'Unable to sign out. Please try again.',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    authenticatedPatient: 'Authenticated patient',
    headline: 'Your care, appointments and billing in one place.',
    description: 'Find verified physiotherapists and manage the parts of your care that your authenticated patient identity is allowed to access. Therapist-private clinical notes, draft billing and payment-provider identifiers remain protected.',
    publicPatientIdentifier: 'Public patient identifier',
    workspaceAria: 'Patient workspace',
    findPhysio: 'Find a physiotherapist',
    appointmentRequests: 'Appointment requests',
    updatesReminders: 'Updates & reminders',
    telephysiotherapy: 'Telephysiotherapy',
    linkedClinicalCare: 'Linked clinical care',
    financialSummary: 'Financial summary',
    publicHome: 'Public PhysioBill home',
  },
  'hi-IN': {
    publicHomeAria: 'PhysioBill सार्वजनिक होम',
    resolvingIdentity: 'मरीज़ की पहचान सुरक्षित रूप से जाँची जा रही है…',
    identityError: 'मरीज़ की पहचान सुरक्षित रूप से सत्यापित नहीं हो सकी।',
    signOutError: 'साइन आउट नहीं हो सका। कृपया फिर प्रयास करें।',
    signOut: 'साइन आउट',
    signingOut: 'साइन आउट हो रहा है…',
    authenticatedPatient: 'प्रमाणित मरीज़',
    headline: 'आपकी देखभाल, अपॉइंटमेंट और बिलिंग एक ही जगह।',
    description: 'सत्यापित फिजियोथेरेपिस्ट खोजें और केवल वही देखभाल-संबंधी हिस्से प्रबंधित करें जिनकी अनुमति आपकी प्रमाणित मरीज़ पहचान को है। थेरेपिस्ट के निजी क्लिनिकल नोट्स, ड्राफ्ट बिलिंग और भुगतान-प्रदाता पहचानकर्ता सुरक्षित रहते हैं।',
    publicPatientIdentifier: 'सार्वजनिक मरीज़ पहचानकर्ता',
    workspaceAria: 'मरीज़ वर्कस्पेस',
    findPhysio: 'फिजियोथेरेपिस्ट खोजें',
    appointmentRequests: 'अपॉइंटमेंट अनुरोध',
    updatesReminders: 'अपडेट और रिमाइंडर',
    telephysiotherapy: 'टेलीफिजियोथेरेपी',
    linkedClinicalCare: 'लिंक की गई क्लिनिकल देखभाल',
    financialSummary: 'वित्तीय सारांश',
    publicHome: 'PhysioBill सार्वजनिक होम',
  },
  'gu-IN': {
    publicHomeAria: 'PhysioBill જાહેર હોમ',
    resolvingIdentity: 'દર્દીની ઓળખ સુરક્ષિત રીતે ચકાસાઈ રહી છે…',
    identityError: 'દર્દીની ઓળખ સુરક્ષિત રીતે નિર્ધારિત થઈ શકી નથી.',
    signOutError: 'સાઇન આઉટ થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયાસ કરો.',
    signOut: 'સાઇન આઉટ',
    signingOut: 'સાઇન આઉટ થઈ રહ્યું છે…',
    authenticatedPatient: 'પ્રમાણિત દર્દી',
    headline: 'તમારી સારવાર, અપોઇન્ટમેન્ટ અને બિલિંગ એક જ જગ્યાએ.',
    description: 'ચકાસાયેલા ફિઝિયોથેરાપિસ્ટ શોધો અને તમારી પ્રમાણિત દર્દી ઓળખને જે ભાગોની મંજૂરી છે તે જ સંભાળો. થેરાપિસ્ટના ખાનગી ક્લિનિકલ નોંધ, ડ્રાફ્ટ બિલિંગ અને પેમેન્ટ-પ્રદાતા ઓળખકર્તા સુરક્ષિત રહે છે.',
    publicPatientIdentifier: 'જાહેર દર્દી ઓળખકર્તા',
    workspaceAria: 'દર્દી વર્કસ્પેસ',
    findPhysio: 'ફિઝિયોથેરાપિસ્ટ શોધો',
    appointmentRequests: 'અપોઇન્ટમેન્ટ વિનંતીઓ',
    updatesReminders: 'અપડેટ અને રિમાઇન્ડર',
    telephysiotherapy: 'ટેલીફિઝિયોથેરાપી',
    linkedClinicalCare: 'લિંક કરેલી ક્લિનિકલ સારવાર',
    financialSummary: 'નાણાકીય સારાંશ',
    publicHome: 'PhysioBill જાહેર હોમ',
  },
};

export function patientGatewayMessage(locale: unknown, key: PatientGatewayMessageKey): string {
  const normalized = normalizeLocale(locale);
  return messages[normalized]?.[key] ?? messages[DEFAULT_LOCALE][key];
}
