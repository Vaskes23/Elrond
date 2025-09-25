import { useEffect, useState, useRef, CSSProperties } from 'react';

/**
 * DecryptedText Component
 *
 * Creates a text animation that simulates decrypting scrambled characters
 * to reveal the final text. Perfect for creating "hacker" or "decoding" effects.
 */

interface DecryptedTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The final text to reveal */
  text: string;
  /** Animation speed in milliseconds (default: 50) */
  speed?: number;
  /** Number of scramble iterations before revealing (default: 10) */
  maxIterations?: number;
  /** Whether to reveal letters sequentially or all at once (default: false) */
  sequential?: boolean;
  /** Direction for sequential reveal (default: 'start') */
  revealDirection?: 'start' | 'end' | 'center';
  /** Characters to use for scrambling effect */
  characters?: string;
  /** Trigger animation on 'view', 'hover', or 'both' (default: 'hover') */
  animateOn?: 'view' | 'hover' | 'both';
  /** Custom styles */
  style?: CSSProperties;
}

export default function DecryptedText({
  text,
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = 'start',
  characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*',
  animateOn = 'hover',
  style,
  className,
  ...props
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState<string>(text);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [hasAnimated, setHasAnimated] = useState<boolean>(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Animation logic - scrambles text then reveals sequentially or all at once
  useEffect(() => {
    if (!isAnimating) return;

    let interval: NodeJS.Timeout;
    let currentIteration = 0;

    const scrambleText = (revealed: Set<number>): string => {
      return text
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (revealed.has(i)) return text[i];
          return characters[Math.floor(Math.random() * characters.length)];
        })
        .join('');
    };

    const getNextRevealIndex = (revealed: Set<number>): number => {
      if (revealDirection === 'center') {
        const middle = Math.floor(text.length / 2);
        const offset = Math.floor(revealed.size / 2);
        return revealed.size % 2 === 0 ? middle + offset : middle - offset - 1;
      }
      return revealDirection === 'end' ? text.length - 1 - revealed.size : revealed.size;
    };

    interval = setInterval(() => {
      setRevealedIndices(prevRevealed => {
        if (sequential && prevRevealed.size < text.length) {
          const nextIndex = getNextRevealIndex(prevRevealed);
          const newRevealed = new Set(prevRevealed);
          if (nextIndex >= 0 && nextIndex < text.length) {
            newRevealed.add(nextIndex);
          }
          setDisplayText(scrambleText(newRevealed));
          return newRevealed;
        } else if (!sequential) {
          setDisplayText(scrambleText(prevRevealed));
          currentIteration++;
          if (currentIteration >= maxIterations) {
            setDisplayText(text);
            setIsAnimating(false);
          }
        } else {
          setIsAnimating(false);
        }
        return prevRevealed;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [isAnimating, text, speed, maxIterations, sequential, revealDirection, characters]);

  // Intersection Observer for 'view' animation trigger
  useEffect(() => {
    if (animateOn !== 'view' && animateOn !== 'both') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsAnimating(true);
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = containerRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [animateOn, hasAnimated]);

  // Hover handlers for 'hover' animation trigger
  const handleMouseEnter = () => {
    if (animateOn === 'hover' || animateOn === 'both') {
      setIsAnimating(true);
      setRevealedIndices(new Set());
    }
  };

  const handleMouseLeave = () => {
    if (animateOn === 'hover' || animateOn === 'both') {
      setIsAnimating(false);
      setDisplayText(text);
      setRevealedIndices(new Set());
    }
  };

  return (
    <span
      ref={containerRef}
      className={className}
      style={{ display: 'inline-block', whiteSpace: 'pre-wrap', ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {displayText}
    </span>
  );
}