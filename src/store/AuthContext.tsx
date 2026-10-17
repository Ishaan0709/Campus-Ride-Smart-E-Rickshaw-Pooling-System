import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";
import { auth, createUserDocument, getUserData, UserRole } from "@/lib/firebase";

type Role = UserRole;

interface AppUser {
  uid: string;
  email: string | null;
  role: Role;
  name?: string | null;
  roll?: string | null;
  plate?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signup: (
    email: string,
    password: string,
    role: Role,
    profile?: { name?: string; roll?: string; plate?: string; hostel?: string }
  ) => Promise<void>;
  login: (email: string, password: string, expectedRole?: Role) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const data = await getUserData(firebaseUser.uid);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: data?.role || "student",
          name: data?.name ?? null,
          roll: data?.roll ?? null,
          plate: data?.plate ?? data?.vehicleNumber ?? null,
        });
      } catch (error) {
        console.error("Failed to load the signed-in profile:", error);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: "student",
        });
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  const signup: AuthContextType["signup"] = async (
    email,
    password,
    role,
    profile
  ) => {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    try {
      await createUserDocument(userCred.user, {
        email,
        role,
        name: profile?.name || "",
        roll: profile?.roll || "",
        plate: profile?.plate || "",
        vehicleNumber: profile?.plate || "",
        hostel: profile?.hostel || "",
      });
    } catch (error) {
      await userCred.user.delete().catch(() => undefined);
      throw error;
    }
  };

  const login = async (email: string, password: string, expectedRole?: Role) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (!expectedRole) return;

    const profile = await getUserData(credential.user.uid);
    if (profile?.role && profile.role !== expectedRole) {
      await signOut(auth);
      throw new Error(
        `This account is a ${profile.role} account. Use the ${profile.role} portal.`
      );
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] text-gray-700">
          Connecting to Campus Ride...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
