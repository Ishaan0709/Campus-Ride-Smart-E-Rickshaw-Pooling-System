import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  throw new Error(
    `Firebase config is missing: ${missingConfig.join(", ")}. Add them to .env.local.`
  );
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export type UserRole = "student" | "driver" | "admin";

export interface UserData {
  uid: string;
  name: string;
  roll: string;
  email: string;
  hostel?: string;
  role: UserRole;
  plate?: string;
  vehicleNumber?: string;
  phone?: string;
  licenseNumber?: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserProfileUpdate = Partial<
  Omit<UserData, "uid" | "createdAt" | "updatedAt">
>;

function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  if (typeof value === "object") {
    const record = value as { toDate?: () => Date; seconds?: number };
    if (typeof record.toDate === "function") return record.toDate();
    if (typeof record.seconds === "number") return new Date(record.seconds * 1000);
  }
  return new Date();
}

export const createUserDocument = async (
  user: { uid: string; email?: string | null },
  additionalData: UserProfileUpdate = {}
) => {
  if (!user?.uid) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const plate = additionalData.plate || additionalData.vehicleNumber || "";

  const payload = {
    uid: user.uid,
    email: additionalData.email || user.email || "",
    name: additionalData.name || "",
    roll: additionalData.roll || "",
    hostel: additionalData.hostel || "",
    role: additionalData.role || "student",
    plate,
    vehicleNumber: additionalData.vehicleNumber || plate,
    phone: additionalData.phone || "",
    licenseNumber: additionalData.licenseNumber || "",
    ...(additionalData.status ? { status: additionalData.status } : {}),
    updatedAt: serverTimestamp(),
    ...(!userSnap.exists() ? { createdAt: serverTimestamp() } : {}),
  };

  await setDoc(userRef, payload, { merge: true });
};

export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;

    const data = userSnap.data();
    const plate = data.plate || data.vehicleNumber || "";

    return {
      uid: data.uid || userId,
      name: data.name || "",
      roll: data.roll || "",
      email: data.email || "",
      hostel: data.hostel || "",
      role: (data.role || "student") as UserRole,
      plate,
      vehicleNumber: data.vehicleNumber || plate,
      phone: data.phone || "",
      licenseNumber: data.licenseNumber || "",
      status: data.status || "",
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};

export const updateUserProfile = async (
  userId: string,
  data: UserProfileUpdate
) => {
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  await setDoc(
    doc(db, "users", userId),
    {
      uid: userId,
      ...cleaned,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return true;
};

export function authErrorMessage(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code?: string }).code)
      : "";

  const messages: Record<string, string> = {
    "auth/email-already-in-use":
      "An account with this email already exists. Sign in instead.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account found with this email.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
    "auth/network-request-failed":
      "Network error. Check your connection and try again.",
    "permission-denied": "Could not save your profile. Firestore denied the write.",
  };

  if (messages[code]) return messages[code];
  if (err instanceof Error && err.message) return err.message;
  return "Authentication failed";
}
