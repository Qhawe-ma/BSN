import React, { useState, useRef, useEffect, memo } from 'react';

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  placeholderColor?: string;
  aspectRatio?: 'auto' | 'square' | 'video' | 'wide';
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImageComponent: React.FC<LazyImageProps> = ({
  src,
  alt = '',
  className = '',
  placeholderColor = 'bg-white/5',
  aspectRatio = 'auto',
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const aspectClasses = {
    auto: '',
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[16/9]'
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px',
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setIsLoaded(true);
      setHasError(false);
      onLoad?.();
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoaded(true);
      onError?.();
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src, onLoad, onError]);

  if (hasError) {
    return (
      <div 
        ref={imgRef}
        className={`${placeholderColor} ${aspectClasses[aspectRatio]} rounded-2xl flex items-center justify-center ${className}`}
      >
        <div className="text-gray-500 text-sm">Failed to load image</div>
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${aspectClasses[aspectRatio]} ${className}`}
    >
      <div 
        className={`absolute inset-0 ${placeholderColor} transition-opacity duration-500 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" 
          style={{
            backgroundSize: '200% 100%',
            animation: isLoaded ? 'none' : 'shimmer 1.5s infinite'
          }}
        />
      </div>
      
      {isInView && (
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isLoaded 
              ? 'opacity-100 scale-100 blur-0' 
              : 'opacity-0 scale-[1.02] blur-sm'
          }`}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
};

export const LazyImage = memo(LazyImageComponent);

interface LazyAvatarProps {
  src: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  address?: string;
  bordered?: boolean;
  className?: string;
}

const LazyAvatarComponent: React.FC<LazyAvatarProps> = ({
  src,
  size = 'md',
  address,
  bordered = true,
  className = ''
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const addressBasedUrl = address ? `https://api.dicebear.com/7.x/identicon/svg?seed=${address}&backgroundColor=1e2329` : null;
  const isDicebearUrl = src?.includes('api.dicebear.com');
  const isCustomAvatar = src && !isDicebearUrl && !src.includes('identicon');
  const displayUrl = isCustomAvatar ? src : (addressBasedUrl || src || `https://api.dicebear.com/7.x/identicon/svg?seed=default&backgroundColor=1e2329`);

  const imgSrc = hasError ? (addressBasedUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=default&backgroundColor=1e2329`) : displayUrl;

  return (
    <div
      className={`${sizes[size]} rounded-full overflow-hidden ${
        bordered ? 'ring-2 ring-white/10 ring-offset-2 ring-offset-black/50' : ''
      } bg-gray-800 flex-shrink-0 shadow-lg ${className}`}
    >
      <div className={`relative w-full h-full ${!isLoaded ? 'animate-pulse bg-white/10' : ''}`}>
        <img
          src={imgSrc}
          alt=""
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
        />
      </div>
    </div>
  );
};

export const LazyAvatar = memo(LazyAvatarComponent);
