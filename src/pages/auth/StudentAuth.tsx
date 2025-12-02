import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function StudentAuth() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password || (!isLogin && (!name || !roll))) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);

      if (isLogin) {
        await login(email, password);
        toast.success("Logged in as student");
      } else {
        // 👇 YAHAN PROFILE BHI JA RAHA HAI
        await signup(email, password, "student", { name, roll });
        toast.success("Account created successfully!");
      }

      navigate("/student");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Authentication failed");
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
            <div className="p-4 rounded-2xl bg-[#AA0000]/15 text-4xl flex items-center justify-center">
              🎓
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
            Student Portal
          </h1>
          <p className="text-center text-gray-600 mb-6">
            {isLogin ? "Sign in to book rides" : "Create your student account"}
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
                  <Label>Roll Number</Label>
                  <Input
                    type="text"
                    placeholder="e.g. 102303795"
                    value={roll}
                    onChange={(e) => setRoll(e.target.value)}
                    className="border-red-200"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="your.email@thapar.edu"
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
        </div>
      </motion.div>
    </div>
  );
}
