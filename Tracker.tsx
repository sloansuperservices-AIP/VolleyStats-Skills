import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play, Pause, Square, Circle, Minus, Plus, Trash2,
  Video, Target, Settings, Upload, ArrowLeft, MousePointer,
  CheckCircle, AlertCircle, Loader2, PenTool, Type, FileDown,
  Camera, StopCircle
} from 'lucide-react';

import {
    Point,
    getDistance,
    isPointInCircle,
    isPointInRect,
    doIntersect
} from './utils/math';
import {
    MAX_INFERENCE_DIM,
    calculateScalingRatio,
    extractFrameFromVideo
} from './utils/video';
import {
    drawZones,
    drawTrajectory,
    Zone,
    ZoneType,
    TrajectoryPoint
} from './utils/drawing';
import { fetchInference } from './utils/inference';

// --- Types ---

interface Rule {
  id: string;
  zoneId: string;
  condition: 'cross' | 'enter' | 'exit' | 'inside';
  action: 'add' | 'deduct';
  points: number;
}

interface TrackerProps {
  onBack: () => void;
}

// --- Helpers ---

const generateId = () => Math.random().toString(36).substring(2, 9);

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'];

export const Tracker: React.FC<TrackerProps> = ({ onBack }) => {
  // --- State ---
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [zones, setZones] = useState<Zone[]>([]);
  const [activeTool, setActiveTool] = useState<ZoneType | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);

  const [rules, setRules] = useState<Rule[]>([]);
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const [score, setScore] = useState(0);
  const [scoreLog, setScoreLog] = useState<{time: number, msg: string}[]>([]);

  // Model status tracking
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');
  const [lastInferenceTime, setLastInferenceTime] = useState<number | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{width: number, height: number} | null>(null);

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisLoopRef = useRef<number | null>(null);
  const isLiveAnalysisRunning = useRef(false);
  const rulesRef = useRef<Rule[]>(rules);
  const zonesRef = useRef<Zone[]>(zones);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const processingContextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    rulesRef.current = rules;
    zonesRef.current = zones;
  }, [rules, zones]);
  const lastFrameTimeRef = useRef<number>(0);

  // State for canvas overlay positioning (to match video's object-contain rendering)
  const [canvasStyle, setCanvasStyle] = useState<React.CSSProperties>({});

  // Function to calculate canvas position/size to match the video's rendered area (object-contain)
  const updateCanvasOverlay = () => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || !video.videoWidth || !video.videoHeight) return;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    const videoRatio = video.videoWidth / video.videoHeight;
    const containerRatio = containerWidth / containerHeight;

    let renderWidth: number;
    let renderHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (containerRatio > videoRatio) {
      // Container is wider than video - pillarboxed (black bars on sides)
      renderHeight = containerHeight;
      renderWidth = containerHeight * videoRatio;
      offsetX = (containerWidth - renderWidth) / 2;
      offsetY = 0;
    } else {
      // Container is taller than video - letterboxed (black bars on top/bottom)
      renderWidth = containerWidth;
      renderHeight = containerWidth / videoRatio;
      offsetX = 0;
      offsetY = (containerHeight - renderHeight) / 2;
    }

    setCanvasStyle({
      position: 'absolute',
      left: `${offsetX}px`,
      top: `${offsetY}px`,
      width: `${renderWidth}px`,
      height: `${renderHeight}px`,
    });
  };

  // --- Video Handling ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      stopLive();
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      resetState();
    }
  };

  const resetState = () => {
    setZones([]);
    setRules([]);
    setTrajectory([]);
    setScore(0);
    setScoreLog([]);
    setModelStatus('idle');
    setLastInferenceTime(null);
    setVideoDimensions(null);
  };

  const startLive = async () => {
    try {
      resetState();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      // Start Recording
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();

      streamRef.current = stream;
      setIsLive(true);
      setVideoUrl('live'); // Trigger view
      setModelStatus('active');

      // Start analysis loop
      isLiveAnalysisRunning.current = true;
      lastFrameTimeRef.current = 0;
      analyzeLiveStream();

    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopLive = () => {
    isLiveAnalysisRunning.current = false;
    if (analysisLoopRef.current) {
        cancelAnimationFrame(analysisLoopRef.current);
        analysisLoopRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // Handle the data
      // We need to wait a moment for the 'stop' event to fire if we relied on event listener,
      // but simpler is to handle it here if we assume chunks are pushed?
      // Actually, 'stop' event is async. Better to set onstop in startLive or here.
      mediaRecorderRef.current.onstop = () => {
         const blob = new Blob(chunksRef.current, { type: 'video/webm' });
         const file = new File([blob], "live_recording.webm", { type: 'video/webm' });
         setVideoFile(file);
         const url = URL.createObjectURL(file);
         setVideoUrl(url);
         // Do NOT reset state here, so user can see what happened
         setIsLive(false);
         setIsAnalyzing(false);
         if (videoRef.current) {
             videoRef.current.srcObject = null;
             videoRef.current.src = url;
         }
      };
    } else {
        setIsLive(false);
        setVideoUrl(null);
        setIsAnalyzing(false);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopLive();
    };
  }, []);

  // Initialize live stream when video element becomes available
  useEffect(() => {
    if (isLive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [isLive, videoUrl]);

  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setDuration(video.duration || 0);
    setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });

    // Trigger canvas resize when video loads
    if (canvasRef.current && video.videoWidth) {
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
    }
    // Update canvas overlay position to match video's rendered area
    updateCanvasOverlay();
  };

  const togglePlay = () => {
    if (isLive) return; // No play/pause for live
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (!isLive) checkRules(videoRef.current.currentTime);
    }
  };

  // --- Drawing Logic ---
  const getCanvasCoordinates = (e: React.MouseEvent) => {
    if (!canvasRef.current || !videoRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Get the bounding rectangle of the canvas (which matches the video element in DOM size)
    const rect = canvas.getBoundingClientRect();

    // Calculate the actual displayed size of the video within the element (handling object-contain)
    const videoRatio = video.videoWidth / video.videoHeight;
    const elementRatio = rect.width / rect.height;

    let renderWidth = rect.width;
    let renderHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (elementRatio > videoRatio) {
      // Pillarboxed
      renderWidth = rect.height * videoRatio;
      offsetX = (rect.width - renderWidth) / 2;
    } else {
      // Letterboxed
      renderHeight = rect.width / videoRatio;
      offsetY = (rect.height - renderHeight) / 2;
    }

    // Coordinates relative to the canvas element
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Map to video source coordinates
    const x = (clientX - offsetX) * (video.videoWidth / renderWidth);
    const y = (clientY - offsetY) * (video.videoHeight / renderHeight);

    return { x, y };
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!activeTool) return;
    const point = getCanvasCoordinates(e);

    const newPoints = [...drawingPoints, point];
    setDrawingPoints(newPoints);

    if (activeTool === 'circle' || activeTool === 'square' || activeTool === 'line') {
      if (newPoints.length === 2) {
        // Shape complete
        addZone(activeTool, newPoints);
        setDrawingPoints([]);
        setActiveTool(null);
      }
    }
  };

  const addZone = (type: ZoneType, points: Point[]) => {
    const newZone: Zone = {
      id: generateId(),
      type,
      points,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${zones.length + 1}`,
      color: COLORS[zones.length % COLORS.length]
    };
    setZones([...zones, newZone]);
  };

  // --- Live Analysis Loop ---
  const analyzeLiveStream = async () => {
     if (!videoRef.current || !isLiveAnalysisRunning.current) return;

     const video = videoRef.current;
     if (video.readyState < 2) {
        requestAnimationFrame(analyzeLiveStream);
        return;
     }

     // Throttling: 10 FPS = 100ms interval
     const now = Date.now();
     if (now - lastFrameTimeRef.current < 100) {
        requestAnimationFrame(analyzeLiveStream);
        return;
     }
     lastFrameTimeRef.current = now;

     const scaleRatio = calculateScalingRatio(video.videoWidth, video.videoHeight);
     const extractWidth = Math.round(video.videoWidth * scaleRatio);
     const extractHeight = Math.round(video.videoHeight * scaleRatio);

     // Reuse the single context for frame extraction to avoid creating a new canvas every frame
     if (!processingContextRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = extractWidth;
        canvas.height = extractHeight;
        processingContextRef.current = canvas.getContext('2d', { willReadFrequently: true });
     }

     const blob = await extractFrameFromVideo(video, extractWidth, extractHeight, processingContextRef.current || undefined);

     if (blob && isLiveAnalysisRunning.current) {
         const result = await fetchInference(blob);

         if (result && result.data && result.data.images && result.data.images[0] && result.data.images[0].results) {
             setLastInferenceTime(result.inferenceTime);
             setModelStatus('active');

             const ballDetections = result.data.images[0].results.filter((r: any) =>
                r.name === 'volleyball' ||
                r.name === 'sports ball' ||
                r.name === 'ball' ||
                r.class === 0 ||
                r.class === 32
             );
             ballDetections.sort((a: any, b: any) => b.confidence - a.confidence);

             const bestResult = ballDetections[0];
             if (bestResult) {
                const box = bestResult.box;
                // Scale coordinates back to original video resolution
                const scaleX = video.videoWidth / extractWidth;
                const scaleY = video.videoHeight / extractHeight;

                const scaledBox = {
                    x1: box.x1 * scaleX,
                    y1: box.y1 * scaleY,
                    x2: box.x2 * scaleX,
                    y2: box.y2 * scaleY
                };

                // Use relative time from start of recording to align with video playback later
                const time = (Date.now() - startTimeRef.current) / 1000;

                const point: TrajectoryPoint = {
                    time: time,
                    box: scaledBox,
                    center: {
                        x: (scaledBox.x1 + scaledBox.x2) / 2,
                        y: (scaledBox.y1 + scaledBox.y2) / 2
                    },
                    confidence: bestResult.confidence,
                    className: bestResult.name || 'ball'
                };

                setTrajectory(prev => {
                    const newT = [...prev, point];
                    calculateFullScore(newT); // Re-calc score
                    return newT;
                });
             }
         } else if (result === null) {
             setModelStatus('error');
         }
     }

     if (isLiveAnalysisRunning.current) {
        requestAnimationFrame(analyzeLiveStream);
     }
  };

  // --- Analysis Logic (File) ---
  const analyzeVideo = async () => {
    if (!videoRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setTrajectory([]);
    setModelStatus('loading');

    const video = videoRef.current;
    const duration = video.duration;
    const interval = 0.1;
    const totalSteps = Math.floor(duration / interval);

    const newTrajectory: TrajectoryPoint[] = [];

    const scaleRatio = calculateScalingRatio(video.videoWidth, video.videoHeight);
    const extractWidth = Math.round(video.videoWidth * scaleRatio);
    const extractHeight = Math.round(video.videoHeight * scaleRatio);

    // Reuse the single context for analysis as well
    if (!processingContextRef.current) {
        const hiddenCanvas = document.createElement('canvas');
        hiddenCanvas.width = extractWidth;
        hiddenCanvas.height = extractHeight;
        processingContextRef.current = hiddenCanvas.getContext('2d', { willReadFrequently: true });
    }
    const ctx = processingContextRef.current;

    // Store current time to restore later
    const originalTime = video.currentTime;
    video.pause();

    try {
      const BATCH_SIZE = 3;

      for (let i = 0; i <= totalSteps; i += BATCH_SIZE) {
         const batchPromises = [];

         for (let j = 0; j < BATCH_SIZE && (i + j) <= totalSteps; j++) {
            const stepIndex = i + j;
            const time = stepIndex * interval;

            // We must seek sequentially to extract frames
            video.currentTime = time;
            await new Promise(r => {
              const onSeek = () => {
                video.removeEventListener('seeked', onSeek);
                r(null);
              };
              video.addEventListener('seeked', onSeek);
            });

            // Reuse the single context and extract frame
            const blob = await extractFrameFromVideo(video, extractWidth, extractHeight, ctx);

            // Now we can fire off the network request asynchronously
            const task = new Promise<void>(async (resolve) => {
                if (blob) {
                   const result = await fetchInference(blob);
                    if (result && result.data && result.data.images && result.data.images[0] && result.data.images[0].results) {
                      setLastInferenceTime(result.inferenceTime);
                      // Filter for volleyball class - check both name and class ID
                      const ballDetections = result.data.images[0].results.filter((r: any) =>
                        r.name === 'volleyball' ||
                        r.name === 'sports ball' ||
                        r.name === 'ball' ||
                        r.class === 0 ||
                        r.class === 32 // COCO sports ball class
                      );
                      // Take the one with highest confidence
                      ballDetections.sort((a: any, b: any) => b.confidence - a.confidence);

                      const bestResult = ballDetections[0];
                      if (bestResult) {
                        const box = bestResult.box;
                        // Scale coordinates back to original video resolution
                        const scaleX = video.videoWidth / extractWidth;
                        const scaleY = video.videoHeight / extractHeight;

                        const scaledBox = {
                            x1: box.x1 * scaleX,
                            y1: box.y1 * scaleY,
                            x2: box.x2 * scaleX,
                            y2: box.y2 * scaleY
                        };

                        newTrajectory.push({
                          time,
                          box: scaledBox,
                          center: {
                            x: (scaledBox.x1 + scaledBox.x2) / 2,
                            y: (scaledBox.y1 + scaledBox.y2) / 2
                          },
                          confidence: bestResult.confidence,
                          className: bestResult.name || 'ball'
                        });
                      }
                    } else if (result === null) {
                         setModelStatus('error');
                    }
                }
                resolve();
            });
            batchPromises.push(task);
         }

         // Wait for the batch to complete network requests
         await Promise.all(batchPromises);
         setAnalysisProgress(Math.round(((i + BATCH_SIZE) / totalSteps) * 100));
      }

    } catch (e) {
      console.error("Analysis failed", e);
      alert("Analysis failed. Check console or API Key.");
    } finally {
      video.currentTime = originalTime;
      setIsAnalyzing(false);
      setTrajectory(newTrajectory);
      setModelStatus('active');
      // Re-calculate score based on full trajectory
      calculateFullScore(newTrajectory);
    }
  };

  // --- Rule Evaluation ---

  const calculateFullScore = (traj: TrajectoryPoint[]) => {
    // Reset scores
    let currentScore = 0;
    const newLog: {time: number, msg: string}[] = [];

    // Sort trajectory by time (needed if live appends out of order, though live should be in order)
    const sorted = [...traj].sort((a, b) => a.time - b.time);

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i-1];
      const curr = sorted[i];

      // Use refs to get latest rules/zones state during live updates
      const currentRules = rulesRef.current;
      const currentZones = zonesRef.current;

      currentRules.forEach(rule => {
        const zone = currentZones.find(z => z.id === rule.zoneId);
        if (!zone) return;

        let triggered = false;

        if (zone.type === 'line' && rule.condition === 'cross') {
           if (doIntersect(prev.center, curr.center, zone.points[0], zone.points[1])) {
             triggered = true;
           }
        } else if (rule.condition === 'enter') {
           const wasIn = checkInside(prev.center, zone);
           const isIn = checkInside(curr.center, zone);
           if (!wasIn && isIn) triggered = true;
        } else if (rule.condition === 'exit') {
           const wasIn = checkInside(prev.center, zone);
           const isIn = checkInside(curr.center, zone);
           if (wasIn && !isIn) triggered = true;
        } else if (rule.condition === 'inside') {
           // Condition: Inside (Bounce/Land)
           // Heuristic: Local Maxima of Y (lowest visual point)
           const next = i + 1 < sorted.length ? sorted[i + 1] : null;

           if (next && checkInside(curr.center, zone)) {
             // Logic: curr.y >= prev.y (was going down or flat) AND curr.y > next.y (is going up)
             // This detects the bottom of the bounce or the end of a floor contact
             const isBounce = curr.center.y >= prev.center.y && curr.center.y > next.center.y;
             if (isBounce) triggered = true;
           }
        }

        if (triggered) {
          const points = rule.action === 'add' ? rule.points : -rule.points;
          currentScore += points;
          newLog.push({
            time: curr.time,
            msg: `${rule.action === 'add' ? '+' : '-'}${rule.points} (${zone.label})`
          });
        }
      });
    }

    setScore(currentScore);
    setScoreLog(newLog);
  };

  // Real-time check during playback (visual only, score is pre-calc)
  const checkRules = (time: number) => {
    // Only for visual feedback if needed
  };

  const checkInside = (p: Point, zone: Zone) => {
    if (zone.type === 'circle') return isPointInCircle(p, zone.points[0], zone.points[1]);
    if (zone.type === 'square') return isPointInRect(p, zone.points[0], zone.points[1]);
    return false;
  };

  // --- Rendering ---

  // Draw Overlay with proper scaling
  // Update canvas overlay position on resize
  useEffect(() => {
    const handleResize = () => {
      updateCanvasOverlay();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw Overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const container = containerRef.current;
    if (!canvas || !video || !container) return;

    // Match canvas internal resolution to video source
    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawZones(ctx, zones);

    // Draw active drawing
    if (drawingPoints.length > 0 && activeTool) {
        // Draw partial shape can be implemented here if needed
        // For simplicity, we just draw the points for now
        ctx.fillStyle = '#00ffff';
        drawingPoints.forEach(p => {
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        });
    }

    drawTrajectory(ctx, trajectory, currentTime, isLive);

  }, [zones, drawingPoints, trajectory, currentTime, isLive, videoRef.current?.videoWidth, videoRef.current?.videoHeight]);


  return (
    <div className="flex flex-col h-full animate-fade-in bg-[#0f1115] text-white p-2 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <h1 className="text-base sm:text-xl font-bold flex items-center gap-2">
          <Target className="text-purple-400 w-4 h-4 sm:w-5 sm:h-5" /> Setting Tracker
        </h1>
        <div className="w-12 sm:w-20" /> {/* Spacer */}
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-3 sm:gap-6 lg:overflow-hidden min-h-0">

        {/* Left Column: Video & Canvas */}
        <div className="w-full lg:flex-[2] flex flex-col bg-[#1a1d24] rounded-xl border border-gray-800 p-4 relative overflow-hidden">
          {videoUrl ? (
            <div
              ref={containerRef}
              className="relative w-full flex items-center justify-center bg-black rounded-lg overflow-hidden"
              style={{
                // Auto-fit: use aspect ratio to determine height based on width
                aspectRatio: videoDimensions ? `${videoDimensions.width} / ${videoDimensions.height}` : '16 / 9',
                maxHeight: '70vh'
              }}
            >
              <video
                ref={videoRef}
                src={!isLive ? videoUrl : undefined}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                playsInline
                muted={isLive}
                onLoadedMetadata={handleVideoLoadedMetadata}
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-auto z-10"
                onClick={handleCanvasClick}
                style={{ cursor: activeTool ? 'crosshair' : 'default', ...canvasStyle }}
              />

              {/* Overlay Controls */}
              {!isLive ? (
                  <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 bg-black/60 backdrop-blur px-2 sm:px-4 py-1 sm:py-2 rounded-full border border-white/10 z-10">
                     <button onClick={togglePlay} className="text-white hover:text-purple-400">
                       {isPlaying ? <Pause className="fill-current w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="fill-current w-4 h-4 sm:w-5 sm:h-5" />}
                     </button>
                     <input
                       type="range"
                       min="0"
                       max={duration || 100}
                       value={currentTime}
                       step="0.1"
                       onChange={(e) => {
                         const t = parseFloat(e.target.value);
                         setCurrentTime(t);
                         if (videoRef.current) videoRef.current.currentTime = t;
                       }}
                       className="w-24 sm:w-48 lg:w-64 accent-purple-500"
                     />
                     <span className="text-xs font-mono w-20 sm:w-24 text-right">
                       {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                     </span>
                  </div>
              ) : (
                  <div className="absolute top-4 left-4 z-20">
                     <div className="flex items-center gap-2 bg-red-600/80 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full" />
                        LIVE
                     </div>
                  </div>
               )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg gap-4">
              <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-500 mb-4 mx-auto" />
                  <p className="text-gray-400 mb-2">Upload a video to start tracking</p>
                  <input
                    type="file"
                    accept="video/*"
                    id="video-upload"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="video-upload"
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg cursor-pointer font-bold transition-colors inline-block"
                  >
                    Select Video
                  </label>
              </div>

              <div className="text-gray-600 font-bold">- OR -</div>

              <div className="text-center">
                   <button
                    onClick={startLive}
                     className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg cursor-pointer font-bold transition-colors flex items-center gap-2"
                   >
                     <Camera className="w-5 h-5" /> Use Live Camera
                   </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Controls & Stats */}
        <div className="w-full lg:flex-1 lg:max-w-sm flex flex-col gap-3 lg:overflow-y-auto">

          {/* Analysis Card */}
          <div className="bg-[#1a1d24] p-3 rounded-xl border border-gray-800">
            <h3 className="font-bold text-gray-200 mb-2 flex items-center gap-2 text-sm">
              <Video className="w-4 h-4 text-purple-400" /> Analysis
            </h3>

            {isLive ? (
                <button
                    onClick={stopLive}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <StopCircle className="w-4 h-4" /> Stop Live Camera
                </button>
            ) : isAnalyzing ? (
              <div className="text-center py-2">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-400">Processing video frame by frame...</p>
                <div className="w-full bg-gray-700 h-1.5 mt-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full transition-all" style={{ width: `${analysisProgress}%` }} />
                </div>
                <p className="text-xs text-right mt-1 text-gray-500">{analysisProgress}%</p>
              </div>
            ) : (
              <button
                onClick={analyzeVideo}
                disabled={!videoUrl || isLive}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Target className="w-4 h-4" /> Start Tracking Analysis
              </button>
            )}

            {trajectory.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="p-2 bg-green-900/20 border border-green-500/30 rounded text-xs text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Tracking ({trajectory.length} points)
                </div>
                <button
                   onClick={() => {
                     const csvContent = "data:text/csv;charset=utf-8,"
                       + "Frame,Time,X,Y,Confidence\n"
                       + trajectory.map((t, idx) => `${idx},${t.time.toFixed(3)},${t.center.x.toFixed(1)},${t.center.y.toFixed(1)},${t.confidence.toFixed(3)}`).join("\n");
                     const encodedUri = encodeURI(csvContent);
                     const link = document.createElement("a");
                     link.setAttribute("href", encodedUri);
                     link.setAttribute("download", "volleyball_tracking.csv");
                     document.body.appendChild(link);
                     link.click();
                     document.body.removeChild(link);
                   }}
                   className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
                >
                  <FileDown className="w-3 h-3" /> Export CSV
                </button>
              </div>
            )}
          </div>

          {/* YOLO Model Status Card */}
          <div className="bg-[#1a1d24] p-4 rounded-xl border border-gray-800">
            <h3 className="font-bold text-gray-200 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-green-400" /> Ultralytics YOLO Model
            </h3>
            <div className="space-y-3">
              {/* Model Status Indicator */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Status</span>
                <div className="flex items-center gap-2">
                  {modelStatus === 'idle' && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                      <span className="text-sm text-gray-400">Idle</span>
                    </>
                  )}
                  {modelStatus === 'loading' && (
                    <>
                      <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                      <span className="text-sm text-yellow-500">Loading...</span>
                    </>
                  )}
                  {modelStatus === 'active' && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm text-green-400">Active</span>
                    </>
                  )}
                  {modelStatus === 'error' && (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-400">Error</span>
                    </>
                  )}
                </div>
              </div>

              {/* Model Details */}
              <div className="bg-black/30 rounded p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Model</span>
                  <span className="text-cyan-400 font-mono">Volleyball YOLO</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Image Size</span>
                  <span className="text-gray-300 font-mono">640px</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Confidence</span>
                  <span className="text-gray-300 font-mono">0.25</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">IoU Threshold</span>
                  <span className="text-gray-300 font-mono">0.45</span>
                </div>
                {lastInferenceTime && (
                  <div className="flex items-center justify-between border-t border-gray-700 pt-2 mt-2">
                    <span className="text-gray-500">Last Inference</span>
                    <span className="text-green-400 font-mono">{lastInferenceTime}ms</span>
                  </div>
                )}
              </div>

              {/* Video Dimensions Info */}
              {videoDimensions && (
                <div className="flex items-center justify-between text-xs bg-purple-900/20 border border-purple-500/30 rounded p-2">
                  <span className="text-purple-400">Video Resolution</span>
                  <span className="text-purple-300 font-mono">{videoDimensions.width} x {videoDimensions.height}</span>
                </div>
              )}
            </div>
          </div>

          {/* Zones Card */}
          <div className="bg-[#1a1d24] p-3 rounded-xl border border-gray-800">
            <h3 className="font-bold text-gray-200 mb-2 flex items-center gap-2 text-sm">
              <PenTool className="w-4 h-4 text-cyan-400" /> Drawing Options
            </h3>
            <div className="flex gap-1.5 mb-3">
              <button
                onClick={() => setActiveTool('line')}
                className={`flex-1 py-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors flex flex-col items-center gap-1 ${activeTool === 'line' ? 'ring-2 ring-cyan-500 bg-gray-700' : ''}`}
              >
                <Minus className="w-5 h-5 -rotate-45" /> <span className="text-xs font-medium">Line</span>
              </button>
              <button
                onClick={() => setActiveTool('circle')}
                className={`flex-1 py-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors flex flex-col items-center gap-1 ${activeTool === 'circle' ? 'ring-2 ring-cyan-500 bg-gray-700' : ''}`}
              >
                <Circle className="w-5 h-5" /> <span className="text-xs font-medium">Circle</span>
              </button>
              <button
                onClick={() => setActiveTool('square')}
                className={`flex-1 py-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors flex flex-col items-center gap-1 ${activeTool === 'square' ? 'ring-2 ring-cyan-500 bg-gray-700' : ''}`}
              >
                <Square className="w-5 h-5" /> <span className="text-xs font-medium">Square</span>
              </button>
            </div>

            {zones.length === 0 && (
              <p className="text-xs text-gray-500 text-center italic">Draw zones on the video to set up rules.</p>
            )}

            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {zones.map(zone => (
                <div key={zone.id} className="flex items-center justify-between p-1.5 bg-gray-800 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: zone.color }} />
                    <span className="font-medium">{zone.label}</span>
                  </div>
                  <button onClick={() => setZones(zones.filter(z => z.id !== zone.id))} className="text-gray-500 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Rules Card */}
          <div className="bg-[#1a1d24] p-3 rounded-xl border border-gray-800 flex-1 min-h-0 flex flex-col">
             <h3 className="font-bold text-gray-200 mb-2 flex items-center gap-2 text-sm">
              <Settings className="w-4 h-4 text-orange-400" /> Rule Sets
            </h3>

            <div className="mb-3">
              {zones.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <select id="rule-zone" className="bg-gray-800 rounded p-1.5 border border-gray-700 col-span-2">
                     {zones.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                  </select>
                  <select id="rule-cond" className="bg-gray-800 rounded p-1.5 border border-gray-700">
                     <option value="enter">Enters</option>
                     <option value="cross">Crosses</option>
                     <option value="exit">Exits</option>
                     <option value="inside">Lands Inside</option>
                  </select>
                  <select id="rule-action" className="bg-gray-800 rounded p-1.5 border border-gray-700">
                     <option value="add">Add Point (+)</option>
                     <option value="deduct">Deduct (-)</option>
                  </select>
                  <input id="rule-points" type="number" defaultValue="1" className="bg-gray-800 rounded p-1.5 border border-gray-700" placeholder="Points" />
                  <button
                    onClick={() => {
                      const zId = (document.getElementById('rule-zone') as HTMLSelectElement).value;
                      const cond = (document.getElementById('rule-cond') as HTMLSelectElement).value as any;
                      const act = (document.getElementById('rule-action') as HTMLSelectElement).value as any;
                      const pts = parseInt((document.getElementById('rule-points') as HTMLInputElement).value);

                      const zone = zones.find(z => z.id === zId);
                      if (zone && zone.type === 'line' && cond !== 'cross') {
                        alert("Lines only support 'Crosses' condition.");
                        return;
                      }

                      setRules([...rules, {
                        id: generateId(),
                        zoneId: zId,
                        condition: cond,
                        action: act,
                        points: pts
                      }]);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded font-bold"
                  >
                    Add Rule
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-24">
              {rules.map(rule => {
                const zone = zones.find(z => z.id === rule.zoneId);
                return (
                  <div key={rule.id} className="text-xs bg-gray-800 p-1.5 rounded flex justify-between items-center border-l-2" style={{ borderColor: zone?.color }}>
                    <span>
                      Ball <b>{rule.condition}</b> {zone?.label} → <b className={rule.action === 'add' ? 'text-green-400' : 'text-red-400'}>{rule.action === 'add' ? '+' : '-'}{rule.points}</b>
                    </span>
                    <button onClick={() => setRules(rules.filter(r => r.id !== rule.id))} className="text-gray-500 hover:text-red-400 ml-2">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-gray-800 mt-auto">
               <div className="flex justify-between items-end">
                 <span className="text-gray-400 text-xs">Total Score</span>
                 <span className={`text-3xl font-mono font-bold ${score >= 0 ? 'text-green-400' : 'text-red-400'}`}>{score}</span>
               </div>

               {scoreLog.length > 0 && (
                 <div className="mt-2 h-20 overflow-y-auto bg-black/30 rounded p-1.5 space-y-0.5">
                   {scoreLog.map((log, i) => (
                     <div key={i} className="text-xs text-gray-400 flex justify-between">
                       <span>{log.time.toFixed(1)}s</span>
                       <span className={log.msg.startsWith('+') ? 'text-green-400' : 'text-red-400'}>{log.msg}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
