import React from 'react';
import { AbsoluteFill, Img, Sequence, Video, staticFile } from 'remotion';
import { Phone, VideoOff, MicOff, MoreVertical } from 'lucide-react';

export type VideoClip = {
  src: string;
  name: string;
  startFrame: number;
  durationInFrames: number;
  trimStart: number;
};

export type ImageClip = {
  src: string;
  name: string;
  startFrame: number;
  durationInFrames: number;
};

export type ZoomLayoutProps = {
  speaker1: VideoClip;
  speaker2: VideoClip;
  logo: ImageClip;
};

const resolveSrc = (src: string) => {
  if (src.startsWith('http') || src.startsWith('/') || src.startsWith('file://')) {
    return src;
  }
  return staticFile(src);
};

const Label: React.FC<{ name: string }> = ({ name }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 24,
      left: 24,
      color: 'white',
      fontSize: 24,
      fontWeight: 600,
      fontFamily: 'sans-serif',
      textShadow: '0 0 8px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
    }}
  >
    {name}
  </div>
);

const VideoSlot: React.FC<{ clip: VideoClip; x: number; y: number; w: number; h: number }> = ({
  clip,
  x,
  y,
  w,
  h,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 32,
      overflow: 'hidden',
      backgroundColor: '#303034',
    }}
  >
    <Sequence from={clip.startFrame} durationInFrames={clip.durationInFrames}>
      <Video
        src={resolveSrc(clip.src)}
        startFrom={clip.trimStart}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </Sequence>
    <Label name={clip.name} />
  </div>
);

const ImageSlot: React.FC<{ clip: ImageClip; x: number; y: number; w: number; h: number }> = ({
  clip,
  x,
  y,
  w,
  h,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 32,
      overflow: 'hidden',
      backgroundColor: '#202024',
    }}
  >
    <Sequence from={clip.startFrame} durationInFrames={clip.durationInFrames}>
      <Img
        src={resolveSrc(clip.src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          padding: 16,
          boxSizing: 'border-box',
        }}
      />
    </Sequence>
    <Label name={clip.name} />
  </div>
);

const CallBtn: React.FC<{
  cx: number;
  size: number;
  bg: string;
  children: React.ReactNode;
}> = ({ cx, size, bg, children }) => (
  <div
    style={{
      position: 'absolute',
      left: cx - size / 2,
      top: 1220 - size / 2,
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </div>
);

export const ZoomLayout: React.FC<ZoomLayoutProps> = ({ speaker1, speaker2, logo }) => (
  <AbsoluteFill style={{ backgroundColor: '#1e1e21' }}>
    <VideoSlot clip={speaker1} x={32} y={160} w={316} h={400} />
    <VideoSlot clip={speaker2} x={372} y={160} w={316} h={400} />
    <ImageSlot clip={logo} x={202} y={584} w={316} h={400} />

    {/* Bottom bar */}
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 1160,
        width: 720,
        height: 120,
        backgroundColor: '#1e1e21',
      }}
    />

    {/* Call controls */}
    <CallBtn cx={200} size={72} bg="#ea4335">
      <Phone size={28} color="white" style={{ transform: 'rotate(135deg)' }} />
    </CallBtn>
    <CallBtn cx={300} size={64} bg="#ffffff">
      <VideoOff size={24} color="#111111" />
    </CallBtn>
    <CallBtn cx={400} size={64} bg="#ffffff">
      <MicOff size={24} color="#111111" />
    </CallBtn>
    <CallBtn cx={500} size={64} bg="#3c4043">
      <MoreVertical size={24} color="white" />
    </CallBtn>
  </AbsoluteFill>
);
