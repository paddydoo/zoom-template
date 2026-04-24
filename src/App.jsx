import React, { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  VideoOff, 
  MicOff, 
  MoreVertical, 
  Maximize2, 
  RefreshCw, 
  Video, 
  Image as ImageIcon,
  Play,
  Pause,
  Scissors,
  MousePointer2,
  Trash2,
  Download
} from 'lucide-react';

export default function App() {
  const [tracks, setTracks] = useState({
    speaker1: [],
    speaker2: [],
    logo: []
  });

  const [names, setNames] = useState({
    speaker1: "Speaker 1",
    speaker2: "Speaker 2",
    logo: "Logo Feed"
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60); 
  const [selectedClip, setSelectedClip] = useState(null); 
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [draggingClip, setDraggingClip] = useState(null); 
  const timelineRef = useRef(null);

  // Export State & Refs
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const isExportingRef = useRef(false);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);

  const mediaRefs = {
    speaker1: useRef(null),
    speaker2: useRef(null),
    logo: useRef(null)
  };

  const handleAddClip = (file, trackId) => {
    if (file) {
      const url = URL.createObjectURL(file);
      
      const addClipToState = (clipDuration) => {
        setTracks(prev => {
          const currentTrackClips = [...prev[trackId]];
          let insertStart = currentTime;
          let hasOverlap = true;
          
          while(hasOverlap) {
              const overlap = currentTrackClips.find(c => 
                  (insertStart >= c.start && insertStart < c.start + c.duration) || 
                  (insertStart + clipDuration > c.start && insertStart < c.start + c.duration) ||
                  (insertStart <= c.start && insertStart + clipDuration >= c.start + c.duration)
              );
              if (overlap) {
                  insertStart = overlap.start + overlap.duration;
              } else {
                  hasOverlap = false;
              }
          }

          if (insertStart + clipDuration > duration) {
            setTimeout(() => {
              setDuration(d => Math.max(d, Math.ceil((insertStart + clipDuration) / 10) * 10 + 10));
            }, 0);
          }

          const newClip = {
            id: Math.random().toString(36).substr(2, 9),
            src: url,
            file: file,
            start: insertStart,
            duration: clipDuration, 
            sourceStart: 0
          };
          
          return {
            ...prev,
            [trackId]: [...currentTrackClips, newClip]
          };
        });
      };

      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          const dur = video.duration;
          addClipToState((dur === Infinity || isNaN(dur)) ? 10 : dur);
        };
        video.src = url;
      } else {
        addClipToState(10); 
      }
    }
  };

  const handleSplit = () => {
    if (!selectedClip) return;
    
    const { trackId, clipId } = selectedClip;
    const trackClips = tracks[trackId];
    const clipIndex = trackClips.findIndex(c => c.id === clipId);
    
    if (clipIndex === -1) return;
    const clip = trackClips[clipIndex];
    
    if (currentTime > clip.start && currentTime < clip.start + clip.duration) {
      const splitPoint = currentTime - clip.start;
      
      const leftClip = { ...clip, duration: splitPoint };
      const rightClip = { 
        ...clip, 
        id: Math.random().toString(36).substr(2, 9),
        start: currentTime,
        duration: clip.duration - splitPoint,
        sourceStart: clip.sourceStart + splitPoint
      };
      
      const newClips = [...trackClips];
      newClips.splice(clipIndex, 1, leftClip, rightClip);
      
      setTracks(prev => ({ ...prev, [trackId]: newClips }));
      setSelectedClip({ trackId, clipId: rightClip.id }); 
    }
  };

  const handleDelete = () => {
    if (!selectedClip) return;
    const { trackId, clipId } = selectedClip;
    
    setTracks(prev => ({
      ...prev,
      [trackId]: prev[trackId].filter(c => c.id !== clipId)
    }));
    setSelectedClip(null);
  };

  const updateName = (trackId, newName) => {
    setNames(prev => ({ ...prev, [trackId]: newName }));
  };

  const getMaxMediaTime = () => {
    let max = 0;
    Object.values(tracks).forEach(track => {
      track.forEach(clip => {
        const end = clip.start + clip.duration;
        if (end > max) max = end;
      });
    });
    return max;
  };

  // --- EXPORT LOGIC ---
  const startExport = () => {
    const maxTime = getMaxMediaTime();
    if (maxTime === 0) return;

    setCurrentTime(0);
    setIsExporting(true);
    setExportProgress(0);
    isExportingRef.current = true;
    recordedChunks.current = [];

    const stream = canvasRef.current.captureStream(30);
    
    let mimeType = 'video/mp4';
    if (typeof MediaRecorder.isTypeSupported === 'function' && !MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm; codecs=vp9';
    }
    
    try {
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
    } catch (e) {
      mediaRecorderRef.current = new MediaRecorder(stream);
    }

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const actualMimeType = mediaRecorderRef.current.mimeType || mimeType;
      const extension = actualMimeType.includes('mp4') ? 'mp4' : 'webm';

      const blob = new Blob(recordedChunks.current, { type: actualMimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `zoom-layout-720p.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      setIsExporting(false);
      isExportingRef.current = false;
    };

    mediaRecorderRef.current.start();
    if (!isPlaying) setIsPlaying(true);
  };

  const renderCanvasFrame = (time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#1e1e21';
    ctx.fillRect(0, 0, 720, 1280);

    const drawSlot = (trackId, x, y, w, h, isImage) => {
      const activeClip = tracks[trackId].find(c => time >= c.start && time < c.start + c.duration);
      const mediaEl = mediaRefs[trackId].current;

      ctx.fillStyle = '#303034';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 32);
      ctx.fill();

      if (mediaEl && activeClip) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 32);
        ctx.clip();
        
        if (isImage) {
           drawContain(ctx, mediaEl, x, y, w, h);
        } else {
           if (mediaEl.readyState >= 2) {
             drawCover(ctx, mediaEl, x, y, w, h);
           }
        }
        ctx.restore();
      }

      ctx.font = "600 24px sans-serif";
      ctx.fillStyle = "white";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 8;
      ctx.fillText(names[trackId], x + 24, y + h - 24);
      ctx.shadowBlur = 0; 
    };

    drawSlot('speaker1', 32, 160, 316, 400, false);
    drawSlot('speaker2', 372, 160, 316, 400, false);
    drawSlot('logo', 202, 584, 316, 400, true);

    ctx.fillStyle = '#1e1e21';
    ctx.fillRect(0, 1160, 720, 120);
    
    const drawBtn = (bx, by, r, color) => {
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };
    drawBtn(200, 1220, 36, '#ea4335'); 
    drawBtn(300, 1220, 32, '#ffffff'); 
    drawBtn(400, 1220, 32, '#ffffff'); 
    drawBtn(500, 1220, 32, '#3c4043'); 
  };

  const togglePlay = () => {
    const maxTime = getMaxMediaTime();
    if (maxTime === 0) return;
    if (!isPlaying && currentTime >= maxTime) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();

    const loop = (time) => {
      const delta = (time - lastTime) / 1000; 
      lastTime = time;

      setCurrentTime((prev) => {
        const maxTime = getMaxMediaTime();
        const nextTime = prev + delta;
        
        if (isExportingRef.current) {
           renderCanvasFrame(nextTime);
           setExportProgress(Math.min(100, Math.round((nextTime / maxTime) * 100)));
        }

        if (nextTime >= maxTime && maxTime > 0) {
          if (isExportingRef.current) {
             mediaRecorderRef.current?.stop();
             setIsPlaying(false);
          } else {
             setIsPlaying(false);
          }
          return maxTime;
        }

        if (nextTime >= duration) {
          setIsPlaying(false);
          return duration; 
        }
        return nextTime;
      });

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, duration, tracks]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const updatePlayheadPosition = (clientX) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left - 150; 
    const trackWidth = rect.width - 150;
    
    let percentage = x / trackWidth;
    percentage = Math.max(0, Math.min(1, percentage));
    setCurrentTime(percentage * duration);
  };

  const handleTimelineMouseDown = (e) => {
    setIsDraggingPlayhead(true);
    updatePlayheadPosition(e.clientX);
  };

  const handlePlayheadMouseDown = (e) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingPlayhead) {
        e.preventDefault(); 
        updatePlayheadPosition(e.clientX);
      } else if (draggingClip) {
        e.preventDefault();
        if (!timelineRef.current) return;
        
        const trackWidth = timelineRef.current.getBoundingClientRect().width - 150;
        const deltaX = e.clientX - draggingClip.startX;
        const deltaTime = (deltaX / trackWidth) * duration;
        
        let newStart = draggingClip.initialStart + deltaTime;

        setTracks(prev => {
          const trackClips = [...prev[draggingClip.trackId]];
          const sortedClips = [...trackClips].sort((a, b) => a.start - b.start);
          const sortedIndex = sortedClips.findIndex(c => c.id === draggingClip.clipId);

          if (sortedIndex > -1) {
            const currClip = sortedClips[sortedIndex];
            const leftClip = sortedIndex > 0 ? sortedClips[sortedIndex - 1] : null;
            const rightClip = sortedIndex < sortedClips.length - 1 ? sortedClips[sortedIndex + 1] : null;

            const minStart = leftClip ? leftClip.start + leftClip.duration : 0;
            const maxStart = rightClip ? rightClip.start - currClip.duration : Infinity;
            const SNAP_THRESHOLD = 0.5;

            if (newStart <= minStart) {
              newStart = minStart;
            } else if (newStart >= maxStart) {
              newStart = maxStart;
            } else {
              if (newStart - minStart < SNAP_THRESHOLD) {
                newStart = minStart;
              } else if (rightClip && rightClip.start - (newStart + currClip.duration) < SNAP_THRESHOLD) {
                newStart = rightClip.start - currClip.duration;
              }
            }

            newStart = Math.max(0, newStart);
            const originalIndex = trackClips.findIndex(c => c.id === draggingClip.clipId);
            trackClips[originalIndex] = { ...trackClips[originalIndex], start: newStart };
            
            if (newStart + trackClips[originalIndex].duration > duration - 5) {
               setTimeout(() => setDuration(d => d + 10), 0);
            }
          }
          return { ...prev, [draggingClip.trackId]: trackClips };
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      setDraggingClip(null);
    };

    if (isDraggingPlayhead || draggingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, draggingClip, duration]);

  const getActiveClip = (trackId) => {
    return tracks[trackId].find(c => currentTime >= c.start && currentTime < c.start + c.duration);
  };

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-row font-sans overflow-hidden">
      
      <canvas ref={canvasRef} width={720} height={1280} className="hidden" />

      {isExporting && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl w-96 max-w-[90%] shadow-2xl flex flex-col items-center text-center">
            <RefreshCw size={48} className="text-blue-500 animate-spin mb-6" />
            <h2 className="text-xl font-bold text-white mb-2">Rendering 720p Video...</h2>
            <p className="text-gray-400 text-sm mb-6">Please leave this tab open.</p>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-100 ease-linear"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
            <div className="text-gray-400 text-xs font-mono mt-2">{exportProgress}%</div>
          </div>
        </div>
      )}

      {/* --- LEFT: PREVIEW AREA --- */}
      <div className="w-[420px] flex-shrink-0 flex items-center justify-center p-4 h-full bg-gray-900/50 relative border-r border-gray-800">
        
        <div className="w-full max-w-[360px] h-full max-h-[800px] bg-[#1e1e21] rounded-[40px] border-[8px] border-gray-950 overflow-hidden shadow-2xl relative flex flex-col scale-95 origin-center">
          
          <div className="flex-1 flex flex-col justify-center px-4 py-8 gap-4 overflow-y-auto overflow-x-hidden">
            <div className="grid grid-cols-2 gap-3 h-[35%] min-h-[200px]">
              <MediaSlot 
                type="video/*"
                activeClip={getActiveClip('speaker1')}
                globalTime={currentTime}
                isPlaying={isPlaying}
                onUpload={(file) => handleAddClip(file, 'speaker1')}
                placeholderIcon={<Video size={32} className="text-gray-500 mb-2" />}
                placeholderText="Upload Speaker 1"
                name={names.speaker1}
                onNameChange={(e) => updateName('speaker1', e.target.value)}
                hideMuteIcon={true}
                mediaRef={mediaRefs.speaker1}
              />
              <MediaSlot 
                type="video/*"
                activeClip={getActiveClip('speaker2')}
                globalTime={currentTime}
                isPlaying={isPlaying}
                onUpload={(file) => handleAddClip(file, 'speaker2')}
                placeholderIcon={<Video size={32} className="text-gray-500 mb-2" />}
                placeholderText="Upload Speaker 2"
                name={names.speaker2}
                onNameChange={(e) => updateName('speaker2', e.target.value)}
                hideMuteIcon={true}
                mediaRef={mediaRefs.speaker2}
              />
            </div>

            <div className="flex justify-center w-full h-[35%] min-h-[200px]">
              <MediaSlot 
                type="image/*"
                activeClip={getActiveClip('logo')}
                globalTime={currentTime}
                isPlaying={isPlaying}
                onUpload={(file) => handleAddClip(file, 'logo')}
                placeholderIcon={<ImageIcon size={32} className="text-gray-500 mb-2" />}
                placeholderText="Upload Brand Logo"
                name={names.logo}
                onNameChange={(e) => updateName('logo', e.target.value)}
                isImage={true}
                customClass="w-[calc(50%-0.375rem)] h-full"
                mediaRef={mediaRefs.logo}
              />
            </div>
          </div>

          <div className="absolute right-4 bottom-28 flex flex-col gap-2 z-20">
            <button className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center hover:bg-white/40 transition">
              <Maximize2 size={20} className="text-black" />
            </button>
            <button className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center hover:bg-white/40 transition">
              <RefreshCw size={20} className="text-black" />
            </button>
          </div>

          <div className="h-24 w-full bg-[#1e1e21] flex items-center justify-center gap-4 px-4 pb-4">
            <button className="w-14 h-14 bg-[#ea4335] rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition">
              <Phone size={24} className="text-white fill-white rotate-[135deg]" />
            </button>
            <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-200 transition">
              <VideoOff size={22} className="text-gray-900" />
            </button>
            <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-200 transition">
              <MicOff size={22} className="text-gray-900" />
            </button>
            <button className="w-12 h-12 bg-[#3c4043] rounded-full flex items-center justify-center hover:bg-gray-600 transition">
              <MoreVertical size={22} className="text-white" />
            </button>
          </div>

        </div>
      </div>

      {/* --- RIGHT: TIMELINE EDITOR --- */}
      <div className="flex-1 h-full bg-[#111113] flex flex-col shadow-2xl z-50 select-none overflow-hidden">
        
        {/* Timeline Toolbar */}
        <div className="h-12 border-b border-gray-800 flex items-center px-4 gap-4 bg-[#18181b] flex-shrink-0">
          <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 hover:bg-blue-500 text-white transition">
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          
          <div className="text-gray-300 font-mono text-sm tracking-wider w-24">
            {formatTime(currentTime)}
          </div>

          <div className="h-5 w-px bg-gray-700 mx-2"></div>

          <button 
            onClick={() => setSelectedClip(null)} 
            className={`p-1.5 rounded transition ${!selectedClip ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} 
            title="Deselect"
          >
            <MousePointer2 size={16} />
          </button>
          <button 
            onClick={handleSplit}
            disabled={!selectedClip}
            className={`p-1.5 rounded transition ${selectedClip ? 'text-gray-200 hover:text-white hover:bg-gray-800' : 'text-gray-600 cursor-not-allowed'}`} 
            title="Split Clip at Playhead"
          >
            <Scissors size={16} />
          </button>
          <button 
            onClick={handleDelete}
            disabled={!selectedClip}
            className={`p-1.5 rounded transition ${selectedClip ? 'text-red-400 hover:bg-gray-800' : 'text-gray-600 cursor-not-allowed'}`} 
            title="Delete Selected Clip"
          >
            <Trash2 size={16} />
          </button>

          <div className="flex-1"></div>

          <button 
            onClick={startExport}
            disabled={getMaxMediaTime() === 0 || isExporting}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium rounded transition"
          >
            <Download size={16} />
            Export 720p
          </button>
        </div>

        {/* Timeline Body */}
        <div 
          ref={timelineRef}
          className="flex-1 relative flex flex-col select-none overflow-hidden"
          onMouseDown={handleTimelineMouseDown}
        >
          {/* Timeline Ruler Header */}
          <div className="h-7 border-b border-gray-800 bg-[#151518] flex flex-shrink-0 pointer-events-none z-20 relative">
            <div className="w-[150px] flex-shrink-0 border-r border-gray-800 bg-[#18181b]"></div>
            <div className="flex-1 relative overflow-hidden">
              {Array.from({ length: Math.ceil(duration / 5) + 1 }).map((_, i) => {
                const time = i * 5;
                const leftPercent = (time / duration) * 100;
                const isMajor = time % 10 === 0;
                return (
                  <div key={i} className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}>
                    {isMajor && (
                      <span className="text-[10px] text-gray-400 mt-[2px] font-mono tracking-tighter">
                        {formatTime(time)}
                      </span>
                    )}
                    <div className={`w-px bg-gray-600 mt-auto ${isMajor ? 'h-2' : 'h-1'}`}></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute top-7 bottom-0 left-[150px] right-0 pointer-events-none z-10">
            {Array.from({ length: Math.ceil(duration / 5) + 1 }).map((_, i) => {
              const leftPercent = ((i * 5) / duration) * 100;
              return (
                <div key={i} className="absolute top-0 bottom-0 w-px bg-white/[0.04]" style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}></div>
              );
            })}
          </div>

          <div 
            className={`absolute top-0 bottom-0 w-[2px] bg-red-500 z-40 pointer-events-none group ${isDraggingPlayhead ? '' : 'transition-all duration-75 ease-linear'}`}
            style={{ left: `calc(150px + ${(currentTime / duration) * 100}%)`, transform: 'translateX(-50%)' }}
          >
            <div 
              onMouseDown={handlePlayheadMouseDown}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[14px] h-[14px] bg-red-500 cursor-ew-resize pointer-events-auto rounded-[1px] shadow-[0_0_8px_rgba(239,68,68,0.6)] flex items-center justify-center hover:scale-110 group-hover:scale-110 transition-transform"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 65%, 50% 100%, 0 65%)' }}
              title="Drag to scrub"
            ></div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col z-0">
            <TimelineTrack 
              id="speaker1"
              name={names.speaker1}
              icon={<Video size={14} />}
              clips={tracks.speaker1}
              selectedClipId={selectedClip?.trackId === 'speaker1' ? selectedClip.clipId : null}
              onSelectClip={(clipId) => setSelectedClip({ trackId: 'speaker1', clipId })}
              onClipMouseDown={(e, clipId, start) => setDraggingClip({ trackId: 'speaker1', clipId, startX: e.clientX, initialStart: start })}
              onDropFile={(file) => handleAddClip(file, 'speaker1')}
              duration={duration}
              color="bg-blue-500"
              colorFocus="border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            />
            <TimelineTrack 
              id="speaker2"
              name={names.speaker2}
              icon={<Video size={14} />}
              clips={tracks.speaker2}
              selectedClipId={selectedClip?.trackId === 'speaker2' ? selectedClip.clipId : null}
              onSelectClip={(clipId) => setSelectedClip({ trackId: 'speaker2', clipId })}
              onClipMouseDown={(e, clipId, start) => setDraggingClip({ trackId: 'speaker2', clipId, startX: e.clientX, initialStart: start })}
              onDropFile={(file) => handleAddClip(file, 'speaker2')}
              duration={duration}
              color="bg-green-500"
              colorFocus="border-green-400 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
            />
            <TimelineTrack 
              id="logo"
              name={names.logo}
              icon={<ImageIcon size={14} />}
              clips={tracks.logo}
              selectedClipId={selectedClip?.trackId === 'logo' ? selectedClip.clipId : null}
              onSelectClip={(clipId) => setSelectedClip({ trackId: 'logo', clipId })}
              onClipMouseDown={(e, clipId, start) => setDraggingClip({ trackId: 'logo', clipId, startX: e.clientX, initialStart: start })}
              onDropFile={(file) => handleAddClip(file, 'logo')}
              duration={duration}
              color="bg-purple-500"
              colorFocus="border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- PHONE FRAME COMPONENTS ---

function MediaSlot({ type, activeClip, globalTime, isPlaying, onUpload, placeholderIcon, placeholderText, name, onNameChange, isImage = false, customClass = '', hideMuteIcon = false, mediaRef }) {
  const fileInputRef = useRef(null);
  const internalVideoRef = useRef(null);
  const src = activeClip?.src;

  const activeMediaRef = mediaRef || internalVideoRef;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  useEffect(() => {
    const video = activeMediaRef.current;
    if (!video || !activeClip || isImage) return;

    if (video.readyState >= 1) {
      const targetTime = activeClip.sourceStart + (globalTime - activeClip.start);
      const diff = Math.abs(video.currentTime - targetTime);
      
      if (!isPlaying) {
        if (diff > 0.05) video.currentTime = targetTime;
        if (!video.paused) video.pause();
      } else {
        if (diff > 0.3) video.currentTime = targetTime;
        if (video.paused) video.play().catch(() => {});
      }
    }
  }, [globalTime, isPlaying, activeClip, isImage]);

  const handleLoadedMetadata = (e) => {
    if (!activeClip) return;
    const video = e.target;
    const targetTime = activeClip.sourceStart + (globalTime - activeClip.start);
    video.currentTime = targetTime;
    if (isPlaying) video.play().catch(() => {});
  };

  return (
    <div className={`relative bg-[#303034] rounded-2xl overflow-hidden group flex-shrink-0 ${customClass || 'h-full'}`}>
      <input type="file" accept={type} ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {src ? (
        isImage ? (
          <img ref={activeMediaRef} src={src} alt="Feed Logo" className="w-full h-full object-contain p-4 bg-[#202024]" />
        ) : (
          <video 
            ref={activeMediaRef} 
            src={src}
            onLoadedMetadata={handleLoadedMetadata}
            loop 
            playsInline 
            className="w-full h-full object-cover bg-black" 
          />
        )
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-[#3a3a3e] transition-colors"
        >
          {placeholderIcon}
          <span className="text-gray-400 text-sm font-medium text-center px-2">{placeholderText}</span>
        </div>
      )}

      {!hideMuteIcon && (
        <div className="absolute top-2 right-2 bg-[#3c4043]/90 p-1.5 rounded-full pointer-events-none z-30">
          <MicOff size={14} className="text-white" />
        </div>
      )}
      <div className="absolute bottom-2 left-3 right-2 flex justify-between items-end z-30">
        <input 
          type="text"
          value={name}
          onChange={onNameChange}
          onClick={(e) => e.stopPropagation()}
          className="text-white text-[13px] font-medium drop-shadow-md bg-transparent border-b border-transparent focus:border-white/50 outline-none w-[70%] pointer-events-auto transition-colors"
        />
        <MoreVertical size={16} className="text-white drop-shadow-md pointer-events-none" />
      </div>

      {src && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-[2px] z-20"
        >
          <span className="bg-white/20 text-white px-4 py-2 rounded-full font-medium text-sm backdrop-blur-md shadow-lg border border-white/30">
            Replace Media
          </span>
        </div>
      )}
    </div>
  );
}

// --- TIMELINE COMPONENTS ---

function TimelineTrack({ id, name, icon, clips, selectedClipId, onSelectClip, onClipMouseDown, onDropFile, duration, color, colorFocus }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onDropFile(file);
  };

  return (
    <div className="flex h-16 border-b border-gray-800/50 bg-[#151518]">
      <div className="w-[150px] flex-shrink-0 bg-[#18181b] border-r border-gray-800 flex items-center px-3 gap-2 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
        <div className={`p-1.5 rounded-md text-white bg-opacity-20 ${color.replace('bg-', 'bg-').replace('500', '500/20')} ${color.replace('bg-', 'text-')}`}>
          {icon}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="text-xs font-semibold text-gray-300 truncate">{name}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">{id === 'logo' ? 'Image' : 'Video'}</div>
        </div>
      </div>

      <div 
        className={`flex-1 relative transition-colors ${isDragOver ? 'bg-white/5' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {clips.length === 0 && (
           <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
             <span className="text-xs text-gray-600 font-medium tracking-wide">
               Drag & Drop {id === 'logo' ? 'Image' : 'Video'} Here
             </span>
           </div>
        )}

        {clips.map(clip => {
          const isSelected = selectedClipId === clip.id;
          const leftPercent = (clip.start / duration) * 100;
          const widthPercent = (clip.duration / duration) * 100;
          
          return (
            <div 
              key={clip.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectClip(clip.id);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelectClip(clip.id);
                onClipMouseDown(e, clip.id, clip.start);
              }}
              className={`absolute top-2 bottom-2 bg-gray-800 rounded-md border flex overflow-hidden shadow-sm group cursor-pointer transition-colors
                ${isSelected ? `border-2 ${colorFocus} z-20` : 'border-gray-700 hover:border-gray-500 z-10'}
              `}
              style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
            >
              <div className={`w-1.5 h-full flex-shrink-0 ${color}`}></div>
              <div className="flex-1 px-2 flex items-center justify-between min-w-0 pointer-events-none">
                <span className={`text-[11px] truncate pr-2 ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>
                  {clip.file?.name || 'Clip'}
                </span>
              </div>
              
              {isSelected && (
                <>
                  <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize bg-white/20 hover:bg-white/40"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-white/20 hover:bg-white/40"></div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- CANVAS DRAWING HELPERS ---

function drawCover(ctx, img, x, y, w, h) {
  const imgW = img.videoWidth || img.naturalWidth || img.width;
  const imgH = img.videoHeight || img.naturalHeight || img.height;
  if (!imgW || !imgH) return;
  const aspect = w / h;
  const iAspect = imgW / imgH;
  let sx, sy, sw, sh;
  if (iAspect > aspect) {
    sh = imgH; 
    sw = imgH * aspect;
    sx = (imgW - sw) / 2; 
    sy = 0;
  } else {
    sw = imgW; 
    sh = imgW / aspect;
    sx = 0; 
    sy = (imgH - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawContain(ctx, img, x, y, w, h) {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  if (!imgW || !imgH) return;
  const aspect = w / h;
  const iAspect = imgW / imgH;
  let dx, dy, dw, dh;
  if (iAspect > aspect) {
    dw = w; 
    dh = w / iAspect;
    dx = x; 
    dy = y + (h - dh) / 2;
  } else {
    dh = h; 
    dw = h * iAspect;
    dy = y; 
    dx = x + (w - dw) / 2;
  }
  
  ctx.fillStyle = '#202024';
  ctx.fillRect(x, y, w, h);
  ctx.drawImage(img, dx, dy, dw, dh);
}
