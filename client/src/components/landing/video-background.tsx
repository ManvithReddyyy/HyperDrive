import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface VideoBackgroundProps {
  src: string;
  poster?: string;
  className?: string; // used for desaturation or other filters
  style?: React.CSSProperties;
}

export function VideoBackground({ src, poster, className = '', style }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (src.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({ startLevel: 2 }); // prevent extremely low res start
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {
            // Auto-play was prevented
          });
        });

        return () => {
          hls.destroy();
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native support (Safari)
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(() => {});
        });
      }
    } else {
      // standard mp4
      video.src = src;
      video.load();
      video.play().catch(() => {});
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      className={className}
      style={style}
      autoPlay
      loop
      muted
      playsInline
    />
  );
}
