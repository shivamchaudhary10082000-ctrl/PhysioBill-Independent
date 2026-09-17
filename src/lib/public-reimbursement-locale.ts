import { DEFAULT_LOCALE, type SupportedLocale } from '@/lib/locale';

export type PublicReimbursementCopy = {
  verificationLabel: string;
  checkingTitle: string;
  checkingDescription: string;
  verifiedTitle: string;
  verifiedDescription: string;
  invoice: string;
  invoiceTotal: string;
  invoiceIssued: string;
  documentIssued: string;
  physiotherapist: string;
  verifiedQualification: string;
  verifiedRegistration: string;
  professionalVerificationRecorded: string;
  disclaimer: string;
  notVerifiedTitle: string;
  invalidToken: string;
  noMatch: string;
  notRecorded: string;
  privacyNotice: string;
};

const copy: Record<SupportedLocale, PublicReimbursementCopy> = {
  'en-IN': {
    verificationLabel: 'Document verification',
    checkingTitle: 'Checking document record…',
    checkingDescription: 'Verifying the token against the PhysioBill issuance record.',
    verifiedTitle: 'Verified PhysioBill document',
    verifiedDescription: 'This token matches an immutable reimbursement-document record created from the finalized invoice snapshot shown below.',
    invoice: 'Invoice',
    invoiceTotal: 'Invoice total',
    invoiceIssued: 'Invoice issued',
    documentIssued: 'Document issued',
    physiotherapist: 'Physiotherapist',
    verifiedQualification: 'Verified qualification',
    verifiedRegistration: 'Verified registration',
    professionalVerificationRecorded: 'Professional verification recorded',
    disclaimer: 'Verification confirms that this token matches the PhysioBill record and the professional credentials captured when the invoice was finalized. It does not represent insurer approval, payment confirmation, reimbursement eligibility, or a legal guarantee.',
    notVerifiedTitle: 'Document not verified',
    invalidToken: 'The supplied verification token is invalid, unknown, or could not be verified.',
    noMatch: 'No matching PhysioBill reimbursement-document record was found.',
    notRecorded: 'Not recorded',
    privacyNotice: 'No patient identity, clinical record, payment account, or private contact information is disclosed by this verification page.',
  },
  'hi-IN': {
    verificationLabel: 'दस्तावेज़ सत्यापन',
    checkingTitle: 'दस्तावेज़ रिकॉर्ड जांचा जा रहा है…',
    checkingDescription: 'टोकन का PhysioBill जारीकरण रिकॉर्ड से सत्यापन किया जा रहा है।',
    verifiedTitle: 'सत्यापित PhysioBill दस्तावेज़',
    verifiedDescription: 'यह टोकन नीचे दिखाए गए अंतिम इनवॉइस स्नैपशॉट से बने अपरिवर्तनीय प्रतिपूर्ति-दस्तावेज़ रिकॉर्ड से मेल खाता है।',
    invoice: 'इनवॉइस',
    invoiceTotal: 'इनवॉइस कुल',
    invoiceIssued: 'इनवॉइस जारी',
    documentIssued: 'दस्तावेज़ जारी',
    physiotherapist: 'फिजियोथेरेपिस्ट',
    verifiedQualification: 'सत्यापित योग्यता',
    verifiedRegistration: 'सत्यापित पंजीकरण',
    professionalVerificationRecorded: 'पेशेवर सत्यापन दर्ज',
    disclaimer: 'सत्यापन केवल यह पुष्टि करता है कि यह टोकन PhysioBill रिकॉर्ड और इनवॉइस अंतिम किए जाने के समय दर्ज पेशेवर प्रमाणों से मेल खाता है। यह बीमाकर्ता की स्वीकृति, भुगतान पुष्टि, प्रतिपूर्ति पात्रता या कानूनी गारंटी नहीं है।',
    notVerifiedTitle: 'दस्तावेज़ सत्यापित नहीं हुआ',
    invalidToken: 'दिया गया सत्यापन टोकन अमान्य, अज्ञात है या सत्यापित नहीं किया जा सका।',
    noMatch: 'कोई मेल खाता PhysioBill प्रतिपूर्ति-दस्तावेज़ रिकॉर्ड नहीं मिला।',
    notRecorded: 'दर्ज नहीं',
    privacyNotice: 'इस सत्यापन पेज पर रोगी की पहचान, क्लिनिकल रिकॉर्ड, भुगतान खाता या निजी संपर्क जानकारी प्रकट नहीं की जाती।',
  },
  'gu-IN': {
    verificationLabel: 'દસ્તાવેજ ચકાસણી',
    checkingTitle: 'દસ્તાવેજ રેકોર્ડ તપાસાઈ રહ્યો છે…',
    checkingDescription: 'ટોકનને PhysioBillના ઇશ્યુઅન્સ રેકોર્ડ સામે ચકાસવામાં આવી રહ્યું છે.',
    verifiedTitle: 'ચકાસાયેલ PhysioBill દસ્તાવેજ',
    verifiedDescription: 'આ ટોકન નીચે દર્શાવેલા અંતિમ ઇન્વૉઇસ સ્નેપશોટ પરથી બનેલા અપરિવર્તનીય રિઇમ્બર્સમેન્ટ-દસ્તાવેજ રેકોર્ડ સાથે મેળ ખાય છે.',
    invoice: 'ઇન્વૉઇસ',
    invoiceTotal: 'ઇન્વૉઇસ કુલ',
    invoiceIssued: 'ઇન્વૉઇસ જારી',
    documentIssued: 'દસ્તાવેજ જારી',
    physiotherapist: 'ફિઝિયોથેરાપિસ્ટ',
    verifiedQualification: 'ચકાસાયેલ લાયકાત',
    verifiedRegistration: 'ચકાસાયેલ નોંધણી',
    professionalVerificationRecorded: 'વ્યાવસાયિક ચકાસણી નોંધાઈ',
    disclaimer: 'ચકાસણી માત્ર એટલું પુષ્ટિ કરે છે કે આ ટોકન PhysioBill રેકોર્ડ અને ઇન્વૉઇસ અંતિમ કરવામાં આવ્યો ત્યારે કૅપ્ચર કરાયેલા વ્યાવસાયિક પ્રમાણપત્રો સાથે મેળ ખાય છે. તે ઇન્શ્યોરરની મંજૂરી, ચુકવણીની પુષ્ટિ, રિઇમ્બર્સમેન્ટ પાત્રતા અથવા કાનૂની ગેરંટી નથી.',
    notVerifiedTitle: 'દસ્તાવેજ ચકાસાયો નથી',
    invalidToken: 'આપેલ ચકાસણી ટોકન અમાન્ય, અજ્ઞાત છે અથવા ચકાસી શકાયો નથી.',
    noMatch: 'મેળ ખાતો PhysioBill રિઇમ્બર્સમેન્ટ-દસ્તાવેજ રેકોર્ડ મળ્યો નથી.',
    notRecorded: 'નોંધાયેલ નથી',
    privacyNotice: 'આ ચકાસણી પેજ દ્વારા દર્દીની ઓળખ, ક્લિનિકલ રેકોર્ડ, ચુકવણી ખાતું અથવા ખાનગી સંપર્ક માહિતી જાહેર થતી નથી.',
  },
};

export function publicReimbursementCopy(locale: SupportedLocale): PublicReimbursementCopy {
  return copy[locale] ?? copy[DEFAULT_LOCALE];
}

export function detectPublicLocale(languages: readonly string[] | undefined): SupportedLocale {
  for (const raw of languages ?? []) {
    const language = raw.toLowerCase();
    if (language === 'hi' || language.startsWith('hi-')) return 'hi-IN';
    if (language === 'gu' || language.startsWith('gu-')) return 'gu-IN';
    if (language === 'en' || language.startsWith('en-')) return 'en-IN';
  }
  return DEFAULT_LOCALE;
}
