import { useCallback, useEffect, useRef, useState } from 'react';

export function useStickToBottom(threshold = 150) {
  const [isStickToBottom, setIsStickToBottom] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);

  const checkIsStickToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollHeight, scrollTop, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    setIsStickToBottom(distanceFromBottom <= threshold);
  }, [threshold]);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Ensure we scroll all the way to the bottom
    container.scrollTop = container.scrollHeight;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkIsStickToBottom();
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkIsStickToBottom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      if (isStickToBottom) {
        scrollToBottom();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isStickToBottom, scrollToBottom]);

  // Auto-scroll when content changes if we're sticking to bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollHeight } = container;
    
    if (scrollHeight !== prevScrollHeightRef.current) {
      if (isStickToBottom) {
        scrollToBottom();
      }
      prevScrollHeightRef.current = scrollHeight;
    }
  });

  // Always scroll to bottom on initial render
  useEffect(() => {
    scrollToBottom();
  }, []);

  return {
    containerRef,
    isStickToBottom,
    scrollToBottom
  };
}
