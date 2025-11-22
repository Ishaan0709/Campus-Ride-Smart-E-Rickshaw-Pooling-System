import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Car, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

export default function DriverAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const navigate = useNavigate();
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      if (email && password) {
        setCurrentUser({ role: 'driver', id: 'd1' });
        toast.success('Logged in successfully!');
        navigate('/driver');
      } else {
        toast.error('Please fill in all fields');
      }
    } else {
      if (email && password && name && plate) {
        setCurrentUser({ role: 'driver', id: 'd1' });
        toast.success('Account created successfully!');
        navigate('/driver');
      } else {
        toast.error('Please fill in all fields');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/5">
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
            <div className="p-4 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5">
              <Car className="w-12 h-12 text-secondary" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2">Driver Portal</h1>
          <p className="text-center text-muted-foreground mb-8">
            {isLogin ? 'Sign in to start driving' : 'Register as a driver'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="glass"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate">Vehicle Number</Label>
                  <Input
                    id="plate"
                    type="text"
                    placeholder="e.g., PB11-ER-4101"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="glass"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass"
              />
            </div>

            <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground glow-secondary">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-secondary transition-colors"
            >
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="font-semibold text-secondary">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}