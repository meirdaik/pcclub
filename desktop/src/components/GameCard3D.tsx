import React, { useState, useRef } from 'react';
import { GameItem } from '../types';

interface GameCard3DProps {
  game: GameItem;
  isRunning?: boolean;
  onLaunch: (game: GameItem) => void;
  onKill?: (game: GameItem) => void;
  onHover?: (game: GameItem | null) => void;
}

export default function GameCard3D({
  game,
  isRunning = false,
  onLaunch,
  onKill,
  onHover,
}: GameCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glare, setGlare] = useState<{ x: number; y: number; opacity: number }>({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -12; // max 12 deg tilt
    const rY = ((x - centerX) / centerX) * 12;

    setRotateX(rX);
    setRotateY(rY);
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.35,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHover) onHover(game);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
    if (onHover) onHover(null);
  };

  // Artwork resolution with curated game imagery
  const getGameBanner = (id: string): string => {
    const banners: Record<string, string> = {
      cs2: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
      dota2: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      valorant: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80',
      steam: 'https://images.unsplash.com/photo-1612287232049-74d6c44fa784?auto=format&fit=crop&w=800&q=80',
      discord: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      youtube_app: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80',
      browser_app: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      twitch_app: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80',
    };
    return banners[id] || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80';
  };

  const bannerImg = getGameBanner(game.id);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...styles.wrapper,
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.04 : 1}, ${isHovered ? 1.04 : 1}, 1)`,
        boxShadow: isHovered
          ? '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(0, 240, 255, 0.45)'
          : '0 8px 24px rgba(0, 0, 0, 0.45), 0 0 10px rgba(0, 0, 0, 0.3)',
        borderColor: isRunning
          ? '#00ff88'
          : isHovered
          ? '#00f0ff'
          : 'rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Specular Glare Layer */}
      <div
        style={{
          ...styles.glareLayer,
          opacity: glare.opacity,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.35) 0%, transparent 60%)`,
        }}
      />

      {/* Cover Image Background */}
      <div
        style={{
          ...styles.coverBackground,
          backgroundImage: `url(${bannerImg})`,
        }}
      />
      <div style={styles.gradientOverlay} />

      {/* Top Meta Badges */}
      <div style={styles.topBadges}>
        <span style={styles.categoryBadge}>{game.category.toUpperCase()}</span>
        {isRunning && (
          <span style={styles.runningBadge}>
            <span style={styles.pulseDot} /> ACTIVE
          </span>
        )}
      </div>

      {/* Main Info */}
      <div style={styles.cardContent}>
        <div style={styles.iconCircle}>{game.icon}</div>
        <h3 style={styles.gameTitle}>{game.name}</h3>
      </div>

      {/* Hover Action Bar */}
      <div
        style={{
          ...styles.actionBar,
          transform: isHovered ? 'translateY(0)' : 'translateY(100%)',
          opacity: isHovered ? 1 : 0,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLaunch(game);
          }}
          className="shimmer-button"
          style={styles.playBtn}
        >
          ▶ {isRunning ? 'SWITCH TO' : 'PLAY NOW'}
        </button>
        {isRunning && onKill && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onKill(game);
            }}
            style={styles.killBtn}
            title="Force close process"
          >
            ⏹ KILL
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    height: '240px',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: '#0e1426',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'transform 0.15s ease-out, box-shadow 0.25s ease-out, border-color 0.25s ease-out',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '16px',
    transformStyle: 'preserve-3d',
    willChange: 'transform',
  },
  glareLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 3,
    transition: 'opacity 0.2s ease-out',
  },
  coverBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'brightness(0.7) saturate(1.2)',
    transition: 'transform 0.3s ease',
    zIndex: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, rgba(7, 10, 22, 0.4) 0%, rgba(7, 10, 22, 0.95) 100%)',
    zIndex: 1,
  },
  topBadges: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    fontSize: '9px',
    fontWeight: 900,
    letterSpacing: '1px',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    color: '#00f0ff',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    backdropFilter: 'blur(8px)',
  },
  runningBadge: {
    fontSize: '9px',
    fontWeight: 900,
    letterSpacing: '1px',
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    color: '#00ff88',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(0, 255, 136, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    backdropFilter: 'blur(8px)',
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#00ff88',
    boxShadow: '0 0 8px #00ff88',
  },
  cardContent: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  iconCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(10px)',
  },
  gameTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#f8fafc',
    margin: 0,
    fontFamily: 'var(--font-cyber)',
    letterSpacing: '0.5px',
    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px 16px',
    backgroundColor: 'rgba(9, 14, 28, 0.95)',
    borderTop: '1px solid rgba(0, 240, 255, 0.2)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    gap: '8px',
    zIndex: 4,
    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
  },
  playBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: '8px',
    border: 'none',
    color: '#070913',
    fontWeight: 900,
    fontSize: '11px',
    letterSpacing: '1px',
    cursor: 'pointer',
  },
  killBtn: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 0, 85, 0.4)',
    backgroundColor: 'rgba(255, 0, 85, 0.15)',
    color: '#ff0055',
    fontWeight: 800,
    fontSize: '10px',
    letterSpacing: '0.5px',
    cursor: 'pointer',
  },
};
