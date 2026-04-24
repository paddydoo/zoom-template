import React from 'react';
import { Composition } from 'remotion';
import { ZoomLayout, ZoomLayoutProps } from './ZoomLayout';

const DEFAULT_PROPS: ZoomLayoutProps = {
  speaker1: {
    src: 'media/speaker1.mp4',
    name: 'Speaker 1',
    startFrame: 0,
    durationInFrames: 300,
    trimStart: 0,
  },
  speaker2: {
    src: 'media/speaker2.mp4',
    name: 'Speaker 2',
    startFrame: 0,
    durationInFrames: 300,
    trimStart: 0,
  },
  logo: {
    src: 'media/logo.png',
    name: 'Company Logo',
    startFrame: 0,
    durationInFrames: 300,
  },
};

export const Root: React.FC = () => (
  <Composition
    id="ZoomLayout"
    component={ZoomLayout}
    durationInFrames={300}
    fps={30}
    width={720}
    height={1280}
    defaultProps={DEFAULT_PROPS}
  />
);
