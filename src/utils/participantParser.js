import { Coffee, Sun, Moon, Cookie, Sparkles } from 'lucide-react';

export const MEAL_SLOTS = [
  {
    key: 'breakfast',
    name: 'Day 1 Breakfast',
    shortName: 'Breakfast',
    time: 'Day 1 – Morning',
    icon: Coffee,
    color: 'amber',
    menu: 'Idli (3 pcs) + Sambar + Chutney'
  },
  {
    key: 'lunch',
    name: 'Lunch',
    shortName: 'Lunch',
    time: 'Day 1 – Afternoon',
    icon: Sun,
    color: 'sky',
    menu: 'Pulaw + Puri (2) + Dal + Mix Veg + Salad + Chips + Mitha Chatni + Butter Paneer Masala + Sweets (1pc)'
  },
  {
    key: 'snacks',
    name: 'Evening Snacks',
    shortName: 'Evening Snacks',
    time: 'Day 1 – Evening',
    icon: Cookie,
    color: 'rose',
    menu: 'Tea with Biscuit'
  },
  {
    key: 'dinner',
    name: 'Dinner',
    shortName: 'Dinner',
    time: 'Day 1 – Night',
    icon: Moon,
    color: 'indigo',
    menu: 'Dal Puri (4 pcs) + Jeera Rice + Chana Daal Tadka + Aloo Dum + Jalebi (1pc)',
    note: 'Night Coffee: Coffee served at 12 AM and 4 AM'
  },
  {
    key: 'next_breakfast',
    name: 'Day 2 Breakfast',
    shortName: 'Day 2 Breakfast',
    time: 'Day 2 – Morning',
    icon: Coffee,
    color: 'emerald',
    menu: 'Kachori (5 pcs) + Kawli Chana + Jalebi (1pc)'
  }
];

export const createDefaultMealsArray = (customStatus = {}) => [
  {
    name: 'breakfast',
    title: 'Day 1 Breakfast',
    timing: 'Day 1 – Morning',
    claimed: customStatus.breakfast?.claimed ?? false,
    claimedAt: customStatus.breakfast?.claimedAt ?? null
  },
  {
    name: 'lunch',
    title: 'Lunch',
    timing: 'Day 1 – Afternoon',
    claimed: customStatus.lunch?.claimed ?? false,
    claimedAt: customStatus.lunch?.claimedAt ?? null
  },
  {
    name: 'snacks',
    title: 'Evening Snacks',
    timing: 'Day 1 – Evening',
    claimed:
      customStatus.snacks?.claimed ??
      customStatus.eveningSnacks?.claimed ??
      customStatus.midnightSnacks?.claimed ??
      false,
    claimedAt:
      customStatus.snacks?.claimedAt ??
      customStatus.eveningSnacks?.claimedAt ??
      customStatus.midnightSnacks?.claimedAt ??
      null
  },
  {
    name: 'dinner',
    title: 'Dinner',
    timing: 'Day 1 – Night',
    claimed: customStatus.dinner?.claimed ?? false,
    claimedAt: customStatus.dinner?.claimedAt ?? null
  },
  {
    name: 'next_breakfast',
    title: 'Day 2 Breakfast',
    timing: 'Day 2 – Morning',
    claimed:
      customStatus.next_breakfast?.claimed ??
      customStatus.nextBreakfast?.claimed ??
      customStatus.day2_breakfast?.claimed ??
      false,
    claimedAt:
      customStatus.next_breakfast?.claimedAt ??
      customStatus.nextBreakfast?.claimedAt ??
      customStatus.day2_breakfast?.claimedAt ??
      null
  }
];

/**
 * Returns the Firestore document field key where this member's meal array is saved.
 * Member 1 (Leader): 'meal'
 * Member 2: 'member2Meal'
 * Member 3: 'member3Meal'
 * Member 4: 'member4Meal'
 */
export const getMemberMealFieldKey = (memberIndex) => {
  if (memberIndex === 1 || memberIndex === '1' || !memberIndex) {
    return 'meal';
  }
  return `member${memberIndex}Meal`;
};

/**
 * Normalizes member meal array so all 5 slots are guaranteed to exist
 */
export const normalizeMemberMeals = (rawMealArray) => {
  const defaultMeals = createDefaultMealsArray();
  if (!Array.isArray(rawMealArray) || rawMealArray.length === 0) {
    return defaultMeals;
  }

  return defaultMeals.map((defSlot) => {
    const matched = rawMealArray.find((m) => {
      if (!m) return false;
      const mName = String(m.name || '').toLowerCase();
      const mTitle = String(m.title || '').toLowerCase();
      const defKey = defSlot.name.toLowerCase();

      if (defKey === 'next_breakfast') {
        return (
          mName === 'next_breakfast' ||
          mName === 'day2_breakfast' ||
          mName === 'nextbreakfast' ||
          mTitle.includes('day 2') ||
          mTitle.includes('next day')
        );
      }
      if (defKey === 'breakfast') {
        return (
          (mName === 'breakfast' || mTitle.includes('breakfast')) &&
          !mName.includes('next') &&
          !mName.includes('day2') &&
          !mTitle.includes('day 2')
        );
      }
      if (defKey === 'snacks') {
        return mName === 'snacks' || mName.includes('snack') || mTitle.includes('snack');
      }
      return mName === defKey || mTitle.includes(defKey);
    });

    if (matched) {
      return {
        ...defSlot,
        claimed: !!matched.claimed,
        claimedAt: matched.claimedAt || null
      };
    }
    return defSlot;
  });
};

/**
 * Parses a Firestore document (team record) into an array of individual member objects.
 */
export const parseTeamDocToMembers = (docData, docId = '') => {
  if (!docData) return [];

  const members = [];
  const teamName = docData['Team Name'] || docData.teamName || docData['Team'] || 'Team';
  const college = docData['Leader College'] || docData['collegeName'] || docData['College Name'] || docData['College'] || '';
  const specialId = docData['Special ID'] || docData.specialId || docId;
  const foodPref = docData['Food Preference'] || docData.foodPreference || 'Veg';

  // 1. Check Leader (Member 1)
  const leaderName = docData['Leader Name'] || docData.leaderName || docData['Full Name'] || docData['Name'] || docData.name;
  const leaderEmail = docData['Leader Email'] || docData.leaderEmail || docData['Email'] || docData.email || '';
  const leaderContact = docData['Leader Contact'] || docData.leaderContact || docData['Leader Phone'] || docData.leaderPhone || docData['Phone'] || docData.phone || '';
  const leaderCourse = docData['Leader Course & Year'] || docData.leaderCourse || '';
  const leaderMeal = docData.meal || docData.leaderMeal || docData.member1Meal || docData.meals;

  if (leaderName || leaderEmail || leaderContact || docData.meal || docData.member2Meal) {
    members.push({
      _docId: docId || docData._docId,
      _memberIndex: 1,
      memberNum: 1,
      isLeader: true,
      name: leaderName || 'Team Leader',
      'Full Name': leaderName || 'Team Leader',
      email: leaderEmail,
      Email: leaderEmail,
      phone: leaderContact,
      Phone: leaderContact,
      'Leader Phone': leaderContact,
      college: docData['Leader College'] || college,
      'College Name': docData['Leader College'] || college,
      course: leaderCourse,
      foodPreference: foodPref,
      'Food Preference': foodPref,
      specialId: specialId,
      'Special ID': specialId,
      teamName: teamName,
      'Team Name': teamName,
      meal: normalizeMemberMeals(leaderMeal),
      foodManagement: docData.foodManagement?.leader || docData.foodManagement?.member1 || (typeof docData.foodManagement === 'object' ? docData.foodManagement : {})
    });
  }

  // 2. Members 2 up to 8
  for (let num = 2; num <= 8; num++) {
    const nameKey = `Member ${num} Name`;
    const nameAlt = `Member${num}Name`;
    const contactKey = `Member ${num} Contact`;
    const contactAlt = `Member ${num} Phone`;
    const contactAlt2 = `Member${num}Phone`;
    const contactAlt3 = `Member${num}Contact`;
    const emailKey = `Member ${num} Email`;
    const emailAlt = `Member${num}Email`;
    const collegeKey = `Member ${num} College`;
    const courseKey = `Member ${num} Course & Year`;

    const mName = docData[nameKey] || docData[nameAlt] || docData[`member_${num}_name`];
    const mContact = docData[contactKey] || docData[contactAlt] || docData[contactAlt2] || docData[contactAlt3] || docData[`member_${num}_contact`];
    const mEmail = docData[emailKey] || docData[emailAlt] || docData[`member_${num}_email`];
    const mCollege = docData[collegeKey] || college;
    const mCourse = docData[courseKey] || '';

    const mealKey = `member${num}Meal`;
    const mealAlt = `Member${num}Meal`;
    const mMeal = docData[mealKey] || docData[mealAlt];

    if (mName || mContact || mEmail || mMeal) {
      members.push({
        _docId: docId || docData._docId,
        _memberIndex: num,
        memberNum: num,
        isLeader: false,
        name: mName || `Member ${num}`,
        'Full Name': mName || `Member ${num}`,
        email: mEmail || '',
        Email: mEmail || '',
        phone: mContact || '',
        Phone: mContact || '',
        'Leader Phone': leaderContact,
        college: mCollege,
        'College Name': mCollege,
        course: mCourse,
        foodPreference: docData[`Member ${num} Food Preference`] || foodPref,
        'Food Preference': docData[`Member ${num} Food Preference`] || foodPref,
        specialId: `${specialId}_M${num}`,
        'Special ID': `${specialId}_M${num}`,
        teamName: teamName,
        'Team Name': teamName,
        meal: normalizeMemberMeals(mMeal),
        foodManagement: docData.foodManagement?.[`member${num}`] || {}
      });
    }
  }

  // 3. Fallback: doc.members array
  if (members.length === 0 && Array.isArray(docData.members) && docData.members.length > 0) {
    docData.members.forEach((m, i) => {
      members.push({
        _docId: docId || docData._docId,
        _memberIndex: i + 1,
        memberNum: i + 1,
        isLeader: i === 0 || !!m.isLeader,
        name: m.name || m['Full Name'] || `Member ${i + 1}`,
        'Full Name': m.name || m['Full Name'] || `Member ${i + 1}`,
        email: m.email || m.Email || '',
        Email: m.email || m.Email || '',
        phone: m.phone || m.Phone || m.contact || '',
        Phone: m.phone || m.Phone || m.contact || '',
        college: m.college || college,
        'College Name': m.college || college,
        foodPreference: m.foodPreference || foodPref,
        'Food Preference': m.foodPreference || foodPref,
        specialId: m.specialId || `${specialId}_M${i + 1}`,
        'Special ID': m.specialId || `${specialId}_M${i + 1}`,
        teamName: teamName,
        'Team Name': teamName,
        meal: normalizeMemberMeals(m.meal),
        foodManagement: m.foodManagement || {}
      });
    });
  }

  // 4. Fallback: single doc single participant
  if (members.length === 0) {
    members.push({
      _docId: docId || docData._docId,
      _memberIndex: 1,
      memberNum: 1,
      isLeader: true,
      name: docData['Full Name'] || docData.name || 'Participant',
      'Full Name': docData['Full Name'] || docData.name || 'Participant',
      email: docData.Email || docData.email || '',
      Email: docData.Email || docData.email || '',
      phone: docData.Phone || docData.phone || '',
      Phone: docData.Phone || docData.phone || '',
      college: college,
      teamName: teamName,
      'Team Name': teamName,
      specialId: specialId,
      'Special ID': specialId,
      meal: normalizeMemberMeals(docData.meal),
      foodManagement: docData.foodManagement || {}
    });
  }

  return members;
};

/**
 * Check if a meal is claimed for a member object.
 */
export const getMealClaimed = (member, mealKey) => {
  if (!member) return { claimed: false, claimedAt: null };

  const mealArr = member.meal || member.meals;
  const slot = MEAL_SLOTS.find((s) => s.key === mealKey);
  const slotName = slot?.name ?? '';

  if (Array.isArray(mealArr)) {
    const found = mealArr.find((m) => {
      if (!m) return false;
      const mName = String(m.name || '').toLowerCase();
      const mTitle = String(m.title || '').toLowerCase();
      const target = mealKey.toLowerCase();

      if (target === 'next_breakfast') {
        return (
          mName === 'next_breakfast' ||
          mName === 'day2_breakfast' ||
          mName === 'nextbreakfast' ||
          mTitle.includes('day 2') ||
          mTitle.includes('next day')
        );
      }
      if (target === 'breakfast') {
        return (
          (mName === 'breakfast' || mTitle.includes('breakfast')) &&
          !mName.includes('next') &&
          !mName.includes('day2') &&
          !mTitle.includes('day 2')
        );
      }
      if (target === 'snacks') {
        return mName === 'snacks' || mName.includes('snack') || mTitle.includes('snack');
      }
      return mName === target || mTitle.includes(target) || mTitle === slotName.toLowerCase();
    });

    if (found !== undefined) {
      return { claimed: !!found.claimed, claimedAt: found.claimedAt || null };
    }
  }

  const fm = member.foodManagement || {};
  const entry =
    fm[mealKey] ||
    (mealKey === 'snacks' ? fm.eveningSnacks || fm.midnightSnacks : null) ||
    (mealKey === 'next_breakfast' ? fm.next_breakfast || fm.nextBreakfast || fm.day2_breakfast : null);

  return { claimed: !!entry?.claimed, claimedAt: entry?.claimedAt || null };
};
