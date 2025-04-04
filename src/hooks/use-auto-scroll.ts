import { useEffect, useRef, useState, useCallback } from "react";

interface UseAutoScrollOptions {
  scrollThreshold?: number;
  debounceTime?: number;
}

const useAutoScroll = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
  options?: UseAutoScrollOptions
) => {
  const { scrollThreshold = 100, debounceTime = 100 } = options || {};
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const lastScrollHeightRef = useRef(0);
  const isAutoScrolling = useRef(false);
  const rafId = useRef<number | null>(null);

  const isAtBottom = useCallback((element: HTMLDivElement | null) => {
    if (!element) return false;
    const { scrollTop, scrollHeight, clientHeight } = element;
    return Math.abs(scrollHeight - scrollTop - clientHeight) <= scrollThreshold;
  }, [scrollThreshold]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;

    if (rafId.current) cancelAnimationFrame(rafId.current);

    isAutoScrolling.current = true;
    const targetScrollTop = container.scrollHeight - container.clientHeight;

    container.scrollTo({
      top: targetScrollTop,
      behavior,
    });

    // Reset auto-scrolling flag after animation
    rafId.current = requestAnimationFrame(() => {
      setTimeout(() => {
        isAutoScrolling.current = false;
      }, behavior === "smooth" ? 250 : 50);
    });
  }, [containerRef]);

  // Handle manual scroll detection
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (isAutoScrolling.current) return;

      const isCurrentlyAtBottom = isAtBottom(container);
      const scrollDirection = container.scrollTop < lastScrollHeightRef.current ? "up" : "down";

      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (scrollDirection === "up" && !isCurrentlyAtBottom) {
          setAutoScrollEnabled(false);
        } else if (isCurrentlyAtBottom) {
          setAutoScrollEnabled(true);
        }
        lastScrollHeightRef.current = container.scrollTop;
      }, debounceTime);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    lastScrollHeightRef.current = container.scrollTop;
    setAutoScrollEnabled(isAtBottom(container));

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [containerRef, enabled, isAtBottom, debounceTime]);

  // Handle content changes
  useEffect(() => {
    if (!enabled || !autoScrollEnabled) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver((mutations) => {
      if (!autoScrollEnabled || isAutoScrolling.current) return;

      const wasAtBottom = isAtBottom(container);
      const newScrollHeight = container.scrollHeight;

      if (wasAtBottom || newScrollHeight > lastScrollHeightRef.current) {
        rafId.current = requestAnimationFrame(() => {
          scrollToBottom("smooth");
          lastScrollHeightRef.current = newScrollHeight;
        });
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });

    // Initial scroll if at bottom
    if (isAtBottom(container)) {
      scrollToBottom("auto");
    }

    return () => {
      observer.disconnect();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [containerRef, enabled, autoScrollEnabled, scrollToBottom, isAtBottom]);

  return {
    autoScrollEnabled,
    scrollToBottom,
  };
};

export { useAutoScroll };