import React, { useState, useEffect } from 'react';
import { Crown, Check, Zap, Shield, Star, Sparkles, Loader, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button, GlassCard } from '../components/UIComponents';
import { FirebaseService } from '../firebaseService';
import { ethers } from 'ethers';

interface PremiumViewProps {
  onBack: () => void;
  userAddress?: string;
}

const PAYMENT_ADDRESS = '0xef1a6c326460c04bb02037725a5e818bbcfff3e3';

const BADGE_PRICES = {
  blue: {
    usd: 9,
    eth: '0.003', // ~$9 in ETH (approximate)
    wei: ethers.parseEther('0.003').toString()
  },
  gold: {
    usd: 35,
    eth: '0.012', // ~$35 in ETH (approximate)
    wei: ethers.parseEther('0.012').toString()
  }
};

export const PremiumView: React.FC<PremiumViewProps> = ({ onBack, userAddress }) => {
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'connecting' | 'confirming' | 'pending_review' | 'error'>('idle');
  const [selectedBadge, setSelectedBadge] = useState<'blue' | 'gold' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [existingBadge, setExistingBadge] = useState<any>(null);
  const [pendingPurchase, setPendingPurchase] = useState<any>(null);

  useEffect(() => {
    if (userAddress) {
      checkExistingBadge();
    }
  }, [userAddress]);

  const checkExistingBadge = async () => {
    if (!userAddress) return;
    
    try {
      const badge = await FirebaseService.getActiveBadge(userAddress);
      if (badge) {
        setExistingBadge(badge);
      }
      
      // Also check for pending purchases
      const allBadges = await FirebaseService.getAllBadges();
      const pending = allBadges.find(
        b => b.userAddress.toLowerCase() === userAddress.toLowerCase() && b.status === 'pending'
      );
      if (pending) {
        setPendingPurchase(pending);
      }
    } catch (error) {
      console.error('Error checking badge:', error);
    }
  };

  const handlePurchase = async (badgeType: 'blue' | 'gold') => {
    if (!userAddress) {
      setErrorMessage('Please connect your wallet first');
      setPurchaseStatus('error');
      return;
    }

    if (!window.ethereum) {
      setErrorMessage('MetaMask not detected. Please install MetaMask.');
      setPurchaseStatus('error');
      return;
    }

    setSelectedBadge(badgeType);
    setPurchaseStatus('connecting');
    setErrorMessage('');

    try {
      const price = BADGE_PRICES[badgeType];
      
      // Request transaction
      setPurchaseStatus('confirming');
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: PAYMENT_ADDRESS,
          value: '0x' + BigInt(price.wei).toString(16),
        }],
      });

      console.log('Transaction sent:', txHash);

      // Create badge purchase record (pending admin review)
      await FirebaseService.createBadgePurchase(
        userAddress,
        badgeType,
        txHash,
        price.eth
      );

      setPurchaseStatus('pending_review');
      setPendingPurchase({
        badgeType,
        txHash,
        status: 'pending'
      });

    } catch (error: any) {
      console.error('Purchase failed:', error);
      
      if (error.code === 4001) {
        setErrorMessage('Transaction cancelled by user');
      } else if (error.code === -32603) {
        setErrorMessage('Insufficient funds for transaction');
      } else {
        setErrorMessage(error.message || 'Transaction failed. Please try again.');
      }
      
      setPurchaseStatus('error');
    }
  };

  const features = [
    { icon: <Zap size={20} />, title: 'Verified Status', desc: 'Stand out with a premium badge' },
    { icon: <Shield size={20} />, title: 'Priority Support', desc: '24/7 dedicated help' },
    { icon: <Star size={20} />, title: 'Exclusive Access', desc: 'Early access to new features' },
    { icon: <Sparkles size={20} />, title: '30-Day Duration', desc: 'Badge valid for 30 days' },
  ];

  // Show existing badge status
  if (existingBadge) {
    const expiryDate = new Date(existingBadge.expiryDate);
    const daysLeft = Math.ceil((existingBadge.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    
    return (
      <div className="min-h-screen pb-32 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-6 shadow-2xl ${
              existingBadge.badgeType === 'gold' 
                ? 'bg-gradient-to-br from-yellow-400 to-amber-600 shadow-yellow-500/30' 
                : 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/30'
            }`}>
              <Crown size={48} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              You have a {existingBadge.badgeType === 'gold' ? 'Gold' : 'Blue'} Badge!
            </h1>
            <p className="text-gray-400">
              Your premium status is active
            </p>
          </div>

          <GlassCard className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle size={24} className="text-green-400" />
              <span className="text-green-400 font-bold text-lg">Active</span>
            </div>
            
            <div className="space-y-3 text-gray-300">
              <p>
                <span className="text-gray-500">Expires:</span>{' '}
                <span className="font-medium">{expiryDate.toLocaleDateString()}</span>
              </p>
              <p>
                <span className="text-gray-500">Days remaining:</span>{' '}
                <span className={`font-bold ${daysLeft < 7 ? 'text-yellow-400' : 'text-white'}`}>{daysLeft} days</span>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-gray-500 text-sm">
                Want to upgrade or extend?
              </p>
              <Button 
                onClick={() => setExistingBadge(null)} 
                variant="secondary" 
                className="mt-3"
              >
                View Plans
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Show pending purchase status
  if (pendingPurchase || purchaseStatus === 'pending_review') {
    return (
      <div className="min-h-screen pb-32 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500/20 rounded-3xl mb-6">
              <Clock size={40} className="text-yellow-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Payment Received!</h1>
            <p className="text-gray-400">Your badge purchase is pending admin review</p>
          </div>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6 p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
              <Loader size={20} className="text-yellow-400 animate-spin" />
              <span className="text-yellow-400 font-medium">Awaiting Admin Approval</span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Badge Type:</span>
                <span className="text-white font-medium capitalize">
                  {pendingPurchase?.badgeType || selectedBadge} Badge
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="text-yellow-400 font-medium">Pending Review</span>
              </div>
              {pendingPurchase?.txHash && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Transaction:</span>
                  <span className="text-gray-300 font-mono text-xs">
                    {pendingPurchase.txHash.substring(0, 10)}...
                  </span>
                </div>
              )}
            </div>

            <p className="text-gray-500 text-sm mt-6 text-center">
              Once approved, your badge will appear next to your username throughout the platform.
            </p>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-yellow-500 rounded-3xl mb-6 shadow-2xl shadow-primary/30">
            <Crown size={40} className="text-black" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">BSN Premium</h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Get verified and stand out with a premium badge
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {features.map((feature, index) => (
            <GlassCard key={index} className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary mx-auto mb-3">
                {feature.icon}
              </div>
              <h3 className="text-white font-bold text-sm mb-1">{feature.title}</h3>
              <p className="text-gray-500 text-xs">{feature.desc}</p>
            </GlassCard>
          ))}
        </div>

        {/* Badge Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Blue Badge */}
          <GlassCard className="p-6 border-blue-500/30 hover:border-blue-500/50 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
            
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Crown size={32} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Blue Badge</h3>
                  <p className="text-blue-400 text-sm">Verified Member</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">${BADGE_PRICES.blue.usd}</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-gray-500 text-sm mt-1">≈ {BADGE_PRICES.blue.eth} ETH</p>
              </div>

              <ul className="space-y-3 mb-6">
                {['Blue verification badge', 'Priority in feed', '30-day duration'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Check size={16} className="text-blue-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button 
                onClick={() => handlePurchase('blue')}
                disabled={purchaseStatus !== 'idle' && purchaseStatus !== 'error'}
                className="w-full bg-blue-500 hover:bg-blue-600"
                size="lg"
              >
                {purchaseStatus === 'connecting' && selectedBadge === 'blue' ? (
                  <><Loader size={18} className="animate-spin mr-2" /> Connecting...</>
                ) : purchaseStatus === 'confirming' && selectedBadge === 'blue' ? (
                  <><Loader size={18} className="animate-spin mr-2" /> Confirm in Wallet...</>
                ) : (
                  'Buy Blue Badge'
                )}
              </Button>
            </div>
          </GlassCard>

          {/* Gold Badge */}
          <GlassCard className="p-6 border-yellow-500/30 hover:border-yellow-500/50 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="absolute top-4 right-4 bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </div>
            
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <Crown size={32} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Gold Badge</h3>
                  <p className="text-yellow-400 text-sm">Premium Member</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">${BADGE_PRICES.gold.usd}</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-gray-500 text-sm mt-1">≈ {BADGE_PRICES.gold.eth} ETH</p>
              </div>

              <ul className="space-y-3 mb-6">
                {['Gold verification badge', 'Top priority in feed', 'Exclusive gold features', '30-day duration'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Check size={16} className="text-yellow-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button 
                onClick={() => handlePurchase('gold')}
                disabled={purchaseStatus !== 'idle' && purchaseStatus !== 'error'}
                className="w-full"
                size="lg"
              >
                {purchaseStatus === 'connecting' && selectedBadge === 'gold' ? (
                  <><Loader size={18} className="animate-spin mr-2" /> Connecting...</>
                ) : purchaseStatus === 'confirming' && selectedBadge === 'gold' ? (
                  <><Loader size={18} className="animate-spin mr-2" /> Confirm in Wallet...</>
                ) : (
                  'Buy Gold Badge'
                )}
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* Error Message */}
        {purchaseStatus === 'error' && errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 mb-8">
            <AlertCircle size={20} className="text-red-400" />
            <p className="text-red-400">{errorMessage}</p>
          </div>
        )}

        {/* Info */}
        <div className="text-center text-gray-500 text-sm">
          <p>Payment is processed via your connected wallet.</p>
          <p className="mt-1">Badge will be activated after admin review (usually within 24 hours).</p>
        </div>
      </div>
    </div>
  );
};
