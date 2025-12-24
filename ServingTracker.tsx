import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play, Pause, Square, Circle, Minus, Plus, Trash2,
  Video, Target, Settings, Upload, ArrowLeft, MousePointer,
  CheckCircle, AlertCircle, Loader2, PenTool, Type, FileDown,
  LayoutGrid, BarChart2, Eye
} from 'lucide-react';

// --- Types ---

type Point = { x: number; y: number };

interface TrajectoryPoint {
  time: number;
  box: { x1: number; y1: number; x2: number; y2: number };
  center: Point;
  confidence: number;
  className?: string;
}

interface ServingTrackerProps {
  onBack: () => void;
}

// --- Helpers ---

// Geometry Helpers
const getDistance = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

const isPointInRect = (point: Point, p1: Point, p2: Point) => {
  const xMin = Math.min(p1.x, p2.x);
  const xMax = Math.max(p1.x, p2.x);
  const yMin = Math.min(p1.y, p2.y);
  const yMax = Math.max(p1.y, p2.y);
  return point.x >= xMin && point.x <= xMax && point.y >= yMin && point.y <= yMax;
};

export const ServingTracker: React.FC<ServingTrackerProps> = ({ onBack }) => {
  // --- State ---
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Court Configuration
  // We store the court as 2 points (TopLeft, BottomRight)
  const [courtPoints, setCourtPoints] = useState<Point[]>([]);
  const [isDrawingCourt, setIsDrawingCourt] = useState(false);

  // Grid State
  // 0 1 2
  // 3 4 5
  // 6 7 8
  const [targetQuadrants, setTargetQuadrants] = useState<number[]>([]); // Max 2
  const [servesAllowed, setServesAllowed] = useState(10);

  // View State
  const [viewMode, setViewMode] = useState<'video' | 'report'>('video');

  // Analysis State
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');
  const [lastInferenceTime, setLastInferenceTime] = useState<number | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{width: number, height: number} | null>(null);

  // Derived Stats
  const [landingPoints, setLandingPoints] = useState<Point[]>([]);

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasStyle, setCanvasStyle] = useState<React.CSSProperties>({});

  // Update canvas overlay position
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
      renderHeight = containerHeight;
      renderWidth = containerHeight * videoRatio;
      offsetX = (containerWidth - renderWidth) / 2;
      offsetY = 0;
    } else {
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
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setCourtPoints([]);
      setTargetQuadrants([]);
      setTrajectory([]);
      setLandingPoints([]);
      setModelStatus('idle');
      setVideoDimensions(null);
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
    }
  };

  // --- Drawing Logic ---
  const getCanvasCoordinates = (e: React.MouseEvent) => {
    if (!canvasRef.current || !videoRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const rect = canvas.getBoundingClientRect();

    // Match video resolution mapping
    // Note: canvas.width/height are set to video source dims
    const scaleX = video.videoWidth / rect.width;
    const scaleY = video.videoHeight / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const point = getCanvasCoordinates(e);

    // Mode 1: Drawing Court
    if (isDrawingCourt) {
      const newPoints = [...courtPoints, point];
      setCourtPoints(newPoints);
      if (newPoints.length === 2) {
        setIsDrawingCourt(false);
      }
      return;
    }

    // Mode 2: Selecting Targets (if court defined)
    if (courtPoints.length === 2) {
      const grid = getGridInfo();
      if (!grid) return;

      // Check which cell was clicked
      const col = Math.floor((point.x - grid.x) / grid.cellW);
      const row = Math.floor((point.y - grid.y) / grid.cellH);

      if (col >= 0 && col < 3 && row >= 0 && row < 3) {
        const index = row * 3 + col;

        // Toggle selection
        if (targetQuadrants.includes(index)) {
          setTargetQuadrants(targetQuadrants.filter(i => i !== index));
        } else {
          if (targetQuadrants.length < 2) {
            setTargetQuadrants([...targetQuadrants, index]);
          } else {
             // Replace the oldest one? Or just block? Let's block.
             // Or shift. Let's block for now as per "pick up to 2".
             // Actually user might want to change, so removing is fine.
          }
        }
      }
    }
  };

  const getGridInfo = () => {
    if (courtPoints.length < 2) return null;
    const p1 = courtPoints[0];
    const p2 = courtPoints[1];
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);
    return { x, y, w, h, cellW: w / 3, cellH: h / 3 };
  };

  // --- Analysis Logic ---
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

    // Performance Optimization: Downscale frame to model's input size (640px)
    const MAX_INFERENCE_DIMENSION = 640;
    const scaleRatio = Math.min(
      1,
      MAX_INFERENCE_DIMENSION / Math.max(video.videoWidth, video.videoHeight)
    );
    const workWidth = Math.round(video.videoWidth * scaleRatio);
    const workHeight = Math.round(video.videoHeight * scaleRatio);

    const hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = workWidth;
    hiddenCanvas.height = workHeight;
    const ctx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
    // Optimization: Downscale to 640px max dimension
    const MAX_INFERENCE_DIM = 640;
    const scale = Math.min(1, MAX_INFERENCE_DIM / Math.max(video.videoWidth, video.videoHeight));

    const hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = Math.round(video.videoWidth * scale);
    hiddenCanvas.height = Math.round(video.videoHeight * scale);
    const ctx = hiddenCanvas.getContext('2d');
    const originalTime = video.currentTime;
    video.pause();

    try {
      const BATCH_SIZE = 3;
      for (let i = 0; i <= totalSteps; i += BATCH_SIZE) {
         const batchPromises = [];
         for (let j = 0; j < BATCH_SIZE && (i + j) <= totalSteps; j++) {
            const stepIndex = i + j;
            const time = stepIndex * interval;

            video.currentTime = time;
            await new Promise(r => {
              const onSeek = () => {
                video.removeEventListener('seeked', onSeek);
                r(null);
              };
              video.addEventListener('seeked', onSeek);
            });

            if (ctx) {
                ctx.drawImage(video, 0, 0, workWidth, workHeight);
                ctx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
                ctx.drawImage(video, 0, 0, extractWidth, extractHeight);
                const blob = await new Promise<Blob | null>(res => hiddenCanvas.toBlob(res, 'image/jpeg', 0.8));

                const task = new Promise<void>(async (resolve) => {
                    if (blob) {
                       const result = await fetchInference(blob);
                        if (result && result.images && result.images[0] && result.images[0].results) {
                          const ballDetections = result.images[0].results.filter((r: any) =>
                            r.name === 'volleyball' || r.name === 'sports ball' || r.name === 'ball' || r.class === 0 || r.class === 32
                          );
                          ballDetections.sort((a: any, b: any) => b.confidence - a.confidence);
                          const bestResult = ballDetections[0];
                          if (bestResult) {
                            // Scale box back to original video dimensions
                            const scaleFactor = 1 / scaleRatio;
                            const box = {
                              x1: bestResult.box.x1 * scaleFactor,
                              y1: bestResult.box.y1 * scaleFactor,
                              x2: bestResult.box.x2 * scaleFactor,
                              y2: bestResult.box.y2 * scaleFactor
                            const box = bestResult.box;
                            // Scale coordinates back
                            const scaleX = video.videoWidth / hiddenCanvas.width;
                            const scaleY = video.videoHeight / hiddenCanvas.height;
                            const scaledBox = {
                                x1: box.x1 * scaleX,
                                y1: box.y1 * scaleY,
                                x2: box.x2 * scaleX,
                                y2: box.y2 * scaleY
                            };
                            newTrajectory.push({
                              time,
                              box: scaledBox,
                              center: { x: (scaledBox.x1 + scaledBox.x2) / 2, y: (scaledBox.y1 + scaledBox.y2) / 2 },
                            // Scale coordinates back to original video resolution
                            const box = {
                              x1: bestResult.box.x1 / scale,
                              y1: bestResult.box.y1 / scale,
                              x2: bestResult.box.x2 / scale,
                              y2: bestResult.box.y2 / scale
                            };

                            newTrajectory.push({
                              time,
                              box,
                              center: { x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2 },
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
         await Promise.all(batchPromises);
         setAnalysisProgress(Math.round(((i + BATCH_SIZE) / totalSteps) * 100));
      }
    } catch (e) {
      console.error("Analysis failed", e);
      setModelStatus('error');
    } finally {
      video.currentTime = originalTime;
      setIsAnalyzing(false);

      // Post-process: Filter noise and sort
      newTrajectory.sort((a, b) => a.time - b.time);
      setTrajectory(newTrajectory);

      // Calculate Landings
      detectLandings(newTrajectory);
    }
  };

  const exportToCSV = () => {
    if (trajectory.length === 0) return;

    // Header
    const headers = ['Time (s)', 'X (px)', 'Y (px)', 'Event', 'Zone'];
    const rows = [];

    // Combine trajectory and landings
    // We'll list all trajectory points, and mark landings

    // Helper to find if a point is a landing
    const isLanding = (t: TrajectoryPoint) => {
      return landingPoints.some(l => l.x === t.center.x && l.y === t.center.y);
    };

    const grid = getGridInfo();

    trajectory.forEach(t => {
       let event = 'Trajectory';
       let zone = '-';

       if (isLanding(t)) {
         event = 'Landing';
         if (grid) {
            const col = Math.floor((t.center.x - grid.x) / grid.cellW);
            const row = Math.floor((t.center.y - grid.y) / grid.cellH);
            if (col >= 0 && col < 3 && row >= 0 && row < 3) {
              zone = (row * 3 + col + 1).toString();
            }
         }
       }

       rows.push([
         t.time.toFixed(3),
         t.center.x.toFixed(2),
         t.center.y.toFixed(2),
         event,
         zone
       ].join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "serving_analysis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchInference = async (imageBlob: Blob) => {
    try {
      const startTime = Date.now();
      const formData = new FormData();
      formData.append('model', 'https://hub.ultralytics.com/models/ITKRtcQHITZrgT2ZNpRq');
      formData.append('imgsz', '640');
      formData.append('conf', '0.25');
      formData.append('iou', '0.45');
      formData.append('file', imageBlob, 'frame.jpg');

      const response = await fetch('/api/ultralytics', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(response.statusText);

      setLastInferenceTime(Date.now() - startTime);
      setModelStatus('active');
      return await response.json();
    } catch (err) {
      setModelStatus('error');
      return null;
    }
  };

  // --- Landing Detection ---
  const detectLandings = (traj: TrajectoryPoint[]) => {
    const landings: Point[] = [];

    // Heuristic: Local Maxima of Y (lowest visual point on screen = higher Y value in canvas coords)
    // AND must be within court if court is defined (optional, but good for filtering)

    for (let i = 2; i < traj.length - 2; i++) {
      const prev2 = traj[i-2];
      const prev = traj[i-1];
      const curr = traj[i];
      const next = traj[i+1];
      const next2 = traj[i+2];

      // Check if curr is a local maximum for Y (lowest point on screen)
      // Visual Y increases downwards. So a bounce is a MAX Y.
      if (curr.center.y > prev.center.y && curr.center.y > prev2.center.y &&
          curr.center.y > next.center.y && curr.center.y > next2.center.y) {

            // It's a bounce candidate.
            // Check if it's inside the court boundary (if defined)
            if (courtPoints.length === 2) {
              if (isPointInRect(curr.center, courtPoints[0], courtPoints[1])) {
                landings.push(curr.center);
              }
            } else {
               landings.push(curr.center);
            }
      }
    }
    setLandingPoints(landings);
  };

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    const grid = getGridInfo();
    const quadrantStats = Array(9).fill(0).map(() => ({ count: 0, percentage: 0 }));

    if (!grid) return { total: 0, quadrants: quadrantStats, efficiency: 0 };

    let totalLandings = 0;

    landingPoints.forEach(p => {
       const col = Math.floor((p.x - grid.x) / grid.cellW);
       const row = Math.floor((p.y - grid.y) / grid.cellH);
       if (col >= 0 && col < 3 && row >= 0 && row < 3) {
         const idx = row * 3 + col;
         quadrantStats[idx].count++;
         totalLandings++;
       }
    });

    quadrantStats.forEach(stat => {
      stat.percentage = totalLandings > 0 ? (stat.count / totalLandings) * 100 : 0;
    });

    // Efficiency: Hits in Target / Total Attempts
    const targetHits = targetQuadrants.reduce((acc, idx) => acc + quadrantStats[idx].count, 0);
    // User sets "Serves Allowed" (e.g. 10). If we detected 12, maybe use detected.
    // If we detected 5, use 5.
    // The prompt says "dividing attempts of serves by percentage of where it landed".
    // This phrasing is weird. Let's stick to "Hit Rate = Hits in Target / Total DETECTED Landings".
    // Or if user set "Serves Allowed", maybe that's the denominator?
    // Let's use Total DETECTED Landings as denominator for distribution,
    // but maybe display Serves Allowed as a limit or goal.

    const efficiency = totalLandings > 0 ? (targetHits / totalLandings) * 100 : 0;

    return { total: totalLandings, quadrants: quadrantStats, efficiency };
  }, [landingPoints, courtPoints, targetQuadrants]);

  // --- Rendering ---
  useEffect(() => {
    const handleResize = updateCanvasOverlay;
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

    // Draw Court & Grid
    if (courtPoints.length > 0) {
      const grid = getGridInfo();

      // Draw Boundary (or partial rect while drawing)
      if (courtPoints.length === 1 && isDrawingCourt) {
         // Drawing in progress (cursor to be handled elsewhere, or just draw point)
         ctx.fillStyle = '#ffff00';
         ctx.fillRect(courtPoints[0].x - 5, courtPoints[0].y - 5, 10, 10);
      } else if (grid) {
        // Draw Full Grid
        ctx.lineWidth = 3;

        // Loop through 3x3
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const idx = r * 3 + c;
            const x = grid.x + c * grid.cellW;
            const y = grid.y + r * grid.cellH;

            ctx.strokeStyle = '#3b82f6'; // Blue lines
            ctx.strokeRect(x, y, grid.cellW, grid.cellH);

            // Highlight Target
            if (targetQuadrants.includes(idx)) {
               ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'; // Green tint
               ctx.fillRect(x, y, grid.cellW, grid.cellH);

               // Draw Target Icon
               ctx.fillStyle = '#ffffff';
               ctx.font = '20px Arial';
               ctx.fillText("TARGET", x + 10, y + 25);
            }
          }
        }
      }
    }

    // Draw Trajectories
    if (trajectory.length > 0 && viewMode === 'video') {
       ctx.beginPath();
       ctx.strokeStyle = '#ffff00';
       ctx.lineWidth = 2;
       trajectory.forEach((t, i) => {
         if (i === 0) ctx.moveTo(t.center.x, t.center.y);
         else ctx.lineTo(t.center.x, t.center.y);
       });
       ctx.stroke();

       // Draw Landings
       landingPoints.forEach(p => {
         ctx.beginPath();
         ctx.fillStyle = '#ef4444'; // Red for landing
         ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
         ctx.fill();
         ctx.lineWidth = 2;
         ctx.strokeStyle = 'white';
         ctx.stroke();
       });
    }

  }, [courtPoints, targetQuadrants, trajectory, landingPoints, isDrawingCourt, viewMode, videoRef.current?.videoWidth]);


  // --- UI Components ---

  const renderEfficiencyReport = () => {
    // Schematic 3x3 Grid
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 bg-[#1a1d24]">
        <h3 className="text-xl font-bold mb-4">Serve Distribution & Efficiency</h3>

        <div className="grid grid-cols-3 gap-1 w-full max-w-md aspect-[3/4] bg-gray-800 p-1 border border-gray-700">
           {Array(9).fill(0).map((_, idx) => {
             const stat = stats.quadrants[idx];
             const isTarget = targetQuadrants.includes(idx);

             // Color coding
             // Target + Hit = Green
             // Target + Miss (0 hits) = Light Green?
             // Non-Target + Hit = Orange/Red?

             let bgClass = 'bg-gray-700';
             if (isTarget) bgClass = 'bg-blue-900/50 border-2 border-green-500';
             else if (stat.count > 0) bgClass = 'bg-orange-500/20';

             return (
               <div key={idx} className={`${bgClass} flex flex-col items-center justify-center text-center p-2 relative`}>
                 <span className="text-2xl font-bold text-white">{stat.percentage.toFixed(0)}%</span>
                 <span className="text-xs text-gray-400">{stat.count} / {stats.total}</span>
                 {isTarget && <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />}
               </div>
             );
           })}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-8 text-center">
           <div>
             <span className="block text-gray-400 text-sm">Target Efficiency</span>
             <span className="block text-4xl font-bold text-green-400">{stats.efficiency.toFixed(1)}%</span>
           </div>
           <div>
             <span className="block text-gray-400 text-sm">Total Landings</span>
             <span className="block text-4xl font-bold text-white">{stats.total}</span>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in bg-[#0f1115] text-white p-2 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <h1 className="text-xl font-bold">Station B: Serving Analysis</h1>
        <div className="w-16" />
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-6 lg:overflow-hidden min-h-0">

        {/* Left Column: Video/Report Area */}
        <div className="w-full lg:flex-[2] flex flex-col bg-[#1a1d24] rounded-xl border border-gray-800 p-4 relative overflow-hidden">

          {/* Tabs */}
          {videoUrl && (
             <div className="absolute top-4 right-4 z-20 flex bg-black/50 backdrop-blur rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setViewMode('video')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'video' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Video
                </button>
                <button
                  onClick={() => setViewMode('report')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'report' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Efficiency Report
                </button>
             </div>
          )}

          {viewMode === 'report' ? (
             renderEfficiencyReport()
          ) : videoUrl ? (
            <div
              ref={containerRef}
              className="relative w-full flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden"
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration);
                  if (canvasRef.current && e.currentTarget.videoWidth) {
                    canvasRef.current.width = e.currentTarget.videoWidth;
                    canvasRef.current.height = e.currentTarget.videoHeight;
                  }
                  updateCanvasOverlay();
                }}
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-auto z-10"
                onClick={handleCanvasClick}
                style={{ cursor: isDrawingCourt ? 'crosshair' : 'default', ...canvasStyle }}
              />

               {/* Overlay Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur px-4 py-2 rounded-full border border-white/10 z-10">
                 <button onClick={togglePlay} className="text-white hover:text-purple-400">
                   {isPlaying ? <Pause className="fill-current w-5 h-5" /> : <Play className="fill-current w-5 h-5" />}
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
                   className="w-48 accent-purple-500"
                 />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg">
              <Upload className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-400 mb-4">Upload serving video</p>
              <input
                type="file"
                accept="video/*"
                id="video-upload"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="video-upload"
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg cursor-pointer font-bold"
              >
                Select Video
              </label>
            </div>
          )}
        </div>

        {/* Right Column: Controls */}
        <div className="w-full lg:flex-1 lg:max-w-sm flex flex-col gap-4 overflow-y-auto">

          {/* Setup Card */}
          <div className="bg-[#1a1d24] p-4 rounded-xl border border-gray-800">
             <h3 className="font-bold text-gray-200 mb-3 flex items-center gap-2">
               <Settings className="w-4 h-4 text-cyan-400" /> Court Configuration
             </h3>

             <div className="space-y-4">
               <div>
                 <label className="text-xs text-gray-400 block mb-1">Step 1: Define Court Boundary</label>
                 <button
                   onClick={() => {
                     setCourtPoints([]);
                     setIsDrawingCourt(true);
                   }}
                   className={`w-full py-2 rounded border border-dashed transition-colors text-sm ${isDrawingCourt ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'border-gray-600 text-gray-300 hover:border-gray-400'}`}
                 >
                   {courtPoints.length === 2 ? 'Redraw Court Boundary' : isDrawingCourt ? 'Click Top-Left & Bottom-Right' : 'Draw Court Boundary'}
                 </button>
               </div>

               {courtPoints.length === 2 && (
                 <div>
                   <label className="text-xs text-gray-400 block mb-1">Step 2: Select Targets (Max 2)</label>
                   <p className="text-xs text-gray-500 mb-2">Click on the grid cells in the video to select target zones.</p>
                   <div className="flex gap-2">
                     {targetQuadrants.map((q, i) => (
                       <span key={q} className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded border border-blue-700">
                         Zone {q + 1}
                       </span>
                     ))}
                     {targetQuadrants.length === 0 && <span className="text-xs text-gray-600 italic">No targets selected</span>}
                   </div>
                 </div>
               )}

               <div>
                  <label className="text-xs text-gray-400 block mb-1">Step 3: Serves Allowed</label>
                  <select
                    value={servesAllowed}
                    onChange={(e) => setServesAllowed(parseInt(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                  >
                    {[5, 10, 15, 20, 25, 30, 40, 50].map(n => (
                      <option key={n} value={n}>{n} Serves</option>
                    ))}
                  </select>
               </div>
             </div>
          </div>

          {/* Analysis Action */}
           <div className="bg-[#1a1d24] p-4 rounded-xl border border-gray-800">
            <h3 className="font-bold text-gray-200 mb-3 flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-400" /> Analysis
            </h3>

            {isAnalyzing ? (
              <div className="text-center py-2">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-400">Tracking ball trajectory...</p>
                <div className="w-full bg-gray-700 h-1.5 mt-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full transition-all" style={{ width: `${analysisProgress}%` }} />
                </div>
              </div>
            ) : (
              <button
                onClick={analyzeVideo}
                disabled={!videoUrl || courtPoints.length < 2}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Target className="w-4 h-4" /> Start Analysis
              </button>
            )}

            {stats.total > 0 && (
               <div className="mt-4 p-3 bg-gray-800/50 rounded border border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Efficiency</span>
                    <span className="text-xl font-bold text-green-400">{stats.efficiency.toFixed(0)}%</span>
                  </div>
                   <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-400">Attempts Detected</span>
                    <span className="text-sm font-mono">{stats.total} / {servesAllowed}</span>
                  </div>

                  <button
                    onClick={exportToCSV}
                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileDown className="w-4 h-4" /> Export Data (CSV)
                  </button>
               </div>
            )}
           </div>

        </div>
      </div>
    </div>
  );
};
