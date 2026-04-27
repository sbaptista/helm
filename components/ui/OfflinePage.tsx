'use client';

import { useEffect } from 'react';
import { version } from '@/lib/version';

export default function OfflinePage() {
  useEffect(() => {
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    const configs = [
      { id: 'hop-m1', keyframe: 'hopShoot1', duration: '4.8s', initialDelay: 800,  minDwell: 6000,  maxDwell: 18000 },
      { id: 'hop-m2', keyframe: 'hopShoot2', duration: '3.6s', initialDelay: 3000, minDwell: 10000, maxDwell: 24000 },
      { id: 'hop-m3', keyframe: 'hopShoot3', duration: '6.2s', initialDelay: 6000, minDwell: 4000,  maxDwell: 14000 },
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
      const el = document.getElementById(id) as HTMLElement | null;
      if (!el) return;
      const tid = setTimeout(() => fire(el, keyframe, duration, minDwell, maxDwell), initialDelay);
      timeoutIds.push(tid);
    });

    return () => { timeoutIds.forEach(clearTimeout); };
  }, []);

  return (
    <>
      <style>{`
        .hop-body { background: #0D1E35; min-height: 100vh; min-height: 100dvh; overflow: hidden; }
        .hop-meteor { position: fixed; height: 1.5px; border-radius: 1px; background: linear-gradient(to right, #fff 0%, rgba(184,137,42,0.85) 22%, transparent 100%); pointer-events: none; z-index: 3; opacity: 0; }
        #hop-m1 { top: 4vh;  right: 0; width: 140px; }
        #hop-m2 { top: 22vh; right: 0; width:  88px; }
        #hop-m3 { top: 11vh; right: 0; width: 175px; }
        @keyframes hopShoot1 { 0%{transform:rotate(-38deg) translateX(0);opacity:0} 4%{opacity:1} 85%{opacity:0.55} 100%{transform:rotate(-38deg) translateX(-280vw);opacity:0} }
        @keyframes hopShoot2 { 0%{transform:rotate(-43deg) translateX(0);opacity:0} 5%{opacity:1} 70%{opacity:0.35} 100%{transform:rotate(-43deg) translateX(-240vw);opacity:0} }
        @keyframes hopShoot3 { 0%{transform:rotate(-36deg) translateX(0);opacity:0} 3%{opacity:1} 90%{opacity:0.65} 100%{transform:rotate(-36deg) translateX(-320vw);opacity:0} }
        .hop-star { position: fixed; border-radius: 50%; background: #B8892A; pointer-events: none; z-index: 2; }
        @keyframes hop-ta { 0%,100%{opacity:.15} 50%{opacity:.92} }
        @keyframes hop-tb { 0%,100%{opacity:.42} 50%{opacity:1}   }
        @keyframes hop-tc { 0%,100%{opacity:.10} 50%{opacity:.78} }
        .hop-sa{animation:hop-ta 3.2s ease-in-out infinite}
        .hop-sb{animation:hop-tb 4.1s ease-in-out infinite .7s}
        .hop-sc{animation:hop-tc 2.8s ease-in-out infinite 1.4s}
        .hop-sd{animation:hop-ta 3.7s ease-in-out infinite 2.1s}
        .hop-se{animation:hop-tb 5.0s ease-in-out infinite .3s}
        .hop-sf{animation:hop-tc 3.5s ease-in-out infinite 1.8s}
        .hop-sg{animation:hop-ta 4.3s ease-in-out infinite .9s}
        .hop-sh{animation:hop-tb 2.5s ease-in-out infinite 1.1s}
        .hop-si{animation:hop-tc 4.8s ease-in-out infinite .5s}
        .hop-sj{animation:hop-ta 3.1s ease-in-out infinite 2.5s}
        .hop-page { position: relative; z-index: 10; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 32px; text-align: center; }
        .hop-wheel-bg { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: min(440px,88vw); aspect-ratio: 1; opacity: 0.20; pointer-events: none; z-index: 0; }
        .hop-wheel-bg svg { width: 100%; height: 100%; }
        .hop-text-layer { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
        .hop-north-star { margin-bottom: 14px; animation: hop-star-pulse 3s ease-in-out infinite; }
        @keyframes hop-star-pulse { 0%,100%{opacity:0.65;transform:scale(1)} 50%{opacity:1;transform:scale(1.18)} }
        .hop-wordmark { font-family:'Lato',sans-serif; font-weight:700; font-size:11px; letter-spacing:0.26em; text-transform:uppercase; color:#B8892A; margin-bottom:48px; opacity:0; animation:hop-fade-up 0.8s ease forwards 0.2s; }
        .hop-headline { font-family:'Cormorant Garamond',serif; font-size:53px; font-weight:400; color:#F2EDE4; line-height:1.1; letter-spacing:0.01em; margin-bottom:22px; max-width:380px; opacity:0; animation:hop-fade-up 0.9s ease forwards 0.5s; }
        .hop-body-text { font-family:'Lato',sans-serif; font-size:18px; font-weight:300; color:#F2EDE4; line-height:1.8; max-width:360px; opacity:0; animation:hop-fade-up 0.9s ease forwards 0.8s; }
        .hop-divider { width:40px; height:1px; background:#B8892A; margin:28px auto; opacity:0; animation:hop-fade-in 1s ease forwards 1.0s; }
        .hop-caveat { font-family:'Lato',sans-serif; font-size:15px; font-weight:300; font-style:italic; color:#F2EDE4; line-height:1.75; max-width:340px; opacity:0; animation:hop-fade-up 0.9s ease forwards 1.05s; }
        .hop-status { margin-top:44px; display:inline-flex; align-items:center; gap:7px; font-family:'Lato',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:#B8892A; border:1px solid rgba(184,137,42,0.25); border-radius:20px; padding:5px 14px; opacity:0; animation:hop-fade-up 0.9s ease forwards 1.3s; }
        .hop-dot { width:5px; height:5px; border-radius:50%; background:#B8892A; animation:hop-dot-pulse 2.8s ease-in-out infinite; }
        @keyframes hop-dot-pulse { 0%,100%{opacity:0.35;transform:scale(1)} 50%{opacity:1;transform:scale(1.5)} }
        .hop-version { position:fixed; bottom:18px; left:16px; font-family:'Lato',sans-serif; font-size:10px; color:rgba(242,237,228,0.45); letter-spacing:0.06em; z-index:10; white-space:nowrap; }
        @keyframes hop-fade-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hop-fade-in { from{opacity:0} to{opacity:1} }
        @keyframes hop-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .hop-W { transform-box:fill-box; transform-origin:center center; animation:hop-spin 26s linear infinite; }
      `}</style>

      <div className="hop-body">
        <div id="hop-m1" className="hop-meteor" />
        <div id="hop-m2" className="hop-meteor" />
        <div id="hop-m3" className="hop-meteor" />

        <span className="hop-star hop-sa" style={{top:'4vh',left:'7vw',width:'7px',height:'7px'}} />
        <span className="hop-star hop-sb" style={{top:'2vh',left:'19vw',width:'3px',height:'3px'}} />
        <span className="hop-star hop-sc" style={{top:'7vh',left:'33vw',width:'5px',height:'5px'}} />
        <span className="hop-star hop-sd" style={{top:'3vh',left:'52vw',width:'4px',height:'4px'}} />
        <span className="hop-star hop-se" style={{top:'6vh',left:'67vw',width:'6px',height:'6px'}} />
        <span className="hop-star hop-sf" style={{top:'2vh',left:'81vw',width:'3px',height:'3px'}} />
        <span className="hop-star hop-sg" style={{top:'9vh',left:'93vw',width:'5px',height:'5px'}} />
        <span className="hop-star hop-sh" style={{top:'20vh',left:'3vw',width:'4px',height:'4px'}} />
        <span className="hop-star hop-si" style={{top:'36vh',left:'2vw',width:'3px',height:'3px'}} />
        <span className="hop-star hop-sj" style={{top:'54vh',left:'4vw',width:'5px',height:'5px'}} />
        <span className="hop-star hop-sa" style={{top:'71vh',left:'3vw',width:'3px',height:'3px'}} />
        <span className="hop-star hop-sb" style={{top:'85vh',left:'6vw',width:'4px',height:'4px'}} />
        <span className="hop-star hop-sc" style={{top:'18vh',left:'94vw',width:'5px',height:'5px'}} />
        <span className="hop-star hop-sd" style={{top:'37vh',left:'95vw',width:'3px',height:'3px'}} />
        <span className="hop-star hop-se" style={{top:'57vh',left:'93vw',width:'4px',height:'4px'}} />
        <span className="hop-star hop-sf" style={{top:'76vh',left:'92vw',width:'6px',height:'6px'}} />
        <span className="hop-star hop-sg" style={{top:'88vh',left:'14vw',width:'3px',height:'3px'}} />
        <span className="hop-star hop-sh" style={{top:'92vh',left:'38vw',width:'5px',height:'5px'}} />
        <span className="hop-star hop-si" style={{top:'90vh',left:'62vw',width:'3px',height:'3px'}} />
        <span className="hop-star hop-sj" style={{top:'87vh',left:'84vw',width:'4px',height:'4px'}} />
        <span className="hop-star hop-sc" style={{top:'18vh',left:'42vw',width:'3px',height:'3px'}} />
        <span className="hop-star hop-se" style={{top:'28vh',left:'24vw',width:'2px',height:'2px'}} />
        <span className="hop-star hop-sg" style={{top:'32vh',left:'72vw',width:'3px',height:'3px'}} />
        <span className="hop-star hop-si" style={{top:'62vh',left:'28vw',width:'2px',height:'2px'}} />
        <span className="hop-star hop-sb" style={{top:'68vh',left:'58vw',width:'3px',height:'3px'}} />
        <span className="hop-star hop-sd" style={{top:'78vh',left:'44vw',width:'2px',height:'2px'}} />

        <main className="hop-page">
          <div className="hop-wheel-bg" aria-hidden="true">
            <svg viewBox="190 110 300 300" xmlns="http://www.w3.org/2000/svg">
              <g className="hop-W">
                <circle cx="340" cy="260" r="104" fill="none" stroke="#B8892A" strokeWidth="1.5" opacity="0.55"/>
                <circle cx="340" cy="260" r="99"  fill="none" stroke="#E8E2D8" strokeWidth="9"/>
                <line x1="367" y1="260" x2="431" y2="260" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round"/>
                <line x1="359" y1="279" x2="404" y2="324" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round"/>
                <line x1="340" y1="287" x2="340" y2="351" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round"/>
                <line x1="321" y1="279" x2="276" y2="324" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round"/>
                <line x1="313" y1="260" x2="249" y2="260" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round"/>
                <line x1="321" y1="241" x2="276" y2="196" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round"/>
                <line x1="340" y1="233" x2="340" y2="169" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round"/>
                <line x1="359" y1="241" x2="404" y2="196" stroke="#E8E2D8" strokeWidth="7.5" strokeLinecap="round"/>
                <circle cx="449" cy="260" r="9"  fill="#E8E2D8"/>
                <circle cx="417" cy="337" r="9"  fill="#E8E2D8"/>
                <circle cx="340" cy="369" r="9"  fill="#E8E2D8"/>
                <circle cx="263" cy="337" r="9"  fill="#E8E2D8"/>
                <circle cx="231" cy="260" r="9"  fill="#E8E2D8"/>
                <circle cx="263" cy="183" r="9"  fill="#E8E2D8"/>
                <circle cx="340" cy="151" r="9"  fill="#E8E2D8"/>
                <circle cx="417" cy="183" r="9"  fill="#E8E2D8"/>
                <circle cx="340" cy="260" r="26" fill="#E8E2D8"/>
                <circle cx="340" cy="260" r="18" fill="#B8892A"/>
                <circle cx="340" cy="260" r="10" fill="#0D1E35"/>
                <circle cx="340" cy="260" r="6"  fill="#B8892A"/>
              </g>
            </svg>
          </div>

          <div className="hop-text-layer">
            <svg className="hop-north-star" width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <polygon points="11,1 13,8 20,11 13,14 11,21 9,14 2,11 9,8" fill="#B8892A"/>
            </svg>
            <div className="hop-wordmark">Helm</div>
            <h1 className="hop-headline">Taking a breather</h1>
            <p className="hop-body-text">
              Helm needs an internet connection to keep your trip data safe and in sync.
              We&rsquo;ll be right back as soon as you&rsquo;re connected again.
            </p>
            <div className="hop-divider" />
            <p className="hop-caveat">
              If you were mid-edit when this happened, that change may not have been saved.
              We&rsquo;re sorry &mdash; offline editing is on the roadmap.
            </p>
            <div className="hop-status">
              <div className="hop-dot" />
              Offline
            </div>
          </div>
        </main>

        <div className="hop-version">v{version}</div>
      </div>
    </>
  );
}
