import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Shield, Zap, Users, Lock, ArrowRight, Sparkles, Send, Globe } from 'lucide-react';
import { Button, GlassCard } from '../components/UIComponents';

interface LandingPageProps {
  onLaunchApp: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const initialParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 4 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.1,
    }));
    setParticles(initialParticles);

    const animate = () => {
      setParticles(prev => prev.map(particle => {
        let newX = particle.x + particle.speedX;
        let newY = particle.y + particle.speedY;

        if (newX < 0) newX = window.innerWidth;
        if (newX > window.innerWidth) newX = 0;
        if (newY < 0) newY = window.innerHeight;
        if (newY > window.innerHeight) newY = 0;

        return { ...particle, x: newX, y: newY };
      }));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    {
      icon: <MessageCircle size={28} />,
      title: "Message Any Wallet",
      description: "Send messages to any wallet address on the blockchain. No phone number or email needed."
    },
    {
      icon: <Lock size={28} />,
      title: "End-to-End Encrypted",
      description: "Your messages are encrypted using advanced cryptography. Only you and the recipient can read them."
    },
    {
      icon: <Shield size={28} />,
      title: "Decentralized Identity",
      description: "Your wallet is your identity. No centralized servers, no data harvesting, just pure privacy."
    },
    {
      icon: <Zap size={28} />,
      title: "Mint Posts as NFTs",
      description: "Turn your content into NFTs on the blockchain. Own your posts forever."
    },
    {
      icon: <Users size={28} />,
      title: "Social Network",
      description: "Follow users, like posts, and engage with a community of blockchain enthusiasts."
    },
    {
      icon: <Globe size={28} />,
      title: "Built on BSC",
      description: "Powered by Binance Smart Chain for fast transactions and low fees."
    }
  ];

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-[#0B0E11] text-white overflow-hidden relative"
    >
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-primary pointer-events-none transition-all duration-1000"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
          }}
        />
      ))}

      <div 
        className="fixed pointer-events-none z-10 transition-all duration-300 ease-out"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-[400px] h-[400px] rounded-full bg-gradient-radial from-primary/20 via-primary/5 to-transparent blur-3xl" />
      </div>

      <div 
        className="fixed pointer-events-none z-10 transition-all duration-500 ease-out"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-radial from-blue-500/10 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-[20%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-[10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] bg-purple-900/5 rounded-full blur-[100px]" />
      </div>

      <nav className="relative z-20 px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img 
            src="/check/logoo.svg" 
            alt="BSN" 
            className="h-12 md:h-14"
          />
        </div>
        <Button 
          onClick={onLaunchApp}
          size="lg"
          className="rounded-full px-6 md:px-8 group"
        >
          <span>Launch App</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </Button>
      </nav>

      <main className="relative z-20 px-6 pt-16 md:pt-24 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <Sparkles size={16} className="text-primary" />
              <span className="text-sm text-gray-300">The Future of Social Networking</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white">Message </span>
              <span className="bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">Any Wallet</span>
              <br />
              <span className="text-white">With </span>
              <span className="bg-gradient-to-r from-blue-400 to-primary bg-clip-text text-transparent">Full Encryption</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              The first truly decentralized social network where your wallet is your identity. 
              Send encrypted messages to any wallet address, create posts as NFTs, and own your digital presence.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={onLaunchApp}
                size="lg"
                className="rounded-full px-10 py-4 text-lg group w-full sm:w-auto"
              >
                <Send size={20} />
                <span>Start Messaging</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="secondary"
                size="lg"
                className="rounded-full px-10 py-4 text-lg w-full sm:w-auto"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </div>
          </div>

          <div className="relative max-w-4xl mx-auto mb-24">
            <GlassCard className="p-1 overflow-hidden">
              <div className="rounded-2xl bg-gradient-to-b from-gray-900/80 to-gray-900/40 p-6 md:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-yellow-400 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                      0x
                    </div>
                    <div className="flex-1">
                      <div className="bg-white/5 rounded-2xl rounded-tl-none p-4 max-w-md">
                        <p className="text-gray-300">Hey! Just sent you 0.5 BNB for the project</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <Lock size={10} />
                          <span>Encrypted</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 justify-end">
                    <div className="flex-1 flex justify-end">
                      <div className="bg-gradient-to-r from-primary/20 to-yellow-400/20 rounded-2xl rounded-tr-none p-4 max-w-md border border-primary/20">
                        <p className="text-white">Thanks! Received it. The smart contract is deployed</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                          <Shield size={10} />
                          <span>End-to-End Encrypted</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      U
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
            
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="text-green-400 text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                All messages are encrypted
              </span>
            </div>
          </div>

          <div id="features" className="pt-10">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Why <span className="bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">BSN</span>?
            </h2>
            <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
              Built for privacy, designed for the future of decentralized communication.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <GlassCard 
                  key={index}
                  hoverEffect
                  className="p-6 group cursor-default"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-primary/20 to-yellow-400/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </GlassCard>
              ))}
            </div>
          </div>

          <div className="mt-24 text-center">
            <GlassCard className="p-8 md:p-12 max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Own Your Social Identity?
              </h2>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                Connect your wallet and start messaging anyone on the blockchain. 
                Your messages are encrypted and your identity is yours.
              </p>
              <Button 
                onClick={onLaunchApp}
                size="lg"
                className="rounded-full px-12 py-4 text-lg group"
              >
                <Sparkles size={20} />
                <span>Get Started Now</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </GlassCard>
          </div>
        </div>
      </main>

      <footer className="relative z-20 border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="/check/logoo.svg" 
              alt="BSN" 
              className="h-8"
            />
            <span className="text-gray-500 text-sm">Blockchain Social Network</span>
          </div>
          <p className="text-gray-500 text-sm">
            Powered by BSC - Built with Privacy in Mind
          </p>
        </div>
      </footer>
    </div>
  );
};
