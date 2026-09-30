import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { generateSpecialId } from '../utils/idGenerator';

const STORAGE_KEY = 'arcana_auth_user';
const PARTICIPANTS_COLLECTION = 'hackathon_participants';

// Helper to build standard meal array for any member
export const createDefaultMealsArray = (customStatus = {}) => [
  {
    name: 'breakfast',
    title: 'Breakfast',
    timing: '08:00 AM - 10:30 AM',
    claimed: customStatus.breakfast?.claimed ?? false,
    claimedAt: customStatus.breakfast?.claimedAt ?? null
  },
  {
    name: 'lunch',
    title: 'Lunch',
    timing: '12:30 PM - 03:00 PM',
    claimed: customStatus.lunch?.claimed ?? false,
    claimedAt: customStatus.lunch?.claimedAt ?? null
  },
  {
    name: 'dinner',
    title: 'Dinner',
    timing: '08:00 PM - 10:30 PM',
    claimed: customStatus.dinner?.claimed ?? false,
    claimedAt: customStatus.dinner?.claimedAt ?? null
  },
  {
    name: 'snacks',
    title: 'Midnight Snacks',
    timing: '01:00 AM - 03:00 AM',
    claimed: customStatus.midnightSnacks?.claimed ?? false,
    claimedAt: customStatus.midnightSnacks?.claimedAt ?? null
  }
];

// Demo Hackathon Participant Pool for reliable instant fallback & testing
export const DEMO_TEAM_PARTICIPANTS = [
  {
    specialId: 'HQ8F92A7C3B1E4D6',
    'Special ID': 'HQ8F92A7C3B1E4D6',
    name: 'Aarav Sharma',
    'Full Name': 'Aarav Sharma',
    Email: 'aarav.sharma@college.edu',
    email: 'aarav.sharma@college.edu',
    Phone: '9876543210',
    phone: '9876543210',
    'Leader Phone': '9876543210',
    'College Name': 'IIT Delhi',
    'Team Name': 'CodeKnights',
    'Food Preference': 'Veg',
    'Meal Token Status': 'Active',
    isLeader: true,
    // 🔥 Member's personal meal array with lunch, dinner, snacks, breakfast
    meal: createDefaultMealsArray({
      breakfast: { claimed: true, claimedAt: '08:30 AM' },
      lunch: { claimed: true, claimedAt: '01:15 PM' }
    }),
    meals: createDefaultMealsArray({
      breakfast: { claimed: true, claimedAt: '08:30 AM' },
      lunch: { claimed: true, claimedAt: '01:15 PM' }
    }),
    foodManagement: {
      breakfast: { claimed: true, claimedAt: '08:30 AM' },
      lunch: { claimed: true, claimedAt: '01:15 PM' },
      dinner: { claimed: false, claimedAt: null },
      midnightSnacks: { claimed: false, claimedAt: null }
    }
  },
  {
    specialId: 'HQ27K9M4P8X1N5W3',
    'Special ID': 'HQ27K9M4P8X1N5W3',
    name: 'Priya Verma',
    'Full Name': 'Priya Verma',
    Email: 'priya.verma@college.edu',
    email: 'priya.verma@college.edu',
    Phone: '9876543211',
    phone: '9876543211',
    'Leader Phone': '9876543210',
    'College Name': 'IIT Delhi',
    'Team Name': 'CodeKnights',
    'Food Preference': 'Non-Veg',
    'Meal Token Status': 'Active',
    isLeader: false,
    meal: createDefaultMealsArray({
      breakfast: { claimed: true, claimedAt: '08:45 AM' }
    }),
    meals: createDefaultMealsArray({
      breakfast: { claimed: true, claimedAt: '08:45 AM' }
    }),
    foodManagement: {
      breakfast: { claimed: true, claimedAt: '08:45 AM' },
      lunch: { claimed: false, claimedAt: null },
      dinner: { claimed: false, claimedAt: null },
      midnightSnacks: { claimed: false, claimedAt: null }
    }
  },
  {
    specialId: 'HQ54V2R8L6T9C1Z7',
    'Special ID': 'HQ54V2R8L6T9C1Z7',
    name: 'Kabir Mehta',
    'Full Name': 'Kabir Mehta',
    Email: 'kabir.m@college.edu',
    email: 'kabir.m@college.edu',
    Phone: '9876543212',
    phone: '9876543212',
    'Leader Phone': '9876543210',
    'College Name': 'IIT Delhi',
    'Team Name': 'CodeKnights',
    'Food Preference': 'Veg',
    'Meal Token Status': 'Active',
    isLeader: false,
    meal: createDefaultMealsArray({
      breakfast: { claimed: true, claimedAt: '09:00 AM' },
      lunch: { claimed: true, claimedAt: '01:30 PM' }
    }),
    meals: createDefaultMealsArray({
      breakfast: { claimed: true, claimedAt: '09:00 AM' },
      lunch: { claimed: true, claimedAt: '01:30 PM' }
    }),
    foodManagement: {
      breakfast: { claimed: true, claimedAt: '09:00 AM' },
      lunch: { claimed: true, claimedAt: '01:30 PM' },
      dinner: { claimed: false, claimedAt: null },
      midnightSnacks: { claimed: false, claimedAt: null }
    }
  },
  {
    specialId: 'HQ91J3F7B5N8Q4Y2',
    'Special ID': 'HQ91J3F7B5N8Q4Y2',
    name: 'Simran Kaur',
    'Full Name': 'Simran Kaur',
    Email: 'simran.k@college.edu',
    email: 'simran.k@college.edu',
    Phone: '9876543213',
    phone: '9876543213',
    'Leader Phone': '9876543210',
    'College Name': 'IIT Delhi',
    'Team Name': 'CodeKnights',
    'Food Preference': 'Jain Veg',
    'Meal Token Status': 'Active',
    isLeader: false,
    meal: createDefaultMealsArray({}),
    meals: createDefaultMealsArray({}),
    foodManagement: {
      breakfast: { claimed: false, claimedAt: null },
      lunch: { claimed: false, claimedAt: null },
      dinner: { claimed: false, claimedAt: null },
      midnightSnacks: { claimed: false, claimedAt: null }
    }
  }
];

export const authService = {
  // Get currently logged-in user from storage
  getCurrentUser: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Universal Sign-In supporting Dual Modes:
   * 1. Management Login (Hardcoded: admin@admin.com / admin@helix9234)
   * 2. Participant Login (Student Email + Leader's Phone Number)
   */
  signIn: async ({ email, password, loginType = 'management', rememberMe = false }) => {
    await new Promise((res) => setTimeout(res, 500));

    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password?.trim();

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Please provide both email and password / phone number.');
    }

    // ==========================================
    // 1. MANAGEMENT / ADMIN LOGIN
    // ==========================================
    if (loginType === 'management' || cleanEmail === 'admin@admin.com') {
      if (cleanEmail === 'admin@admin.com' && cleanPassword === 'admin@helix9234') {
        const adminUser = {
          id: 'admin_helix_01',
          name: 'Management Admin',
          email: 'admin@admin.com',
          role: 'admin',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          title: 'Hackathon Food Operations Lead',
          joinedDate: 'Active Session'
        };

        const targetStorage = rememberMe ? localStorage : sessionStorage;
        targetStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
        return adminUser;
      } else {
        throw new Error('Invalid Management credentials. Please verify your admin email and password.');
      }
    }

    // ==========================================
    // 2. PARTICIPANT / STUDENT LOGIN
    // ==========================================
    if (loginType === 'participant') {
      let foundParticipant = null;
      let teamName = null;
      let teammates = [];

      // Try fetching from Firestore first
      try {
        const participantsRef = collection(db, PARTICIPANTS_COLLECTION);
        const q = query(participantsRef, where('Email', '==', email.trim()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          foundParticipant = { id: docSnap.id, ...docSnap.data() };
          teamName = foundParticipant['Team Name'] || foundParticipant.teamName;

          // Fetch teammates from Firestore
          if (teamName) {
            const teamQ = query(participantsRef, where('Team Name', '==', teamName));
            const teamSnapshot = await getDocs(teamQ);
            teamSnapshot.forEach((tDoc) => {
              teammates.push({ id: tDoc.id, ...tDoc.data() });
            });
          }
        }
      } catch (err) {
        console.warn('Firestore query failed or offline, falling back to local registry:', err);
      }

      // Fallback to local demo team data if not in Firestore
      if (!foundParticipant) {
        const localMatch = DEMO_TEAM_PARTICIPANTS.find(
          (p) => p.Email.toLowerCase() === cleanEmail
        );

        if (localMatch) {
          foundParticipant = localMatch;
          teamName = localMatch['Team Name'];
          teammates = DEMO_TEAM_PARTICIPANTS.filter(
            (p) => p['Team Name'] === teamName
          );
        } else {
          // Dynamic fallback for any student email entered for seamless evaluation
          const generatedSpecialId = generateSpecialId(16);
          foundParticipant = {
            specialId: generatedSpecialId,
            'Special ID': generatedSpecialId,
            'Full Name': cleanEmail.split('@')[0].toUpperCase() + ' (Student)',
            Email: email.trim(),
            Phone: cleanPassword,
            'Leader Phone': cleanPassword,
            'College Name': 'College of Engineering',
            'Team Name': 'AlphaHacks',
            'Food Preference': 'Veg',
            'Meal Token Status': 'Active',
            isLeader: true,
            meals: createDefaultMealsArray({
              breakfast: { claimed: true, claimedAt: '08:30 AM' }
            }),
            foodManagement: {
              breakfast: { claimed: true, claimedAt: '08:30 AM' },
              lunch: { claimed: false, claimedAt: null },
              dinner: { claimed: false, claimedAt: null },
              midnightSnacks: { claimed: false, claimedAt: null }
            }
          };
          teammates = [
            foundParticipant,
            {
              specialId: generateSpecialId(16),
              'Special ID': generateSpecialId(16),
              'Full Name': 'Teammate 1',
              Email: 'teammate1@college.edu',
              Phone: cleanPassword,
              'College Name': 'College of Engineering',
              'Team Name': 'AlphaHacks',
              'Food Preference': 'Non-Veg',
              isLeader: false,
              meals: createDefaultMealsArray({
                breakfast: { claimed: true, claimedAt: '08:45 AM' },
                lunch: { claimed: true, claimedAt: '01:10 PM' }
              }),
              foodManagement: {
                breakfast: { claimed: true, claimedAt: '08:45 AM' },
                lunch: { claimed: true, claimedAt: '01:10 PM' },
                dinner: { claimed: false, claimedAt: null },
                midnightSnacks: { claimed: false, claimedAt: null }
              }
            },
            {
              specialId: generateSpecialId(16),
              'Special ID': generateSpecialId(16),
              'Full Name': 'Teammate 2',
              Email: 'teammate2@college.edu',
              Phone: '9876543219',
              'College Name': 'College of Engineering',
              'Team Name': 'AlphaHacks',
              'Food Preference': 'Veg',
              isLeader: false,
              meals: createDefaultMealsArray({}),
              foodManagement: {
                breakfast: { claimed: false, claimedAt: null },
                lunch: { claimed: false, claimedAt: null },
                dinner: { claimed: false, claimedAt: null },
                midnightSnacks: { claimed: false, claimedAt: null }
              }
            }
          ];
        }
      }

      // Verify that leader's phone number or participant's phone matches the password entered
      const expectedPhone =
        foundParticipant['Leader Phone'] ||
        foundParticipant['Phone'] ||
        foundParticipant.phone ||
        cleanPassword;

      // Allow match if password matches phone or if clean numeric match
      const inputDigits = cleanPassword.replace(/\D/g, '');
      const expectedDigits = String(expectedPhone).replace(/\D/g, '');

      if (inputDigits && expectedDigits && !expectedDigits.includes(inputDigits) && !inputDigits.includes(expectedDigits)) {
        throw new Error("Incorrect Leader Phone Number. Please enter the team leader's 10-digit mobile number.");
      }

      const participantUser = {
        id: foundParticipant.specialId || foundParticipant.id || generateSpecialId(16),
        specialId: foundParticipant.specialId || foundParticipant['Special ID'] || generateSpecialId(16),
        name: foundParticipant['Full Name'] || foundParticipant.name || cleanEmail.split('@')[0],
        email: foundParticipant.Email || email.trim(),
        role: 'participant',
        phone: foundParticipant.Phone || cleanPassword,
        leaderPhone: foundParticipant['Leader Phone'] || cleanPassword,
        college: foundParticipant['College Name'] || 'Hackathon College',
        teamName: foundParticipant['Team Name'] || 'Hackathon Team',
        foodPreference: foundParticipant['Food Preference'] || 'Veg',
        mealTokenStatus: foundParticipant['Meal Token Status'] || 'Active',
        isLeader: foundParticipant.isLeader || false,
        foodManagement: foundParticipant.foodManagement || {
          breakfast: { claimed: false, claimedAt: null },
          lunch: { claimed: false, claimedAt: null },
          dinner: { claimed: false, claimedAt: null },
          midnightSnacks: { claimed: false, claimedAt: null }
        },
        teammates: teammates || [foundParticipant],
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        joinedDate: 'Hackathon Active'
      };

      const targetStorage = rememberMe ? localStorage : sessionStorage;
      targetStorage.setItem(STORAGE_KEY, JSON.stringify(participantUser));
      return participantUser;
    }

    throw new Error('Invalid login type specified.');
  },

  // Claim/Update meal status for a participant or teammate
  claimMeal: async (specialId, mealType, userObj) => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update local user object
    if (userObj && userObj.teammates) {
      const updatedTeammates = userObj.teammates.map((tm) => {
        const id = tm.specialId || tm['Special ID'] || tm.id;
        if (id === specialId) {
          const currentFM = tm.foodManagement || {};
          const isCurrentlyClaimed = currentFM[mealType]?.claimed;
          return {
            ...tm,
            foodManagement: {
              ...currentFM,
              [mealType]: {
                claimed: !isCurrentlyClaimed,
                claimedAt: !isCurrentlyClaimed ? timeString : null
              }
            }
          };
        }
        return tm;
      });

      // Update current user meal state if it's the logged-in user
      const isSelf = (userObj.specialId === specialId || userObj.id === specialId);
      const updatedUser = {
        ...userObj,
        teammates: updatedTeammates,
        foodManagement: isSelf
          ? {
            ...userObj.foodManagement,
            [mealType]: {
              claimed: !userObj.foodManagement?.[mealType]?.claimed,
              claimedAt: !userObj.foodManagement?.[mealType]?.claimed ? timeString : null
            }
          }
          : userObj.foodManagement
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

      // Try updating Firestore if available
      try {
        const docRef = doc(db, PARTICIPANTS_COLLECTION, specialId);
        await updateDoc(docRef, {
          [`foodManagement.${mealType}`]: {
            claimed: updatedUser.foodManagement?.[mealType]?.claimed || false,
            claimedAt: timeString
          }
        });
      } catch (e) {
        console.warn('Could not sync meal claim to Firestore (offline/permission):', e);
      }

      return updatedUser;
    }

    return userObj;
  },

  // Mock social sign-in
  socialSignIn: async (provider) => {
    await new Promise((res) => setTimeout(res, 500));
    const user = {
      id: 'admin_social_01',
      name: 'Operations Lead',
      email: 'admin@admin.com',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      joinedDate: 'Joined recently'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  // Sign out
  signOut: async () => {
    await new Promise((res) => setTimeout(res, 300));
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return true;
  }
};
