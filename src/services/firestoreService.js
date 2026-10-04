import {
  collection,
  doc,
  writeBatch,
  getDocs,
  serverTimestamp,
  query,
  limit,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { sanitizeTeamRow } from '../utils/teamSchema';

export const DEFAULT_COLLECTION = 'hackathon_participants';

/**
 * Uploads an array of structured team records parsed from Excel into Firestore using batches.
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

    chunk.forEach((item, index) => {
      // Ensure row is strictly formatted with the canonical Hackathon Team Schema
      const structuredItem = item.leader && item.specialId
        ? item
        : sanitizeTeamRow(item, uploadedCount + index);

      // Remove temporary helper properties like _rowId
      const { _rowId, ...data } = structuredItem;

      // Document ID: 16-character alphanumeric Special ID
      const specialId = String(data.specialId || data['Special ID'])
        .replace(/[/\\#?]/g, '_')
        .trim();

      const docRef = doc(targetCollection, specialId);

      // Standardize metadata and timestamps
      const ts =
        data.TimeStamp ||
        data.timestamp ||
        data.registration?.timestamp ||
        new Date().toISOString();

      const teamPayload = {
        ...data,
        specialId,
        'Special ID': specialId,
        TimeStamp: ts,
        timestamp: ts,
        status: data.status || 'registered',
        uploadedAt: serverTimestamp(),
        createdAt: data.createdAt || new Date().toISOString()
      };

      batch.set(docRef, teamPayload, { merge: true });
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

/**
 * Real-time subscription to all participant documents in Firestore
 */
export const subscribeToAllParticipants = (
  onUpdate,
  onError = null,
  collectionName = DEFAULT_COLLECTION
) => {
  const colRef = collection(db, collectionName || DEFAULT_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const records = [];
      snapshot.forEach((docSnap) => {
        records.push({ _docId: docSnap.id, id: docSnap.id, ...docSnap.data() });
      });
      onUpdate(records);
    },
    (err) => {
      console.error('Real-time subscription error:', err);
      if (onError) onError(err);
    }
  );
};

/**
 * Updates a participant team record in Firestore.
 * Special ID is strictly immutable and protected from alteration.
 */
export const updateParticipantInFirestore = async (
  docId,
  formData,
  collectionName = DEFAULT_COLLECTION
) => {
  if (!docId) {
    throw new Error('Participant Document ID is required for update.');
  }

  const docRef = doc(db, collectionName || DEFAULT_COLLECTION, docId);

  // Extract values ensuring strings
  const teamName = String(formData.teamName || formData['Team Name'] || '').trim();
  const wifiId = String(formData.wifiId || formData['WiFi ID'] || '').trim();
  const wifiPassword = String(formData.wifiPassword || formData['WiFi Password'] || '').trim();
  const teamSize = parseInt(formData.teamSize || formData['Team Size'], 10) || 1;

  const timestamp = String(formData.timestamp || formData.TimeStamp || '').trim();
  const transactionId = String(formData.transactionId || formData['Transaction ID'] || '').trim();
  const paymentScreenshotLink = String(formData.paymentScreenshotLink || formData['Payment Screenshot Link'] || '').trim();
  const wrongUtr = String(formData.wrongUtr || formData['wrong UTR'] || 'FALSE').trim();
  const googleFormResponse = String(formData.googleFormResponse || formData['google form response'] || 'TRUE').trim();

  const leaderName = String(formData.leaderName || formData['Leader Name'] || '').trim();
  const leaderEmail = String(formData.leaderEmail || formData['Leader Email'] || '').trim();
  const leaderContact = String(formData.leaderContact || formData['Leader Contact'] || '').trim();
  const leaderCollege = String(formData.leaderCollege || formData['Leader College'] || '').trim();
  const leaderCourse = String(formData.leaderCourse || formData['Leader Course & Year'] || '').trim();

  const member2Name = String(formData.member2Name || formData['Member 2 Name'] || '').trim();
  const member2Contact = String(formData.member2Contact || formData['Member 2 Contact'] || '').trim();

  const member3Name = String(formData.member3Name || formData['Member 3 Name'] || '').trim();
  const member3Contact = String(formData.member3Contact || formData['Member 3 Contact'] || '').trim();

  const member4Name = String(formData.member4Name || formData['Member 4 Name'] || '').trim();
  const member4Contact = String(formData.member4Contact || formData['Member 4 Contact'] || '').trim();

  // Rebuild structured members array preserving meals if existing
  const existingMembers = Array.isArray(formData.members) ? formData.members : [];
  const getExistingMeals = (memberNum) => {
    const existing = existingMembers.find((m) => m.memberNum === memberNum);
    return existing?.meal || existing?.meals || [];
  };

  const updatedMembers = [
    {
      memberNum: 1,
      isLeader: true,
      name: leaderName,
      email: leaderEmail,
      contact: leaderContact,
      college: leaderCollege,
      course: leaderCourse,
      meal: getExistingMeals(1).length ? getExistingMeals(1) : (formData.meal || [])
    }
  ];

  if (member2Name || member2Contact) {
    updatedMembers.push({
      memberNum: 2,
      isLeader: false,
      name: member2Name,
      contact: member2Contact,
      college: leaderCollege,
      meal: getExistingMeals(2).length ? getExistingMeals(2) : (formData.member2Meal || [])
    });
  }

  if (member3Name || member3Contact) {
    updatedMembers.push({
      memberNum: 3,
      isLeader: false,
      name: member3Name,
      contact: member3Contact,
      college: leaderCollege,
      meal: getExistingMeals(3).length ? getExistingMeals(3) : (formData.member3Meal || [])
    });
  }

  if (member4Name || member4Contact) {
    updatedMembers.push({
      memberNum: 4,
      isLeader: false,
      name: member4Name,
      contact: member4Contact,
      college: leaderCollege,
      meal: getExistingMeals(4).length ? getExistingMeals(4) : (formData.member4Meal || [])
    });
  }

  // Construct payload with flat, camelCase, and nested properties
  // Note: 'Special ID', specialId, id are NOT modified to preserve immutability
  const updatePayload = {
    'Team Name': teamName,
    teamName,
    'WiFi ID': wifiId,
    wifiId,
    'WiFi Password': wifiPassword,
    wifiPassword,
    'Team Size': teamSize,
    teamSize,

    TimeStamp: timestamp,
    timestamp,
    'Transaction ID': transactionId,
    'Payment Screenshot Link': paymentScreenshotLink,
    'wrong UTR': wrongUtr,
    wrongUtr,
    'google form response': googleFormResponse,
    googleFormResponse,
    registration: {
      timestamp,
      transactionId,
      paymentScreenshotLink,
      wrongUtr,
      googleFormResponse
    },

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

    'Member 2 Name': member2Name,
    'Member 2 Contact': member2Contact,

    'Member 3 Name': member3Name,
    'Member 3 Contact': member3Contact,

    'Member 4 Name': member4Name,
    'Member 4 Contact': member4Contact,

    members: updatedMembers,
    updatedAt: serverTimestamp()
  };

  await updateDoc(docRef, updatePayload);
  return { success: true, docId, updatedPayload };
};

/**
 * Deletes a participant team from Firestore
 */
export const deleteParticipantFromFirestore = async (
  docId,
  collectionName = DEFAULT_COLLECTION
) => {
  if (!docId) throw new Error('Document ID is required for deletion.');
  const docRef = doc(db, collectionName || DEFAULT_COLLECTION, docId);
  await deleteDoc(docRef);
  return { success: true, docId };
};
