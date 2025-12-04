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
        <div className="flex items-center gap-3">
          <a 
            href="https://x.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Follow us on X"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <Button 
            onClick={onLaunchApp}
            size="lg"
            className="rounded-full px-6 md:px-8 group"
          >
            <span>Launch App</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </nav>

      <main className="relative z-20 px-6 pt-16 md:pt-24 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-20">
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

          <div className="relative max-w-2xl mx-auto mb-24">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-gray-500 text-sm font-mono">CA:</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('TBA');
                  const btn = document.getElementById('ca-copy-btn');
                  if (btn) {
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = 'TBA'; }, 1500);
                  }
                }}
                id="ca-copy-btn"
                className="text-primary text-sm font-mono hover:text-yellow-300 transition-colors cursor-pointer"
                title="Click to copy"
              >
                TBA
              </button>
            </div>
            <div className="rounded-3xl bg-[#0D1117] border border-white/10 shadow-2xl overflow-hidden">
              <div className="bg-[#161B22] border-b border-white/5 px-5 py-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/10 ring-offset-2 ring-offset-[#161B22]">
                      <img 
                        src="https://api.dicebear.com/7.x/identicon/svg?seed=alice&backgroundColor=1e2329" 
                        alt="alice.eth" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">alice.eth</p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-500 text-xs">Online</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                    <Lock size={12} className="text-green-400" />
                    <span className="text-green-400 text-xs font-medium">Encrypted</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 space-y-4 min-h-[200px] bg-[#0D1117]">
                <div className="flex justify-start">
                  <div className="flex flex-col items-start max-w-[75%]">
                    <div className="bg-[#1E2025] text-gray-100 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <p className="text-[15px] leading-relaxed">Hey! Just sent you 0.5 BNB for the project</p>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1.5 ml-1 font-mono">10:42 AM</span>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <div className="flex flex-col items-end max-w-[75%]">
                    <div className="bg-primary text-black rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                      <p className="text-[15px] leading-relaxed font-medium">Thanks! Received it. The smart contract is deployed</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 mr-1">
                      <span className="text-[10px] text-gray-500 font-mono">10:43 AM</span>
                      <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                        <path d="M15 6L4 17" strokeOpacity="0.5" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="flex flex-col items-start max-w-[75%]">
                    <div className="bg-[#1E2025] text-gray-100 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <p className="text-[15px] leading-relaxed">Perfect! Let me check it out</p>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1.5 ml-1 font-mono">10:44 AM</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#161B22] border-t border-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#0D1117] border border-white/10 rounded-2xl px-4 py-3 flex items-center">
                    <span className="text-gray-500 text-sm">Type a message...</span>
                  </div>
                  <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg hover:shadow-primary/25 transition-shadow">
                    <Send size={18} className="text-black" />
                  </button>
                </div>
              </div>
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
