import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Authenticated users go straight to chat
  useEffect(() => {
    if (currentUser) navigate('/chat', { replace: true });
  }, [currentUser, navigate]);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
        fontFamily: "'General Sans', 'Space Grotesk', sans-serif",
        background: '#05040b',
      }}
    >
      {/* ─── Full-screen GIF background using <img> ─── */}
      <img
        src="/models/Cultura-Background(1).gif"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          zIndex: 0,
        }}
      />

      {/* ─── Dark gradient overlay ─── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(3,2,12,0.82) 0%, rgba(5,4,11,0.68) 50%, rgba(3,2,12,0.88) 100%)',
          zIndex: 1,
        }}
      />

      {/* ─── Left amber aurora ─── */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          left: '-80px',
          width: '480px',
          height: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,122,85,0.22), transparent 65%)',
          filter: 'blur(90px)',
          zIndex: 2,
          pointerEvents: 'none',
          animation: 'auroraDrift 22s ease-in-out infinite',
        }}
      />
      {/* ─── Right violet aurora ─── */}
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          right: '-100px',
          width: '560px',
          height: '560px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(127,138,255,0.18), transparent 65%)',
          filter: 'blur(110px)',
          zIndex: 2,
          pointerEvents: 'none',
          animation: 'auroraDrift 28s ease-in-out infinite reverse',
        }}
      />

      {/* ════════════════ CONTENT LAYER ════════════════ */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* ─── Navbar ─── */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.4rem 3rem',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #ffb289, #ff7a55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.4rem',
                color: '#230800',
                boxShadow: '0 8px 24px rgba(255,122,85,0.45)',
                flexShrink: 0,
              }}
            >
              C
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#f4f3ff',
                }}
              >
                Cultura AI
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9996b8', marginTop: 1 }}>
                Heritage Intelligence
              </div>
            </div>
          </div>

          {/* Nav right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                color: '#9996b8',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                padding: '0.4rem 0.9rem',
                borderRadius: 999,
                border: '1px dashed rgba(255,255,255,0.18)',
              }}
            >
              Beta · 0.7
            </span>
            <Link
              to="/chat"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: 999,
                background: 'linear-gradient(120deg, #ff7a55, #ff9f7a)',
                color: '#1c0b03',
                boxShadow: '0 6px 20px rgba(255,122,85,0.4)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(255,122,85,0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,122,85,0.4)';
              }}
            >
              Sign In →
            </Link>
          </div>
        </nav>

        {/* ─── Hero centre ─── */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem 1.5rem 4rem',
          }}
        >
          {/* Eyebrow badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '2rem',
              padding: '0.45rem 1.1rem',
              borderRadius: 999,
              border: '1px solid rgba(127,138,255,0.4)',
              background: 'rgba(127,138,255,0.1)',
              color: '#a8b2ff',
              fontSize: '0.72rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              animation: 'fadeUp 0.6s ease both',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#7f8aff',
                boxShadow: '0 0 8px #7f8aff',
                display: 'inline-block',
                animation: 'pulse 2.4s ease-in-out infinite',
              }}
            />
            Karnataka's AI Cultural Guide
          </div>

          {/* Main headline */}
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(2.6rem, 6.5vw, 5.2rem)',
              fontWeight: 700,
              lineHeight: 1.1,
              color: '#fbfbff',
              margin: '0 0 1.5rem',
              maxWidth: '820px',
              textShadow: '0 4px 40px rgba(0,0,0,0.7)',
              animation: 'fadeUp 0.65s ease 0.1s both',
            }}
          >
            Discover Karnataka's{' '}
            <span
              style={{
                background: 'linear-gradient(120deg, #ff7a55 10%, #ffb289 45%, #a8b2ff 80%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Living Heritage
            </span>
          </h1>

          {/* Subheading */}
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              lineHeight: 1.75,
              color: '#c4c1db',
              maxWidth: '560px',
              margin: '0 0 2.75rem',
              animation: 'fadeUp 0.65s ease 0.2s both',
            }}
          >
            Wander through dynasties, craftsmanship, festivals, and hidden trails —
            narrated in real time by a voice-first AI guide.
          </p>

          {/* CTA buttons */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: '4.5rem',
              animation: 'fadeUp 0.65s ease 0.3s both',
            }}
          >
            <Link
              to="/chat"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.9rem 2rem',
                borderRadius: 16,
                background: 'linear-gradient(120deg, #ff7a55, #ff9f7a)',
                color: '#1c0b03',
                fontWeight: 700,
                fontSize: '0.9rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                boxShadow: '0 14px 36px rgba(255,122,85,0.42)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 44px rgba(255,122,85,0.55)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 14px 36px rgba(255,122,85,0.42)';
              }}
            >
              Enter Studio
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/chat"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.9rem 2rem',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.22)',
                color: '#f4f3ff',
                fontWeight: 600,
                fontSize: '0.9rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'transform 0.25s ease, border-color 0.25s ease, background 0.25s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
            >
              Sign In
            </Link>
          </div>

          {/* ─── Glassmorphism feature strip ─── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              width: '100%',
              maxWidth: '860px',
              animation: 'fadeUp 0.7s ease 0.42s both',
            }}
          >
            {[
              { icon: '🏛️', label: 'Heritage Trails',      desc: 'Hampi, Belur, Halebidu' },
              { icon: '🎶', label: 'Living Traditions',    desc: 'Yakshagana · Folk arts' },
              { icon: '🍛', label: 'Culinary Stories',     desc: 'Udupi · Coorg cuisine' },
              { icon: '✈️', label: 'Travel Planner',        desc: 'AI itineraries' },
            ].map((f) => (
              <div
                key={f.label}
                style={{
                  padding: '1.2rem 1rem',
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                  transition: 'transform 0.3s ease, border-color 0.3s ease',
                  cursor: 'default',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{f.icon}</span>
                <p
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#f4f3ff',
                    margin: 0,
                  }}
                >
                  {f.label}
                </p>
                <p
                  style={{
                    fontSize: '0.72rem',
                    color: '#8884a8',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {f.desc}
                </p>
                {/* accent bar */}
                <div
                  style={{
                    height: 2,
                    width: 28,
                    borderRadius: 99,
                    background: 'linear-gradient(90deg, #ff7a55, #7f8aff)',
                    marginTop: 4,
                  }}
                />
              </div>
            ))}
          </div>
        </main>

        {/* ─── Footer strip ─── */}
        <footer
          style={{
            textAlign: 'center',
            padding: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Voice-first · Karnataka-rooted · AI-powered
          </p>
        </footer>
      </div>

      {/* ─── Keyframes ─── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes auroraDrift {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-35px) rotate(8deg); }
        }
        @keyframes pulse {
          0%,100% { transform: scale(1); opacity:1; }
          50%      { transform: scale(1.5); opacity:0.4; }
        }
        @media (max-width: 700px) {
          .landing-feature-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 420px) {
          .landing-feature-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
