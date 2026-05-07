'use client';

import React, { useState, useEffect } from 'react';
import { VERSION } from '@/lib/version';

const VARIANT_KEY = 'helm-auth-variant';

type Variant = 'a' | 'b';

interface AuthShellProps {
  children: React.ReactNode;
}

function useAuthVariant(): Variant {
  const [variant, setVariant] = useState<Variant>('a');

  useEffect(() => {
    const stored = localStorage.getItem(VARIANT_KEY);
    if (stored === 'b') setVariant('b');

    function onStorage(e: StorageEvent) {
      if (e.key === VARIANT_KEY) setVariant(e.newValue === 'b' ? 'b' : 'a');
    }

    function onCustom() {
      const v = localStorage.getItem(VARIANT_KEY);
      setVariant(v === 'b' ? 'b' : 'a');
    }

    window.addEventListener('storage', onStorage);
    window.addEventListener('auth-variant-change', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth-variant-change', onCustom);
    };
  }, []);

  return variant;
}

function ShipsWheel({ size = 180 }: { size?: number }) {
  const s = size / 300;
  return (
    <svg
      width={size}
      height={size}
      viewBox="190 110 300 300"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g className="auth-wheel-spin">
        <circle cx="340" cy="260" r="104" fill="none" stroke="#B8892A" strokeWidth={1.5 / s} opacity="0.55" />
        <circle cx="340" cy="260" r="99" fill="none" stroke="#E8E2D8" strokeWidth={9 / s} />
        <line x1="367" y1="260" x2="431" y2="260" stroke="#E8E2D8" strokeWidth={7.5 / s} strokeLinecap="round" />
        <line x1="359" y1="279" x2="404" y2="324" stroke="#E8E2D8" strokeWidth={7.5 / s} strokeLinecap="round" />
        <line x1="340" y1="287" x2="340" y2="351" stroke="#E8E2D8" strokeWidth={7.5 / s} strokeLinecap="round" />
        <line x1="321" y1="279" x2="276" y2="324" stroke="#E8E2D8" strokeWidth={7.5 / s} strokeLinecap="round" />
        <line x1="313" y1="260" x2="249" y2="260" stroke="#E8E2D8" strokeWidth={7.5 / s} strokeLinecap="round" />
        <line x1="321" y1="241" x2="276" y2="196" stroke="#E8E2D8" strokeWidth={7.5 / s} strokeLinecap="round" />
        <line x1="340" y1="233" x2="340" y2="169" stroke="#E8E2D8" strokeWidth={7.5 / s} strokeLinecap="round" />
        <line x1="359" y1="241" x2="404" y2="196" stroke="#E8E2D8" strokeWidth={7.5 / s} strokeLinecap="round" />
        <circle cx="449" cy="260" r={9 / s} fill="#E8E2D8" />
        <circle cx="417" cy="337" r={9 / s} fill="#E8E2D8" />
        <circle cx="340" cy="369" r={9 / s} fill="#E8E2D8" />
        <circle cx="263" cy="337" r={9 / s} fill="#E8E2D8" />
        <circle cx="231" cy="260" r={9 / s} fill="#E8E2D8" />
        <circle cx="263" cy="183" r={9 / s} fill="#E8E2D8" />
        <circle cx="340" cy="151" r={9 / s} fill="#E8E2D8" />
        <circle cx="417" cy="183" r={9 / s} fill="#E8E2D8" />
        <circle cx="340" cy="260" r={26 / s} fill="#E8E2D8" />
        <circle cx="340" cy="260" r={18 / s} fill="#B8892A" />
        <circle cx="340" cy="260" r={10 / s} fill="#0D1E35" />
        <circle cx="340" cy="260" r={6 / s} fill="#B8892A" />
      </g>
    </svg>
  );
}

function NorthStar() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="auth-north-star">
      <polygon points="11,1 13,8 20,11 13,14 11,21 9,14 2,11 9,8" fill="#B8892A" />
    </svg>
  );
}

function useMeteors() {
  useEffect(() => {
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    const configs = [
      { id: 'auth-m1', keyframe: 'auth-shoot1', duration: '4.8s', initialDelay: 200,  minDwell: 6000,  maxDwell: 18000 },
      { id: 'auth-m2', keyframe: 'auth-shoot2', duration: '3.6s', initialDelay: 1200, minDwell: 10000, maxDwell: 24000 },
      { id: 'auth-m3', keyframe: 'auth-shoot3', duration: '6.2s', initialDelay: 2500, minDwell: 4000,  maxDwell: 14000 },
    ];

    function fire(el: HTMLElement, keyframe: string, duration: string, minDwell: number, maxDwell: number) {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = `${keyframe} ${duration} ease-in forwards`;
      const onEnd = () => {
        el.removeEventListener('animationend', onEnd);
        el.style.animation = 'none';
        const dwell = minDwell + Math.random() * (maxDwell - minDwell);
        const id = setTimeout(() => fire(el, keyframe, duration, minDwell, maxDwell), dwell);
        timeoutIds.push(id);
      };
      el.addEventListener('animationend', onEnd);
    }

    configs.forEach(({ id, keyframe, duration, initialDelay, minDwell, maxDwell }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const tid = setTimeout(() => fire(el, keyframe, duration, minDwell, maxDwell), initialDelay);
      timeoutIds.push(tid);
    });

    return () => { timeoutIds.forEach(clearTimeout); };
  }, []);
}

function VariantA({ children }: { children: React.ReactNode }) {
  useMeteors();

  return (
    <>
      <style>{`
        .auth-a-body {
          background: #0D1E35;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
          padding-top: calc(40px + var(--sat));
          padding-bottom: calc(40px + var(--sab));
          position: relative;
          overflow: hidden;
        }
        .auth-a-wheel-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.18;
          pointer-events: none;
          z-index: 0;
        }
        .auth-a-brand {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
          text-align: center;
          padding: 24px 0;
        }
        .auth-a-wordmark {
          font-family: 'Cormorant Garamond', serif;
          font-size: 44px;
          font-weight: 300;
          color: #ffffff;
          letter-spacing: 3px;
          text-transform: uppercase;
          line-height: 1;
        }
        .auth-a-tagline {
          font-family: 'Lato', sans-serif;
          font-size: 15px;
          font-weight: 300;
          color: rgba(255,255,255,0.6);
          line-height: 1.6;
          margin: 0;
        }
        .auth-a-card {
          position: relative;
          z-index: 1;
          background: var(--bg2);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          border-radius: var(--r-xl);
          padding: 36px;
          width: 100%;
          max-width: 400px;
        }
        .auth-a-version {
          position: fixed;
          bottom: 16px;
          left: 0;
          right: 0;
          text-align: center;
          font-family: 'Lato', sans-serif;
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.06em;
          z-index: 1;
          pointer-events: none;
        }
        .auth-a-star {
          position: fixed;
          border-radius: 50%;
          background: #B8892A;
          pointer-events: none;
          z-index: 0;
        }
        @keyframes auth-twinkle-a { 0%,100%{opacity:.15} 50%{opacity:.85} }
        @keyframes auth-twinkle-b { 0%,100%{opacity:.35} 50%{opacity:.95} }
        @keyframes auth-twinkle-c { 0%,100%{opacity:.10} 50%{opacity:.7} }
        .auth-tw-a { animation: auth-twinkle-a 3.2s ease-in-out infinite; }
        .auth-tw-b { animation: auth-twinkle-b 4.1s ease-in-out infinite 0.7s; }
        .auth-tw-c { animation: auth-twinkle-c 2.8s ease-in-out infinite 1.4s; }
        .auth-tw-d { animation: auth-twinkle-a 3.7s ease-in-out infinite 2.1s; }
        .auth-tw-e { animation: auth-twinkle-b 5.0s ease-in-out infinite 0.3s; }
        .auth-tw-f { animation: auth-twinkle-c 3.5s ease-in-out infinite 1.8s; }
        @keyframes auth-wheel-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .auth-wheel-spin { transform-box: fill-box; transform-origin: center center; animation: auth-wheel-rotate 30s linear infinite; }
        @keyframes auth-star-pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
        .auth-north-star { animation: auth-star-pulse 3s ease-in-out infinite; }
        .auth-a-meteor {
          position: fixed;
          height: 1.5px;
          border-radius: 1px;
          background: linear-gradient(to right, #fff 0%, rgba(184,137,42,0.85) 22%, transparent 100%);
          pointer-events: none;
          z-index: 3;
          opacity: 0;
        }
        #auth-m1 { top: 4vh; right: 0; width: 140px; }
        #auth-m2 { top: 22vh; right: 0; width: 88px; }
        #auth-m3 { top: 11vh; right: 0; width: 175px; }
        @keyframes auth-shoot1 { 0%{transform:rotate(-38deg) translateX(0);opacity:0} 4%{opacity:1} 85%{opacity:0.55} 100%{transform:rotate(-38deg) translateX(-280vw);opacity:0} }
        @keyframes auth-shoot2 { 0%{transform:rotate(-43deg) translateX(0);opacity:0} 5%{opacity:1} 70%{opacity:0.35} 100%{transform:rotate(-43deg) translateX(-240vw);opacity:0} }
        @keyframes auth-shoot3 { 0%{transform:rotate(-36deg) translateX(0);opacity:0} 3%{opacity:1} 90%{opacity:0.65} 100%{transform:rotate(-36deg) translateX(-320vw);opacity:0} }
      `}</style>

      <div className="auth-a-body">
        <div id="auth-m1" className="auth-a-meteor" />
        <div id="auth-m2" className="auth-a-meteor" />
        <div id="auth-m3" className="auth-a-meteor" />

        <span className="auth-a-star auth-tw-a" style={{ top: '5vh', left: '8vw', width: 6, height: 6 }} />
        <span className="auth-a-star auth-tw-b" style={{ top: '3vh', left: '22vw', width: 3, height: 3 }} />
        <span className="auth-a-star auth-tw-c" style={{ top: '8vh', left: '45vw', width: 4, height: 4 }} />
        <span className="auth-a-star auth-tw-d" style={{ top: '4vh', left: '68vw', width: 5, height: 5 }} />
        <span className="auth-a-star auth-tw-e" style={{ top: '7vh', left: '85vw', width: 3, height: 3 }} />
        <span className="auth-a-star auth-tw-f" style={{ top: '15vh', left: '4vw', width: 4, height: 4 }} />
        <span className="auth-a-star auth-tw-a" style={{ top: '30vh', left: '3vw', width: 3, height: 3 }} />
        <span className="auth-a-star auth-tw-b" style={{ top: '60vh', left: '5vw', width: 5, height: 5 }} />
        <span className="auth-a-star auth-tw-c" style={{ top: '80vh', left: '8vw', width: 3, height: 3 }} />
        <span className="auth-a-star auth-tw-d" style={{ top: '25vh', left: '94vw', width: 4, height: 4 }} />
        <span className="auth-a-star auth-tw-e" style={{ top: '50vh', left: '93vw', width: 3, height: 3 }} />
        <span className="auth-a-star auth-tw-f" style={{ top: '75vh', left: '92vw', width: 5, height: 5 }} />
        <span className="auth-a-star auth-tw-a" style={{ top: '90vh', left: '30vw', width: 3, height: 3 }} />
        <span className="auth-a-star auth-tw-b" style={{ top: '92vh', left: '65vw', width: 4, height: 4 }} />

        <div className="auth-a-brand">
          <div className="auth-a-wheel-bg">
            <ShipsWheel size={220} />
          </div>
          <NorthStar />
          <span className="auth-a-wordmark">Helm</span>
          <p className="auth-a-tagline">Your journeys, beautifully organized.</p>
        </div>

        <div className="auth-a-card">
          {children}
        </div>

        <div className="auth-a-version">v{VERSION}</div>
      </div>
    </>
  );
}

function VariantB({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .auth-b-body {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
        }
        .auth-b-header {
          background: #0D1E35;
          padding: calc(32px + var(--sat)) 24px 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 14px;
          position: relative;
          overflow: hidden;
        }
        .auth-b-header-wheel {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.06;
          pointer-events: none;
        }
        .auth-b-brand-row {
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          z-index: 1;
        }
        .auth-b-wheel-icon {
          opacity: 0.7;
        }
        .auth-b-wordmark {
          font-family: 'Cormorant Garamond', serif;
          font-size: 38px;
          font-weight: 300;
          color: #ffffff;
          letter-spacing: 3px;
          text-transform: uppercase;
          line-height: 1;
        }
        .auth-b-tagline {
          font-family: 'Lato', sans-serif;
          font-size: 14px;
          font-weight: 300;
          color: rgba(255,255,255,0.55);
          line-height: 1.5;
          margin: 0;
          position: relative;
          z-index: 1;
        }
        .auth-b-version {
          font-family: 'Lato', sans-serif;
          font-size: 10px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.06em;
          margin-top: 4px;
          position: relative;
          z-index: 1;
        }
        .auth-b-content {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 28px 16px;
          padding-bottom: calc(32px + var(--sab));
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .auth-b-card {
          background: var(--bg2);
          box-shadow: var(--shadow-md);
          border-radius: var(--r-xl);
          padding: 32px;
          width: 100%;
          max-width: 420px;
        }
        @keyframes auth-wheel-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .auth-wheel-spin { transform-box: fill-box; transform-origin: center center; animation: auth-wheel-rotate 30s linear infinite; }
      `}</style>

      <div className="auth-b-body">
        <div className="auth-b-header">
          <div className="auth-b-header-wheel">
            <ShipsWheel size={280} />
          </div>

          <div className="auth-b-brand-row">
            <div className="auth-b-wheel-icon">
              <ShipsWheel size={40} />
            </div>
            <span className="auth-b-wordmark">Helm</span>
          </div>
          <p className="auth-b-tagline">Your journeys, beautifully organized.</p>
          <span className="auth-b-version">v{VERSION}</span>
        </div>

        <div className="auth-b-content">
          <div className="auth-b-card">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

export function AuthShell({ children }: AuthShellProps) {
  const variant = useAuthVariant();
  if (variant === 'b') return <VariantB>{children}</VariantB>;
  return <VariantA>{children}</VariantA>;
}
