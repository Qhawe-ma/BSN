import React from 'react';
import { Crown, Check, Zap, Shield, Star, Sparkles } from 'lucide-react';
import { Button, GlassCard } from '../components/UIComponents';

interface PremiumViewProps {
  onBack: () => void;
}

export const PremiumView: React.FC<PremiumViewProps> = ({ onBack }) => {
  const features = [
    { icon: <Zap size={20} />, title: 'Unlimited Posts', desc: 'Post without limits' },
    { icon: <Shield size={20} />, title: 'Verified Badge', desc: 'Stand out with verification' },
    { icon: <Star size={20} />, title: 'Priority Support', desc: '24/7 dedicated help' },
    { icon: <Sparkles size={20} />, title: 'Exclusive Features', desc: 'Early access to new tools' },
  ];

  return (
    <div className="min-h-screen pb-32 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-yellow-500 rounded-3xl mb-6 shadow-2xl shadow-primary/30">
            <Crown size={40} className="text-black" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">BSN Premium</h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Unlock the full potential of your social experience
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, index) => (
            <GlassCard key={index} className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="p-8 text-center border-primary/30">
          <div className="mb-6">
            <span className="text-gray-400 text-sm">Starting at</span>
            <div className="flex items-baseline justify-center gap-1 mt-2">
              <span className="text-5xl font-bold text-white">$9.99</span>
              <span className="text-gray-400">/month</span>
            </div>
          </div>

          <ul className="space-y-3 mb-8 text-left max-w-xs mx-auto">
            {['All premium features', 'Cancel anytime', 'No hidden fees'].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-300">
                <Check size={18} className="text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <Button size="lg" className="w-full max-w-xs rounded-full">
            Coming Soon
          </Button>
          <p className="text-gray-500 text-xs mt-4">Premium launches Q1 2025</p>
        </GlassCard>
      </div>
    </div>
  );
};
