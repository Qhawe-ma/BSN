import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface VirtualScrollConfig {
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
}

interface VirtualScrollResult<T> {
  virtualItems: { item: T; index: number; style: React.CSSProperties }[];
  totalHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  scrollToIndex: (index: number) => void;
}

export function useVirtualScroll<T>(
  items: T[],
  config: VirtualScrollConfig
): VirtualScrollResult<T> {
  const { itemHeight, overscan = 3 } = config;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(config.containerHeight || 800);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateContainerHeight = () => {
      setContainerHeight(container.clientHeight || window.innerHeight);
    };

    updateContainerHeight();

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateContainerHeight);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateContainerHeight);
    };
  }, []);

  const virtualItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const result: { item: T; index: number; style: React.CSSProperties }[] = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        },
      });
    }

    return result;
  }, [items, scrollTop, containerHeight, itemHeight, overscan]);

  const totalHeight = items.length * itemHeight;

  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  return {
    virtualItems,
    totalHeight,
    containerRef,
    scrollToIndex,
  };
}

export function useWindowVirtualScroll<T>(
  items: T[],
  estimatedItemHeight: number,
  overscan: number = 5
) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const itemHeights = useRef<Map<number, number>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const updateVisibleRange = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      
      let accumulatedHeight = 0;
      let start = 0;
      let end = items.length;
      
      for (let i = 0; i < items.length; i++) {
        const height = itemHeights.current.get(i) || estimatedItemHeight;
        if (accumulatedHeight + height < scrollY - overscan * estimatedItemHeight) {
          start = i;
        }
        if (accumulatedHeight < scrollY + viewportHeight + overscan * estimatedItemHeight) {
          end = i + 1;
        }
        accumulatedHeight += height;
      }
      
      setVisibleRange({ start: Math.max(0, start), end: Math.min(items.length, end) });
    };

    updateVisibleRange();
    
    window.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange);

    return () => {
      window.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [items.length, estimatedItemHeight, overscan]);

  const measureElement = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      const height = element.getBoundingClientRect().height;
      if (height > 0) {
        itemHeights.current.set(index, height);
      }
    }
  }, []);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, i) => ({
      item,
      index: visibleRange.start + i,
    }));
  }, [items, visibleRange]);

  return {
    visibleItems,
    visibleRange,
    measureElement,
    totalItems: items.length,
  };
}
