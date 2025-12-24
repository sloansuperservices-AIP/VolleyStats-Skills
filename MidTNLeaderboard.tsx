import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  Zap,
  Activity,
  BarChart2,
  Filter,
  Medal,
  ChevronDown
} from 'lucide-react';

// Types for leaderboard
interface Player {
  id: number;
  name: string;
  age: number;
  position: string;
  skills: {
    vertical: number;
    serving: number;
    passing: number;
    setting: number;
    agility: number;
  };
}

type SkillKey = keyof Player['skills'];

interface LeaderboardProps {
  onBack: () => void;
}

// Generate 50 sample players with realistic volleyball names and scores
const generatePlayers = (): Player[] => {
  const firstNames = [
    'Emma', 'Sophia', 'Olivia', 'Ava', 'Isabella', 'Mia', 'Charlotte', 'Amelia',
    'Harper', 'Evelyn', 'Abigail', 'Emily', 'Madison', 'Luna', 'Chloe', 'Layla',
    'Riley', 'Zoey', 'Nora', 'Lily', 'Eleanor', 'Hannah', 'Addison', 'Aubrey',
    'Ella', 'Stella', 'Natalie', 'Zoe', 'Leah', 'Hazel', 'Violet', 'Aurora',
    'Savannah', 'Brooklyn', 'Bella', 'Claire', 'Skylar', 'Lucy', 'Paisley', 'Everly',
    'Anna', 'Caroline', 'Nova', 'Genesis', 'Emilia', 'Kennedy', 'Samantha', 'Maya',
    'Willow', 'Kinsley'
  ];

  const lastNames = [
    'Anderson', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson',
    'Moore', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson',
    'Robinson', 'Clark', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young',
    'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
    'Adams', 'Nelson', 'Baker', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
    'Turner', 'Phillips', 'Evans'
  ];

  const positions = ['OH', 'OPP', 'MB', 'S', 'L'];

  // Function to generate a score with some variance based on age
  const generateScore = (age: number, baseMin: number, baseMax: number): number => {
    // Older players tend to have slightly higher scores due to experience
    const ageBonus = (age - 12) * 1.5;
    const min = Math.min(100, baseMin + ageBonus);
    const max = Math.min(100, baseMax + ageBonus);
    return Math.round(min + Math.random() * (max - min));
  };

  const players: Player[] = [];

  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[i];
    const lastName = lastNames[i];
    const age = 12 + Math.floor(Math.random() * 7); // 12-18 years old
    const position = positions[Math.floor(Math.random() * positions.length)];

    players.push({
      id: i + 1,
      name: `${firstName} ${lastName}`,
      age,
      position,
      skills: {
        vertical: generateScore(age, 45, 85),
        serving: generateScore(age, 40, 88),
        passing: generateScore(age, 50, 90),
        setting: generateScore(age, 45, 87),
        agility: generateScore(age, 48, 92),
      }
    });
  }

  return players;
};

// Static player data - generated once
const PLAYERS = generatePlayers();

// Skill configuration for display
const SKILLS: { key: SkillKey; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'vertical', label: 'Vertical Jump', icon: <TrendingUp className="w-4 h-4" />, color: 'text-cyan-400' },
  { key: 'serving', label: 'Serving', icon: <Zap className="w-4 h-4" />, color: 'text-yellow-400' },
  { key: 'passing', label: 'Passing', icon: <Activity className="w-4 h-4" />, color: 'text-green-400' },
  { key: 'setting', label: 'Setting', icon: <BarChart2 className="w-4 h-4" />, color: 'text-purple-400' },
  { key: 'agility', label: 'Agility', icon: <Activity className="w-4 h-4" />, color: 'text-orange-400' },
];

// Age range options
const AGE_OPTIONS = [
  { value: 'all', label: 'All Ages' },
  { value: '12', label: '12 Years' },
  { value: '13', label: '13 Years' },
  { value: '14', label: '14 Years' },
  { value: '15', label: '15 Years' },
  { value: '16', label: '16 Years' },
  { value: '17', label: '17 Years' },
  { value: '18', label: '18 Years' },
];

// Medal icons for top 3
const getMedalIcon = (rank: number) => {
  if (rank === 1) return <Medal className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return null;
};

// Get score color based on value
const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-400';
  if (score >= 80) return 'text-cyan-400';
  if (score >= 70) return 'text-yellow-400';
  if (score >= 60) return 'text-orange-400';
  return 'text-red-400';
};

export const MidTNLeaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
  const [selectedSkill, setSelectedSkill] = useState<SkillKey>('vertical');
  const [selectedAge, setSelectedAge] = useState<string>('all');
  const [isSkillDropdownOpen, setIsSkillDropdownOpen] = useState(false);
  const [isAgeDropdownOpen, setIsAgeDropdownOpen] = useState(false);

  // Filter and sort players
  const rankedPlayers = useMemo(() => {
    let filtered = PLAYERS;

    // Filter by age
    if (selectedAge !== 'all') {
      filtered = filtered.filter(p => p.age === parseInt(selectedAge));
    }

    // Sort by selected skill (descending)
    return [...filtered].sort((a, b) => b.skills[selectedSkill] - a.skills[selectedSkill]);
  }, [selectedAge, selectedSkill]);

  const currentSkillConfig = SKILLS.find(s => s.key === selectedSkill)!;

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-1" /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-cyan-900/50 rounded-xl p-6 border border-gray-800 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Trophy className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">MID TN Volleyball</h1>
            <p className="text-gray-400 text-sm">Club Leaderboard Rankings</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <span className="font-mono text-cyan-400 font-bold">{rankedPlayers.length}</span>
          <span>athletes ranked</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        {/* Skill Filter Dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => {
              setIsSkillDropdownOpen(!isSkillDropdownOpen);
              setIsAgeDropdownOpen(false);
            }}
            className="w-full bg-[#1a1d24] border border-gray-800 rounded-lg p-3 text-white flex items-center justify-between hover:border-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={currentSkillConfig.color}>{currentSkillConfig.icon}</span>
              <span className="text-sm font-medium">{currentSkillConfig.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isSkillDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSkillDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1d24] border border-gray-800 rounded-lg shadow-xl z-20 overflow-hidden">
              {SKILLS.map((skill) => (
                <button
                  key={skill.key}
                  onClick={() => {
                    setSelectedSkill(skill.key);
                    setIsSkillDropdownOpen(false);
                  }}
                  className={`w-full p-3 flex items-center gap-2 hover:bg-[#20242c] transition-colors text-left ${
                    selectedSkill === skill.key ? 'bg-[#20242c]' : ''
                  }`}
                >
                  <span className={skill.color}>{skill.icon}</span>
                  <span className="text-sm">{skill.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Age Filter Dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => {
              setIsAgeDropdownOpen(!isAgeDropdownOpen);
              setIsSkillDropdownOpen(false);
            }}
            className="w-full bg-[#1a1d24] border border-gray-800 rounded-lg p-3 text-white flex items-center justify-between hover:border-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">
                {selectedAge === 'all' ? 'All Ages' : `${selectedAge} Years`}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isAgeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isAgeDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1d24] border border-gray-800 rounded-lg shadow-xl z-20 overflow-hidden max-h-64 overflow-y-auto">
              {AGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedAge(option.value);
                    setIsAgeDropdownOpen(false);
                  }}
                  className={`w-full p-3 text-left hover:bg-[#20242c] transition-colors text-sm ${
                    selectedAge === option.value ? 'bg-[#20242c] text-cyan-400' : 'text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Table Header */}
      <div className="bg-[#1a1d24] border border-gray-800 rounded-t-xl">
        <div className="grid grid-cols-12 gap-2 p-3 border-b border-gray-800 text-xs font-bold text-gray-500 uppercase">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-5">Player</div>
          <div className="col-span-2 text-center">Age</div>
          <div className="col-span-2 text-center">Pos</div>
          <div className="col-span-2 text-center">Score</div>
        </div>
      </div>

      {/* Leaderboard Entries */}
      <div className="bg-[#1a1d24] border-x border-b border-gray-800 rounded-b-xl overflow-hidden">
        {rankedPlayers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No players found for the selected age filter.
          </div>
        ) : (
          rankedPlayers.map((player, index) => {
            const rank = index + 1;
            const score = player.skills[selectedSkill];
            const isTopThree = rank <= 3;

            return (
              <div
                key={player.id}
                className={`grid grid-cols-12 gap-2 p-3 items-center border-b border-gray-800/50 last:border-b-0 hover:bg-[#20242c] transition-colors ${
                  isTopThree ? 'bg-gradient-to-r from-purple-900/10 to-transparent' : ''
                }`}
              >
                {/* Rank */}
                <div className="col-span-1 flex justify-center">
                  {getMedalIcon(rank) || (
                    <span className="text-sm font-mono text-gray-500">{rank}</span>
                  )}
                </div>

                {/* Player Name */}
                <div className="col-span-5">
                  <span className={`text-sm font-medium ${isTopThree ? 'text-white' : 'text-gray-300'}`}>
                    {player.name}
                  </span>
                </div>

                {/* Age */}
                <div className="col-span-2 text-center">
                  <span className="text-sm text-gray-400">{player.age}</span>
                </div>

                {/* Position */}
                <div className="col-span-2 text-center">
                  <span className="text-xs font-bold text-gray-500 bg-gray-800 px-2 py-1 rounded">
                    {player.position}
                  </span>
                </div>

                {/* Score */}
                <div className="col-span-2 text-center">
                  <span className={`text-sm font-mono font-bold ${getScoreColor(score)}`}>
                    {score}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend / Info */}
      <div className="mt-6 p-4 bg-[#1a1d24] border border-gray-800 rounded-xl">
        <h3 className="text-sm font-bold text-gray-400 mb-3">Score Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-400"></span>
            <span className="text-gray-400">90+ Elite</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
            <span className="text-gray-400">80-89 Advanced</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
            <span className="text-gray-400">70-79 Proficient</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-400"></span>
            <span className="text-gray-400">60-69 Developing</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-400"></span>
            <span className="text-gray-400">&lt;60 Beginner</span>
          </div>
        </div>
      </div>
    </div>
  );
};
