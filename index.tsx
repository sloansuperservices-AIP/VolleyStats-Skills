import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, Schema } from "@google/genai";
import {
  Camera,
  Activity,
  TrendingUp,
  PlayCircle,
  CheckCircle,
  User,
  BarChart2,
  ChevronRight,
  Zap,
  Eye,
  ArrowLeft,
  Upload,
  Loader2,
  Trophy
  StopCircle
} from 'lucide-react';

import { Tracker } from './Tracker';
import { ServingTracker } from './ServingTracker';
import { MidTNLeaderboard } from './MidTNLeaderboard';

// --- Types ---

interface AthleteProfile {
  name: string;
  heightCm: number;
  position: string;
}

interface AnalysisResult {
  metric_estimate: string;
  score_out_of_100: number;
  mechanics_rating: string;
  key_strengths: string[];
  areas_for_improvement: string[];
  pro_comparison: string;
}

interface Station {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  promptTask: string;
  requiredMetric: string;
}

// --- Constants ---

const STATIONS: Station[] = [
  {
    id: 'jump',
    title: 'Station A: Vertical',
    description: 'Approach Jump & Takeoff Mechanics',
    icon: <TrendingUp className="w-6 h-6 text-cyan-400" />,
    promptTask: "Analyze this video of a volleyball approach jump. Estimate the vertical jump height (inches) based on the athlete's height. Analyze takeoff efficiency, arm swing mechanics, and landing.",
    requiredMetric: "Vertical Jump (inches)"
  },
  {
    id: 'serve',
    title: 'Station B: Serving',
    description: 'Serve Mechanics & Arm Speed',
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    promptTask: "Analyze this volleyball serve. Estimate the ball velocity/arm swing speed (qualitative or mph estimate). Analyze the toss consistency, contact point height, and follow-through mechanics.",
    requiredMetric: "Est. Serve Velocity (MPH)"
  },
  {
    id: 'passing',
    title: 'Station C: Passing',
    description: 'Pass Reception & Platform Control',
    icon: <Activity className="w-6 h-6 text-green-400" />,
    promptTask: "Analyze this passing/reception technique. Analyze platform angle, footwork positioning, body posture, and ball control accuracy to target.",
    requiredMetric: "Passing Accuracy Rating"
  },
  {
    id: 'tracker',
    title: 'Station D: Setting',
    description: 'Set Tracking & Ball Placement',
    icon: <BarChart2 className="w-6 h-6 text-purple-400" />,
    promptTask: "Track ball trajectory and setting accuracy.",
    requiredMetric: "Points"
  },
  {
    id: 'agility',
    title: 'Station F: Agility',
    description: 'Defensive Shuffle & Reaction',
    icon: <Activity className="w-6 h-6 text-orange-400" />,
    promptTask: "Analyze this defensive movement/shuttle run. Analyze lateral acceleration, center of gravity consistency, and reaction time to directional change.",
    requiredMetric: "Agility Rating (Speed/Form)"
  }
];

// --- Components ---

const App = () => {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [activeStation, setActiveStation] = useState<Station | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<Record<string, AnalysisResult>>({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const handleProfileComplete = (p: AthleteProfile) => setProfile(p);

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0f1115]/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">VOLLEY<span className="text-cyan-400">VISION</span></span>
          </div>
          {profile && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User className="w-4 h-4" />
              <span>{profile.name}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        {!profile ? (
          <Onboarding onComplete={handleProfileComplete} />
        ) : showLeaderboard ? (
          <MidTNLeaderboard onBack={() => setShowLeaderboard(false)} />
        ) : !activeStation ? (
          <Dashboard
            profile={profile}
            stations={STATIONS}
            history={analysisHistory}
            onSelectStation={setActiveStation}
            onShowLeaderboard={() => setShowLeaderboard(true)}
          />
        ) : activeStation.id === 'tracker' ? (
          <Tracker onBack={() => setActiveStation(null)} />
        ) : activeStation.id === 'serve' ? (
          <ServingTracker onBack={() => setActiveStation(null)} />
        ) : (
          <StationView
            station={activeStation}
            profile={profile}
            onBack={() => setActiveStation(null)}
            onComplete={(result) => {
              setAnalysisHistory(prev => ({ ...prev, [activeStation.id]: result }));
              setActiveStation(null);
            }}
          />
        )}
      </main>
    </div>
  );
};

// 1. Onboarding / Profile Setup
const Onboarding = ({ onComplete }: { onComplete: (p: AthleteProfile) => void }) => {
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [position, setPosition] = useState('OH');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && height) {
      onComplete({ name, heightCm: parseInt(height), position });
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-extrabold mb-2">Athlete Profile</h1>
      <p className="text-gray-400 mb-8">Enter your measurable baseline for AI calibration.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
          <input 
            type="text" 
            required
            className="w-full bg-[#1a1d24] border border-gray-800 rounded-lg p-4 text-white focus:border-cyan-500 focus:outline-none transition-colors"
            placeholder="e.g. Jordan Larson"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Height (cm)</label>
            <input 
              type="number" 
              required
              className="w-full bg-[#1a1d24] border border-gray-800 rounded-lg p-4 text-white focus:border-cyan-500 focus:outline-none"
              placeholder="180"
              value={height}
              onChange={e => setHeight(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Position</label>
            <select 
              className="w-full bg-[#1a1d24] border border-gray-800 rounded-lg p-4 text-white focus:border-cyan-500 focus:outline-none"
              value={position}
              onChange={e => setPosition(e.target.value)}
            >
              <option value="OH">Outside Hitter</option>
              <option value="OPP">Opposite</option>
              <option value="MB">Middle Blocker</option>
              <option value="S">Setter</option>
              <option value="L">Libero</option>
            </select>
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          Initialize Combine <ChevronRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

// 2. Dashboard / Station Selection
const Dashboard = ({
  profile,
  stations,
  history,
  onSelectStation,
  onShowLeaderboard
}: {
  profile: AthleteProfile,
  stations: Station[],
  history: Record<string, AnalysisResult>,
  onSelectStation: (s: Station) => void,
  onShowLeaderboard: () => void
}) => {
  return (
    <div className="animate-fade-in space-y-6">
      {/* MID TN Leaderboard Button */}
      <button
        onClick={onShowLeaderboard}
        className="w-full bg-gradient-to-r from-purple-900/50 to-cyan-900/50 hover:from-purple-900/70 hover:to-cyan-900/70 border border-purple-500/30 rounded-xl p-4 text-left transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-white">MID TN Leaderboard</h4>
            <p className="text-sm text-gray-400 mt-1">View club rankings by skill</p>
          </div>
          <ChevronRight className="text-purple-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      <div className="bg-[#1a1d24] rounded-xl p-6 border border-gray-800">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">Combine Status</h2>
            <p className="text-gray-400 text-sm">Complete all stations for full report</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-mono font-bold text-cyan-400">
              {Object.keys(history).length}/{stations.length}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-cyan-500 h-full transition-all duration-500" 
            style={{ width: `${(Object.keys(history).length / stations.length) * 100}%` }}
          />
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-200">Active Stations</h3>
      <div className="grid gap-4">
        {stations.map(station => {
          const isDone = !!history[station.id];
          return (
            <button
              key={station.id}
              onClick={() => onSelectStation(station)}
              className="w-full bg-[#1a1d24] hover:bg-[#20242c] border border-gray-800 rounded-xl p-4 text-left transition-all group relative overflow-hidden"
            >
              <div className="flex items-start gap-4 z-10 relative">
                <div className={`p-3 rounded-lg bg-gray-800 ${isDone ? 'text-green-400' : 'text-gray-300'}`}>
                  {isDone ? <CheckCircle className="w-6 h-6" /> : station.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-100">{station.title}</h4>
                    {isDone && <span className="text-xs font-bold text-green-400 border border-green-400/30 px-2 py-0.5 rounded bg-green-400/10">DONE</span>}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{station.description}</p>
                  
                  {isDone && (
                    <div className="mt-3 pt-3 border-t border-gray-800 flex gap-4">
                      <div>
                        <span className="text-xs text-gray-500 block">SCORE</span>
                        <span className="font-mono text-cyan-400 font-bold">{history[station.id].score_out_of_100}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">METRIC</span>
                        <span className="font-mono text-white font-bold">{history[station.id].metric_estimate}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {!isDone && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="text-gray-600" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 3. Station View (Video Analysis)
const StationView = ({ 
  station, 
  profile,
  onBack, 
  onComplete 
}: { 
  station: Station, 
  profile: AthleteProfile,
  onBack: () => void, 
  onComplete: (r: AnalysisResult) => void 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Define schema for structured JSON output
  const resultSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      metric_estimate: { type: Type.STRING, description: "The estimated quantitative metric (e.g., '28 inches', '55 mph')." },
      score_out_of_100: { type: Type.NUMBER, description: "Overall rating of the performance from 0-100." },
      mechanics_rating: { type: Type.STRING, description: "A grade (A, B, C, D, F) for form mechanics." },
      key_strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 2-3 biomechanical strengths." },
      areas_for_improvement: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 2-3 actionable biomechanical fixes." },
      pro_comparison: { type: Type.STRING, description: "Comparison to a style of a famous player (optional)." }
    },
    required: ["metric_estimate", "score_out_of_100", "mechanics_rating", "key_strengths", "areas_for_improvement"]
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const recordedFile = new File([blob], "recorded_video.webm", { type: 'video/webm' });
        setFile(recordedFile);
        setPreviewUrl(URL.createObjectURL(recordedFile));

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setPreviewUrl('recording'); // Use placeholder to show video element

    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const runAnalysis = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });
      
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // remove data url prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const model = ai.models.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: resultSchema,
        }
      });

      const fullPrompt = `
        You are an expert Volleyball Scout and Biomechanics Analyst.
        Athlete Profile: ${profile.name}, ${profile.heightCm}cm tall, Position: ${profile.position}.
        
        TASK: ${station.promptTask}
        
        Using the video provided, extract the metrics and provide coaching feedback. 
        Be critical but constructive. Use the athlete's height as a reference for spatial measurements.
      `;

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: fullPrompt },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]
          }
        ]
      });

      const responseText = result.response.text();
      const analysisData = JSON.parse(responseText) as AnalysisResult;
      onComplete(analysisData);

    } catch (err: any) {
      console.error(err);
      setError("Analysis failed. Please try a shorter video clip (under 20MB) or check connection.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="animate-fade-in h-full flex flex-col">
      <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5 mr-1" /> Back to Dashboard
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-800 rounded-lg text-cyan-400">
            {station.icon}
          </div>
          <h2 className="text-2xl font-bold">{station.title}</h2>
        </div>
        <p className="text-gray-400">{station.description}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center bg-[#1a1d24] rounded-xl border border-gray-800 border-dashed relative overflow-hidden p-4">
        
        {analyzing && (
          <div className="absolute inset-0 z-50 bg-[#1a1d24]/90 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Analyzing Biomechanics...</h3>
            <p className="text-gray-400 text-sm">Extracting skeleton data • Calculating velocity • Measuring displacement</p>
          </div>
        )}

        {previewUrl ? (
          <div className="w-full h-full flex flex-col items-center">
            <div className="relative w-full max-h-[50vh] bg-black rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  src={previewUrl !== 'recording' ? previewUrl : undefined}
                  className="max-h-[50vh] w-full object-contain"
                  controls={!isRecording}
                  playsInline
                  muted={isRecording}
                />
                {isRecording && (
                    <div className="absolute top-4 right-4 animate-pulse flex items-center gap-2 bg-red-600/80 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-white rounded-full" />
                        <span className="text-white text-xs font-bold">REC</span>
                    </div>
                )}
            </div>

            <div className="flex gap-4 w-full">
              {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <StopCircle className="w-5 h-5" /> Stop Recording
                  </button>
              ) : (
                  <>
                      <button
                        onClick={() => {
                          setFile(null);
                          setPreviewUrl(null);
                        }}
                        className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-white transition-colors"
                      >
                        Retake
                      </button>
                      <button
                        onClick={runAnalysis}
                        className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg font-bold text-white shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4 fill-white" /> Analyze Form
                      </button>
                  </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-500">
              <Camera className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold mb-2">Upload or Record</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
              Record a clear video of the specific movement. Ensure full body is in frame.
            </p>
            <input 
              type="file" 
              ref={fileInputRef}
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-black font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" /> Select Video
              </button>

               <div className="text-gray-600 font-bold my-1">- OR -</div>

               <button
                onClick={startRecording}
                className="bg-red-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" /> Record Video
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
      </div>
      
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg flex items-start gap-3">
        <Eye className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-200">
          <span className="font-bold block mb-1">Scout Tip</span>
          Ensure the camera is stationary and you are capturing from the side profile for best jump analysis.
        </div>
      </div>
    </div>
  );
};

// -- Main Render --
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
