// src/pages/auth/DriverAuth.tsx

import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { useAuth } from "@/store/AuthContext";
import { authErrorMessage } from "@/lib/firebase";
import { DEMO_DRIVER, enterDemo } from "@/lib/demoAccounts";

export default function DriverAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { signup, login } = useAuth();          // 👈 from AuthContext

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || (!isLogin && (!name || !plate))) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      if (isLogin) {
        await login(email, password, "driver");
        toast.success("Logged in successfully!");
      } else {
        await signup(email, password, "driver", { name, plate });
        toast.success("Driver account created successfully!");
      }

      navigate("/driver"); // Go to driver dashboard
    } catch (err: unknown) {
      console.error(err);
      toast.error(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E6DADA] p-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 text-gray-600 hover:text-black"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl p-8 bg-white shadow-2xl border border-red-200">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-2xl bg-[#AA0000]/15 text-4xl">
              🚗
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
            Driver Portal
          </h1>

          <p className="text-center text-gray-600 mb-6">
            {isLogin ? "Sign in to start driving" : "Create your driver account"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-red-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vehicle Number</Label>
                  <Input
                    type="text"
                    placeholder="PB11-ER-4101"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="border-red-200"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="driver@thapar.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-red-200"
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-red-200"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#AA0000] hover:bg-[#8A0000] text-white font-semibold py-3 rounded-xl"
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-700 hover:text-[#AA0000] transition"
            >
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <span className="ml-1 font-semibold text-[#AA0000]">
                {isLogin ? "Sign Up" : "Sign In"}
              </span>
            </button>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-[#AA0000] py-3 text-sm font-semibold text-[#AA0000]"
            onClick={() => {
              enterDemo("driver");
              navigate("/driver");
            }}
          >
            Demo driver · {DEMO_DRIVER.name}
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">Open this beside the student demo. No Firebase account is created.</p>
        </div>
      </motion.div>
    </div>
  );
}
