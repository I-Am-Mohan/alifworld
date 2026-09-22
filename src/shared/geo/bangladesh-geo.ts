/**
 * Bangladesh Geographic Hierarchy & Address Validation Utility
 * 
 * Authoritative Model for Bangladesh Administrative Structure:
 * Division (8) -> District (64) -> Upazila/Thana (Commercial & Fulfillment Hubs) -> Post Offices / Unions
 * 
 * Provides:
 * 1. Bilingual metadata (English and Bengali) for all 8 Divisions and 64 Districts.
 * 2. Major fulfillment, trading, and metropolitan Upazilas/Thanas across Bangladesh.
 * 3. Extensible lower administrative tiers (Unions / Post Offices / Postal Codes).
 * 4. Pure query functions for API route handlers and Flutter client data synchronization.
 * 5. Strict server-side address validation and canonical formatting.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Milestone: 038 (Design Bangladesh phone normalization and OTP authentication)
 * Invariants: ADR-0005, ADR-0023, ADR-0034
 */

export type DivisionCode =
  | 'DHAKA'
  | 'CHATTOGRAM'
  | 'RAJSHAHI'
  | 'KHULNA'
  | 'BARISHAL'
  | 'SYLHET'
  | 'RANGPUR'
  | 'MYMENSINGH';

export interface Division {
  id: string; // e.g. 'dhaka'
  code: DivisionCode;
  nameEn: string;
  nameBn: string;
  headquarters: string;
  districtsCount: number;
}

export interface District {
  id: string; // e.g. 'dhaka', 'coxs-bazar'
  divisionCode: DivisionCode;
  nameEn: string;
  nameBn: string;
  postalCodePrefix: string; // e.g. '12', '47'
}

export interface Upazila {
  id: string; // e.g. 'dhanmondi', 'mirpur', 'kotwali-ctg'
  districtId: string;
  nameEn: string;
  nameBn: string;
  postalCode?: string; // Standard or central postal code
}

export interface PostOfficeArea {
  id: string;
  upazilaId: string;
  nameEn: string;
  nameBn: string;
  postalCode: string;
}

export interface BangladeshAddressInput {
  division: string;
  district: string;
  upazila?: string;
  streetAddress: string;
  postalCode?: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  errors: string[];
  normalized?: {
    division: Division;
    district?: District;
    upazila?: Upazila;
    postalCode?: string;
    streetAddress?: string;
  };
}

// ------------------------------------------------------------------------------
// 1. Authoritative 8 Administrative Divisions of Bangladesh
// ------------------------------------------------------------------------------
export const BANGLADESH_DIVISIONS: Division[] = [
  {
    id: 'dhaka',
    code: 'DHAKA',
    nameEn: 'Dhaka',
    nameBn: 'ঢাকা',
    headquarters: 'Dhaka',
    districtsCount: 13,
  },
  {
    id: 'chattogram',
    code: 'CHATTOGRAM',
    nameEn: 'Chattogram',
    nameBn: 'চট্টগ্রাম',
    headquarters: 'Chattogram',
    districtsCount: 11,
  },
  {
    id: 'rajshahi',
    code: 'RAJSHAHI',
    nameEn: 'Rajshahi',
    nameBn: 'রাজশাহী',
    headquarters: 'Rajshahi',
    districtsCount: 8,
  },
  {
    id: 'khulna',
    code: 'KHULNA',
    nameEn: 'Khulna',
    nameBn: 'খুলনা',
    headquarters: 'Khulna',
    districtsCount: 10,
  },
  {
    id: 'barishal',
    code: 'BARISHAL',
    nameEn: 'Barishal',
    nameBn: 'বরিশাল',
    headquarters: 'Barishal',
    districtsCount: 6,
  },
  {
    id: 'sylhet',
    code: 'SYLHET',
    nameEn: 'Sylhet',
    nameBn: 'সিলেট',
    headquarters: 'Sylhet',
    districtsCount: 4,
  },
  {
    id: 'rangpur',
    code: 'RANGPUR',
    nameEn: 'Rangpur',
    nameBn: 'রংপুর',
    headquarters: 'Rangpur',
    districtsCount: 8,
  },
  {
    id: 'mymensingh',
    code: 'MYMENSINGH',
    nameEn: 'Mymensingh',
    nameBn: 'ময়মনসিংহ',
    headquarters: 'Mymensingh',
    districtsCount: 4,
  },
];

// ------------------------------------------------------------------------------
// 2. Authoritative 64 Administrative Districts of Bangladesh
// ------------------------------------------------------------------------------
export const BANGLADESH_DISTRICTS: District[] = [
  // --- DHAKA DIVISION (13) ---
  { id: 'dhaka', divisionCode: 'DHAKA', nameEn: 'Dhaka', nameBn: 'ঢাকা', postalCodePrefix: '12' },
  { id: 'gazipur', divisionCode: 'DHAKA', nameEn: 'Gazipur', nameBn: 'গাজীপুর', postalCodePrefix: '17' },
  { id: 'narayanganj', divisionCode: 'DHAKA', nameEn: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ', postalCodePrefix: '14' },
  { id: 'narsingdi', divisionCode: 'DHAKA', nameEn: 'Narsingdi', nameBn: 'নরসিংদী', postalCodePrefix: '16' },
  { id: 'tangail', divisionCode: 'DHAKA', nameEn: 'Tangail', nameBn: 'টাঙ্গাইল', postalCodePrefix: '19' },
  { id: 'kishoreganj', divisionCode: 'DHAKA', nameEn: 'Kishoreganj', nameBn: 'কিশোরগঞ্জ', postalCodePrefix: '23' },
  { id: 'manikganj', divisionCode: 'DHAKA', nameEn: 'Manikganj', nameBn: 'মানিকগঞ্জ', postalCodePrefix: '18' },
  { id: 'munshiganj', divisionCode: 'DHAKA', nameEn: 'Munshiganj', nameBn: 'মুন্সীগঞ্জ', postalCodePrefix: '15' },
  { id: 'rajbari', divisionCode: 'DHAKA', nameEn: 'Rajbari', nameBn: 'রাজবাড়ী', postalCodePrefix: '77' },
  { id: 'madaripur', divisionCode: 'DHAKA', nameEn: 'Madaripur', nameBn: 'মাদারীপুর', postalCodePrefix: '79' },
  { id: 'gopalganj', divisionCode: 'DHAKA', nameEn: 'Gopalganj', nameBn: 'গোপালগঞ্জ', postalCodePrefix: '81' },
  { id: 'faridpur', divisionCode: 'DHAKA', nameEn: 'Faridpur', nameBn: 'ফরিদপুর', postalCodePrefix: '78' },
  { id: 'shariatpur', divisionCode: 'DHAKA', nameEn: 'Shariatpur', nameBn: 'শরীয়তপুর', postalCodePrefix: '80' },

  // --- CHATTOGRAM DIVISION (11) ---
  { id: 'chattogram', divisionCode: 'CHATTOGRAM', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম', postalCodePrefix: '40' },
  { id: 'coxs-bazar', divisionCode: 'CHATTOGRAM', nameEn: "Cox's Bazar", nameBn: 'কক্সবাজার', postalCodePrefix: '47' },
  { id: 'cumilla', divisionCode: 'CHATTOGRAM', nameEn: 'Cumilla', nameBn: 'কুমিল্লা', postalCodePrefix: '35' },
  { id: 'feni', divisionCode: 'CHATTOGRAM', nameEn: 'Feni', nameBn: 'ফেনী', postalCodePrefix: '39' },
  { id: 'brahmanbaria', divisionCode: 'CHATTOGRAM', nameEn: 'Brahmanbaria', nameBn: 'ব্রাহ্মণবাড়িয়া', postalCodePrefix: '34' },
  { id: 'noakhali', divisionCode: 'CHATTOGRAM', nameEn: 'Noakhali', nameBn: 'নোয়াখালী', postalCodePrefix: '38' },
  { id: 'chandpur', divisionCode: 'CHATTOGRAM', nameEn: 'Chandpur', nameBn: 'চাঁদপুর', postalCodePrefix: '36' },
  { id: 'lakshmipur', divisionCode: 'CHATTOGRAM', nameEn: 'Lakshmipur', nameBn: 'লক্ষ্মীপুর', postalCodePrefix: '37' },
  { id: 'rangamati', divisionCode: 'CHATTOGRAM', nameEn: 'Rangamati', nameBn: 'রাঙ্গামাটি', postalCodePrefix: '45' },
  { id: 'bandarban', divisionCode: 'CHATTOGRAM', nameEn: 'Bandarban', nameBn: 'বান্দরবান', postalCodePrefix: '46' },
  { id: 'khagrachhari', divisionCode: 'CHATTOGRAM', nameEn: 'Khagrachhari', nameBn: 'খাগড়াছড়ি', postalCodePrefix: '44' },

  // --- RAJSHAHI DIVISION (8) ---
  { id: 'rajshahi', divisionCode: 'RAJSHAHI', nameEn: 'Rajshahi', nameBn: 'রাজশাহী', postalCodePrefix: '60' },
  { id: 'bogura', divisionCode: 'RAJSHAHI', nameEn: 'Bogura', nameBn: 'বগুড়া', postalCodePrefix: '58' },
  { id: 'pabna', divisionCode: 'RAJSHAHI', nameEn: 'Pabna', nameBn: 'পাবনা', postalCodePrefix: '66' },
  { id: 'sirajganj', divisionCode: 'RAJSHAHI', nameEn: 'Sirajganj', nameBn: 'সিরাজগঞ্জ', postalCodePrefix: '67' },
  { id: 'naogaon', divisionCode: 'RAJSHAHI', nameEn: 'Naogaon', nameBn: 'নওগাঁ', postalCodePrefix: '65' },
  { id: 'natore', divisionCode: 'RAJSHAHI', nameEn: 'Natore', nameBn: 'নাটোর', postalCodePrefix: '64' },
  { id: 'chapainawabganj', divisionCode: 'RAJSHAHI', nameEn: 'Chapainawabganj', nameBn: 'চাঁপাইনবাবগঞ্জ', postalCodePrefix: '63' },
  { id: 'joypurhat', divisionCode: 'RAJSHAHI', nameEn: 'Joypurhat', nameBn: 'জয়পুরহাট', postalCodePrefix: '59' },

  // --- KHULNA DIVISION (10) ---
  { id: 'khulna', divisionCode: 'KHULNA', nameEn: 'Khulna', nameBn: 'খুলনা', postalCodePrefix: '90' },
  { id: 'jashore', divisionCode: 'KHULNA', nameEn: 'Jashore', nameBn: 'যশোর', postalCodePrefix: '74' },
  { id: 'satkhira', divisionCode: 'KHULNA', nameEn: 'Satkhira', nameBn: 'সাতক্ষীরা', postalCodePrefix: '94' },
  { id: 'bagerhat', divisionCode: 'KHULNA', nameEn: 'Bagerhat', nameBn: 'বাগেরহাট', postalCodePrefix: '93' },
  { id: 'jhenaidah', divisionCode: 'KHULNA', nameEn: 'Jhenaidah', nameBn: 'ঝিনাইদহ', postalCodePrefix: '73' },
  { id: 'kushtia', divisionCode: 'KHULNA', nameEn: 'Kushtia', nameBn: 'কুষ্টিয়া', postalCodePrefix: '70' },
  { id: 'magura', divisionCode: 'KHULNA', nameEn: 'Magura', nameBn: 'মাগুরা', postalCodePrefix: '76' },
  { id: 'meherpur', divisionCode: 'KHULNA', nameEn: 'Meherpur', nameBn: 'মেহেরপুর', postalCodePrefix: '71' },
  { id: 'narail', divisionCode: 'KHULNA', nameEn: 'Narail', nameBn: 'নড়াইল', postalCodePrefix: '75' },
  { id: 'chuadanga', divisionCode: 'KHULNA', nameEn: 'Chuadanga', nameBn: 'চুয়াডাঙ্গা', postalCodePrefix: '72' },

  // --- BARISHAL DIVISION (6) ---
  { id: 'barishal', divisionCode: 'BARISHAL', nameEn: 'Barishal', nameBn: 'বরিশাল', postalCodePrefix: '82' },
  { id: 'bhola', divisionCode: 'BARISHAL', nameEn: 'Bhola', nameBn: 'ভোলা', postalCodePrefix: '83' },
  { id: 'patuakhali', divisionCode: 'BARISHAL', nameEn: 'Patuakhali', nameBn: 'পটুয়াখালী', postalCodePrefix: '86' },
  { id: 'pirojpur', divisionCode: 'BARISHAL', nameEn: 'Pirojpur', nameBn: 'পিরোজপুর', postalCodePrefix: '85' },
  { id: 'barguna', divisionCode: 'BARISHAL', nameEn: 'Barguna', nameBn: 'বরগুনা', postalCodePrefix: '87' },
  { id: 'jhalokathi', divisionCode: 'BARISHAL', nameEn: 'Jhalokathi', nameBn: 'ঝালকাঠি', postalCodePrefix: '84' },

  // --- SYLHET DIVISION (4) ---
  { id: 'sylhet', divisionCode: 'SYLHET', nameEn: 'Sylhet', nameBn: 'সিলেট', postalCodePrefix: '31' },
  { id: 'moulvibazar', divisionCode: 'SYLHET', nameEn: 'Moulvibazar', nameBn: 'মৌলভীবাজার', postalCodePrefix: '32' },
  { id: 'habiganj', divisionCode: 'SYLHET', nameEn: 'Habiganj', nameBn: 'হবিগঞ্জ', postalCodePrefix: '33' },
  { id: 'sunamganj', divisionCode: 'SYLHET', nameEn: 'Sunamganj', nameBn: 'সুনামগঞ্জ', postalCodePrefix: '30' },

  // --- RANGPUR DIVISION (8) ---
  { id: 'rangpur', divisionCode: 'RANGPUR', nameEn: 'Rangpur', nameBn: 'রংপুর', postalCodePrefix: '54' },
  { id: 'dinajpur', divisionCode: 'RANGPUR', nameEn: 'Dinajpur', nameBn: 'দিনাজপুর', postalCodePrefix: '52' },
  { id: 'gaibandha', divisionCode: 'RANGPUR', nameEn: 'Gaibandha', nameBn: 'গাইবান্ধা', postalCodePrefix: '57' },
  { id: 'kurigram', divisionCode: 'RANGPUR', nameEn: 'Kurigram', nameBn: 'কুড়িগ্রাম', postalCodePrefix: '56' },
  { id: 'lalmonirhat', divisionCode: 'RANGPUR', nameEn: 'Lalmonirhat', nameBn: 'লালমনিরহাট', postalCodePrefix: '55' },
  { id: 'nilphamari', divisionCode: 'RANGPUR', nameEn: 'Nilphamari', nameBn: 'নীলফামারী', postalCodePrefix: '53' },
  { id: 'panchagarh', divisionCode: 'RANGPUR', nameEn: 'Panchagarh', nameBn: 'পঞ্চগড়', postalCodePrefix: '50' },
  { id: 'thakurgaon', divisionCode: 'RANGPUR', nameEn: 'Thakurgaon', nameBn: 'ঠাকুরগাঁও', postalCodePrefix: '51' },

  // --- MYMENSINGH DIVISION (4) ---
  { id: 'mymensingh', divisionCode: 'MYMENSINGH', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ', postalCodePrefix: '22' },
  { id: 'jamalpur', divisionCode: 'MYMENSINGH', nameEn: 'Jamalpur', nameBn: 'জামালপুর', postalCodePrefix: '20' },
  { id: 'netrokona', divisionCode: 'MYMENSINGH', nameEn: 'Netrokona', nameBn: 'নেত্রকোণা', postalCodePrefix: '24' },
  { id: 'sherpur', divisionCode: 'MYMENSINGH', nameEn: 'Sherpur', nameBn: 'শেরপুর', postalCodePrefix: '21' },
];

// ------------------------------------------------------------------------------
// 3. Representative Upazilas / Thanas & Metropolitan Fulfillment Hubs
// ------------------------------------------------------------------------------
export const BANGLADESH_UPAZILAS: Upazila[] = [
  // --- DHAKA DISTRICT METRO & SURROUNDINGS ---
  { id: 'dhanmondi', districtId: 'dhaka', nameEn: 'Dhanmondi', nameBn: 'ধানমন্ডি', postalCode: '1205' },
  { id: 'gulshan', districtId: 'dhaka', nameEn: 'Gulshan', nameBn: 'গুলশান', postalCode: '1212' },
  { id: 'banani', districtId: 'dhaka', nameEn: 'Banani', nameBn: 'বনানী', postalCode: '1213' },
  { id: 'mirpur', districtId: 'dhaka', nameEn: 'Mirpur', nameBn: 'মিরপুর', postalCode: '1216' },
  { id: 'uttara', districtId: 'dhaka', nameEn: 'Uttara', nameBn: 'উত্তরা', postalCode: '1230' },
  { id: 'mohammadpur', districtId: 'dhaka', nameEn: 'Mohammadpur', nameBn: 'মোহাম্মদপুর', postalCode: '1207' },
  { id: 'motijheel', districtId: 'dhaka', nameEn: 'Motijheel', nameBn: 'মতিঝিল', postalCode: '1000' },
  { id: 'tejgaon', districtId: 'dhaka', nameEn: 'Tejgaon', nameBn: 'তেজগাঁও', postalCode: '1215' },
  { id: 'badda', districtId: 'dhaka', nameEn: 'Badda', nameBn: 'বাড্ডা', postalCode: '1212' },
  { id: 'khilgaon', districtId: 'dhaka', nameEn: 'Khilgaon', nameBn: 'খিলগাঁও', postalCode: '1219' },
  { id: 'paltan', districtId: 'dhaka', nameEn: 'Paltan', nameBn: 'পল্টন', postalCode: '1000' },
  { id: 'lalbagh', districtId: 'dhaka', nameEn: 'Lalbagh', nameBn: 'লালবাগ', postalCode: '1211' },
  { id: 'new-market', districtId: 'dhaka', nameEn: 'New Market', nameBn: 'নিউ মার্কেট', postalCode: '1205' },
  { id: 'rampura', districtId: 'dhaka', nameEn: 'Rampura', nameBn: 'রামপুরা', postalCode: '1219' },
  { id: 'savar', districtId: 'dhaka', nameEn: 'Savar', nameBn: 'সাভার', postalCode: '1340' },
  { id: 'dhamrai', districtId: 'dhaka', nameEn: 'Dhamrai', nameBn: 'ধামরাই', postalCode: '1350' },
  { id: 'keraniganj', districtId: 'dhaka', nameEn: 'Keraniganj', nameBn: 'কেরানীগঞ্জ', postalCode: '1310' },

  // --- GAZIPUR DISTRICT ---
  { id: 'gazipur-sadar', districtId: 'gazipur', nameEn: 'Gazipur Sadar', nameBn: 'গাজীপুর সদর', postalCode: '1700' },
  { id: 'tongi', districtId: 'gazipur', nameEn: 'Tongi', nameBn: 'টঙ্গী', postalCode: '1710' },
  { id: 'kaliakair', districtId: 'gazipur', nameEn: 'Kaliakair', nameBn: 'কালিয়াকৈর', postalCode: '1750' },
  { id: 'sreepur', districtId: 'gazipur', nameEn: 'Sreepur', nameBn: 'শ্রীপুর', postalCode: '1740' },

  // --- NARAYANGANJ DISTRICT ---
  { id: 'narayanganj-sadar', districtId: 'narayanganj', nameEn: 'Narayanganj Sadar', nameBn: 'নারায়ণগঞ্জ সদর', postalCode: '1400' },
  { id: 'fatullah', districtId: 'narayanganj', nameEn: 'Fatullah', nameBn: 'ফতুল্লা', postalCode: '1420' },
  { id: 'siddhirganj', districtId: 'narayanganj', nameEn: 'Siddhirganj', nameBn: 'সিদ্ধিরগঞ্জ', postalCode: '1430' },
  { id: 'rupganj', districtId: 'narayanganj', nameEn: 'Rupganj', nameBn: 'রূপগঞ্জ', postalCode: '1460' },
  { id: 'sonargaon', districtId: 'narayanganj', nameEn: 'Sonargaon', nameBn: 'সোনারগাঁও', postalCode: '1440' },

  // --- CHATTOGRAM DISTRICT ---
  { id: 'kotwali-ctg', districtId: 'chattogram', nameEn: 'Kotwali (Chattogram)', nameBn: 'কোতোয়ালী (চট্টগ্রাম)', postalCode: '4000' },
  { id: 'panchlaish', districtId: 'chattogram', nameEn: 'Panchlaish', nameBn: 'পাঁচলাইশ', postalCode: '4203' },
  { id: 'agrabad', districtId: 'chattogram', nameEn: 'Agrabad / Double Mooring', nameBn: 'আগ্রাবাদ', postalCode: '4100' },
  { id: 'halishahar', districtId: 'chattogram', nameEn: 'Halishahar', nameBn: 'হালিশহর', postalCode: '4216' },
  { id: 'hathazari', districtId: 'chattogram', nameEn: 'Hathazari', nameBn: 'হাটহাজারী', postalCode: '4330' },
  { id: 'sitakunda', districtId: 'chattogram', nameEn: 'Sitakunda', nameBn: 'সীতাকুণ্ড', postalCode: '4310' },

  // --- COX'S BAZAR DISTRICT ---
  { id: 'coxs-bazar-sadar', districtId: 'coxs-bazar', nameEn: "Cox's Bazar Sadar", nameBn: 'কক্সবাজার সদর', postalCode: '4700' },
  { id: 'teknaf', districtId: 'coxs-bazar', nameEn: 'Teknaf', nameBn: 'টেকনাফ', postalCode: '4760' },
  { id: 'ramu', districtId: 'coxs-bazar', nameEn: 'Ramu', nameBn: 'রামু', postalCode: '4730' },

  // --- CUMILLA DISTRICT ---
  { id: 'cumilla-sadar', districtId: 'cumilla', nameEn: 'Cumilla Adarsha Sadar', nameBn: 'কুমিল্লা আদর্শ সদর', postalCode: '3500' },

  // --- RAJSHAHI DISTRICT ---
  { id: 'boalia', districtId: 'rajshahi', nameEn: 'Boalia', nameBn: 'বোয়ালিয়া', postalCode: '6000' },
  { id: 'rajpara', districtId: 'rajshahi', nameEn: 'Rajpara', nameBn: 'রাজপাড়া', postalCode: '6000' },
  { id: 'motihar', districtId: 'rajshahi', nameEn: 'Motihar', nameBn: 'মতিহার', postalCode: '6205' },

  // --- BOGURA DISTRICT ---
  { id: 'bogura-sadar', districtId: 'bogura', nameEn: 'Bogura Sadar', nameBn: 'বগুড়া সদর', postalCode: '5800' },

  // --- KHULNA DISTRICT ---
  { id: 'khulna-sadar', districtId: 'khulna', nameEn: 'Khulna Sadar', nameBn: 'খুলনা সদর', postalCode: '9100' },
  { id: 'sonadanga', districtId: 'khulna', nameEn: 'Sonadanga', nameBn: 'সোনাডাঙ্গা', postalCode: '9000' },
  { id: 'khalishpur', districtId: 'khulna', nameEn: 'Khalishpur', nameBn: 'খালিশপুর', postalCode: '9200' },

  // --- JASHORE DISTRICT ---
  { id: 'jashore-sadar', districtId: 'jashore', nameEn: 'Jashore Sadar', nameBn: 'যশোর সদর', postalCode: '7400' },
  { id: 'sharsha', districtId: 'jashore', nameEn: 'Sharsha / Benapole', nameBn: 'শার্শা / বেনাপোল', postalCode: '7432' },

  // --- BARISHAL DISTRICT ---
  { id: 'barishal-sadar', districtId: 'barishal', nameEn: 'Barishal Sadar (Kotwali)', nameBn: 'বরিশাল সদর (কোতোয়ালী)', postalCode: '8200' },

  // --- SYLHET DISTRICT ---
  { id: 'sylhet-sadar', districtId: 'sylhet', nameEn: 'Sylhet Sadar (Kotwali)', nameBn: 'সিলেট সদর (কোতোয়ালী)', postalCode: '3100' },
  { id: 'south-surma', districtId: 'sylhet', nameEn: 'South Surma', nameBn: 'দক্ষিণ সুরমা', postalCode: '3110' },

  // --- RANGPUR DISTRICT ---
  { id: 'rangpur-sadar', districtId: 'rangpur', nameEn: 'Rangpur Sadar', nameBn: 'রংপুর সদর', postalCode: '5400' },

  // --- MYMENSINGH DISTRICT ---
  { id: 'mymensingh-sadar', districtId: 'mymensingh', nameEn: 'Mymensingh Sadar', nameBn: 'ময়মনসিংহ সদর', postalCode: '2200' },
  { id: 'bhaluka', districtId: 'mymensingh', nameEn: 'Bhaluka', nameBn: 'ভালুকা', postalCode: '2240' },
];

// Helper maps for fast O(1) indexed lookups
const DIVISION_BY_ID = new Map<string, Division>();
const DIVISION_BY_CODE = new Map<string, Division>();
const DISTRICT_BY_ID = new Map<string, District>();
const DISTRICTS_BY_DIVISION = new Map<DivisionCode, District[]>();
const UPAZILAS_BY_DISTRICT = new Map<string, Upazila[]>();

for (const div of BANGLADESH_DIVISIONS) {
  DIVISION_BY_ID.set(div.id.toLowerCase(), div);
  DIVISION_BY_CODE.set(div.code.toUpperCase(), div);
}

for (const dist of BANGLADESH_DISTRICTS) {
  DISTRICT_BY_ID.set(dist.id.toLowerCase(), dist);
  const existing = DISTRICTS_BY_DIVISION.get(dist.divisionCode) || [];
  existing.push(dist);
  DISTRICTS_BY_DIVISION.set(dist.divisionCode, existing);
}

for (const upz of BANGLADESH_UPAZILAS) {
  const existing = UPAZILAS_BY_DISTRICT.get(upz.districtId.toLowerCase()) || [];
  existing.push(upz);
  UPAZILAS_BY_DISTRICT.set(upz.districtId.toLowerCase(), existing);
}

// ------------------------------------------------------------------------------
// 4. Query and Retrieval Functions
// ------------------------------------------------------------------------------

/**
 * Returns all 8 administrative divisions of Bangladesh.
 */
export function getBangladeshDivisions(): Division[] {
  return [...BANGLADESH_DIVISIONS];
}

/**
 * Returns districts of Bangladesh, optionally filtered by division code or slug.
 */
export function getBangladeshDistricts(divisionCodeOrId?: string): District[] {
  if (!divisionCodeOrId) {
    return [...BANGLADESH_DISTRICTS];
  }

  const clean = divisionCodeOrId.trim();
  const division =
    DIVISION_BY_CODE.get(clean.toUpperCase()) ||
    DIVISION_BY_ID.get(clean.toLowerCase());

  if (!division) {
    return [];
  }

  return [...(DISTRICTS_BY_DIVISION.get(division.code) || [])];
}

/**
 * Returns upazilas/thanas, optionally filtered by district ID or name.
 */
export function getBangladeshUpazilas(districtIdOrName?: string): Upazila[] {
  if (!districtIdOrName) {
    return [...BANGLADESH_UPAZILAS];
  }

  const clean = districtIdOrName.trim().toLowerCase();
  const district =
    DISTRICT_BY_ID.get(clean) ||
    BANGLADESH_DISTRICTS.find(
      (d) =>
        d.nameEn.toLowerCase() === clean ||
        d.nameBn === clean ||
        d.id.toLowerCase() === clean
    );

  if (!district) {
    return [];
  }

  const upazilas = UPAZILAS_BY_DISTRICT.get(district.id) || [];
  if (upazilas.length > 0) {
    return [...upazilas];
  }

  // If specific thana entries are not yet enumerated for a rural district,
  // provide a canonical district Sadar entry as default
  return [
    {
      id: `${district.id}-sadar`,
      districtId: district.id,
      nameEn: `${district.nameEn} Sadar`,
      nameBn: `${district.nameBn} সদর`,
      postalCode: `${district.postalCodePrefix}00`,
    },
  ];
}

/**
 * Looks up a single division by its id, code, or name (English or Bengali).
 */
export function getBangladeshDivision(identifier: string): Division | null {
  if (!identifier) return null;
  const clean = identifier.trim();

  // Try direct code/id match
  const byCode = DIVISION_BY_CODE.get(clean.toUpperCase());
  if (byCode) return byCode;

  const byId = DIVISION_BY_ID.get(clean.toLowerCase());
  if (byId) return byId;

  // Try name match
  const byName = BANGLADESH_DIVISIONS.find(
    (d) =>
      d.nameEn.toLowerCase() === clean.toLowerCase() ||
      d.nameBn === clean
  );

  return byName || null;
}

/**
 * Looks up a single district by its id or name (English or Bengali).
 */
export function getBangladeshDistrict(identifier: string): District | null {
  if (!identifier) return null;
  const clean = identifier.trim();

  const byId = DISTRICT_BY_ID.get(clean.toLowerCase());
  if (byId) return byId;

  const byName = BANGLADESH_DISTRICTS.find(
    (d) =>
      d.nameEn.toLowerCase() === clean.toLowerCase() ||
      d.nameBn === clean
  );

  return byName || null;
}

/**
 * Looks up a single upazila/thana by its id or name.
 */
export function getBangladeshUpazila(identifier: string): Upazila | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();

  const byId = BANGLADESH_UPAZILAS.find((u) => u.id === clean);
  if (byId) return byId;

  const byName = BANGLADESH_UPAZILAS.find(
    (u) =>
      u.nameEn.toLowerCase() === clean ||
      u.nameBn === identifier.trim()
  );

  return byName || null;
}

// ------------------------------------------------------------------------------
// 5. Address Validation & Formatting
// ------------------------------------------------------------------------------

/**
 * Validates a Bangladesh address object against the authoritative administrative model.
 */
export function validateBangladeshAddress(
  address: Partial<BangladeshAddressInput>
): AddressValidationResult {
  const errors: string[] = [];

  if (!address.division || typeof address.division !== 'string' || !address.division.trim()) {
    errors.push('Division is required');
  }

  const division = address.division ? getBangladeshDivision(address.division) : null;
  if (address.division && !division) {
    errors.push(`Invalid Bangladesh division: '${address.division}'. Must be one of: Dhaka, Chattogram, Rajshahi, Khulna, Barishal, Sylhet, Rangpur, Mymensingh.`);
  }

  let district: District | null = null;
  if (address.district) {
    district = getBangladeshDistrict(address.district);
    if (!district) {
      errors.push(`Invalid Bangladesh district: '${address.district}'.`);
    } else if (division && district.divisionCode !== division.code) {
      errors.push(
        `District '${district.nameEn}' does not belong to Division '${division.nameEn}'. It belongs to '${district.divisionCode}'.`
      );
    }
  }

  let upazila: Upazila | null = null;
  if (address.upazila) {
    upazila = getBangladeshUpazila(address.upazila);
    if (upazila && district && upazila.districtId !== district.id) {
      errors.push(
        `Upazila '${upazila.nameEn}' does not belong to District '${district.nameEn}'.`
      );
    }
  }

  if (address.postalCode) {
    const cleanPostal = address.postalCode.trim();
    // 4-digit Bangladesh postal code
    if (!/^\d{4}$/.test(cleanPostal)) {
      errors.push(`Invalid Bangladesh postal code: '${address.postalCode}'. Must be 4 digits (e.g. 1205).`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    normalized: {
      division: division!,
      district: district || undefined,
      upazila: upazila || undefined,
      postalCode: address.postalCode?.trim(),
      streetAddress: address.streetAddress?.trim(),
    },
  };
}

/**
 * Formats a Bangladesh address into a standard display string.
 */
export function formatBangladeshAddress(
  address: BangladeshAddressInput,
  locale: 'en' | 'bn' = 'en'
): string {
  const div = getBangladeshDivision(address.division);
  const dist = getBangladeshDistrict(address.district);
  const upz = address.upazila ? getBangladeshUpazila(address.upazila) : null;

  const divName = locale === 'bn' ? div?.nameBn || address.division : div?.nameEn || address.division;
  const distName = locale === 'bn' ? dist?.nameBn || address.district : dist?.nameEn || address.district;
  const upzName = address.upazila
    ? locale === 'bn'
      ? upz?.nameBn || address.upazila
      : upz?.nameEn || address.upazila
    : null;

  const parts = [
    address.streetAddress,
    upzName,
    distName,
    divName,
    address.postalCode ? (locale === 'bn' ? `পোস্টকোড: ${address.postalCode}` : `Postal Code: ${address.postalCode}`) : null,
    locale === 'bn' ? 'বাংলাদেশ' : 'Bangladesh',
  ].filter(Boolean);

  return parts.join(', ');
}
