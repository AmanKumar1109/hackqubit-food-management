import { generateSpecialId } from './idGenerator.js';
import { createDefaultMealsArray } from './participantParser.js';

/**
 * Normalizes any header string by stripping BOM, non-breaking spaces,
 * special characters, and converting to lowercase for robust matching.
 */
export const normalizeHeaderString = (str) => {
  if (str === undefined || str === null) return '';
  return String(str)
    .toLowerCase()
    .replace(/[\uFEFF\u00A0]/g, '') // remove BOM and non-breaking spaces
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Formats Excel date values (Date objects, Excel serial numbers, or timestamp strings)
 * into a standard readable date-time string (e.g. "9/9/2026 20:07:36").
 */
export const formatExcelTimestamp = (value) => {
  if (value === undefined || value === null || value === '') return '';
  
  // 1. If it's already a JS Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const d = value.getDate();
    const m = value.getMonth() + 1;
    const y = value.getFullYear();
    const h = pad(value.getHours());
    const min = pad(value.getMinutes());
    const s = pad(value.getSeconds());
    return `${m}/${d}/${y} ${h}:${min}:${s}`;
  }

  // 2. If it's a numeric Excel serial date (e.g. 46274.838611)
  if (typeof value === 'number') {
    if (value > 20000 && value < 75000) {
      // Excel epoch base: Dec 30 1899
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        const d = date.getUTCDate();
        const m = date.getUTCMonth() + 1;
        const y = date.getUTCFullYear();
        const h = pad(date.getUTCHours());
        const min = pad(date.getUTCMinutes());
        const s = pad(date.getUTCSeconds());
        return `${m}/${d}/${y} ${h}:${min}:${s}`;
      }
    }
    return String(value);
  }

  // 3. String date: trim and return as is
  return String(value).trim();
};

/**
 * Cleanly stringifies numbers, booleans, and text to prevent truncation of leading zeros
 * (e.g. phone numbers starting with '0' or numeric WiFi passwords).
 */
export const formatCleanString = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value).trim();
};

/**
 * Exact 20 Canonical Column Keys matching HackQubit 2.0 Google Forms / Excel Schema
 */
export const CANONICAL_KEYS = [
  'TimeStamp',
  'Team Name',
  'WiFi ID',
  'WiFi Password',
  'Team Size',
  'Transaction ID',
  'Payment Screenshot Link',
  'Leader Name',
  'Leader Email',
  'Leader Contact',
  'Leader College',
  'Leader Course & Year',
  'Member 2 Name',
  'Member 2 Contact',
  'Member 3 Name',
  'Member 3 Contact',
  'Member 4 Name',
  'Member 4 Contact',
  'wrong UTR',
  'google form response'
];

/**
 * Exhaustive alias dictionary for all 20 columns to accommodate header variations
 */
export const FIELD_ALIASES = {
  TimeStamp: [
    'timestamp',
    'time stamp',
    'date',
    'datetime',
    'submission time',
    'registered at',
    'form timestamp',
    'entry timestamp'
  ],
  'Team Name': ['team name', 'team_name', 'teamname', 'team'],
  'WiFi ID': ['wifi id', 'wifi_id', 'wifiid', 'ssid', 'wifi username', 'wifi name', 'allocated wifi'],
  'WiFi Password': ['wifi password', 'wifi_password', 'wifipassword', 'wifi pass', 'password', 'wifi key'],
  'Team Size': ['team size', 'teamsize', 'size', 'members count', 'total participants', 'number of members'],
  'Transaction ID': ['transaction id', 'transactionid', 'utr', 'utr number', 'txn id', 'transaction no', 'payment utr'],
  'Payment Screenshot Link': [
    'payment screenshot link',
    'payment screenshot',
    'screenshot link',
    'payment link',
    'screenshot',
    'drive link',
    'payment proof'
  ],
  'Leader Name': ['leader name', 'leadername', 'leader full name', 'team leader', 'leader', 'name'],
  'Leader Email': ['leader email', 'leaderemail', 'email', 'email address', 'leader mail'],
  'Leader Contact': [
    'leader contact',
    'leadercontact',
    'leader phone',
    'leader mobile',
    'contact',
    'phone',
    'mobile',
    'primary contact'
  ],
  'Leader College': ['leader college', 'college', 'college name', 'institute', 'institution', 'university'],
  'Leader Course & Year': [
    'leader course & year',
    'leader course and year',
    'course & year',
    'course and year',
    'branch & year',
    'course',
    'year',
    'branch'
  ],
  'Member 2 Name': ['member 2 name', 'member 2', 'member2 name', 'member2name', 'member 2 full name'],
  'Member 2 Contact': ['member 2 contact', 'member 2 phone', 'member2 contact', 'member2phone', 'member 2 mobile'],
  'Member 3 Name': ['member 3 name', 'member 3', 'member3 name', 'member3name', 'member 3 full name'],
  'Member 3 Contact': ['member 3 contact', 'member 3 phone', 'member3 contact', 'member3phone', 'member 3 mobile'],
  'Member 4 Name': ['member 4 name', 'member 4', 'member4 name', 'member4name', 'member 4 full name'],
  'Member 4 Contact': ['member 4 contact', 'member 4 phone', 'member4 contact', 'member4phone', 'member 4 mobile'],
  'wrong UTR': ['wrong utr', 'wrongutr', 'payment verify flag', 'payment status', 'wrong txn', 'invalid utr'],
  'google form response': ['google form response', 'google form', 'form response', 'response status', 'verified']
};

/**
 * Standard Schema Specification for Admin UI & Schema Guide Modal
 */
export const HACKATHON_TEAM_SCHEMA = [
  {
    category: 'Team & WiFi Credentials',
    badgeColor: 'blue',
    fields: [
      {
        key: 'Team Name',
        aliases: FIELD_ALIASES['Team Name'],
        type: 'String (Text)',
        required: true,
        description: 'Official registered team name (e.g. SORA, DevSync)',
        example: 'SORA'
      },
      {
        key: 'WiFi ID',
        aliases: FIELD_ALIASES['WiFi ID'],
        type: 'String (Text)',
        required: false,
        description: 'Allocated venue WiFi SSID/Username (e.g. Team1, Team2)',
        example: 'Team1'
      },
      {
        key: 'WiFi Password',
        aliases: FIELD_ALIASES['WiFi Password'],
        type: 'String (Text/Numeric)',
        required: false,
        description: 'WiFi password stored as string preserving numbers & zeros',
        example: '9798337249'
      },
      {
        key: 'Team Size',
        aliases: FIELD_ALIASES['Team Size'],
        type: 'Integer (Number)',
        required: false,
        description: 'Total participants in team (e.g. 3, 4)',
        example: '3'
      }
    ]
  },
  {
    category: 'Registration & Verification',
    badgeColor: 'emerald',
    fields: [
      {
        key: 'TimeStamp',
        aliases: FIELD_ALIASES.TimeStamp,
        type: 'DateTime / String',
        required: false,
        description: 'Google Form submission timestamp (e.g. 9/9/2026 20:07:36)',
        example: '9/9/2026 20:07:36'
      },
      {
        key: 'Transaction ID',
        aliases: FIELD_ALIASES['Transaction ID'],
        type: 'String (Text)',
        required: false,
        description: 'Fee payment UTR / Transaction number',
        example: '625255096559'
      },
      {
        key: 'Payment Screenshot Link',
        aliases: FIELD_ALIASES['Payment Screenshot Link'],
        type: 'String (URL)',
        required: false,
        description: 'Google Drive or cloud proof link',
        example: 'https://drive.google.com/open?id=123'
      },
      {
        key: 'wrong UTR',
        aliases: FIELD_ALIASES['wrong UTR'],
        type: 'Boolean / String',
        required: false,
        description: 'Payment verification flag (TRUE / FALSE)',
        example: 'FALSE'
      },
      {
        key: 'google form response',
        aliases: FIELD_ALIASES['google form response'],
        type: 'Boolean / String',
        required: false,
        description: 'Google form verification status flag (TRUE / FALSE)',
        example: 'TRUE'
      }
    ]
  },
  {
    category: 'Team Leader (Member 1)',
    badgeColor: 'amber',
    fields: [
      {
        key: 'Leader Name',
        aliases: FIELD_ALIASES['Leader Name'],
        type: 'String (Text)',
        required: true,
        description: "Leader's full legal name",
        example: 'Ankit Kumar Raj'
      },
      {
        key: 'Leader Email',
        aliases: FIELD_ALIASES['Leader Email'],
        type: 'String (Email)',
        required: true,
        description: "Leader's registered email address",
        example: 'ankitraj18750@gmail.com'
      },
      {
        key: 'Leader Contact',
        aliases: FIELD_ALIASES['Leader Contact'],
        type: 'String (Phone/Text)',
        required: true,
        description: '10-digit primary contact number stored as text',
        example: '9798337249'
      },
      {
        key: 'Leader College',
        aliases: FIELD_ALIASES['Leader College'],
        type: 'String (Text)',
        required: false,
        description: "Leader's institute / college name",
        example: 'BIT Sindri'
      },
      {
        key: 'Leader Course & Year',
        aliases: FIELD_ALIASES['Leader Course & Year'],
        type: 'String (Text)',
        required: false,
        description: 'Branch and academic year',
        example: 'BTech CSE ,1st Year'
      }
    ]
  },
  {
    category: 'Team Members (2, 3 & 4)',
    badgeColor: 'purple',
    fields: [
      {
        key: 'Member 2 Name',
        aliases: FIELD_ALIASES['Member 2 Name'],
        type: 'String (Text)',
        required: false,
        description: 'Second member full name',
        example: 'Aman Kumar'
      },
      {
        key: 'Member 2 Contact',
        aliases: FIELD_ALIASES['Member 2 Contact'],
        type: 'String (Phone/Text)',
        required: false,
        description: 'Member 2 mobile number',
        example: '7061368979'
      },
      {
        key: 'Member 3 Name',
        aliases: FIELD_ALIASES['Member 3 Name'],
        type: 'String (Text / Null)',
        required: false,
        description: 'Third member name (blank if 2-member team)',
        example: ''
      },
      {
        key: 'Member 3 Contact',
        aliases: FIELD_ALIASES['Member 3 Contact'],
        type: 'String (Phone/Text / Null)',
        required: false,
        description: 'Member 3 mobile number',
        example: ''
      },
      {
        key: 'Member 4 Name',
        aliases: FIELD_ALIASES['Member 4 Name'],
        type: 'String (Text / Null)',
        required: false,
        description: 'Fourth member name (blank if 3-member team)',
        example: ''
      },
      {
        key: 'Member 4 Contact',
        aliases: FIELD_ALIASES['Member 4 Contact'],
        type: 'String (Phone/Text / Null)',
        required: false,
        description: 'Member 4 mobile number',
        example: ''
      }
    ]
  },
  {
    category: 'System Generated (Automated)',
    badgeColor: 'neutral',
    fields: [
      {
        key: 'Special ID',
        type: 'Alphanumeric (16 chars)',
        required: true,
        description: 'Cryptographically unique 16-character token ID used for QR passes & Firestore doc ID',
        example: 'HQ8F92A7C3B1E4D6'
      },
      {
        key: 'Meal Allocation',
        type: 'Array of 5 Meals',
        required: true,
        description: '5 standardized meal slots pre-initialized for Leader & each member (unclaimed)',
        example: '[Day 1 Breakfast, Lunch, Snacks, Dinner, Day 2 Breakfast]'
      }
    ]
  }
];

/**
 * Finds matching value from raw row object using multiple possible header aliases.
 */
export const findFieldValue = (row, aliases, defaultValue = '') => {
  if (!row || typeof row !== 'object') return defaultValue;
  const keys = Object.keys(row);
  
  for (const alias of aliases) {
    const cleanAlias = normalizeHeaderString(alias);
    const matchedKey = keys.find(
      (k) => normalizeHeaderString(k) === cleanAlias
    );
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      const val = row[matchedKey];
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed !== '' ? trimmed : defaultValue;
      }
      if (val instanceof Date) {
        return formatExcelTimestamp(val);
      }
      if (typeof val === 'boolean') {
        return val ? 'TRUE' : 'FALSE';
      }
      return String(val).trim();
    }
  }
  return defaultValue;
};

/**
 * Sanitizes and maps a raw Excel row into a clean, structured Team Schema object.
 */
export const sanitizeTeamRow = (rawRow, rowIndex = 0) => {
  // 1. Preserve or generate 16-character alphanumeric Special ID
  const existingSpecialId = findFieldValue(
    rawRow,
    ['special id', 'specialid', 'special_id', 'participant id', 'uid'],
    ''
  );
  const specialId =
    existingSpecialId && existingSpecialId.length >= 16
      ? existingSpecialId.toUpperCase()
      : generateSpecialId(16);

  // 2. Extract Team & Network Info
  const teamName = findFieldValue(rawRow, FIELD_ALIASES['Team Name'], `Team_${rowIndex + 1}`);
  const wifiId = findFieldValue(rawRow, FIELD_ALIASES['WiFi ID'], '');
  const wifiPassword = formatCleanString(findFieldValue(rawRow, FIELD_ALIASES['WiFi Password'], ''));
  const rawTeamSize = findFieldValue(rawRow, FIELD_ALIASES['Team Size'], '');

  // 3. Extract Registration & Payment
  let rawTimestamp = findFieldValue(rawRow, FIELD_ALIASES.TimeStamp, '');
  if (!rawTimestamp && rawRow.TimeStamp) {
    rawTimestamp = rawRow.TimeStamp;
  }
  const timestamp = formatExcelTimestamp(rawTimestamp) || new Date().toISOString();

  const transactionId = formatCleanString(findFieldValue(rawRow, FIELD_ALIASES['Transaction ID'], ''));
  const paymentScreenshotLink = findFieldValue(rawRow, FIELD_ALIASES['Payment Screenshot Link'], '');
  const wrongUtr = findFieldValue(rawRow, FIELD_ALIASES['wrong UTR'], 'FALSE');
  const googleFormResponse = findFieldValue(rawRow, FIELD_ALIASES['google form response'], 'TRUE');

  // 4. Extract Leader (Member 1)
  const leaderName = findFieldValue(rawRow, FIELD_ALIASES['Leader Name'], 'Team Leader');
  const leaderEmail = findFieldValue(rawRow, FIELD_ALIASES['Leader Email'], '');
  const leaderContact = formatCleanString(findFieldValue(rawRow, FIELD_ALIASES['Leader Contact'], ''));
  const leaderCollege = findFieldValue(rawRow, FIELD_ALIASES['Leader College'], '');
  const leaderCourse = findFieldValue(rawRow, FIELD_ALIASES['Leader Course & Year'], '');

  // 5. Extract Members 2, 3, 4
  const member2Name = findFieldValue(rawRow, FIELD_ALIASES['Member 2 Name'], '');
  const member2Contact = formatCleanString(findFieldValue(rawRow, FIELD_ALIASES['Member 2 Contact'], ''));

  const member3Name = findFieldValue(rawRow, FIELD_ALIASES['Member 3 Name'], '');
  const member3Contact = formatCleanString(findFieldValue(rawRow, FIELD_ALIASES['Member 3 Contact'], ''));

  const member4Name = findFieldValue(rawRow, FIELD_ALIASES['Member 4 Name'], '');
  const member4Contact = formatCleanString(findFieldValue(rawRow, FIELD_ALIASES['Member 4 Contact'], ''));

  // Determine active member count
  let calculatedSize = 1; // leader is 1
  if (member2Name || member2Contact) calculatedSize++;
  if (member3Name || member3Contact) calculatedSize++;
  if (member4Name || member4Contact) calculatedSize++;

  const teamSize = parseInt(rawTeamSize, 10) || calculatedSize;

  // 6. Build Member Objects
  const members = [
    {
      memberNum: 1,
      isLeader: true,
      name: leaderName,
      email: leaderEmail,
      contact: leaderContact,
      college: leaderCollege,
      course: leaderCourse,
      meal: createDefaultMealsArray()
    }
  ];

  if (member2Name || member2Contact) {
    members.push({
      memberNum: 2,
      isLeader: false,
      name: member2Name || 'Member 2',
      contact: member2Contact,
      college: leaderCollege,
      meal: createDefaultMealsArray()
    });
  }

  if (member3Name || member3Contact) {
    members.push({
      memberNum: 3,
      isLeader: false,
      name: member3Name || 'Member 3',
      contact: member3Contact,
      college: leaderCollege,
      meal: createDefaultMealsArray()
    });
  }

  if (member4Name || member4Contact) {
    members.push({
      memberNum: 4,
      isLeader: false,
      name: member4Name || 'Member 4',
      contact: member4Contact,
      college: leaderCollege,
      meal: createDefaultMealsArray()
    });
  }

  // 7. Compose Clean Structured Team Document with both canonical and object properties
  return {
    _rowId: rowIndex + 1,
    // Unique ID
    'Special ID': specialId,
    specialId: specialId,

    // Team Meta
    'Team Name': teamName,
    teamName: teamName,
    'Team Size': teamSize,
    teamSize: teamSize,
    'WiFi ID': wifiId,
    wifiId: wifiId,
    'WiFi Password': wifiPassword,
    wifiPassword: wifiPassword,

    // Registration Details
    TimeStamp: timestamp,
    timestamp: timestamp,
    'Transaction ID': transactionId,
    'Payment Screenshot Link': paymentScreenshotLink,
    'wrong UTR': wrongUtr,
    wrongUtr: wrongUtr,
    'google form response': googleFormResponse,
    googleFormResponse: googleFormResponse,
    registration: {
      timestamp,
      transactionId,
      paymentScreenshotLink,
      wrongUtr,
      googleFormResponse
    },

    // Leader Details
    'Leader Name': leaderName,
    'Leader Email': leaderEmail,
    'Leader Contact': leaderContact,
    'Leader Phone': leaderContact,
    'Leader College': leaderCollege,
    'Leader Course & Year': leaderCourse,
    leader: {
      name: leaderName,
      email: leaderEmail,
      contact: leaderContact,
      college: leaderCollege,
      courseAndYear: leaderCourse
    },

    // Member 2
    'Member 2 Name': member2Name,
    'Member 2 Contact': member2Contact,

    // Member 3
    'Member 3 Name': member3Name,
    'Member 3 Contact': member3Contact,

    // Member 4
    'Member 4 Name': member4Name,
    'Member 4 Contact': member4Contact,

    // Structured Members Array
    members: members,

    // Pre-initialized 5 Meal slots per member for atomic Firestore operations
    meal: createDefaultMealsArray(),
    member2Meal: member2Name ? createDefaultMealsArray() : [],
    member3Meal: member3Name ? createDefaultMealsArray() : [],
    member4Meal: member4Name ? createDefaultMealsArray() : [],

    // Status & timestamps
    foodPreference: 'Veg',
    status: 'registered',
    createdAt: new Date().toISOString()
  };
};

/**
 * Canonical Sample Data Generator for template download & demo load
 * Matched strictly to HackQubit 2.0 Participants & WiFi Credentials Data Schema
 */
export const getSampleTeamExcelData = () => [
  {
    TimeStamp: '9/9/2026 20:07:36',
    'Team Name': 'SORA',
    'WiFi ID': 'Team1',
    'WiFi Password': '9798337249',
    'Team Size': 3,
    'Transaction ID': '625255096559',
    'Payment Screenshot Link': 'https://drive.google.com/open?id=1sample_proof_sora',
    'Leader Name': 'Ankit Kumar Raj',
    'Leader Email': 'ankitraj18750@gmail.com',
    'Leader Contact': '9798337249',
    'Leader College': 'BIT Sindri',
    'Leader Course & Year': 'BTech CSE ,1st Year',
    'Member 2 Name': 'Aman Kumar',
    'Member 2 Contact': '7061368979',
    'Member 3 Name': '',
    'Member 3 Contact': '',
    'Member 4 Name': '',
    'Member 4 Contact': '',
    'wrong UTR': 'FALSE',
    'google form response': 'TRUE'
  },
  {
    TimeStamp: '9/9/2026 20:15:22',
    'Team Name': 'DevSync',
    'WiFi ID': 'Team2',
    'WiFi Password': '9876543210',
    'Team Size': 4,
    'Transaction ID': 'UPI839201948572',
    'Payment Screenshot Link': 'https://drive.google.com/open?id=2sample_proof_devsync',
    'Leader Name': 'Priya Sharma',
    'Leader Email': 'priya.sharma@gmail.com',
    'Leader Contact': '9876543210',
    'Leader College': 'BIT Sindri',
    'Leader Course & Year': 'BTech IT ,2nd Year',
    'Member 2 Name': 'Rahul Verma',
    'Member 2 Contact': '9876543211',
    'Member 3 Name': 'Sneha Patel',
    'Member 3 Contact': '9876543212',
    'Member 4 Name': 'Amit Kumar',
    'Member 4 Contact': '9876543213',
    'wrong UTR': 'FALSE',
    'google form response': 'TRUE'
  }
];
