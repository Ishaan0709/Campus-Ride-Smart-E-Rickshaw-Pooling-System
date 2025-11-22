import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

export default function AdminAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (email && password) {
      setCurrentUser({ role: "admin", id: "a1" });
      toast.success("Logged in successfully!");
      navigate("/admin");
    } else toast.error("Please fill all fields");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#DCD6D6]

 p-4">

      <Button
        variant="ghost"
        onClick={() => navigate('/')}
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

          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-2xl bg-[#AA0000]/15 text-4xl">
              🧑🏻‍💼
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
            Admin Portal
          </h1>
          <p className="text-center text-gray-600 mb-6">Sign in to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="admin@thapar.edu"
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
              className="w-full bg-[#AA0000] hover:bg-[#8A0000] text-white font-semibold py-3 rounded-xl"
            >
              Sign In
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
