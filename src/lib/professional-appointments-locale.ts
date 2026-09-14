import type { SupportedLocale } from '@/lib/locale';

type MessageKey =
  | 'statusRequested' | 'statusAccepted' | 'statusRejected' | 'statusCancelled'
  | 'loadError' | 'resolveError' | 'cancelConfirm' | 'cancelError'
  | 'chooseChartError' | 'chartGoneError' | 'linkConfirmPrefix' | 'linkConfirmSuffix'
  | 'linkSuccess' | 'linkError' | 'nameRequired' | 'createConfirmPrefix' | 'createConfirmSuffix'
  | 'createSuccess' | 'createError' | 'rejectSuccess' | 'rejectError'
  | 'kicker' | 'title' | 'intro' | 'loading' | 'saving'
  | 'clinicalTitle' | 'clinicalIntro' | 'patientRequestedConnection' | 'selectChart'
  | 'chooseDeliberately' | 'linkSelected' | 'createNewChart' | 'rejectConnection'
  | 'newChartTitle' | 'newChartIntro' | 'patientName' | 'phone' | 'email' | 'age' | 'sex'
  | 'occupation' | 'clinicalCategory' | 'condition' | 'address' | 'notes' | 'createAndAccept'
  | 'manageAvailability' | 'refresh' | 'empty' | 'platformPatientNote'
  | 'homeAreaTitle' | 'homeAreaMissing' | 'homeAreaDisclaimer' | 'accept' | 'reject'
  | 'cancelling' | 'cancelAppointment' | 'cancelledFutureNote';

const EN: Record<MessageKey, string> = {
  statusRequested: 'Awaiting your response', statusAccepted: 'Accepted', statusRejected: 'Rejected', statusCancelled: 'Cancelled',
  loadError: 'Unable to load scheduling or clinical connection requests right now.',
  resolveError: 'This request could not be resolved. Refresh the page; the slot or request state may have changed.',
  cancelConfirm: 'Cancel this accepted appointment? The original appointment will remain in scheduling history, and the slot will not be reopened automatically.',
  cancelError: 'This accepted appointment could not be cancelled. It may already be cancelled or past its scheduled start time.',
  chooseChartError: 'Choose the correct existing therapist-owned clinical chart first. Never guess or link by name alone.',
  chartGoneError: 'The selected clinical chart is no longer available. Refresh and choose again.',
  linkConfirmPrefix: 'Link', linkConfirmSuffix: 'Only continue if you have verified that this is the same patient. This cannot be treated as an automatic identity match.',
  linkSuccess: 'Clinical connection accepted for the deliberately selected therapist-owned chart. Scheduling history remains separate.',
  linkError: 'The clinical connection could not be accepted. No fallback or automatic chart match was performed.',
  nameRequired: 'Enter the patient name after verifying it with the patient before creating a new clinical chart.',
  createConfirmPrefix: 'Create a new therapist-owned clinical chart for', createConfirmSuffix: 'and accept this clinical connection? This creates a new chart only; it does not merge or copy another therapist\'s records.',
  createSuccess: 'A new therapist-owned clinical chart was created and linked through the explicit patient-requested connection. No other therapist chart was merged or copied.',
  createError: 'The new clinical chart could not be created or linked. No partial chart/link fallback was accepted. Refresh before trying again.',
  rejectSuccess: 'Clinical connection request rejected. No chart or clinical access was created.', rejectError: 'The clinical connection request could not be rejected. Refresh and try again.',
  kicker: 'Scheduling requests', title: 'Patient appointment requests',
  intro: 'Accept or reject scheduling independently. A patient-requested clinical connection can be linked to a verified existing chart or used to create a new therapist-owned chart only after deliberate confirmation.',
  loading: 'Loading appointment and clinical connection requests.', saving: 'Saving your change.',
  clinicalTitle: 'Clinical connection requests', clinicalIntro: 'PAT identifies the platform patient, not your clinical chart. Link only after independently confirming the correct chart. If no correct chart exists, create a new owned chart from verified demographics instead of choosing a different patient.',
  patientRequestedConnection: 'Patient-requested connection', selectChart: 'Select a verified matching existing clinical chart', chooseDeliberately: 'Do not auto-match — choose deliberately',
  linkSelected: 'Link selected chart', createNewChart: 'Create new chart', rejectConnection: 'Reject connection', newChartTitle: 'Create a new therapist-owned clinical chart',
  newChartIntro: 'Verify these details directly with the patient. This form does not import another therapist\'s chart and does not make PAT the chart identifier.',
  patientName: 'Patient name', phone: 'Phone', email: 'Email', age: 'Age', sex: 'Sex', occupation: 'Occupation', clinicalCategory: 'Clinical category', condition: 'Condition / reason for care', address: 'Address', notes: 'Initial administrative note (optional)', createAndAccept: 'Create chart & accept connection',
  manageAvailability: 'Manage availability', refresh: 'Refresh', empty: 'No patient appointment requests are waiting here.', platformPatientNote: 'Platform patient identifier · not a clinical chart identifier',
  homeAreaTitle: 'Declared home-visit service area', homeAreaMissing: 'No coarse service-area snapshot is available for this scheduling record.', homeAreaDisclaimer: 'Scheduling evidence only. This is not an exact address, GPS/attendance proof, identity evidence, clinical access, treatment evidence, invoice authority, or payment proof.',
  accept: 'Accept', reject: 'Reject', cancelling: 'Cancelling…', cancelAppointment: 'Cancel appointment', cancelledFutureNote: 'This time remains cancelled. Publish availability deliberately if you want patients to request a replacement time.',
};

const HI: Record<MessageKey, string> = {
  ...EN,
  statusRequested: 'आपकी प्रतिक्रिया की प्रतीक्षा', statusAccepted: 'स्वीकृत', statusRejected: 'अस्वीकृत', statusCancelled: 'रद्द',
  kicker: 'शेड्यूलिंग अनुरोध', title: 'रोगी अपॉइंटमेंट अनुरोध',
  intro: 'शेड्यूलिंग को स्वतंत्र रूप से स्वीकार या अस्वीकार करें। रोगी द्वारा मांगा गया क्लिनिकल कनेक्शन केवल सोच-समझकर पुष्टि के बाद सही मौजूदा चार्ट से जोड़ा या नया आपके स्वामित्व वाला चार्ट बनाकर स्वीकार किया जा सकता है।',
  loading: 'अपॉइंटमेंट और क्लिनिकल कनेक्शन अनुरोध लोड हो रहे हैं।', saving: 'बदलाव सहेजा जा रहा है।',
  clinicalTitle: 'क्लिनिकल कनेक्शन अनुरोध', clinicalIntro: 'PAT प्लेटफ़ॉर्म रोगी की पहचान करता है, आपके क्लिनिकल चार्ट की नहीं। सही चार्ट की स्वतंत्र पुष्टि के बाद ही लिंक करें। सही चार्ट न हो तो सत्यापित जनसांख्यिकीय जानकारी से नया स्वामित्व वाला चार्ट बनाएं।',
  patientRequestedConnection: 'रोगी द्वारा अनुरोधित कनेक्शन', selectChart: 'सत्यापित मेल खाता मौजूदा क्लिनिकल चार्ट चुनें', chooseDeliberately: 'ऑटो-मैच न करें — सोचकर चुनें',
  linkSelected: 'चुना चार्ट लिंक करें', createNewChart: 'नया चार्ट बनाएं', rejectConnection: 'कनेक्शन अस्वीकार करें', newChartTitle: 'नया थेरेपिस्ट-स्वामित्व वाला क्लिनिकल चार्ट बनाएं',
  newChartIntro: 'इन विवरणों की रोगी से सीधे पुष्टि करें। यह फॉर्म किसी दूसरे थेरेपिस्ट का चार्ट आयात नहीं करता और PAT को चार्ट पहचानकर्ता नहीं बनाता।',
  patientName: 'रोगी का नाम', phone: 'फ़ोन', email: 'ईमेल', age: 'आयु', sex: 'लिंग', occupation: 'व्यवसाय', clinicalCategory: 'क्लिनिकल श्रेणी', condition: 'स्थिति / देखभाल का कारण', address: 'पता', notes: 'प्रारंभिक प्रशासनिक नोट (वैकल्पिक)', createAndAccept: 'चार्ट बनाएं और कनेक्शन स्वीकार करें',
  manageAvailability: 'उपलब्धता प्रबंधित करें', refresh: 'रीफ़्रेश', empty: 'यहाँ कोई रोगी अपॉइंटमेंट अनुरोध प्रतीक्षा में नहीं है।', platformPatientNote: 'प्लेटफ़ॉर्म रोगी पहचानकर्ता · क्लिनिकल चार्ट पहचानकर्ता नहीं',
  homeAreaTitle: 'घोषित होम-विज़िट सेवा क्षेत्र', homeAreaMissing: 'इस शेड्यूलिंग रिकॉर्ड के लिए कोई मोटा सेवा-क्षेत्र स्नैपशॉट उपलब्ध नहीं है।', homeAreaDisclaimer: 'केवल शेड्यूलिंग प्रमाण। यह सटीक पता, GPS/उपस्थिति प्रमाण, पहचान, क्लिनिकल एक्सेस, उपचार प्रमाण, इनवॉइस अधिकार या भुगतान प्रमाण नहीं है।',
  accept: 'स्वीकार करें', reject: 'अस्वीकार करें', cancelling: 'रद्द किया जा रहा है…', cancelAppointment: 'अपॉइंटमेंट रद्द करें', cancelledFutureNote: 'यह समय रद्द ही रहेगा। यदि रोगियों से नया समय अनुरोध करवाना है तो उपलब्धता जानबूझकर प्रकाशित करें।',
};

const GU: Record<MessageKey, string> = {
  ...EN,
  statusRequested: 'તમારા પ્રતિભાવની રાહમાં', statusAccepted: 'સ્વીકારેલ', statusRejected: 'નકારેલ', statusCancelled: 'રદ',
  kicker: 'શેડ્યૂલિંગ વિનંતીઓ', title: 'દર્દીની અપોઇન્ટમેન્ટ વિનંતીઓ',
  intro: 'શેડ્યૂલિંગને સ્વતંત્ર રીતે સ્વીકારો અથવા નકારો. દર્દી દ્વારા માંગાયેલ ક્લિનિકલ કનેક્શન માત્ર વિચારપૂર્વકની પુષ્ટિ પછી સાચા હાલના ચાર્ટ સાથે જોડવું અથવા નવો તમારા માલિકીનો ચાર્ટ બનાવી સ્વીકારવું.',
  loading: 'અપોઇન્ટમેન્ટ અને ક્લિનિકલ કનેક્શન વિનંતીઓ લોડ થઈ રહી છે.', saving: 'ફેરફાર સાચવાઈ રહ્યો છે.',
  clinicalTitle: 'ક્લિનિકલ કનેક્શન વિનંતીઓ', clinicalIntro: 'PAT પ્લેટફોર્મ દર્દીને ઓળખે છે, તમારા ક્લિનિકલ ચાર્ટને નહીં. યોગ્ય ચાર્ટની સ્વતંત્ર પુષ્ટિ કર્યા પછી જ લિંક કરો. યોગ્ય ચાર્ટ ન હોય તો ચકાસેલી વિગતો પરથી નવો માલિકીનો ચાર્ટ બનાવો.',
  patientRequestedConnection: 'દર્દી દ્વારા માંગાયેલ કનેક્શન', selectChart: 'ચકાસાયેલ મેળ ખાતો હાલનો ક્લિનિકલ ચાર્ટ પસંદ કરો', chooseDeliberately: 'ઓટો-મેચ ન કરો — વિચારપૂર્વક પસંદ કરો',
  linkSelected: 'પસંદ કરેલ ચાર્ટ લિંક કરો', createNewChart: 'નવો ચાર્ટ બનાવો', rejectConnection: 'કનેક્શન નકારો', newChartTitle: 'નવો થેરાપિસ્ટ-માલિકીનો ક્લિનિકલ ચાર્ટ બનાવો',
  newChartIntro: 'આ વિગતો દર્દી સાથે સીધી ચકાસો. આ ફોર્મ બીજા થેરાપિસ્ટનો ચાર્ટ આયાત કરતું નથી અને PAT ને ચાર્ટ ઓળખ બનાવતું નથી.',
  patientName: 'દર્દીનું નામ', phone: 'ફોન', email: 'ઇમેઇલ', age: 'ઉંમર', sex: 'લિંગ', occupation: 'વ્યવસાય', clinicalCategory: 'ક્લિનિકલ શ્રેણી', condition: 'સ્થિતિ / સારવારનું કારણ', address: 'સરનામું', notes: 'પ્રારંભિક વહીવટી નોંધ (વૈકલ્પિક)', createAndAccept: 'ચાર્ટ બનાવો અને કનેક્શન સ્વીકારો',
  manageAvailability: 'ઉપલબ્ધતા મેનેજ કરો', refresh: 'રીફ્રેશ', empty: 'અહીં કોઈ દર્દીની અપોઇન્ટમેન્ટ વિનંતી રાહમાં નથી.', platformPatientNote: 'પ્લેટફોર્મ દર્દી ઓળખ · ક્લિનિકલ ચાર્ટ ઓળખ નહીં',
  homeAreaTitle: 'જાહેર કરેલ હોમ-વિઝિટ સેવા વિસ્તાર', homeAreaMissing: 'આ શેડ્યૂલિંગ રેકોર્ડ માટે કોઈ coarse સેવા-વિસ્તાર snapshot ઉપલબ્ધ નથી.', homeAreaDisclaimer: 'ફક્ત શેડ્યૂલિંગ પુરાવો. આ ચોક્કસ સરનામું, GPS/હાજરી પુરાવો, ઓળખ, ક્લિનિકલ ઍક્સેસ, સારવાર પુરાવો, ઇનવૉઇસ અધિકાર અથવા ચુકવણી પુરાવો નથી.',
  accept: 'સ્વીકારો', reject: 'નકારો', cancelling: 'રદ થઈ રહ્યું છે…', cancelAppointment: 'અપોઇન્ટમેન્ટ રદ કરો', cancelledFutureNote: 'આ સમય રદ જ રહેશે. દર્દીઓથી બદલી સમયની વિનંતી જોઈએ તો ઉપલબ્ધતા જાણપૂર્વક પ્રકાશિત કરો.',
};

const CATALOG: Record<SupportedLocale, Record<MessageKey, string>> = { 'en-IN': EN, 'hi-IN': HI, 'gu-IN': GU };

export function professionalAppointmentsMessage(locale: SupportedLocale, key: MessageKey): string {
  return CATALOG[locale]?.[key] ?? EN[key];
}
