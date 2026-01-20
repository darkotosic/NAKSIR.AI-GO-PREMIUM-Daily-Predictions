// Add new country mappings when a new league appears.

export const COUNTRY_TO_ISO2: Record<string, string> = {
  serbia: 'RS',
  croatia: 'HR',
  'bosnia and herzegovina': 'BA',
  montenegro: 'ME',
  'north macedonia': 'MK',
  slovenia: 'SI',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  'united kingdom': 'GB',
  germany: 'DE',
  france: 'FR',
  spain: 'ES',
  italy: 'IT',
  portugal: 'PT',
  netherlands: 'NL',
  belgium: 'BE',
  austria: 'AT',
  switzerland: 'CH',
  turkey: 'TR',
  greece: 'GR',
  romania: 'RO',
  bulgaria: 'BG',
  hungary: 'HU',
  poland: 'PL',
  'czech republic': 'CZ',
  czechia: 'CZ',
  slovakia: 'SK',
  ukraine: 'UA',
  russia: 'RU',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  finland: 'FI',
  iceland: 'IS',
  ireland: 'IE',
  usa: 'US',
  'united states': 'US',
  canada: 'CA',
  mexico: 'MX',
  brazil: 'BR',
  argentina: 'AR',
  colombia: 'CO',
  chile: 'CL',
  peru: 'PE',
  uruguay: 'UY',
  japan: 'JP',
  'south korea': 'KR',
  korea: 'KR',
  china: 'CN',
  australia: 'AU',
  'saudi arabia': 'SA',
  uae: 'AE',
  'united arab emirates': 'AE',
  qatar: 'QA',
  israel: 'IL',
  egypt: 'EG',
  morocco: 'MA',
  tunisia: 'TN',
  algeria: 'DZ',
  'south africa': 'ZA',
};

const normalizeCountryName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const flagEmojiFromCountry = (countryName: string): string => {
  if (!countryName) {
    return '🌍';
  }
  const normalized = normalizeCountryName(countryName);
  const iso2 = COUNTRY_TO_ISO2[normalized];
  if (!iso2) {
    return '🌍';
  }
  return iso2
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join('');
};
