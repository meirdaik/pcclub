import React, { useEffect, useRef } from 'react';

interface ParallaxBackgroundProps {
  children?: React.ReactNode;
}

export default function ParallaxBackground({ children }: ParallaxBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layer1Ref = useRef<HTMLDivElement>(null);
  const layer2Ref = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetX = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      targetY = (e.clientY / innerHeight - 0.5) * 2; // -1 to 1
    };

    const updateParallax = () => {
      // Smooth lerp for 60fps fluid motion
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;

      if (layer1Ref.current) {
        layer1Ref.current.style.transform = `translate3d(${currentX * -18}px, ${currentY * -18}px, 0)`;
      }
      if (layer2Ref.current) {
        layer2Ref.current.style.transform = `translate3d(${currentX * -35}px, ${currentY * -35}px, 0)`;
      }
      if (particlesRef.current) {
        particlesRef.current.style.transform = `translate3d(${currentX * -50}px, ${currentY * -50}px, 0)`;
      }

      animId = requestAnimationFrame(updateParallax);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    animId = requestAnimationFrame(updateParallax);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div ref={containerRef} style={styles.container}>
      {/* Layer 1: Deep Aurora Glow & Cyber Perspective Grid */}
      <div ref={layer1Ref} style={styles.auroraLayer}>
        <div style={styles.auroraBlob1} />
        <div style={styles.auroraBlob2} />
        <div style={styles.auroraBlob3} />
        <div style={styles.cyberGrid} />
      </div>

      {/* Layer 2: 25 Floating Glowing Ambient Particles */}
      <div ref={particlesRef} style={styles.particlesContainer}>
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="ambient-particle"
            style={{
              ...styles.particle,
              left: `${(i * 4.1 + 2) % 96}%`,
              top: `${(i * 7.3 + 5) % 94}%`,
              width: `${(i % 3) * 2 + 2}px`,
              height: `${(i % 3) * 2 + 2}px`,
              backgroundColor: i % 3 === 0 ? '#00f2fe' : i % 3 === 1 ? '#7c3aed' : '#ff007f',
              boxShadow: `0 0 10px ${i % 3 === 0 ? '#00f2fe' : i % 3 === 1 ? '#7c3aed' : '#ff007f'}`,
              animationDuration: `${12 + (i % 8)}s`,
              animationDelay: `-${(i % 5) * 2.5}s`,
            }}
          />
        ))}
      </div>

      {/* Layer 3: CRT Scanlines and Deep Obsidian Vignette */}
      <div style={styles.scanlineOverlay} />
      <div style={styles.vignetteOverlay} />

      {/* Content Mount */}
      <div style={styles.contentLayer}>{children}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#050711',
  },
  auroraLayer: {
    position: 'absolute',
    top: '-8%',
    left: '-8%',
    width: '116%',
    height: '116%',
    pointerEvents: 'none',
    willChange: 'transform',
  },
  auroraBlob1: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    width: '650px',
    height: '650px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0, 242, 254, 0.18) 0%, rgba(0, 242, 254, 0) 70%)',
    filter: 'blur(70px)',
    animation: 'pulseAurora 9s ease-in-out infinite alternate',
  },
  auroraBlob2: {
    position: 'absolute',
    bottom: '10%',
    right: '15%',
    width: '750px',
    height: '750px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124, 58, 237, 0.22) 0%, rgba(124, 58, 237, 0) 70%)',
    filter: 'blur(80px)',
    animation: 'pulseAurora 12s ease-in-out infinite alternate-reverse',
  },
  auroraBlob3: {
    position: 'absolute',
    top: '40%',
    right: '35%',
    width: '550px',
    height: '550px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255, 0, 127, 0.12) 0%, rgba(255, 0, 127, 0) 70%)',
    filter: 'blur(75px)',
    animation: 'pulseAurora 8s ease-in-out infinite alternate',
  },
  cyberGrid: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundImage: `
      linear-gradient(rgba(0, 242, 254, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 242, 254, 0.04) 1px, transparent 1px)
    `,
    backgroundSize: '54px 54px',
    opacity: 0.65,
    maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)',
    WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)',
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    willChange: 'transform',
  },
  particle: {
    position: 'absolute',
    borderRadius: '50%',
    opacity: 0.7,
    animation: 'floatDrift linear infinite',
  },
  scanlineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 3px)',
    pointerEvents: 'none',
    opacity: 0.35,
    zIndex: 2,
  },
  vignetteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(ellipse at center, rgba(5, 7, 17, 0) 45%, rgba(5, 7, 17, 0.88) 100%)',
    pointerEvents: 'none',
    zIndex: 3,
  },
  contentLayer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    zIndex: 4,
  },
};
