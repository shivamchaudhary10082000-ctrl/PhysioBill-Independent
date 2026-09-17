import {
  DEFAULT_LOCALE,
  loadPreferredLocale,
  type SupportedLocale,
} from '@/lib/locale';

export type TherapistAnalyticsCopy = {
  eyebrow: string;
  title: string;
  description: string;
  startDate: string;
  endDateExclusive: string;
  loadingButton: string;
  refresh: string;
  invalidPeriod: string;
  unableToLoad: string;
  loading: string;
  loaded: string;
  patientsTreated: string;
  patientsTreatedDetail: string;
  visits: string;
  visitsDetail: (minutes: number, average: number) => string;
  newEpisodes: string;
  newEpisodesDetail: (ongoing: number) => string;
  unlinkedVisits: string;
  unlinkedVisitsDetail: string;
  recoveredDischarged: string;
  recoveredDischargedDetail: string;
  leftDiscontinued: string;
  leftDiscontinuedDetail: string;
  finalizedInvoices: string;
  finalizedInvoicesDetail: string;
  billedTotal: string;
  billedTotalDetail: string;
};

const copy: Record<SupportedLocale, TherapistAnalyticsCopy> = {
  'en-IN': {
    eyebrow: 'Professional analytics',
    title: 'Operating overview',
    description:
      'Aggregate operational metrics are resolved by the database for your physiotherapist account only. No patient identity is returned by this analytics boundary.',
    startDate: 'Start date',
    endDateExclusive: 'End date (exclusive)',
    loadingButton: 'Loading…',
    refresh: 'Refresh analytics',
    invalidPeriod: 'Choose an end date after the start date. The selected period was not sent to analytics.',
    unableToLoad: 'Unable to load therapist analytics.',
    loading: 'Loading therapist operating analytics…',
    loaded: 'Therapist operating analytics loaded for the selected period.',
    patientsTreated: 'Patients treated',
    patientsTreatedDetail: 'Distinct therapist-owned patient charts with a recorded visit in the selected period.',
    visits: 'Visits',
    visitsDetail: (minutes, average) => `${minutes} documented treatment minutes; average ${average} minutes per visit.`,
    newEpisodes: 'New episodes',
    newEpisodesDetail: (ongoing) => `${ongoing} treatment episodes were ongoing at the period end.`,
    unlinkedVisits: 'Unlinked visits',
    unlinkedVisitsDetail: 'Visits not attached to a treatment episode. This is a documentation-quality signal, not a patient access status.',
    recoveredDischarged: 'Recovered / discharged',
    recoveredDischargedDetail: 'Outcome transitions recorded during the selected period.',
    leftDiscontinued: 'Left / discontinued',
    leftDiscontinuedDetail: 'Discontinuation transitions recorded during the selected period.',
    finalizedInvoices: 'Finalized invoices',
    finalizedInvoicesDetail: 'Counted from immutable invoice issuance snapshots.',
    billedTotal: 'Immutable billed total',
    billedTotalDetail: 'Issued invoice value only. It is explicitly not proof of cash, bank, UPI, provider settlement, or collected revenue.',
  },
  'hi-IN': {
    eyebrow: 'प्रोफेशनल एनालिटिक्स',
    title: 'ऑपरेटिंग ओवरव्यू',
    description:
      'समेकित ऑपरेशनल मेट्रिक्स केवल आपके फिजियोथेरेपिस्ट अकाउंट के लिए डेटाबेस द्वारा तय किए जाते हैं। इस एनालिटिक्स सीमा से किसी मरीज की पहचान वापस नहीं की जाती।',
    startDate: 'शुरुआती तारीख',
    endDateExclusive: 'अंतिम तारीख (शामिल नहीं)',
    loadingButton: 'लोड हो रहा है…',
    refresh: 'एनालिटिक्स रिफ्रेश करें',
    invalidPeriod: 'शुरुआती तारीख के बाद की अंतिम तारीख चुनें। चुनी गई अवधि एनालिटिक्स को नहीं भेजी गई।',
    unableToLoad: 'थेरेपिस्ट एनालिटिक्स लोड नहीं हो सका।',
    loading: 'थेरेपिस्ट ऑपरेटिंग एनालिटिक्स लोड हो रहा है…',
    loaded: 'चुनी गई अवधि के लिए थेरेपिस्ट ऑपरेटिंग एनालिटिक्स लोड हो गया।',
    patientsTreated: 'उपचार किए गए मरीज',
    patientsTreatedDetail: 'चुनी गई अवधि में दर्ज विज़िट वाले अलग-अलग थेरेपिस्ट-स्वामित्व वाले मरीज चार्ट।',
    visits: 'विज़िट',
    visitsDetail: (minutes, average) => `${minutes} दर्ज उपचार मिनट; प्रति विज़िट औसत ${average} मिनट।`,
    newEpisodes: 'नए एपिसोड',
    newEpisodesDetail: (ongoing) => `अवधि के अंत में ${ongoing} उपचार एपिसोड जारी थे।`,
    unlinkedVisits: 'अनलिंक्ड विज़िट',
    unlinkedVisitsDetail: 'ऐसी विज़िट जो किसी उपचार एपिसोड से जुड़ी नहीं हैं। यह डॉक्यूमेंटेशन गुणवत्ता संकेत है, मरीज की एक्सेस स्थिति नहीं।',
    recoveredDischarged: 'रिकवर / डिस्चार्ज',
    recoveredDischargedDetail: 'चुनी गई अवधि में दर्ज परिणाम-स्थिति परिवर्तन।',
    leftDiscontinued: 'छोड़ा / बंद किया',
    leftDiscontinuedDetail: 'चुनी गई अवधि में दर्ज उपचार-बंद परिवर्तन।',
    finalizedInvoices: 'फाइनल किए गए इनवॉइस',
    finalizedInvoicesDetail: 'अपरिवर्तनीय इनवॉइस जारी करने वाले स्नैपशॉट से गिने गए।',
    billedTotal: 'अपरिवर्तनीय बिल कुल',
    billedTotalDetail: 'केवल जारी इनवॉइस का मूल्य। यह नकद, बैंक, UPI, प्रदाता सेटलमेंट या वसूल राजस्व का प्रमाण नहीं है।',
  },
  'gu-IN': {
    eyebrow: 'પ્રોફેશનલ એનાલિટિક્સ',
    title: 'ઓપરેટિંગ ઓવરવ્યૂ',
    description:
      'એકત્રિત ઓપરેશનલ માપદંડો માત્ર તમારા ફિઝિયોથેરાપિસ્ટ ખાતા માટે ડેટાબેઝ દ્વારા નક્કી થાય છે. આ એનાલિટિક્સ સીમા દર્દીની ઓળખ પરત કરતી નથી.',
    startDate: 'શરૂઆતની તારીખ',
    endDateExclusive: 'અંતિમ તારીખ (સમાવેશ વિના)',
    loadingButton: 'લોડ થઈ રહ્યું છે…',
    refresh: 'એનલિટિક્સ રિફ્રેશ કરો',
    invalidPeriod: 'શરૂઆતની તારીખ પછીની અંતિમ તારીખ પસંદ કરો. પસંદ કરેલો સમયગાળો એનાલિટિક્સને મોકલાયો નથી.',
    unableToLoad: 'થેરાપિસ્ટ એનાલિટિક્સ લોડ થઈ શક્યું નથી.',
    loading: 'થેરાપિસ્ટ ઓપરેટિંગ એનાલિટિક્સ લોડ થઈ રહ્યું છે…',
    loaded: 'પસંદ કરેલા સમયગાળા માટે થેરાપિસ્ટ ઓપરેટિંગ એનાલિટિક્સ લોડ થયું.',
    patientsTreated: 'સારવાર કરેલા દર્દીઓ',
    patientsTreatedDetail: 'પસંદ કરેલા સમયગાળામાં નોંધાયેલી વિઝિટ ધરાવતા અલગ થેરાપિસ્ટ-માલિકીના દર્દી ચાર્ટ.',
    visits: 'વિઝિટ',
    visitsDetail: (minutes, average) => `${minutes} નોંધાયેલા સારવાર મિનિટ; પ્રતિ વિઝિટ સરેરાશ ${average} મિનિટ.`,
    newEpisodes: 'નવા એપિસોડ',
    newEpisodesDetail: (ongoing) => `સમયગાળાના અંતે ${ongoing} સારવાર એપિસોડ ચાલુ હતા.`,
    unlinkedVisits: 'લિંક ન થયેલી વિઝિટ',
    unlinkedVisitsDetail: 'સારવાર એપિસોડ સાથે જોડાયેલી ન હોય તેવી વિઝિટ. આ દસ્તાવેજીકરણ ગુણવત્તાનો સંકેત છે, દર્દી ઍક્સેસની સ્થિતિ નહીં.',
    recoveredDischarged: 'સુધારો / ડિસ્ચાર્જ',
    recoveredDischargedDetail: 'પસંદ કરેલા સમયગાળામાં નોંધાયેલા પરિણામ-સ્થિતિ ફેરફારો.',
    leftDiscontinued: 'છોડી દીધું / બંધ',
    leftDiscontinuedDetail: 'પસંદ કરેલા સમયગાળામાં નોંધાયેલા બંધ થવાના ફેરફારો.',
    finalizedInvoices: 'ફાઇનલ કરેલા ઇનવૉઇસ',
    finalizedInvoicesDetail: 'અપરિવર્તનીય ઇનવૉઇસ ઇશ્યુઅન્સ સ્નૅપશૉટમાંથી ગણાયેલા.',
    billedTotal: 'અપરિવર્તનીય બિલ કુલ',
    billedTotalDetail: 'ફક્ત જારી કરેલા ઇનવૉઇસનું મૂલ્ય. તે રોકડ, બેંક, UPI, પ્રદાતા સેટલમેન્ટ અથવા વસૂલ થયેલી આવકનો પુરાવો નથી.',
  },
};

export function therapistAnalyticsCopy(locale: SupportedLocale): TherapistAnalyticsCopy {
  return copy[locale] ?? copy[DEFAULT_LOCALE];
}

export async function loadTherapistAnalyticsLocale(): Promise<SupportedLocale> {
  try {
    return await loadPreferredLocale();
  } catch {
    return DEFAULT_LOCALE;
  }
}
