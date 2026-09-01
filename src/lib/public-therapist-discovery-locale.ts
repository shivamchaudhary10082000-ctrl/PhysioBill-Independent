import { DEFAULT_LOCALE, type SupportedLocale } from '@/lib/locale';
import type { TherapistServiceMode } from '@/lib/therapist-discovery';

export type PublicTherapistDiscoveryCopy = {
  loadingVerifiedPhysiotherapists: string;
  verifiedProfessional: string;
  verifiedRegistration: string;
  services: string;
  chooseHomeVisitServiceArea: string;
  serviceAreas: string;
  coarseLocationEvidence: string;
  upcomingAvailability: string;
  checkingAvailability: string;
  availabilityUnavailable: string;
  upcomingTime: string;
  requested: string;
  requesting: string;
  chooseAreaFirst: string;
  requestThisTime: string;
  noUpcomingTimes: string;
  requestBoundary: string;
  myRequests: string;
  chooseAreaError: string;
  professionalPersonaError: string;
  homeVisitRequestSent: string;
  appointmentRequestSent: string;
  requestFailed: string;
  chooseCityToBegin: string;
  verifiedCareOptions: (city: string) => string;
  notFindingMatch: string;
  stillLooking: string;
  broadenSearchHeading: string;
  findCareHeading: string;
  widenSearch: string;
  tryAnotherSearch: string;
  adjustSearchAnytime: string;
  backToPhysioBill: string;
  verifiedTherapistSearch: string;
  verifiedPhysiotherapists: string;
  startWithCity: string;
  noVerifiedMatches: (city: string) => string;
  careOptionsFor: (city: string) => string;
  searchUnavailable: string;
  retrySearch: string;
  enterCityToSearch: string;
  chooseServiceAndCity: string;
  searchCompleted: string;
  noVerifiedPhysiotherapists: string;
  broadenLocationOrCare: string;
  editArea: string;
  tryAnotherCity: string;
  changeServiceType: string;
  wantBroadenSearch: string;
  adjustControls: string;
  dismissSearchHelp: string;
  professionalSignIn: string;
  serviceModeLabels: Record<TherapistServiceMode, string>;
};

const copy: Record<SupportedLocale, PublicTherapistDiscoveryCopy> = {
  'en-IN': {
    loadingVerifiedPhysiotherapists: 'Loading verified physiotherapists',
    verifiedProfessional: 'Verified professional',
    verifiedRegistration: 'Verified registration',
    services: 'Services',
    chooseHomeVisitServiceArea: 'Choose a home-visit service area',
    serviceAreas: 'Service areas',
    coarseLocationEvidence: 'This is coarse scheduling evidence only. It does not prove your exact location or attendance.',
    upcomingAvailability: 'Upcoming availability',
    checkingAvailability: 'Checking upcoming availability',
    availabilityUnavailable: 'Upcoming times could not be loaded right now. No availability is being assumed.',
    upcomingTime: 'Upcoming time',
    requested: 'Requested',
    requesting: 'Requesting…',
    chooseAreaFirst: 'Choose area first',
    requestThisTime: 'Request this time',
    noUpcomingTimes: 'No upcoming times are currently published for this care type.',
    requestBoundary: 'A request is not confirmed until the physiotherapist accepts it. It creates no clinical or payment access.',
    myRequests: 'My requests',
    chooseAreaError: 'Choose the therapist service area where the home visit should take place before requesting this time.',
    professionalPersonaError: 'A professional session cannot create a patient appointment request. Sign out before continuing as a patient.',
    homeVisitRequestSent: 'Home-visit request sent with the selected service area. The physiotherapist must accept it before the time is scheduled.',
    appointmentRequestSent: 'Request sent. The physiotherapist must accept it before the time is scheduled.',
    requestFailed: 'This time could not be requested. It may already be requested, the selected service area may no longer be active, or the time may no longer be available.',
    chooseCityToBegin: 'Choose a city to begin.',
    verifiedCareOptions: (city) => `Verified care options for ${city}.`,
    notFindingMatch: 'Not finding the right match yet?',
    stillLooking: 'Still looking? Let’s try another approach.',
    broadenSearchHeading: 'Let’s broaden your search.',
    findCareHeading: 'Find care that fits your location.',
    widenSearch: 'Widen the area or switch the type of care — we’ll keep the search simple.',
    tryAnotherSearch: 'Try another area, city, or care type to widen your search.',
    adjustSearchAnytime: 'Adjust the search anytime. Your choices stay in the URL so this page is easy to revisit.',
    backToPhysioBill: 'Back to PhysioBill',
    verifiedTherapistSearch: 'Verified therapist search',
    verifiedPhysiotherapists: 'Verified physiotherapists',
    startWithCity: 'Start with your city',
    noVerifiedMatches: (city) => `No verified matches in ${city} yet`,
    careOptionsFor: (city) => `Care options for ${city}`,
    searchUnavailable: 'Search temporarily unavailable',
    retrySearch: 'Retry search',
    enterCityToSearch: 'Enter a city to search',
    chooseServiceAndCity: 'Choose a service and city above. Area is optional.',
    searchCompleted: 'Search completed',
    noVerifiedPhysiotherapists: 'No verified physiotherapists are listed for this search yet.',
    broadenLocationOrCare: 'Try broadening the location or changing the type of physiotherapy care.',
    editArea: 'Edit area',
    tryAnotherCity: 'Try another city',
    changeServiceType: 'Change service type',
    wantBroadenSearch: 'Want to broaden your search?',
    adjustControls: 'You can adjust the same location and service controls above.',
    dismissSearchHelp: 'Dismiss search help',
    professionalSignIn: 'Professional sign in',
    serviceModeLabels: { home_visit: 'Home visit', clinic: 'Clinic visit', telephysiotherapy: 'Telephysiotherapy' },
  },
  'hi-IN': {
    loadingVerifiedPhysiotherapists: 'सत्यापित फिजियोथेरेपिस्ट लोड हो रहे हैं',
    verifiedProfessional: 'सत्यापित प्रोफेशनल',
    verifiedRegistration: 'सत्यापित पंजीकरण',
    services: 'सेवाएँ',
    chooseHomeVisitServiceArea: 'होम विज़िट का सेवा क्षेत्र चुनें',
    serviceAreas: 'सेवा क्षेत्र',
    coarseLocationEvidence: 'यह केवल सामान्य शेड्यूलिंग प्रमाण है। यह आपकी सटीक लोकेशन या उपस्थिति साबित नहीं करता।',
    upcomingAvailability: 'आगामी उपलब्धता',
    checkingAvailability: 'आगामी उपलब्धता जाँची जा रही है',
    availabilityUnavailable: 'आगामी समय अभी लोड नहीं हो सके। किसी उपलब्धता का अनुमान नहीं लगाया जा रहा है।',
    upcomingTime: 'आगामी समय',
    requested: 'अनुरोध भेजा',
    requesting: 'अनुरोध भेजा जा रहा है…',
    chooseAreaFirst: 'पहले क्षेत्र चुनें',
    requestThisTime: 'इस समय का अनुरोध करें',
    noUpcomingTimes: 'इस देखभाल प्रकार के लिए अभी कोई आगामी समय प्रकाशित नहीं है।',
    requestBoundary: 'फिजियोथेरेपिस्ट के स्वीकार करने तक अनुरोध पुष्टि नहीं है। इससे कोई क्लिनिकल या भुगतान पहुँच नहीं मिलती।',
    myRequests: 'मेरे अनुरोध',
    chooseAreaError: 'इस समय का अनुरोध करने से पहले होम विज़िट के लिए फिजियोथेरेपिस्ट का सेवा क्षेत्र चुनें।',
    professionalPersonaError: 'प्रोफेशनल सत्र मरीज की अपॉइंटमेंट का अनुरोध नहीं बना सकता। मरीज के रूप में जारी रखने से पहले साइन आउट करें।',
    homeVisitRequestSent: 'चुने गए सेवा क्षेत्र के साथ होम-विज़िट अनुरोध भेजा गया। समय तय होने से पहले फिजियोथेरेपिस्ट को इसे स्वीकार करना होगा।',
    appointmentRequestSent: 'अनुरोध भेजा गया। समय तय होने से पहले फिजियोथेरेपिस्ट को इसे स्वीकार करना होगा।',
    requestFailed: 'इस समय का अनुरोध नहीं किया जा सका। समय पहले से अनुरोधित हो सकता है, क्षेत्र निष्क्रिय हो सकता है, या समय अब उपलब्ध नहीं हो सकता।',
    chooseCityToBegin: 'शुरू करने के लिए शहर चुनें।',
    verifiedCareOptions: (city) => `${city} के लिए सत्यापित देखभाल विकल्प।`,
    notFindingMatch: 'अभी सही विकल्प नहीं मिल रहा?',
    stillLooking: 'अभी भी खोज रहे हैं? दूसरा तरीका आज़माएँ।',
    broadenSearchHeading: 'अपनी खोज को थोड़ा व्यापक करें।',
    findCareHeading: 'अपनी लोकेशन के अनुसार देखभाल खोजें।',
    widenSearch: 'क्षेत्र बढ़ाएँ या देखभाल का प्रकार बदलें — खोज सरल रहेगी।',
    tryAnotherSearch: 'खोज बढ़ाने के लिए दूसरा क्षेत्र, शहर या देखभाल प्रकार आज़माएँ।',
    adjustSearchAnytime: 'आप कभी भी खोज बदल सकते हैं। आपके विकल्प URL में सुरक्षित रहते हैं।',
    backToPhysioBill: 'PhysioBill पर वापस जाएँ',
    verifiedTherapistSearch: 'सत्यापित फिजियोथेरेपिस्ट खोज',
    verifiedPhysiotherapists: 'सत्यापित फिजियोथेरेपिस्ट',
    startWithCity: 'अपने शहर से शुरू करें',
    noVerifiedMatches: (city) => `${city} में अभी कोई सत्यापित मैच नहीं`,
    careOptionsFor: (city) => `${city} के लिए देखभाल विकल्प`,
    searchUnavailable: 'खोज अस्थायी रूप से उपलब्ध नहीं है',
    retrySearch: 'फिर से खोजें',
    enterCityToSearch: 'खोजने के लिए शहर दर्ज करें',
    chooseServiceAndCity: 'ऊपर सेवा और शहर चुनें। क्षेत्र वैकल्पिक है।',
    searchCompleted: 'खोज पूरी हुई',
    noVerifiedPhysiotherapists: 'इस खोज के लिए अभी कोई सत्यापित फिजियोथेरेपिस्ट सूचीबद्ध नहीं है।',
    broadenLocationOrCare: 'लोकेशन बढ़ाएँ या फिजियोथेरेपी देखभाल का प्रकार बदलें।',
    editArea: 'क्षेत्र बदलें',
    tryAnotherCity: 'दूसरा शहर आज़माएँ',
    changeServiceType: 'सेवा प्रकार बदलें',
    wantBroadenSearch: 'खोज को व्यापक करना चाहते हैं?',
    adjustControls: 'ऊपर वही लोकेशन और सेवा नियंत्रण बदल सकते हैं।',
    dismissSearchHelp: 'खोज सहायता बंद करें',
    professionalSignIn: 'प्रोफेशनल साइन इन',
    serviceModeLabels: { home_visit: 'होम विज़िट', clinic: 'क्लिनिक विज़िट', telephysiotherapy: 'टेलीफिजियोथेरेपी' },
  },
  'gu-IN': {
    loadingVerifiedPhysiotherapists: 'ચકાસાયેલ ફિઝિયોથેરાપિસ્ટ લોડ થઈ રહ્યા છે',
    verifiedProfessional: 'ચકાસાયેલ પ્રોફેશનલ',
    verifiedRegistration: 'ચકાસાયેલ રજીસ્ટ્રેશન',
    services: 'સેવાઓ',
    chooseHomeVisitServiceArea: 'હોમ વિઝિટ માટે સેવા વિસ્તાર પસંદ કરો',
    serviceAreas: 'સેવા વિસ્તારો',
    coarseLocationEvidence: 'આ માત્ર સામાન્ય શેડ્યૂલિંગ પુરાવો છે. તે તમારી ચોક્કસ લોકેશન અથવા હાજરી સાબિત કરતું નથી.',
    upcomingAvailability: 'આગામી ઉપલબ્ધતા',
    checkingAvailability: 'આગામી ઉપલબ્ધતા તપાસી રહ્યા છીએ',
    availabilityUnavailable: 'આગામી સમય હાલમાં લોડ થઈ શક્યા નથી. ઉપલબ્ધતા માનવામાં આવી રહી નથી.',
    upcomingTime: 'આગામી સમય',
    requested: 'વિનંતી મોકલાઈ',
    requesting: 'વિનંતી મોકલી રહ્યા છીએ…',
    chooseAreaFirst: 'પહેલા વિસ્તાર પસંદ કરો',
    requestThisTime: 'આ સમય માટે વિનંતી કરો',
    noUpcomingTimes: 'આ કાળજી પ્રકાર માટે હાલમાં કોઈ આગામી સમય પ્રકાશિત નથી.',
    requestBoundary: 'ફિઝિયોથેરાપિસ્ટ સ્વીકારે ત્યાં સુધી વિનંતી પુષ્ટિ થયેલી નથી. તે ક્લિનિકલ અથવા પેમેન્ટ ઍક્સેસ આપતી નથી.',
    myRequests: 'મારી વિનંતીઓ',
    chooseAreaError: 'આ સમય માટે વિનંતી કરતા પહેલાં હોમ વિઝિટ માટે ફિઝિયોથેરાપિસ્ટનો સેવા વિસ્તાર પસંદ કરો.',
    professionalPersonaError: 'પ્રોફેશનલ સેશન દર્દીની અપોઇન્ટમેન્ટ વિનંતી બનાવી શકતું નથી. દર્દી તરીકે ચાલુ રાખતા પહેલાં સાઇન આઉટ કરો.',
    homeVisitRequestSent: 'પસંદ કરેલા સેવા વિસ્તાર સાથે હોમ-વિઝિટ વિનંતી મોકલાઈ. સમય નક્કી થાય તે પહેલાં ફિઝિયોથેરાપિસ્ટે સ્વીકારવી જરૂરી છે.',
    appointmentRequestSent: 'વિનંતી મોકલાઈ. સમય નક્કી થાય તે પહેલાં ફિઝિયોથેરાપિસ્ટે તેને સ્વીકારવી જરૂરી છે.',
    requestFailed: 'આ સમય માટે વિનંતી થઈ શકી નથી. સમય પહેલેથી વિનંતી થયેલો હોઈ શકે, વિસ્તાર સક્રિય ન હોઈ શકે, અથવા સમય હવે ઉપલબ્ધ ન હોઈ શકે.',
    chooseCityToBegin: 'શરૂ કરવા માટે શહેર પસંદ કરો.',
    verifiedCareOptions: (city) => `${city} માટે ચકાસાયેલ કાળજી વિકલ્પો.`,
    notFindingMatch: 'હજુ યોગ્ય વિકલ્પ મળતો નથી?',
    stillLooking: 'હજુ શોધી રહ્યા છો? બીજો રસ્તો અજમાવીએ.',
    broadenSearchHeading: 'તમારી શોધને વધુ વ્યાપક બનાવીએ.',
    findCareHeading: 'તમારી લોકેશનને અનુકૂળ કાળજી શોધો.',
    widenSearch: 'વિસ્તાર વધારો અથવા કાળજી પ્રકાર બદલો — શોધ સરળ રાખીશું.',
    tryAnotherSearch: 'શોધ વિસ્તૃત કરવા બીજો વિસ્તાર, શહેર અથવા કાળજી પ્રકાર અજમાવો.',
    adjustSearchAnytime: 'તમે ક્યારેય પણ શોધ બદલી શકો છો. તમારા વિકલ્પો URL માં રહે છે.',
    backToPhysioBill: 'PhysioBill પર પાછા જાઓ',
    verifiedTherapistSearch: 'ચકાસાયેલ ફિઝિયોથેરાપિસ્ટ શોધ',
    verifiedPhysiotherapists: 'ચકાસાયેલ ફિઝિયોથેરાપિસ્ટ',
    startWithCity: 'તમારા શહેરથી શરૂ કરો',
    noVerifiedMatches: (city) => `${city} માં હાલમાં કોઈ ચકાસાયેલ મેચ નથી`,
    careOptionsFor: (city) => `${city} માટે કાળજી વિકલ્પો`,
    searchUnavailable: 'શોધ હાલમાં ઉપલબ્ધ નથી',
    retrySearch: 'ફરી શોધો',
    enterCityToSearch: 'શોધવા માટે શહેર દાખલ કરો',
    chooseServiceAndCity: 'ઉપર સેવા અને શહેર પસંદ કરો. વિસ્તાર વૈકલ્પિક છે.',
    searchCompleted: 'શોધ પૂર્ણ થઈ',
    noVerifiedPhysiotherapists: 'આ શોધ માટે હાલમાં કોઈ ચકાસાયેલ ફિઝિયોથેરાપિસ્ટ સૂચિબદ્ધ નથી.',
    broadenLocationOrCare: 'લોકેશન વિસ્તારો અથવા ફિઝિયોથેરાપી કાળજીનો પ્રકાર બદલો.',
    editArea: 'વિસ્તાર બદલો',
    tryAnotherCity: 'બીજું શહેર અજમાવો',
    changeServiceType: 'સેવા પ્રકાર બદલો',
    wantBroadenSearch: 'શોધ વધુ વ્યાપક કરવી છે?',
    adjustControls: 'ઉપરના એ જ લોકેશન અને સેવા નિયંત્રણો બદલી શકો છો.',
    dismissSearchHelp: 'શોધ સહાય બંધ કરો',
    professionalSignIn: 'પ્રોફેશનલ સાઇન ઇન',
    serviceModeLabels: { home_visit: 'હોમ વિઝિટ', clinic: 'ક્લિનિક વિઝિટ', telephysiotherapy: 'ટેલિફિઝિયોથેરાપી' },
  },
};

export function publicTherapistDiscoveryCopy(locale: SupportedLocale): PublicTherapistDiscoveryCopy {
  return copy[locale] ?? copy[DEFAULT_LOCALE];
}

export function detectPublicTherapistDiscoveryLocale(languages: readonly string[] | undefined): SupportedLocale {
  for (const raw of languages ?? []) {
    const language = raw.toLowerCase();
    if (language === 'hi' || language.startsWith('hi-')) return 'hi-IN';
    if (language === 'gu' || language.startsWith('gu-')) return 'gu-IN';
    if (language === 'en' || language.startsWith('en-')) return 'en-IN';
  }
  return DEFAULT_LOCALE;
}
