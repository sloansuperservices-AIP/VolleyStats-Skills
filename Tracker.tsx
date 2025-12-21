import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play, Pause, Square, Circle, Minus, Plus, Trash2,
  Video, Target, Settings, Upload, ArrowLeft, MousePointer,
  CheckCircle, AlertCircle, Loader2, PenTool, Type
} from 'lucide-react';

// --- Types ---

type Point = { x: number; y: number };
type ZoneType = 'line' | 'circle' | 'square';

interface Zone {
  id: string;
  type: ZoneType;
  points: Point[]; // Line: [start, end], Square: [topLeft, bottomRight], Circle: [center, edgePoint]
  label: string;
  color: string;
}

interface Rule {
  id: string;
  zoneId: string;
  condition: 'cross' | 'enter' | 'exit' | 'inside';
  action: 'add' | 'deduct';
  points: number;
}

interface TrajectoryPoint {
  time: number;
  box: { x1: number; y1: number; x2: number; y2: number };
  center: Point;
  confidence: number;
}

interface TrackerProps {
  onBack: () => void;
}

// --- Helpers ---

const generateId = () => Math.random().toString(36).substring(2, 9);

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'];

// Geometry Helpers
const getDistance = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

const isPointInCircle = (point: Point, center: Point, radius: Point) => {
  const r = getDistance(center, radius);
  return getDistance(point, center) <= r;
};

const isPointInRect = (point: Point, p1: Point, p2: Point) => {
  const xMin = Math.min(p1.x, p2.x);
  const xMax = Math.max(p1.x, p2.x);
  const yMin = Math.min(p1.y, p2.y);
  const yMax = Math.max(p1.y, p2.y);
  return point.x >= xMin && point.x <= xMax && point.y >= yMin && point.y <= yMax;
};

// Line intersection
const doIntersect = (p1: Point, q1: Point, p2: Point, q2: Point) => {
  const onSegment = (p: Point, r: Point, q: Point) =>
    q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);

  const orientation = (p: Point, q: Point, r: Point) => {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0;
    return (val > 0) ? 1 : 2;
  };

  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;

  // Special Cases (collinear)
  if (o1 === 0 && onSegment(p1, q1, p2)) return true;
  if (o2 === 0 && onSegment(p1, q1, q2)) return true;
  if (o3 === 0 && onSegment(p2, q2, p1)) return true;
  if (o4 === 0 && onSegment(p2, q2, q1)) return true;

  return false;
};


export const Tracker: React.FC<TrackerProps> = ({ onBack }) => {
  // --- State ---
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
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

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Video Handling ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      // Reset state
      setZones([]);
      setRules([]);
      setTrajectory([]);
      setScore(0);
      setScoreLog([]);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      checkRules(videoRef.current.currentTime);
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
      // Pillarboxed (black bars on sides)
      renderWidth = rect.height * videoRatio;
      offsetX = (rect.width - renderWidth) / 2;
    } else {
      // Letterboxed (black bars on top/bottom)
      renderHeight = rect.width / videoRatio;
      offsetY = (rect.height - renderHeight) / 2;
    }

    // Coordinates relative to the canvas element
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Check if click is within the video area
    // (Optional: clamp or ignore if outside)

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

  // --- Analysis Logic ---
  const analyzeVideo = async () => {
    if (!videoRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setTrajectory([]);

    const video = videoRef.current;
    const duration = video.duration;
    const interval = 0.5; // Analyze every 0.5 seconds
    const totalSteps = Math.floor(duration / interval);

    const newTrajectory: TrajectoryPoint[] = [];

    // Create hidden canvas for extraction
    const hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = video.videoWidth;
    hiddenCanvas.height = video.videoHeight;
    const ctx = hiddenCanvas.getContext('2d');

    // Store current time to restore later
    const originalTime = video.currentTime;
    video.pause();

    try {
      // Collect all frames first to minimize seek thrashing during network calls
      // However, we can't store 1000 blobs in memory easily.
      // Better: Process in batches of X.

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

            if (ctx) {
                ctx.drawImage(video, 0, 0);
                // We MUST await the blob creation before moving to the next frame
                // because the next iteration will overwrite the canvas.
                const blob = await new Promise<Blob | null>(res => hiddenCanvas.toBlob(res, 'image/jpeg', 0.8));

                // Now we can fire off the network request asynchronously
                const task = new Promise<void>(async (resolve) => {
                    if (blob) {
                       const result = await fetchInference(blob);
                        if (result && result.images && result.images[0].results) {
                          const bestResult = result.images[0].results[0];
                          if (bestResult) {
                            const box = bestResult.box;
                            newTrajectory.push({
                              time,
                              box,
                              center: {
                                x: (box.x1 + box.x2) / 2,
                                y: (box.y1 + box.y2) / 2
                              },
                              confidence: bestResult.confidence
                            });
                          }
                        }
                    }
                    resolve();
                });
                batchPromises.push(task);
            }
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
      // Re-calculate score based on full trajectory
      calculateFullScore(newTrajectory);
    }
  };

  const fetchInference = async (imageBlob: Blob) => {
    try {
      const apiKey = import.meta.env.VITE_ULTRALYTICS_API_KEY || '5ea02b4238fc9528408b8c36dcdb3834e11a9cbf58';

      const formData = new FormData();
      formData.append('model', 'https://hub.ultralytics.com/models/ITKRtcQHITZrgT2ZNpRq');
      formData.append('imgsz', '640');
      formData.append('conf', '0.25');
      formData.append('iou', '0.45');
      formData.append('file', imageBlob, 'frame.jpg');

      // Use local proxy if available (to avoid CORS)
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '/api/ultralytics'
        : 'https://predict.ultralytics.com';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey
        },
        body: formData
      });

      if (!response.ok) {
        if (response.status === 0 || response.status === 403) {
           console.warn("API Request failed. This might be a CORS issue or Invalid Key.");
        }
        throw new Error(response.statusText);
      }
      return await response.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // --- Rule Evaluation ---

  const calculateFullScore = (traj: TrajectoryPoint[]) => {
    // Reset scores
    let currentScore = 0;
    const newLog: {time: number, msg: string}[] = [];

    // Sort trajectory by time
    const sorted = [...traj].sort((a, b) => a.time - b.time);

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i-1];
      const curr = sorted[i];

      rules.forEach(rule => {
        const zone = zones.find(z => z.id === rule.zoneId);
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
           // This triggers every frame? That's probably too much.
           // Usually "landing" is what matters.
           // For now, we'll skip continuous 'inside' scoring to avoid infinite points.
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

  // Draw Overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    if (video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Zones
    zones.forEach(zone => {
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 5;
      ctx.fillStyle = zone.color + '40'; // Transparent fill

      ctx.beginPath();
      if (zone.type === 'line') {
        ctx.moveTo(zone.points[0].x, zone.points[0].y);
        ctx.lineTo(zone.points[1].x, zone.points[1].y);
      } else if (zone.type === 'circle') {
        const r = getDistance(zone.points[0], zone.points[1]);
        ctx.arc(zone.points[0].x, zone.points[0].y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (zone.type === 'square') {
         const p1 = zone.points[0];
         const p2 = zone.points[1];
         const x = Math.min(p1.x, p2.x);
         const y = Math.min(p1.y, p2.y);
         const w = Math.abs(p2.x - p1.x);
         const h = Math.abs(p2.y - p1.y);
         ctx.rect(x, y, w, h);
         ctx.fill();
      }
      ctx.stroke();

      // Label
      ctx.fillStyle = 'white';
      ctx.font = '30px Arial';
      ctx.fillText(zone.label, zone.points[0].x + 10, zone.points[0].y - 10);
    });

    // Draw active drawing
    if (drawingPoints.length > 0 && activeTool) {
       // Draw partial shape... (simplified for now)
    }

    // Draw Ball & Trajectory
    if (trajectory.length > 0) {
      // Draw path
      ctx.beginPath();
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      trajectory.forEach((t, i) => {
        if (i === 0) ctx.moveTo(t.center.x, t.center.y);
        else ctx.lineTo(t.center.x, t.center.y);
      });
      ctx.stroke();

      // Draw current ball position if near current time
      const currentPoint = trajectory.find(p => Math.abs(p.time - currentTime) < 0.3);
      if (currentPoint) {
        ctx.beginPath();
        ctx.fillStyle = '#ff00ff';
        ctx.arc(currentPoint.center.x, currentPoint.center.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Bounding box
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          currentPoint.box.x1,
          currentPoint.box.y1,
          currentPoint.box.x2 - currentPoint.box.x1,
          currentPoint.box.y2 - currentPoint.box.y1
        );
      }
    }

  }, [zones, drawingPoints, trajectory, currentTime, videoRef.current?.videoWidth]);


  return (
    <div className="flex flex-col h-full animate-fade-in bg-[#0f1115] text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5 mr-1" /> Back
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Target className="text-purple-400" /> Ball Tracking & Rules Engine
        </h1>
        <div className="w-20" /> {/* Spacer */}
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-6 lg:overflow-hidden">

        {/* Left Column: Video & Canvas */}
        <div className="w-full lg:flex-[2] flex flex-col bg-[#1a1d24] rounded-xl border border-gray-800 p-4 relative overflow-hidden min-h-[500px]">
          {videoUrl ? (
            <div
              ref={containerRef}
              className="relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden"
              style={{ minHeight: '400px' }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="absolute inset-0 w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-auto z-10"
                onClick={handleCanvasClick}
                style={{ cursor: activeTool ? 'crosshair' : 'default' }}
              />

              {/* Overlay Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur px-4 py-2 rounded-full border border-white/10 z-10">
                 <button onClick={togglePlay} className="text-white hover:text-purple-400">
                   {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
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
                   className="w-64 accent-purple-500"
                 />
                 <span className="text-xs font-mono w-16 text-right">
                   {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                 </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg">
              <Upload className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-400 mb-4">Upload a video to start tracking</p>
              <input
                type="file"
                accept="video/*"
                id="video-upload"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="video-upload"
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg cursor-pointer font-bold transition-colors"
              >
                Select Video
              </label>
            </div>
          )}
        </div>

        {/* Right Column: Controls & Stats */}
        <div className="w-full lg:flex-1 flex flex-col gap-4 lg:overflow-y-auto">

          {/* Analysis Card */}
          <div className="bg-[#1a1d24] p-4 rounded-xl border border-gray-800">
            <h3 className="font-bold text-gray-200 mb-3 flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-400" /> Analysis
            </h3>
            {isAnalyzing ? (
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-400">Processing video frame by frame...</p>
                <div className="w-full bg-gray-700 h-2 mt-3 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full transition-all" style={{ width: `${analysisProgress}%` }} />
                </div>
                <p className="text-xs text-right mt-1 text-gray-500">{analysisProgress}%</p>
              </div>
            ) : (
              <button
                onClick={analyzeVideo}
                disabled={!videoUrl}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Target className="w-4 h-4" /> Start Tracking Analysis
              </button>
            )}
            {trajectory.length > 0 && (
              <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded text-sm text-green-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Tracking Complete ({trajectory.length} frames)
              </div>
            )}
          </div>

          {/* Zones Card */}
          <div className="bg-[#1a1d24] p-4 rounded-xl border border-gray-800">
            <h3 className="font-bold text-gray-200 mb-3 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-cyan-400" /> Zones
            </h3>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTool('line')}
                className={`flex-1 py-3 rounded bg-gray-800 hover:bg-gray-700 transition-colors flex flex-col items-center gap-2 ${activeTool === 'line' ? 'ring-2 ring-cyan-500 bg-gray-700' : ''}`}
              >
                <Minus className="w-6 h-6 -rotate-45" /> <span className="text-sm font-medium">Line</span>
              </button>
              <button
                onClick={() => setActiveTool('circle')}
                className={`flex-1 py-3 rounded bg-gray-800 hover:bg-gray-700 transition-colors flex flex-col items-center gap-2 ${activeTool === 'circle' ? 'ring-2 ring-cyan-500 bg-gray-700' : ''}`}
              >
                <Circle className="w-6 h-6" /> <span className="text-sm font-medium">Circle</span>
              </button>
              <button
                onClick={() => setActiveTool('square')}
                className={`flex-1 py-3 rounded bg-gray-800 hover:bg-gray-700 transition-colors flex flex-col items-center gap-2 ${activeTool === 'square' ? 'ring-2 ring-cyan-500 bg-gray-700' : ''}`}
              >
                <Square className="w-6 h-6" /> <span className="text-sm font-medium">Square</span>
              </button>
            </div>

            {zones.length === 0 && (
              <p className="text-sm text-gray-500 text-center italic">Draw zones on the video to set up rules.</p>
            )}

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {zones.map(zone => (
                <div key={zone.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: zone.color }} />
                    <span className="text-sm font-medium">{zone.label}</span>
                  </div>
                  <button onClick={() => setZones(zones.filter(z => z.id !== zone.id))} className="text-gray-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Rules Card */}
          <div className="bg-[#1a1d24] p-4 rounded-xl border border-gray-800 flex-1">
             <h3 className="font-bold text-gray-200 mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-orange-400" /> Rules Engine
            </h3>

            <div className="mb-4 space-y-2">
              {zones.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <select id="rule-zone" className="bg-gray-800 text-sm rounded p-1 border border-gray-700">
                     {zones.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                  </select>
                  <select id="rule-cond" className="bg-gray-800 text-sm rounded p-1 border border-gray-700">
                     <option value="enter">Enters</option>
                     <option value="cross">Crosses</option>
                     <option value="exit">Exits</option>
                  </select>
                  <select id="rule-action" className="bg-gray-800 text-sm rounded p-1 border border-gray-700">
                     <option value="add">Add Point (+)</option>
                     <option value="deduct">Deduct Point (-)</option>
                  </select>
                  <input id="rule-points" type="number" defaultValue="1" className="w-12 bg-gray-800 text-sm rounded p-1 border border-gray-700" />
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
                    className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm font-bold"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {rules.map(rule => {
                const zone = zones.find(z => z.id === rule.zoneId);
                return (
                  <div key={rule.id} className="text-xs bg-gray-800 p-2 rounded flex justify-between items-center border-l-2" style={{ borderColor: zone?.color }}>
                    <span>
                      If Ball <b>{rule.condition}</b> {zone?.label} → <b className={rule.action === 'add' ? 'text-green-400' : 'text-red-400'}>{rule.action === 'add' ? '+' : '-'}{rule.points}</b>
                    </span>
                    <button onClick={() => setRules(rules.filter(r => r.id !== rule.id))} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto pt-4 border-t border-gray-800">
               <div className="flex justify-between items-end">
                 <span className="text-gray-400 text-sm">Total Score</span>
                 <span className={`text-4xl font-mono font-bold ${score >= 0 ? 'text-green-400' : 'text-red-400'}`}>{score}</span>
               </div>

               {scoreLog.length > 0 && (
                 <div className="mt-3 h-32 overflow-y-auto bg-black/30 rounded p-2 space-y-1">
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
