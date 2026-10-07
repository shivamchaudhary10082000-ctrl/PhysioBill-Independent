import { DEFAULT_LOCALE, type SupportedLocale } from '@/lib/locale';

export type PatientAppointmentsMessageKey =
  | 'eyebrow' | 'title' | 'description' | 'findPhysio' | 'refresh' | 'loading' | 'empty'
  | 'statusRequested' | 'statusAccepted' | 'statusRejected' | 'statusCancelled'
  | 'homeAreaTitle' | 'homeAreaMissing' | 'homeAreaDisclaimer'
  | 'clinicalTitle' | 'clinicalLinked' | 'clinicalPending' | 'clinicalAvailable' | 'clinicalRequest'
  | 'working' | 'cancelAppointment' | 'cancelRequest' | 'loadingTimes' | 'hideTimes' | 'reschedule'
  | 'chooseTime' | 'noTimes' | 'request' | 'freshRequest' | 'findAnotherTime' | 'safetyNotice'
  | 'loadError' | 'cancelConfirm' | 'cancelledAcceptedNotice' | 'cancelledRequestNotice' | 'cancelError'
  | 'clinicalConfirm' | 'clinicalRequestedNotice' | 'clinicalError' | 'replacementLoadError'
  | 'rescheduleConfirm' | 'homeRescheduleConfirm' | 'rescheduleNotice' | 'homeRescheduleNotice'
  | 'rescheduleError' | 'homeRescheduleError' | 'homeRescheduleRule' | 'rescheduleRule';

const EN: Record<PatientAppointmentsMessageKey, string> = {
  eyebrow: 'Patient scheduling', title: 'Your appointment requests',
  description: 'Accepted future appointments can be cancelled or rescheduled here. Rescheduling creates a new linked request and never rewrites the original accepted time.',
  findPhysio: 'Find a physiotherapist', refresh: 'Refresh', loading: 'Loading appointment requests…', empty: 'You have no appointment requests yet.',
  statusRequested: 'Awaiting therapist', statusAccepted: 'Accepted', statusRejected: 'Not accepted', statusCancelled: 'Cancelled',
  homeAreaTitle: 'Declared home-visit service area', homeAreaMissing: 'No coarse service-area snapshot is available for this scheduling record.',
  homeAreaDisclaimer: 'Scheduling evidence only. This is not an exact address, GPS/attendance proof, identity evidence, clinical access, treatment evidence, invoice authority, or payment proof.',
  clinicalTitle: 'Clinical connection', clinicalLinked: 'Connected to a therapist-owned clinical chart through the separate consent/linkage workflow.',
  clinicalPending: 'Request sent. The therapist still has to deliberately accept linkage to one of their own clinical charts.',
  clinicalAvailable: 'An accepted appointment does not create a clinical chart. You may separately request a clinical connection with this therapist.',
  clinicalRequest: 'Request clinical connection', working: 'Working…', cancelAppointment: 'Cancel appointment', cancelRequest: 'Cancel request',
  loadingTimes: 'Loading times…', hideTimes: 'Hide times', reschedule: 'Reschedule', chooseTime: 'Choose another published time',
  noTimes: 'No different future times are currently published. Your existing scheduling record has not been changed.', request: 'Request',
  freshRequest: 'This pending request was cancelled before acceptance. Choose any new published time as a fresh request.', findAnotherTime: 'Find another time',
  safetyNotice: 'Scheduling cancellation or rescheduling grants no therapist chart, clinical, invoice, payment or account-linkage access. A patient-triggered clinical connection remains a separate database-controlled consent workflow.',
  loadError: 'Unable to load your appointment requests right now.',
  cancelConfirm: 'Cancel this accepted appointment? The original appointment will remain in scheduling history, and the slot will not reopen automatically.',
  cancelledAcceptedNotice: 'Appointment cancelled. Its original scheduling record remains in your history.', cancelledRequestNotice: 'Appointment request cancelled.',
  cancelError: 'This appointment could not be cancelled. It may already be resolved, cancelled, or past its scheduled start time.',
  clinicalConfirm: 'Request a clinical connection with this physiotherapist? This only asks the therapist to link your platform identity to a therapist-owned clinical chart. It does not itself create a chart, expose clinical records, or grant invoice/payment access.',
  clinicalRequestedNotice: 'Clinical connection requested. No clinical chart or record is shared unless the physiotherapist deliberately accepts the separate linkage request.',
  clinicalError: 'The clinical connection request could not be created. The appointment and all clinical/financial access remain unchanged.',
  replacementLoadError: 'Replacement times could not be loaded right now. Your existing appointment has not been changed.',
  rescheduleConfirm: 'Request {time} instead? Your current accepted appointment will be cancelled only if this replacement request is created successfully.',
  homeRescheduleConfirm: 'Request {time} instead? PhysioBill will revalidate the same therapist service area and create a fresh immutable coarse-area snapshot with the replacement. Your current accepted appointment is cancelled only if the whole replacement transaction succeeds.',
  rescheduleNotice: 'Reschedule request sent. The original accepted appointment was preserved in history and cancelled; the new time now awaits therapist acceptance.',
  homeRescheduleNotice: 'Home-visit reschedule requested. The replacement carries a fresh immutable coarse service-area snapshot; the original scheduling record remains in history and is cancelled only as part of the same successful transaction.',
  rescheduleError: 'This replacement time could not be requested. Your existing appointment was not changed unless it had already been cancelled earlier.',
  homeRescheduleError: 'This home-visit replacement could not be requested. If the previously declared therapist service area is no longer active, choose a fresh home-visit booking instead. The existing appointment remains unchanged unless it had already been cancelled earlier.',
  homeRescheduleRule: 'Only the same verified physiotherapist and home-visit service type can replace this appointment. The previously declared coarse therapist service area must still be active; PhysioBill creates a fresh immutable snapshot and cancels the current appointment only if the entire transaction succeeds.',
  rescheduleRule: 'Only the same verified physiotherapist and service type can replace this appointment. Your current accepted appointment is cancelled only when a valid replacement request is created.',
};

const HI: Record<PatientAppointmentsMessageKey, string> = {
  ...EN, eyebrow: 'रोगी अपॉइंटमेंट', title: 'आपके अपॉइंटमेंट अनुरोध', description: 'स्वीकृत भविष्य के अपॉइंटमेंट यहां रद्द या पुनर्निर्धारित किए जा सकते हैं। पुनर्निर्धारण नया लिंक किया हुआ अनुरोध बनाता है और मूल समय को नहीं बदलता।',
  findPhysio: 'फिजियोथेरेपिस्ट खोजें', refresh: 'रिफ्रेश', loading: 'अपॉइंटमेंट अनुरोध लोड हो रहे हैं…', empty: 'अभी कोई अपॉइंटमेंट अनुरोध नहीं है।',
  statusRequested: 'थेरेपिस्ट की प्रतीक्षा', statusAccepted: 'स्वीकृत', statusRejected: 'स्वीकृत नहीं', statusCancelled: 'रद्द',
  homeAreaTitle: 'घोषित होम-विज़िट सेवा क्षेत्र', homeAreaMissing: 'इस शेड्यूल रिकॉर्ड के लिए सेवा-क्षेत्र स्नैपशॉट उपलब्ध नहीं है।',
  homeAreaDisclaimer: 'केवल शेड्यूलिंग प्रमाण। यह सटीक पता, GPS/उपस्थिति, पहचान, क्लिनिकल एक्सेस, उपचार, इनवॉइस या भुगतान प्रमाण नहीं है।',
  clinicalTitle: 'क्लिनिकल कनेक्शन', clinicalLinked: 'अलग सहमति/लिंकिंग वर्कफ़्लो के माध्यम से थेरेपिस्ट के क्लिनिकल चार्ट से जुड़ा है।',
  clinicalPending: 'अनुरोध भेजा गया है। थेरेपिस्ट को अभी भी अपने क्लिनिकल चार्ट से लिंक स्वीकार करना होगा।',
  clinicalAvailable: 'स्वीकृत अपॉइंटमेंट अपने-आप क्लिनिकल चार्ट नहीं बनाता। आप अलग से क्लिनिकल कनेक्शन का अनुरोध कर सकते हैं।',
  clinicalRequest: 'क्लिनिकल कनेक्शन का अनुरोध', working: 'काम जारी…', cancelAppointment: 'अपॉइंटमेंट रद्द करें', cancelRequest: 'अनुरोध रद्द करें', loadingTimes: 'समय लोड हो रहे हैं…', hideTimes: 'समय छिपाएं', reschedule: 'समय बदलें', chooseTime: 'दूसरा उपलब्ध समय चुनें', noTimes: 'अभी कोई अलग भविष्य का समय उपलब्ध नहीं है। मौजूदा रिकॉर्ड नहीं बदला है।', request: 'अनुरोध', freshRequest: 'यह लंबित अनुरोध स्वीकृति से पहले रद्द हुआ था। नया प्रकाशित समय नया अनुरोध होगा।', findAnotherTime: 'दूसरा समय खोजें', safetyNotice: 'रद्द या पुनर्निर्धारित करने से क्लिनिकल, चार्ट, इनवॉइस, भुगतान या अकाउंट-लिंकिंग एक्सेस नहीं मिलता। क्लिनिकल कनेक्शन अलग डेटाबेस-नियंत्रित सहमति वर्कफ़्लो है।',
  loadError: 'अभी आपके अपॉइंटमेंट अनुरोध लोड नहीं हो सके।', cancelConfirm: 'यह स्वीकृत अपॉइंटमेंट रद्द करें? मूल रिकॉर्ड शेड्यूल इतिहास में रहेगा और स्लॉट अपने-आप फिर नहीं खुलेगा।', cancelledAcceptedNotice: 'अपॉइंटमेंट रद्द हुआ। मूल शेड्यूल रिकॉर्ड इतिहास में सुरक्षित है।', cancelledRequestNotice: 'अपॉइंटमेंट अनुरोध रद्द हुआ।', cancelError: 'यह अपॉइंटमेंट रद्द नहीं हो सका। यह पहले ही निपटाया, रद्द या शुरू हो चुका हो सकता है।', clinicalConfirm: 'इस फिजियोथेरेपिस्ट से क्लिनिकल कनेक्शन का अनुरोध करें? इससे केवल आपकी प्लेटफ़ॉर्म पहचान को थेरेपिस्ट के चार्ट से जोड़ने का अनुरोध जाता है; इससे चार्ट, रिकॉर्ड, इनवॉइस या भुगतान एक्सेस अपने-आप नहीं मिलता।', clinicalRequestedNotice: 'क्लिनिकल कनेक्शन का अनुरोध भेजा गया। अलग लिंकिंग अनुरोध थेरेपिस्ट द्वारा स्वीकार किए बिना कोई क्लिनिकल रिकॉर्ड साझा नहीं होगा।', clinicalError: 'क्लिनिकल कनेक्शन अनुरोध नहीं बन सका। अपॉइंटमेंट और सभी क्लिनिकल/वित्तीय एक्सेस अपरिवर्तित हैं।', replacementLoadError: 'नए समय अभी लोड नहीं हो सके। आपका मौजूदा अपॉइंटमेंट नहीं बदला है।', rescheduleConfirm: '{time} का अनुरोध करें? नया अनुरोध सफल बनने पर ही वर्तमान अपॉइंटमेंट रद्द होगा।', homeRescheduleConfirm: '{time} का अनुरोध करें? PhysioBill उसी थेरेपिस्ट सेवा क्षेत्र को फिर सत्यापित करेगा और नया अपरिवर्तनीय क्षेत्र स्नैपशॉट बनाएगा। पूरा ट्रांज़ैक्शन सफल होने पर ही मौजूदा अपॉइंटमेंट रद्द होगा।', rescheduleNotice: 'समय बदलने का अनुरोध भेजा गया। मूल रिकॉर्ड इतिहास में सुरक्षित है और नया समय थेरेपिस्ट की स्वीकृति की प्रतीक्षा में है।', homeRescheduleNotice: 'होम-विज़िट पुनर्निर्धारण अनुरोध भेजा गया। नए अनुरोध के साथ नया अपरिवर्तनीय सेवा-क्षेत्र स्नैपशॉट है।', rescheduleError: 'नया समय अनुरोध नहीं किया जा सका। मौजूदा अपॉइंटमेंट अपरिवर्तित है, जब तक वह पहले ही रद्द न हुआ हो।', homeRescheduleError: 'होम-विज़िट का नया समय अनुरोध नहीं किया जा सका। यदि पुराना सेवा क्षेत्र निष्क्रिय है तो नई होम-विज़िट बुकिंग चुनें।', homeRescheduleRule: 'केवल वही सत्यापित फिजियोथेरेपिस्ट और होम-विज़िट सेवा प्रकार इस अपॉइंटमेंट को बदल सकते हैं। घोषित सेवा क्षेत्र सक्रिय रहना चाहिए और पूरा ट्रांज़ैक्शन सफल होना चाहिए।', rescheduleRule: 'केवल वही सत्यापित फिजियोथेरेपिस्ट और वही सेवा प्रकार इस अपॉइंटमेंट को बदल सकते हैं। वैध नया अनुरोध बनने पर ही वर्तमान अपॉइंटमेंट रद्द होगा।',
};

const GU: Record<PatientAppointmentsMessageKey, string> = {
  ...EN, eyebrow: 'દર્દી અપોઇન્ટમેન્ટ', title: 'તમારી અપોઇન્ટમેન્ટ વિનંતીઓ', description: 'સ્વીકારેલી ભવિષ્યની અપોઇન્ટમેન્ટ અહીં રદ અથવા ફરી સમયબદ્ધ કરી શકાય છે. ફરી સમયબદ્ધ કરવાથી નવો જોડાયેલ વિનંતી રેકોર્ડ બને છે અને મૂળ સમય બદલાતો નથી.',
  findPhysio: 'ફિઝિયોથેરાપિસ્ટ શોધો', refresh: 'રિફ્રેશ', loading: 'અપોઇન્ટમેન્ટ વિનંતીઓ લોડ થઈ રહી છે…', empty: 'હજુ કોઈ અપોઇન્ટમેન્ટ વિનંતી નથી.',
  statusRequested: 'થેરાપિસ્ટની રાહમાં', statusAccepted: 'સ્વીકારેલ', statusRejected: 'સ્વીકારેલ નથી', statusCancelled: 'રદ',
  homeAreaTitle: 'જાહેર કરેલ હોમ-વિઝિટ સેવા વિસ્તાર', homeAreaMissing: 'આ શેડ્યૂલ રેકોર્ડ માટે સેવા-વિસ્તાર સ્નેપશોટ ઉપલબ્ધ નથી.', homeAreaDisclaimer: 'માત્ર શેડ્યૂલિંગ પુરાવો. આ ચોક્કસ સરનામું, GPS/હાજરી, ઓળખ, ક્લિનિકલ ઍક્સેસ, સારવાર, ઇનવૉઇસ અથવા ચુકવણીનો પુરાવો નથી.',
  clinicalTitle: 'ક્લિનિકલ કનેક્શન', clinicalLinked: 'અલગ સંમતિ/લિંકેજ પ્રક્રિયા દ્વારા થેરાપિસ્ટના ક્લિનિકલ ચાર્ટ સાથે જોડાયેલ છે.', clinicalPending: 'વિનંતી મોકલાઈ છે. થેરાપિસ્ટે હજુ પોતાના ક્લિનિકલ ચાર્ટ સાથે લિંક સ્વીકારવી પડશે.', clinicalAvailable: 'સ્વીકારેલી અપોઇન્ટમેન્ટ આપમેળે ક્લિનિકલ ચાર્ટ બનાવતી નથી. તમે અલગથી ક્લિનિકલ કનેક્શનની વિનંતી કરી શકો છો.', clinicalRequest: 'ક્લિનિકલ કનેક્શન વિનંતી', working: 'પ્રક્રિયા ચાલુ…', cancelAppointment: 'અપોઇન્ટમેન્ટ રદ કરો', cancelRequest: 'વિનંતી રદ કરો', loadingTimes: 'સમય લોડ થઈ રહ્યા છે…', hideTimes: 'સમય છુપાવો', reschedule: 'સમય બદલો', chooseTime: 'બીજો ઉપલબ્ધ સમય પસંદ કરો', noTimes: 'હાલ કોઈ અલગ ભવિષ્ય સમય ઉપલબ્ધ નથી. હાલનો રેકોર્ડ બદલાયો નથી.', request: 'વિનંતી', freshRequest: 'આ બાકી વિનંતી સ્વીકાર પહેલાં રદ થઈ હતી. નવો સમય નવી વિનંતી તરીકે જશે.', findAnotherTime: 'બીજો સમય શોધો', safetyNotice: 'રદ અથવા સમય બદલવાથી ક્લિનિકલ, ચાર્ટ, ઇનવૉઇસ, ચુકવણી અથવા અકાઉન્ટ-લિંકેજ ઍક્સેસ મળતી નથી. ક્લિનિકલ કનેક્શન અલગ ડેટાબેસ-નિયંત્રિત સંમતિ પ્રક્રિયા છે.', loadError: 'હાલ તમારી અપોઇન્ટમેન્ટ વિનંતીઓ લોડ થઈ શકી નથી.', cancelConfirm: 'આ સ્વીકારેલી અપોઇન્ટમેન્ટ રદ કરવી? મૂળ રેકોર્ડ શેડ્યૂલ ઇતિહાસમાં રહેશે અને સ્લોટ આપમેળે ફરી નહીં ખૂલે.', cancelledAcceptedNotice: 'અપોઇન્ટમેન્ટ રદ થઈ. મૂળ શેડ્યૂલ રેકોર્ડ ઇતિહાસમાં રહેશે.', cancelledRequestNotice: 'અપોઇન્ટમેન્ટ વિનંતી રદ થઈ.', cancelError: 'આ અપોઇન્ટમેન્ટ રદ થઈ શકી નથી. તે પહેલેથી નિર્ધારિત, રદ અથવા શરૂ થઈ ગઈ હોઈ શકે છે.', clinicalConfirm: 'આ ફિઝિયોથેરાપિસ્ટ સાથે ક્લિનિકલ કનેક્શનની વિનંતી કરવી? આ માત્ર તમારી પ્લેટફોર્મ ઓળખને થેરાપિસ્ટના ચાર્ટ સાથે જોડવાની વિનંતી છે; તે ચાર્ટ, રેકોર્ડ, ઇનવૉઇસ અથવા ચુકવણી ઍક્સેસ આપતું નથી.', clinicalRequestedNotice: 'ક્લિનિકલ કનેક્શન વિનંતી મોકલાઈ. થેરાપિસ્ટ અલગ લિંકેજ વિનંતી સ્વીકાર્યા વિના કોઈ ક્લિનિકલ રેકોર્ડ શેર નહીં થાય.', clinicalError: 'ક્લિનિકલ કનેક્શન વિનંતી બની શકી નથી. અપોઇન્ટમેન્ટ અને ક્લિનિકલ/નાણાકીય ઍક્સેસ બદલાયા નથી.', replacementLoadError: 'નવા સમય હાલ લોડ થઈ શક્યા નથી. હાલની અપોઇન્ટમેન્ટ બદલાઈ નથી.', rescheduleConfirm: '{time} માટે વિનંતી કરવી? નવો વિનંતી સફળ બન્યા પછી જ હાલની અપોઇન્ટમેન્ટ રદ થશે.', homeRescheduleConfirm: '{time} માટે વિનંતી કરવી? PhysioBill તે જ સેવા વિસ્તારને ફરી ચકાસશે અને નવો અચલ વિસ્તાર સ્નેપશોટ બનાવશે. સંપૂર્ણ ટ્રાન્ઝેક્શન સફળ થાય ત્યારે જ હાલની અપોઇન્ટમેન્ટ રદ થશે.', rescheduleNotice: 'સમય બદલવાની વિનંતી મોકલાઈ. મૂળ રેકોર્ડ ઇતિહાસમાં સુરક્ષિત છે અને નવો સમય થેરાપિસ્ટની સ્વીકૃતિની રાહમાં છે.', homeRescheduleNotice: 'હોમ-વિઝિટ સમય બદલવાની વિનંતી મોકલાઈ. નવા વિનંતી સાથે નવો અચલ સેવા-વિસ્તાર સ્નેપશોટ છે.', rescheduleError: 'નવો સમય વિનંતી થઈ શક્યો નથી. હાલની અપોઇન્ટમેન્ટ બદલાઈ નથી, જો તે પહેલેથી રદ ન થઈ હોય.', homeRescheduleError: 'હોમ-વિઝિટનો નવો સમય વિનંતી થઈ શક્યો નથી. જો અગાઉનો સેવા વિસ્તાર નિષ્ક્રિય હોય તો નવી હોમ-વિઝિટ બુકિંગ પસંદ કરો.', homeRescheduleRule: 'માત્ર એ જ ચકાસાયેલ ફિઝિયોથેરાપિસ્ટ અને હોમ-વિઝિટ સેવા પ્રકાર આ અપોઇન્ટમેન્ટ બદલી શકે છે. જાહેર કરેલો સેવા વિસ્તાર સક્રિય હોવો જોઈએ અને સંપૂર્ણ ટ્રાન્ઝેક્શન સફળ થવું જોઈએ.', rescheduleRule: 'માત્ર એ જ ચકાસાયેલ ફિઝિયોથેરાપિસ્ટ અને એ જ સેવા પ્રકાર આ અપોઇન્ટમેન્ટ બદલી શકે છે. માન્ય નવો વિનંતી બન્યા પછી જ હાલની અપોઇન્ટમેન્ટ રદ થશે.',
};

const ALL: Record<SupportedLocale, Record<PatientAppointmentsMessageKey, string>> = { 'en-IN': EN, 'hi-IN': HI, 'gu-IN': GU };

export function patientAppointmentsMessage(locale: SupportedLocale, key: PatientAppointmentsMessageKey, vars?: Record<string, string>): string {
  let value = (ALL[locale] ?? ALL[DEFAULT_LOCALE])[key] ?? ALL[DEFAULT_LOCALE][key];
  if (vars) for (const [name, replacement] of Object.entries(vars)) value = value.replaceAll(`{${name}}`, replacement);
  return value;
}
