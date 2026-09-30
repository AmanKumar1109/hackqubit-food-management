import {
  collection,
  doc,
  writeBatch,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { createDefaultMealsArray } from '../utils/participantParser';

export const DEFAULT_COLLECTION = 'hackathon_participants';

/**
 * Uploads an array of participant records parsed from Excel into Firestore using batches.
 * @param {Array<Object>} records - The array of parsed rows (key-value objects)
 * @param {String} collectionName - Target Firestore collection
 * @param {Function} onProgress - Progress callback function (uploadedCount, totalCount)
 */
export const uploadParticipantsToFirestore = async (
  records,
  collectionName = DEFAULT_COLLECTION,
  onProgress = null
) => {
  if (!records || records.length === 0) {
    throw new Error('No records to upload.');
  }

  const targetCollection = collection(db, collectionName || DEFAULT_COLLECTION);
  const BATCH_SIZE = 400; // Firestore limit is 500 operations per batch
  const total = records.length;
  let uploadedCount = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((item) => {
      // Remove temporary helper properties like _rowId
      const { _rowId, ...data } = item;

      // Determine document ID using 16-char alphanumeric Special ID
      const specialId =
        data['Special ID'] ||
        data['special_id'] ||
        data['SpecialID'] ||
        data['Participant ID'] ||
        data['Email'] ||
        null;

      const docRef = specialId
        ? doc(targetCollection, String(specialId).replace(/[/\\#?]/g, '_').trim())
        : doc(targetCollection);

      // Create standard 5-meal array
      const mealArray = createDefaultMealsArray();

      // Standardize metadata and member details with the 5 meal array
      const participantPayload = {
        name: data['Full Name'] || data['Name'] || data['name'] || '',
        email: data['Email'] || data['email'] || '',
        phone: data['Phone'] || data['phone'] || data['Mobile'] || '',
        specialId: specialId || docRef.id,
        teamName: data['Team Name'] || data['Team'] || data['teamName'] || '',
        collegeName: data['College Name'] || data['College'] || data['college'] || '',
        foodPreference: data['Food Preference'] || data['Food'] || data['Diet'] || 'Veg',
        // 5 Meals array: Day 1 Breakfast, Lunch, Evening Snacks, Dinner, Day 2 Breakfast
        meal: mealArray,
        mealList: ['breakfast', 'lunch', 'snacks', 'dinner', 'next_breakfast'],
        totalMeals: 5,
        mealsConsumed: 0,
        ...data,
        status: 'registered',
        uploadedAt: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      batch.set(docRef, participantPayload, { merge: true });
    });

    await batch.commit();
    uploadedCount += chunk.length;

    if (onProgress && typeof onProgress === 'function') {
      onProgress(uploadedCount, total);
    }
  }

  return {
    success: true,
    totalUploaded: uploadedCount,
    collectionName: collectionName || DEFAULT_COLLECTION
  };
};

/**
 * Fetches existing participants from Firestore for live preview
 */
export const fetchFirestoreParticipants = async (
  collectionName = DEFAULT_COLLECTION,
  maxRecords = 50
) => {
  try {
    const q = query(
      collection(db, collectionName || DEFAULT_COLLECTION),
      limit(maxRecords)
    );
    const snapshot = await getDocs(q);
    const results = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() });
    });
    return results;
  } catch (error) {
    console.error('Error fetching participants from Firestore:', error);
    throw error;
  }
};
