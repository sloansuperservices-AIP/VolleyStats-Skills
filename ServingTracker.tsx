import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play, Pause, Square, Circle, Minus, Plus, Trash2,
  Video, Target, Settings, Upload, ArrowLeft, MousePointer,
  CheckCircle, AlertCircle, Loader2, PenTool, Type, FileDown,
  LayoutGrid, BarChart2, Eye, Camera, StopCircle
} from 'lucide-react';

import {
  Point,
  getDistance,
  isPointInRect
} from './utils/math';
import {
  calculateScalingRatio,
  extractFrameFromVideo
} from './utils/video';
import {
  TrajectoryPoint
} from './utils/drawing';
import { fetchInference } from './utils/inference';

// --- Types ---

interface ServingTrackerProps {
  onBack: () => void;
}

// --- Helpers ---

// Presets for target zones
const ZONE_PRESETS = [
    { label: 'Deep Corners', targets: [0, 2] },
    { label: 'Short Serve', targets: [6, 7, 8] },
    { label: 'Line Serving', targets: [0, 3, 6, 2, 5, 8] },
    { label: 'Cross Court', targets: [0, 8, 2, 6] }
];

export const ServingTracker: React.FC<ServingTrackerProps> = ({ onBack }) => {
  // --- State ---
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
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
  const streamRef = useRef<MediaStream | null>(null);
  const isLiveAnalysisRunning = useRef(false);
  const courtPointsRef = useRef<Point[]>(courtPoints);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    courtPointsRef.current = courtPoints;
  }, [courtPoints]);
  const lastFrameTimeRef = useRef<number>(0);

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
      stopLive();
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

  const startLive = async () => {
    try {
      setTrajectory([]);
      setLandingPoints([]);
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
      setVideoUrl('live');
      setModelStatus('active');

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

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
         const blob = new Blob(chunksRef.current, { type: 'video/webm' });
         const file = new File([blob], "live_recording.webm", { type: 'video/webm' });
         setVideoFile(file);
         const url = URL.createObjectURL(file);
         setVideoUrl(url);
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

  const togglePlay = () => {
    if (isLive) return;
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
          // Allow multiple selections
          setTargetQuadrants([...targetQuadrants, index]);
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

  // --- Live Analysis Loop ---
  const analyzeLiveStream = async () => {
     if (!videoRef.current || !isLiveAnalysisRunning.current) return;

     const video = videoRef.current;
     if (video.readyState < 2) {
        requestAnimationFrame(analyzeLiveStream);
        return;
     }

     // Extract frame
     const MAX_INFERENCE_DIM = 640;
     const scale = Math.min(1, MAX_INFERENCE_DIM / Math.max(video.videoWidth, video.videoHeight));
     const extractWidth = Math.round(video.videoWidth * scale);
     const extractHeight = Math.round(video.videoHeight * scale);

     const hiddenCanvas = document.createElement('canvas');
     hiddenCanvas.width = extractWidth;
     hiddenCanvas.height = extractHeight;
     const ctx = hiddenCanvas.getContext('2d');

     if (ctx) {
         ctx.drawImage(video, 0, 0, extractWidth, extractHeight);
         const blob = await new Promise<Blob | null>(res => hiddenCanvas.toBlob(res, 'image/jpeg', 0.8));

         if (blob && isLiveAnalysisRunning.current) {
             const result = await fetchInference(blob);

             if (result && result.images && result.images[0] && result.images[0].results) {
                  const ballDetections = result.images[0].results.filter((r: any) =>
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
                    const scaleX = video.videoWidth / extractWidth;
                    const scaleY = video.videoHeight / extractHeight;

                    const scaledBox = {
                        x1: box.x1 * scaleX,
                        y1: box.y1 * scaleY,
                        x2: box.x2 * scaleX,
                        y2: box.y2 * scaleY
                    };

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
                       detectLandings(newT); // Update landings in real-time
                       return newT;
                    });
                  }
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

     const blob = await extractFrameFromVideo(video, extractWidth, extractHeight);

     if (blob && isLiveAnalysisRunning.current) {
         const result = await fetchInference(blob);

         if (result && result.data && result.data.images && result.data.images[0] && result.data.images[0].results) {
              setLastInferenceTime(result.inferenceTime);
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
                const scaleX = video.videoWidth / extractWidth;
                const scaleY = video.videoHeight / extractHeight;

                const scaledBox = {
                    x1: box.x1 * scaleX,
                    y1: box.y1 * scaleY,
                    x2: box.x2 * scaleX,
                    y2: box.y2 * scaleY
                };

                const time = Date.now() / 1000;

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
                   detectLandings(newT); // Update landings in real-time
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

    const scaleRatio = calculateScalingRatio(video.videoWidth, video.videoHeight);
    const extractWidth = Math.round(video.videoWidth * scaleRatio);
    const extractHeight = Math.round(video.videoHeight * scaleRatio);

    const hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = extractWidth;
    hiddenCanvas.height = extractHeight;
    const ctx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
    // Optimization: Downscale to 640px max dimension
    const MAX_INFERENCE_DIM = 640;
    const scale = Math.min(1, MAX_INFERENCE_DIM / Math.max(video.videoWidth, video.videoHeight));
    const extractWidth = Math.round(video.videoWidth * scale);
    const extractHeight = Math.round(video.videoHeight * scale);

    if (!ctx) return;

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

            // Reuse context and extract frame
            const blob = await extractFrameFromVideo(video, extractWidth, extractHeight, ctx);

            const task = new Promise<void>(async (resolve) => {
                if (blob) {
                   const result = await fetchInference(blob);
                    if (result && result.data && result.data.images && result.data.images[0] && result.data.images[0].results) {
                      setLastInferenceTime(result.inferenceTime);
                      const ballDetections = result.data.images[0].results.filter((r: any) =>
                        r.name === 'volleyball' || r.name === 'sports ball' || r.name === 'ball' || r.class === 0 || r.class === 32
                      );
                      ballDetections.sort((a: any, b: any) => b.confidence - a.confidence);
                      const bestResult = ballDetections[0];
                      if (bestResult) {
                        const box = bestResult.box;
                        // Scale coordinates back
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
                          center: { x: (scaledBox.x1 + scaledBox.x2) / 2, y: (scaledBox.y1 + scaledBox.y2) / 2 },
                          confidence: bestResult.confidence
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
      setModelStatus('active');

      // Calculate Landings
      detectLandings(newTrajectory);
    }
  };

  const exportToCSV = () => {
    if (trajectory.length === 0) return;

    // Header
    const headers = ['Time (s)', 'X (px)', 'Y (px)', 'Event', 'Zone'];
    const rows: string[] = [];

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

  // --- Landing Detection ---
  const detectLandings = (traj: TrajectoryPoint[]) => {
    const landings: Point[] = [];
    const currentCourtPoints = courtPointsRef.current;

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
            if (currentCourtPoints.length === 2) {
              if (isPointInRect(curr.center, currentCourtPoints[0], currentCourtPoints[1])) {
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

       // Draw latest ball position larger if live
       if (isLive && trajectory.length > 0) {
           const latest = trajectory[trajectory.length - 1];
           ctx.beginPath();
           ctx.fillStyle = '#ff00ff';
           ctx.arc(latest.center.x, latest.center.y, 10, 0, Math.PI * 2);
           ctx.fill();
           ctx.strokeStyle = 'white';
           ctx.lineWidth = 2;
           ctx.stroke();
       }

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

  }, [courtPoints, targetQuadrants, trajectory, landingPoints, isDrawingCourt, viewMode, videoRef.current?.videoWidth, isLive]);


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
                src={!isLive ? videoUrl : undefined}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                playsInline
                muted={isLive}
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
               {!isLive ? (
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
               ) : (
                  <div className="absolute top-4 left-4 z-20">
                     <div className="flex items-center gap-2 bg-red-600/80 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full" />
                        LIVE
                     </div>
                  </div>
               )}

              {/* Real-time stats overlay in Video Mode */}
               <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur p-2 rounded text-xs text-white border border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Total:</span>
                    <span className="font-bold">{stats.total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Target %:</span>
                    <span className="font-bold text-green-400">{stats.efficiency.toFixed(0)}%</span>
                  </div>
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg gap-4">
              <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-500 mb-4 mx-auto" />
                  <p className="text-gray-400 mb-2">Upload serving video</p>
                  <input
                    type="file"
                    accept="video/*"
                    id="video-upload"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="video-upload"
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg cursor-pointer font-bold inline-block"
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
                   <label className="text-xs text-gray-400 block mb-1">Step 2: Select Target Zones</label>

                   {/* Presets Dropdown */}
                   <select
                      className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white mb-2"
                      onChange={(e) => {
                          const preset = ZONE_PRESETS.find(p => p.label === e.target.value);
                          if (preset) {
                              setTargetQuadrants(preset.targets);
                          } else {
                              setTargetQuadrants([]);
                          }
                      }}
                   >
                       <option value="">-- Select Preset --</option>
                       {ZONE_PRESETS.map(p => (
                           <option key={p.label} value={p.label}>{p.label}</option>
                       ))}
                   </select>

                   <p className="text-xs text-gray-500 mb-2">Or click on grid cells to manually select.</p>
                   <div className="flex gap-2 flex-wrap">
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

            {isLive ? (
                <button
                    onClick={stopLive}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <StopCircle className="w-4 h-4" /> Stop Live Camera
                </button>
            ) : isAnalyzing ? (
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
                disabled={!videoUrl || courtPoints.length < 2 || isLive}
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
