import type { SupportedLocale } from '@/lib/locale';

type MessageKey =
  | 'loadError' | 'tooManyWindows' | 'disabledMode' | 'missingTimes' | 'endBeforeStart'
  | 'tooLong' | 'mustBeFuture' | 'tooFarAhead' | 'duplicateWindow' | 'unavailable'
  | 'saved' | 'saveError' | 'kicker' | 'title' | 'intro' | 'authorityKicker'
  | 'upcomingWindows' | 'timezonePrefix' | 'discoveryProfile' | 'enableModeTitle'
  | 'enableModeIntro' | 'openDiscoveryProfile' | 'service' | 'starts' | 'ends'
  | 'removeWindow' | 'empty' | 'addAvailability' | 'saving' | 'saveAvailability'
  | 'futureWindowsTitle' | 'futureWindowsIntro' | 'noBookingTitle' | 'noBookingIntro';

const EN: Record<MessageKey, string> = {
  loadError: 'Unable to load therapist availability.',
  tooManyWindows: 'Keep this page to 32 upcoming windows at a time.',
  disabledMode: 'Every availability window must use a currently enabled service mode.',
  missingTimes: 'Complete the start and end time for every window.',
  endBeforeStart: 'Each availability window must end after it starts.',
  tooLong: 'An availability window cannot exceed eight hours.',
  mustBeFuture: 'Availability must end in the future.',
  tooFarAhead: 'Availability cannot be published more than 180 days ahead.',
  duplicateWindow: 'Remove duplicate availability windows before saving.',
  unavailable: 'Availability is unavailable right now.',
  saved: 'Availability saved.',
  saveError: 'Unable to save therapist availability.',
  kicker: 'Patient discovery',
  title: 'Publish real upcoming availability.',
  intro: 'These are explicit future time windows, not bookings. Patients cannot reserve care, enter your workspace, or gain clinical or financial access from availability alone.',
  authorityKicker: 'Availability authority',
  upcomingWindows: 'Upcoming windows',
  timezonePrefix: 'Times are saved as absolute timestamps and labelled with this device timezone:',
  discoveryProfile: 'Discovery profile',
  enableModeTitle: 'Enable a service mode first',
  enableModeIntro: 'Availability can only be published for Home visit, Clinic visit or Telephysiotherapy modes already enabled on your discovery profile.',
  openDiscoveryProfile: 'Open discovery profile',
  service: 'Service',
  starts: 'Starts',
  ends: 'Ends',
  removeWindow: 'Remove availability window',
  empty: 'No upcoming availability is published. This is safe: discovery may still show the verified therapist, but it must not invent appointment availability.',
  addAvailability: 'Add availability',
  saving: 'Saving…',
  saveAvailability: 'Save availability',
  futureWindowsTitle: 'Concrete future windows',
  futureWindowsIntro: 'PhysioBill stores explicit timestamps instead of guessing availability from service modes, visits or profile status.',
  noBookingTitle: 'No booking authority yet',
  noBookingIntro: 'Publishing a window does not create an appointment, treatment episode, clinical record, invoice or payment.',
};

const HI: Record<MessageKey, string> = {
  ...EN,
  loadError: 'थेरेपिस्ट की उपलब्धता लोड नहीं हो सकी।',
  tooManyWindows: 'एक समय में अधिकतम 32 आगामी उपलब्धता विंडो रखें।',
  disabledMode: 'हर उपलब्धता विंडो में वर्तमान में सक्षम सेवा मोड ही होना चाहिए।',
  missingTimes: 'हर विंडो के लिए शुरू और समाप्त होने का समय पूरा करें।',
  endBeforeStart: 'हर उपलब्धता विंडो का समाप्ति समय शुरू होने के बाद होना चाहिए।',
  tooLong: 'एक उपलब्धता विंडो आठ घंटे से अधिक नहीं हो सकती।',
  mustBeFuture: 'उपलब्धता भविष्य में समाप्त होनी चाहिए।',
  tooFarAhead: 'उपलब्धता 180 दिनों से अधिक आगे प्रकाशित नहीं की जा सकती।',
  duplicateWindow: 'सहेजने से पहले डुप्लिकेट उपलब्धता विंडो हटाएँ।',
  unavailable: 'उपलब्धता अभी उपलब्ध नहीं है।',
  saved: 'उपलब्धता सहेजी गई।',
  saveError: 'थेरेपिस्ट की उपलब्धता सहेजी नहीं जा सकी।',
  kicker: 'रोगी खोज',
  title: 'वास्तविक आगामी उपलब्धता प्रकाशित करें।',
  intro: 'ये स्पष्ट भविष्य के समय विंडो हैं, बुकिंग नहीं। केवल उपलब्धता से रोगी देखभाल आरक्षित नहीं कर सकता, आपके कार्यक्षेत्र में प्रवेश नहीं कर सकता और न ही क्लिनिकल या वित्तीय पहुँच पा सकता है।',
  authorityKicker: 'उपलब्धता प्राधिकरण',
  upcomingWindows: 'आगामी विंडो',
  timezonePrefix: 'समय पूर्ण टाइमस्टैम्प के रूप में सहेजा जाता है और इस डिवाइस टाइमज़ोन के साथ दिखाया जाता है:',
  discoveryProfile: 'डिस्कवरी प्रोफ़ाइल',
  enableModeTitle: 'पहले सेवा मोड सक्षम करें',
  enableModeIntro: 'उपलब्धता केवल उन Home visit, Clinic visit या Telephysiotherapy मोड के लिए प्रकाशित की जा सकती है जो आपकी डिस्कवरी प्रोफ़ाइल पर पहले से सक्षम हैं।',
  openDiscoveryProfile: 'डिस्कवरी प्रोफ़ाइल खोलें',
  service: 'सेवा', starts: 'शुरू', ends: 'समाप्त',
  removeWindow: 'उपलब्धता विंडो हटाएँ',
  empty: 'कोई आगामी उपलब्धता प्रकाशित नहीं है। यह सुरक्षित है: डिस्कवरी सत्यापित थेरेपिस्ट को दिखा सकती है, लेकिन अपॉइंटमेंट उपलब्धता गढ़ नहीं सकती।',
  addAvailability: 'उपलब्धता जोड़ें', saving: 'सहेजा जा रहा है…', saveAvailability: 'उपलब्धता सहेजें',
  futureWindowsTitle: 'स्पष्ट भविष्य की विंडो',
  futureWindowsIntro: 'PhysioBill सेवा मोड, विज़िट या प्रोफ़ाइल स्थिति से उपलब्धता का अनुमान लगाने के बजाय स्पष्ट टाइमस्टैम्प सहेजता है।',
  noBookingTitle: 'अभी बुकिंग प्राधिकरण नहीं',
  noBookingIntro: 'विंडो प्रकाशित करने से अपॉइंटमेंट, उपचार एपिसोड, क्लिनिकल रिकॉर्ड, इनवॉइस या भुगतान नहीं बनता।',
};

const GU: Record<MessageKey, string> = {
  ...EN,
  loadError: 'થેરાપિસ્ટની ઉપલબ્ધતા લોડ થઈ શકી નથી.',
  tooManyWindows: 'એક સમયે વધુમાં વધુ 32 આગામી ઉપલબ્ધતા વિન્ડો રાખો.',
  disabledMode: 'દરેક ઉપલબ્ધતા વિન્ડોમાં હાલમાં સક્રિય સેવા મોડ જ હોવો જોઈએ.',
  missingTimes: 'દરેક વિન્ડો માટે શરૂઆત અને અંતનો સમય પૂર્ણ કરો.',
  endBeforeStart: 'દરેક ઉપલબ્ધતા વિન્ડોનો અંત તેની શરૂઆત પછી હોવો જોઈએ.',
  tooLong: 'એક ઉપલબ્ધતા વિન્ડો આઠ કલાકથી વધુ હોઈ શકતી નથી.',
  mustBeFuture: 'ઉપલબ્ધતા ભવિષ્યમાં પૂર્ણ થવી જોઈએ.',
  tooFarAhead: 'ઉપલબ્ધતા 180 દિવસથી વધુ આગળ પ્રકાશિત કરી શકાતી નથી.',
  duplicateWindow: 'સાચવતા પહેલાં ડુપ્લિકેટ ઉપલબ્ધતા વિન્ડો દૂર કરો.',
  unavailable: 'ઉપલબ્ધતા હાલમાં ઉપલબ્ધ નથી.',
  saved: 'ઉપલબ્ધતા સાચવાઈ.',
  saveError: 'થેરાપિસ્ટની ઉપલબ્ધતા સાચવી શકાઈ નથી.',
  kicker: 'દર્દી શોધ',
  title: 'વાસ્તવિક આગામી ઉપલબ્ધતા પ્રકાશિત કરો.',
  intro: 'આ સ્પષ્ટ ભવિષ્યની સમય વિન્ડો છે, બુકિંગ નહીં. માત્ર ઉપલબ્ધતા પરથી દર્દી સારવાર બુક કરી શકતો નથી, તમારા કાર્યક્ષેત્રમાં પ્રવેશ મેળવી શકતો નથી અને ક્લિનિકલ અથવા નાણાકીય ઍક્સેસ મેળવી શકતો નથી.',
  authorityKicker: 'ઉપલબ્ધતા અધિકાર',
  upcomingWindows: 'આગામી વિન્ડો',
  timezonePrefix: 'સમય સંપૂર્ણ ટાઇમસ્ટેમ્પ તરીકે સાચવાય છે અને આ ઉપકરણના ટાઇમઝોન સાથે દર્શાવવામાં આવે છે:',
  discoveryProfile: 'ડિસ્કવરી પ્રોફાઇલ',
  enableModeTitle: 'પહેલા સેવા મોડ સક્રિય કરો',
  enableModeIntro: 'ઉપલબ્ધતા માત્ર તમારી ડિસ્કવરી પ્રોફાઇલ પર પહેલેથી સક્રિય Home visit, Clinic visit અથવા Telephysiotherapy મોડ માટે પ્રકાશિત કરી શકાય છે.',
  openDiscoveryProfile: 'ડિસ્કવરી પ્રોફાઇલ ખોલો',
  service: 'સેવા', starts: 'શરૂઆત', ends: 'અંત',
  removeWindow: 'ઉપલબ્ધતા વિન્ડો દૂર કરો',
  empty: 'કોઈ આગામી ઉપલબ્ધતા પ્રકાશિત નથી. આ સુરક્ષિત છે: ડિસ્કવરી ચકાસાયેલ થેરાપિસ્ટ બતાવી શકે છે, પરંતુ અપોઇન્ટમેન્ટ ઉપલબ્ધતા બનાવી શકતી નથી.',
  addAvailability: 'ઉપલબ્ધતા ઉમેરો', saving: 'સાચવાઈ રહ્યું છે…', saveAvailability: 'ઉપલબ્ધતા સાચવો',
  futureWindowsTitle: 'સ્પષ્ટ ભવિષ્યની વિન્ડો',
  futureWindowsIntro: 'PhysioBill સેવા મોડ, મુલાકાત અથવા પ્રોફાઇલ સ્થિતિ પરથી અંદાજ લગાવવાને બદલે સ્પષ્ટ ટાઇમસ્ટેમ્પ સાચવે છે.',
  noBookingTitle: 'હજુ બુકિંગ અધિકાર નથી',
  noBookingIntro: 'વિન્ડો પ્રકાશિત કરવાથી અપોઇન્ટમેન્ટ, સારવાર એપિસોડ, ક્લિનિકલ રેકોર્ડ, ઇનવોઇસ અથવા ચુકવણી બનતી નથી.',
};

const CATALOG: Record<SupportedLocale, Record<MessageKey, string>> = {
  'en-IN': EN,
  'hi-IN': HI,
  'gu-IN': GU,
};

export function therapistAvailabilityMessage(locale: SupportedLocale, key: MessageKey) {
  return CATALOG[locale]?.[key] ?? EN[key];
}
