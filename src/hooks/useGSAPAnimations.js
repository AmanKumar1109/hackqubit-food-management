import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Hook for staggering entrance animations on elements within a container
 */
export const useStaggerEntrance = (deps = [], selector = '.gsap-stagger-item', delay = 0.1) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        selector,
        {
          opacity: 0,
          y: 20,
          scale: 0.98,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          delay,
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, deps);

  return containerRef;
};

/**
 * Hook for subtle continuous floating / breathing animation
 */
export const useFloatingElement = (yOffset = 8, duration = 3.5) => {
  const elementRef = useRef(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(elementRef.current, {
        y: -yOffset,
        duration,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, elementRef);

    return () => ctx.revert();
  }, [yOffset, duration]);

  return elementRef;
};

/**
 * Hook for shimmering / pulsing diagonal light beams
 */
export const useShimmerBeams = () => {
  const beamsRef = useRef(null);

  useEffect(() => {
    if (!beamsRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to('.gsap-beam', {
        opacity: 0.75,
        scaleY: 1.08,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        stagger: 0.6,
        ease: 'sine.inOut',
      });
    }, beamsRef);

    return () => ctx.revert();
  }, []);

  return beamsRef;
};
