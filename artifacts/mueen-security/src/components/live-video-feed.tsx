import { useEffect, useRef, useState } from 'react';
import { Camera, Maximize2, Minimize2, Radio, Volume2, VolumeX, Pause, Play, ShieldCheck, RefreshCw } from 'lucide-react';

interface LiveVideoFeedProps {
  lang?: 'ar' | 'en';
  className?: string;
  onExpand?: () => void;
  isExpanded?: boolean;
}

export function LiveVideoFeed({
  lang = 'ar',
  className = '',
  onExpand,
  isExpanded = false,
}: LiveVideoFeedProps) {
  const isArabic = lang === 'ar';
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Robust playback force: Ensures muted and playsInline are strictly set on the DOM node
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;

    const forcePlay = () => {
      const promise = video.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            setIsPlaying(true);
            setHasError(false);
          })
          .catch((err) => {
            console.warn('Video autoplay attempt handled:', err);
          });
      }
    };

    forcePlay();

    video.addEventListener('loadedmetadata', forcePlay);
    video.addEventListener('loadeddata', forcePlay);
    video.addEventListener('canplay', forcePlay);

    // Delayed fallback force
    const timer = setTimeout(forcePlay, 250);

    return () => {
      clearTimeout(timer);
      video.removeEventListener('loadedmetadata', forcePlay);
      video.removeEventListener('loadeddata', forcePlay);
      video.removeEventListener('canplay', forcePlay);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const reloadVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    video.defaultMuted = true;
    video.muted = true;
    video.play().catch(() => {});
  };

  return (
    <div
      ref={containerRef}
      className={`live-video-card flex flex-col bg-[#111e19]/95 border border-[#2b3a30] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 ${className}`}
      dir={isArabic ? 'rtl' : 'ltr'}
      data-testid="live-video-feed-card"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#243329] bg-[#14231d]/90 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#e8f1eb] tracking-wide">
                {isArabic ? 'البث المباشر ومربعات التتبع' : 'Live Stream & Tracking Boxes'}
              </h3>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                <span>{isArabic ? 'بث حي' : 'LIVE'}</span>
              </span>
            </div>
            <p className="text-[10px] text-[#8ea394] mt-0.5">
              {isArabic
                ? 'كاميرا المطاف 01 · تحليل وتتبع الأفراد المباشر (YOLOv8)'
                : 'Mataf Cam-01 · Real-time Pedestrian Tracking (YOLOv8)'}
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1.5 text-xs text-[#9bb0a1]">
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-[#182921] border border-[#2e4034] text-[10px] font-mono text-emerald-300/90">
            30 FPS · 1080p
          </span>
          <button
            type="button"
            onClick={reloadVideo}
            className="p-1.5 rounded-lg bg-[#182a22] hover:bg-[#233b2f] border border-[#2f4236] text-[#c7d8cc] hover:text-white transition-colors"
            title={isArabic ? 'إعادة تحميل' : 'Reload Stream'}
            aria-label="Reload"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="p-1.5 rounded-lg bg-[#182a22] hover:bg-[#233b2f] border border-[#2f4236] text-[#c7d8cc] hover:text-white transition-colors"
            title={isPlaying ? (isArabic ? 'إيقاف مؤقت' : 'Pause') : (isArabic ? 'تشغيل' : 'Play')}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-[#182a22] hover:bg-[#233b2f] border border-[#2f4236] text-[#c7d8cc] hover:text-white transition-colors"
            title={isMuted ? (isArabic ? 'كتم الصوت' : 'Unmute') : (isArabic ? 'تشغيل الصوت' : 'Mute')}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          {onExpand ? (
            <button
              type="button"
              onClick={onExpand}
              className="p-1.5 rounded-lg bg-[#182a22] hover:bg-[#233b2f] border border-[#2f4236] text-[#c7d8cc] hover:text-white transition-colors"
              title={isExpanded ? (isArabic ? 'تصغير' : 'Collapse') : (isArabic ? 'توسيع' : 'Expand')}
              aria-label="Expand"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-[#182a22] hover:bg-[#233b2f] border border-[#2f4236] text-[#c7d8cc] hover:text-white transition-colors"
              title={isFullscreen ? (isArabic ? 'إنهاء وضع ملء الشاشة' : 'Exit Fullscreen') : (isArabic ? 'ملء الشاشة' : 'Fullscreen')}
              aria-label="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Video Viewport Area */}
      <div className="relative w-full aspect-video bg-black rounded-b-2xl overflow-hidden flex items-center justify-center group">
        {/* Exact native video element with lowercase attributes and source fallback */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          preload="auto"
          src="/output_result.mp4"
          className="w-full h-full object-cover rounded-xl"
          style={{ display: 'block', backgroundColor: '#000' }}
          onError={(e) => {
            console.error('Video load error:', e);
            setHasError(true);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          <source src="/output_result.mp4" type="video/mp4" />
          <source src="./output_result.mp4" type="video/mp4" />
          {isArabic ? 'المتصفح لا يدعم تشغيل الفيديو.' : 'Your browser does not support HTML5 video.'}
        </video>

        {/* Required Status Overlay Badge: Pulsing green live indicator + "NORMAL | 27 persons | 0.42 p/m2" */}
        <div
          className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-20 pointer-events-none"
          data-testid="video-status-overlay"
        >
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#091510]/85 backdrop-blur-md border border-emerald-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </span>
            <span className="font-mono font-bold text-xs sm:text-[13px] text-emerald-300 tracking-wide select-none drop-shadow">
              NORMAL | 27 persons | 0.42 p/m2
            </span>
          </div>
        </div>

        {/* Error Fallback Notice */}
        {hasError && (
          <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-red-400 text-xs font-semibold mb-2">
              {isArabic ? 'تعذر تشغيل البث المباشر' : 'Failed to play live stream'}
            </p>
            <a
              href="/output_result.mp4"
              download
              className="px-3 py-1 rounded bg-[#182a22] border border-[#2f4236] text-emerald-300 text-xs hover:bg-[#233b2f]"
            >
              {isArabic ? 'تنزيل الفيديو مباشرة' : 'Download video directly'}
            </a>
          </div>
        )}

        {/* Subtle Lower Info Strip (Strictly NO heatmap overlay) */}
        <div className="absolute bottom-2.5 inset-x-3 z-10 pointer-events-none flex items-center justify-between text-[11px] text-[#c0d6c7] opacity-85 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[10px] text-slate-200">
              {isArabic ? 'الكشف والتعقب النشط' : 'Active Object Tracking'}
            </span>
          </div>
          <div className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 font-mono text-[10px] text-emerald-400/90">
            {isArabic ? 'منطقة الصحن · آمن' : 'Mataf Central · SECURE'}
          </div>
        </div>
      </div>
    </div>
  );
}
