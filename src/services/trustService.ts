import { doc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';

export interface UserTrust {
  user_id: string;
  score: number;
  days_active: number;
  contests_voted: number;
  vote_diversity: number;
  last_updated: string;
  level: 'new' | 'regular' | 'trusted' | 'senior';
}

export async function getTrustData(
  userId: string
): Promise<{ data: UserTrust | null; error: string | null }> {
  try {
    const snap = await getDoc(doc(db, 'user_trust', userId));
    if (snap.exists()) {
      return { data: snap.data() as UserTrust, error: null };
    }
    return {
      data: {
        user_id: userId,
        score: 1.0,
        level: 'new',
        days_active: 1,
        contests_voted: 0,
        vote_diversity: 0,
        last_updated: new Date().toISOString(),
      },
      error: null,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `user_trust/${userId}`);
  }
}

export async function getMyTrust(): Promise<{ data: UserTrust | null; error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { data: null, error: null };
  return getTrustData(user.uid);
}
