import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function Teleprompter({ script, onClose, isPopup = false }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const offsetRef = useRef(0);
  const rafRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(script.scroll_speed || 3);
  const [atEnd, setAtEnd] = useState(false);

  // Speed 1–10 maps to 0.3–3.0 px per frame (~18–180 px/sec at 60fps)
  const pxPerFrame = speed * 0.3;

  const tick = useCallback(() => {
    if (!contentRef.current || !containerRef.current) return;

    offsetRef.current += pxPerFrame;

    const contentHeight = contentRef.current.scrollHeight;
    const viewHeight = containerRef.current.clientHeight;
    const maxScroll = Math.max(0, contentHeight - viewHeight);

    if (offsetRef.current >= maxScroll) {
      offsetRef.current = maxScroll;
      setIsPlaying(false);
      setAtEnd(true);
    }

    contentRef.current.style.transform = `translateY(-${offsetRef.current}px)`;
    rafRef.current = requestAnimationFrame(tick);
  }, [pxPerFrame]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    setAtEnd(false);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, tick]);

  function restart() {
    offsetRef.current = 0;
    if (contentRef.current) {
      contentRef.current.style.transform = 'translateY(0)';
    }
    setIsPlaying(false);
    setAtEnd(false);
  }

  function togglePlay() {
    if (atEnd) {
      restart();
      setTimeout(() => setIsPlaying(true), 50);
    } else {
      setIsPlaying(p => !p);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setSpeed(s => Math.min(10, s + 1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setSpeed(s => Math.max(1, s - 1));
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        restart();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  return (
    <div
      className="relative flex flex-col select-none"
      style={{
        backgroundColor: script.bg_color || '#000000',
        height: isPopup ? '100vh' : '70vh',
      }}
    >
      {/* Scrolling content area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
      >
        <div
          ref={contentRef}
          className="px-8 py-12 whitespace-pre-wrap leading-relaxed"
          style={{
            color: script.fg_color || '#FFFFFF',
            fontSize: `${script.font_size || 32}px`,
            lineHeight: 1.6,
          }}
        >
          {script.content}
        </div>
      </div>

      {/* Read-line indicator */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top: '35%' }}
      >
        <div className="h-px w-full opacity-20 bg-white" />
      </div>

      {/* Controls bar */}
      <div className="shrink-0 bg-black/80 backdrop-blur px-4 py-3 flex items-center justify-between gap-4">
        <span
          className="text-white text-sm font-medium truncate max-w-[30%]"
          title={script.title}
        >
          {script.title}
        </span>

        <div className="flex items-center gap-3">
          {/* Restart */}
          <button
            onClick={restart}
            className="text-slate-300 hover:text-white text-sm px-2 py-1 rounded transition-colors"
            title="Restart (R)"
          >
            ⏮
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-lg transition-colors min-w-[80px]"
            title="Play/Pause (Space)"
          >
            {isPlaying ? '⏸ Pause' : atEnd ? '⏮ Replay' : '▶ Play'}
          </button>

          {/* Speed slider */}
          <label className="flex items-center gap-2 text-slate-300 text-xs">
            Speed
            <input
              type="range"
              min={1}
              max={10}
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              className="w-20 accent-emerald-500"
            />
            <span className="text-white font-mono w-4 text-center">{speed}</span>
          </label>

          {/* Close (inline only) */}
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded transition-colors ml-2"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="absolute top-3 right-3 text-white/20 text-xs space-y-0.5 pointer-events-none">
        <div>Space: play/pause</div>
        <div>↑↓: speed</div>
        <div>R: restart</div>
      </div>
    </div>
  );
}
