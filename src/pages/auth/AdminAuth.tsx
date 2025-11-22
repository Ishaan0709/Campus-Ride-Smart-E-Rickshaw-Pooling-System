import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

export default function AdminAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (email && password) {
      setCurrentUser({ role: 'admin', id: 'admin1' });
      toast.success('Admin login successful!');
      navigate('/admin');
    } else {
      toast.error('Please fill in all fields');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-success/5">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
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
        <div className="glass-strong rounded-3xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-success/20 to-success/5">
              <Shield className="w-12 h-12 text-success" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2">Admin Portal</h1>
          <p className="text-center text-muted-foreground mb-8">
            Sign in to manage the system
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@tiet.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass"
              />
            </div>

            <Button type="submit" className="w-full bg-success hover:bg-success/90 text-background">
              Sign In
            </Button>
          </form>

          <div className="mt-6 p-3 glass rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              For demo: Use any email and password
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}