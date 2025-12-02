import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Role = "student" | "driver" | "admin";

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
    profile?: { name?: string; roll?: string; plate?: string }
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to login/logout automatically
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const ref = doc(db, "users", firebaseUser.uid);
      const snap = await getDoc(ref);
      const data = snap.data() || {};

      const role = (data.role || "student") as Role;

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        name: data.name ?? null,
        roll: data.roll ?? null,
        plate: data.plate ?? null,
      });

      setLoading(false);
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

    await setDoc(doc(db, "users", userCred.user.uid), {
      email,
      role,
      ...(profile?.name && { name: profile.name }),
      ...(profile?.roll && { roll: profile.roll }),
      ...(profile?.plate && { plate: profile.plate }),
      createdAt: new Date().toISOString(),
    });
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
