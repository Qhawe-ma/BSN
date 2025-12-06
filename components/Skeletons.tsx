import React from 'react';

export const PostSkeleton: React.FC = () => (
  <div className="bg-white/5 rounded-2xl p-5 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-11 h-11 rounded-full bg-white/10"></div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-24 bg-white/10 rounded"></div>
          <div className="h-3 w-16 bg-white/5 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-white/10 rounded"></div>
          <div className="h-4 w-3/4 bg-white/10 rounded"></div>
        </div>
        <div className="flex gap-6 mt-4">
          <div className="h-4 w-12 bg-white/5 rounded"></div>
          <div className="h-4 w-12 bg-white/5 rounded"></div>
          <div className="h-4 w-12 bg-white/5 rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

export const FeedSkeleton: React.FC = () => (
  <div className="space-y-4">
    <PostSkeleton />
    <PostSkeleton />
    <PostSkeleton />
    <PostSkeleton />
  </div>
);

export const ProfileSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="relative">
      <div className="h-48 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl"></div>
      <div className="absolute -bottom-16 left-8">
        <div className="w-32 h-32 rounded-full bg-white/10 border-4 border-[#0B0E11]"></div>
      </div>
    </div>
    <div className="mt-20 px-8">
      <div className="h-6 w-48 bg-white/10 rounded mb-2"></div>
      <div className="h-4 w-32 bg-white/5 rounded mb-4"></div>
      <div className="h-4 w-full bg-white/10 rounded mb-2"></div>
      <div className="h-4 w-2/3 bg-white/10 rounded mb-6"></div>
      <div className="flex gap-6">
        <div className="h-8 w-24 bg-white/5 rounded"></div>
        <div className="h-8 w-24 bg-white/5 rounded"></div>
      </div>
    </div>
    <div className="mt-8 px-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="aspect-square bg-white/5 rounded-xl"></div>
        <div className="aspect-square bg-white/5 rounded-xl"></div>
        <div className="aspect-square bg-white/5 rounded-xl"></div>
      </div>
    </div>
  </div>
);

export const ChatListSkeleton: React.FC = () => (
  <div className="space-y-2 p-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 animate-pulse">
        <div className="w-12 h-12 rounded-full bg-white/10"></div>
        <div className="flex-1">
          <div className="h-4 w-24 bg-white/10 rounded mb-2"></div>
          <div className="h-3 w-32 bg-white/5 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

export const MessagesSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 p-4 animate-pulse">
    <div className="self-start max-w-[70%]">
      <div className="h-12 w-48 bg-white/5 rounded-2xl"></div>
    </div>
    <div className="self-end max-w-[70%]">
      <div className="h-16 w-56 bg-primary/20 rounded-2xl"></div>
    </div>
    <div className="self-start max-w-[70%]">
      <div className="h-10 w-40 bg-white/5 rounded-2xl"></div>
    </div>
    <div className="self-end max-w-[70%]">
      <div className="h-12 w-52 bg-primary/20 rounded-2xl"></div>
    </div>
  </div>
);

export const ViewTransition: React.FC<{ children: React.ReactNode; show: boolean }> = ({ children, show }) => (
  <div className={`transition-all duration-200 ease-out ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
    {children}
  </div>
);

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <div className={`${sizeClasses[size]} animate-spin`}>
      <svg className="w-full h-full text-primary" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );
};
