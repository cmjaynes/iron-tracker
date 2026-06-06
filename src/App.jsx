import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";

// ── Constants ────────────────────────────────────────────────────────────────
const EXERCISE_CATEGORIES = {
  "Chest": [
    "Bench Press","Incline Bench Press","Decline Bench Press",
    "Dumbbell Bench Press","Incline Dumbbell Press","Decline Dumbbell Press",
    "Cable Fly","Dumbbell Fly","Incline Dumbbell Fly","Pec Deck",
    "Push-Up","Archer Push-Up","Chest Dip","Cable Crossover",
    "Landmine Press","Smith Machine Bench","Floor Press",
  ],
  "Back": [
    "Deadlift","Barbell Row","Pendlay Row","T-Bar Row","Dumbbell Row",
    "Pull-Up","Chin-Up","Neutral Grip Pull-Up","Weighted Pull-Up",
    "Lat Pulldown","Wide Grip Lat Pulldown","Straight Arm Pulldown",
    "Seated Cable Row","Single Arm Cable Row","Machine Row","Chest Supported Row",
    "Romanian Deadlift","Sumo Deadlift","Trap Bar Deadlift","Good Morning",
    "Back Extension","Reverse Hyper","Shrug","Dumbbell Shrug",
  ],
  "Shoulders": [
    "Overhead Press","Seated Dumbbell Press","Arnold Press","Push Press",
    "Lateral Raise","Cable Lateral Raise","Machine Lateral Raise",
    "Front Raise","Cable Front Raise","Rear Delt Fly","Reverse Pec Deck",
    "Face Pull","Band Pull-Apart","Upright Row","Landmine Lateral Raise",
    "Machine Shoulder Press","Smith Machine OHP","Bradford Press",
  ],
  "Arms - Biceps": [
    "Barbell Curl","Dumbbell Curl","Hammer Curl","Incline Dumbbell Curl",
    "Concentration Curl","Spider Curl","Preacher Curl","EZ Bar Curl",
    "Cable Curl","High Cable Curl","Cross Body Curl","Zottman Curl",
    "21s","Drag Curl","Reverse Curl",
  ],
  "Arms - Triceps": [
    "Tricep Pushdown","Rope Pushdown","Overhead Tricep Extension",
    "Skull Crusher","Close Grip Bench","Diamond Push-Up","Tricep Dip",
    "Cable Overhead Extension","Kickback","JM Press","Tate Press",
    "Single Arm Pushdown","Long Head Tricep Extension",
  ],
  "Legs - Quads": [
    "Squat","Front Squat","Hack Squat","Bulgarian Split Squat",
    "Leg Press","Leg Extension","Goblet Squat","Sissy Squat",
    "Box Squat","Pause Squat","Zercher Squat","Smith Machine Squat",
    "Lunges","Walking Lunges","Reverse Lunge","Step Up",
  ],
  "Legs - Hamstrings & Glutes": [
    "Romanian Deadlift","Stiff Leg Deadlift","Nordic Curl","Leg Curl",
    "Seated Leg Curl","Hip Thrust","Glute Bridge","Cable Pull-Through",
    "Sumo Squat","Kettlebell Swing","Good Morning","Glute Kickback",
    "Hip Abduction","Hip Adduction","Frog Pump",
  ],
  "Legs - Calves": [
    "Standing Calf Raise","Seated Calf Raise","Leg Press Calf Raise",
    "Donkey Calf Raise","Single Leg Calf Raise","Smith Machine Calf Raise",
  ],
  "Core": [
    "Plank","Side Plank","Cable Crunch","Hanging Leg Raise","Ab Wheel Rollout",
    "Russian Twist","Decline Sit-Up","Dragon Flag","Hollow Body Hold",
    "Pallof Press","Landmine Rotation","L-Sit","Toes to Bar",
    "Woodchop","Suitcase Carry","Farmer Carry","Dead Bug",
  ],
  "Olympic & Power": [
    "Power Clean","Hang Clean","Clean & Jerk","Snatch","Hang Snatch",
    "Push Jerk","Split Jerk","Hang Power Clean","Box Jump","Broad Jump",
  ],
  "Cardio & Conditioning": [
    "Rowing Machine","Assault Bike","Ski Erg","Battle Ropes","Sled Push",
    "Sled Pull","Burpee","Jumping Jack","Jump Rope","Box Jump",
    "Stair Climb","Treadmill Run","Cycling",
  ],
};

const EXERCISES = Object.values(EXERCISE_CATEGORIES).flat();

const MUSCLE_GROUPS = {};
Object.entries(EXERCISE_CATEGORIES).forEach(([cat, exList]) => {
  const group = cat.includes("Chest") ? "Chest"
    : cat.includes("Back") ? "Back"
    : cat.includes("Shoulders") ? "Shoulders"
    : cat.includes("Biceps") ? "Arms"
    : cat.includes("Triceps") ? "Arms"
    : cat.includes("Quads") ? "Legs"
    : cat.includes("Hamstrings") ? "Legs"
    : cat.includes("Calves") ? "Legs"
    : cat.includes("Core") ? "Core"
    : cat.includes("Olympic") ? "Full Body"
    : "Cardio";
  exList.forEach(ex => { MUSCLE_GROUPS[ex] = group; });
});
const STORAGE_LOGS         = "ironlog-v4-logs";
const STORAGE_TEMPLATES    = "ironlog-v4-templates";
const STORAGE_MEASUREMENTS = "ironlog-v4-measurements";
const STORAGE_SCHEDULE     = "ironlog-v4-schedule"; // {Mon:{templateId,label}, Tue:...}

// Strength standards by lift (lbs) [beginner, novice, intermediate, advanced, elite]
// Based on bodyweight multipliers for ~180lb male (scale with bodyweight)
const STRENGTH_STANDARDS = {
  "Bench Press":       [0.5, 0.75, 1.0,  1.25, 1.5],
  "Squat":             [0.5, 0.75, 1.25, 1.5,  2.0],
  "Deadlift":          [0.75,1.0,  1.5,  2.0,  2.5],
  "Overhead Press":    [0.35,0.5,  0.65, 0.8,  1.0],
  "Barbell Row":       [0.5, 0.65, 0.85, 1.0,  1.25],
  "Pull-Up":           [1,   3,    6,    10,   15],   // reps
  "Dumbbell Curl":     [0.2, 0.3,  0.4,  0.5,  0.65],
  "Romanian Deadlift": [0.5, 0.75, 1.0,  1.25, 1.5],
};
const STRENGTH_LABELS = ["Beginner","Novice","Intermediate","Advanced","Elite"];
const STRENGTH_COLORS = ["#6b7280","#60a5fa","#34d399","#f59e0b","#f87171"];

function getStrengthLevel(exercise, weight, bodyweight) {
  const standards = STRENGTH_STANDARDS[exercise];
  if (!standards || !bodyweight || !weight) return null;
  const multipliers = standards;
  let level = 0;
  for (let i = multipliers.length - 1; i >= 0; i--) {
    if (weight >= multipliers[i] * bodyweight) { level = i + 1; break; }
  }
  return { level, label: STRENGTH_LABELS[level] || STRENGTH_LABELS[0], color: STRENGTH_COLORS[level] || STRENGTH_COLORS[0], pct: Math.min(100, Math.round((weight / (multipliers[4] * bodyweight)) * 100)) };
}

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// ── Planner: canonical body parts and their recommended exercises ─────────────
const BODY_PARTS = ["Chest","Back","Shoulders","Biceps","Triceps","Quads","Hamstrings","Glutes","Calves","Core"];

const BODY_PART_MUSCLE = {
  Chest:"Chest", Back:"Back", Shoulders:"Shoulders",
  Biceps:"Arms", Triceps:"Arms",
  Quads:"Legs", Hamstrings:"Legs", Glutes:"Legs", Calves:"Legs", Core:"Core",
};

// Curated exercise menu per body part (primary + accessory tiers)
const PLANNER_EXERCISES = {
  Chest: [
    {name:"Bench Press",        sets:4, reps:"6-8",  tier:"primary"},
    {name:"Incline Bench Press",sets:3, reps:"8-10", tier:"primary"},
    {name:"Incline Dumbbell Press",sets:3,reps:"10-12",tier:"secondary"},
    {name:"Cable Fly",          sets:3, reps:"12-15",tier:"accessory"},
    {name:"Pec Deck",           sets:3, reps:"12-15",tier:"accessory"},
    {name:"Dumbbell Fly",       sets:3, reps:"12-15",tier:"accessory"},
  ],
  Back: [
    {name:"Deadlift",           sets:4, reps:"4-6",  tier:"primary"},
    {name:"Barbell Row",        sets:4, reps:"6-8",  tier:"primary"},
    {name:"Pull-Up",            sets:3, reps:"6-10", tier:"primary"},
    {name:"Lat Pulldown",       sets:3, reps:"10-12",tier:"secondary"},
    {name:"Seated Cable Row",   sets:3, reps:"10-12",tier:"secondary"},
    {name:"Dumbbell Row",       sets:3, reps:"10-12",tier:"accessory"},
    {name:"Face Pull",          sets:3, reps:"15-20",tier:"accessory"},
  ],
  Shoulders: [
    {name:"Overhead Press",     sets:4, reps:"6-8",  tier:"primary"},
    {name:"Seated Dumbbell Press",sets:3,reps:"10-12",tier:"primary"},
    {name:"Lateral Raise",      sets:4, reps:"12-15",tier:"secondary"},
    {name:"Rear Delt Fly",      sets:3, reps:"12-15",tier:"secondary"},
    {name:"Face Pull",          sets:3, reps:"15-20",tier:"accessory"},
    {name:"Upright Row",        sets:3, reps:"10-12",tier:"accessory"},
  ],
  Biceps: [
    {name:"Barbell Curl",       sets:3, reps:"8-10", tier:"primary"},
    {name:"Dumbbell Curl",      sets:3, reps:"10-12",tier:"primary"},
    {name:"Hammer Curl",        sets:3, reps:"10-12",tier:"secondary"},
    {name:"Preacher Curl",      sets:3, reps:"10-12",tier:"secondary"},
    {name:"Incline Dumbbell Curl",sets:3,reps:"12",  tier:"accessory"},
    {name:"Cable Curl",         sets:3, reps:"12-15",tier:"accessory"},
  ],
  Triceps: [
    {name:"Close Grip Bench",   sets:4, reps:"6-8",  tier:"primary"},
    {name:"Skull Crusher",      sets:3, reps:"8-10", tier:"primary"},
    {name:"Tricep Pushdown",    sets:3, reps:"10-12",tier:"secondary"},
    {name:"Overhead Tricep Extension",sets:3,reps:"10-12",tier:"secondary"},
    {name:"Rope Pushdown",      sets:3, reps:"12-15",tier:"accessory"},
    {name:"Tricep Dip",         sets:3, reps:"8-12", tier:"accessory"},
  ],
  Quads: [
    {name:"Squat",              sets:4, reps:"6-8",  tier:"primary"},
    {name:"Hack Squat",         sets:3, reps:"8-10", tier:"primary"},
    {name:"Bulgarian Split Squat",sets:3,reps:"8-10",tier:"secondary"},
    {name:"Leg Press",          sets:3, reps:"10-12",tier:"secondary"},
    {name:"Leg Extension",      sets:3, reps:"12-15",tier:"accessory"},
    {name:"Lunges",             sets:3, reps:"10-12",tier:"accessory"},
  ],
  Hamstrings: [
    {name:"Romanian Deadlift",  sets:4, reps:"8-10", tier:"primary"},
    {name:"Stiff Leg Deadlift", sets:3, reps:"8-10", tier:"primary"},
    {name:"Leg Curl",           sets:3, reps:"10-12",tier:"secondary"},
    {name:"Seated Leg Curl",    sets:3, reps:"10-12",tier:"secondary"},
    {name:"Nordic Curl",        sets:3, reps:"5-8",  tier:"accessory"},
    {name:"Good Morning",       sets:3, reps:"10-12",tier:"accessory"},
  ],
  Glutes: [
    {name:"Hip Thrust",         sets:4, reps:"8-10", tier:"primary"},
    {name:"Glute Bridge",       sets:3, reps:"12-15",tier:"primary"},
    {name:"Bulgarian Split Squat",sets:3,reps:"10-12",tier:"secondary"},
    {name:"Cable Pull-Through", sets:3, reps:"12-15",tier:"secondary"},
    {name:"Hip Abduction",      sets:3, reps:"15-20",tier:"accessory"},
    {name:"Glute Kickback",     sets:3, reps:"15-20",tier:"accessory"},
  ],
  Calves: [
    {name:"Standing Calf Raise",sets:4, reps:"10-15",tier:"primary"},
    {name:"Seated Calf Raise",  sets:3, reps:"12-15",tier:"primary"},
    {name:"Leg Press Calf Raise",sets:3,reps:"15-20",tier:"secondary"},
    {name:"Single Leg Calf Raise",sets:3,reps:"12-15",tier:"accessory"},
  ],
  Core: [
    {name:"Ab Wheel Rollout",   sets:3, reps:"8-12", tier:"primary"},
    {name:"Hanging Leg Raise",  sets:3, reps:"10-15",tier:"primary"},
    {name:"Cable Crunch",       sets:3, reps:"12-15",tier:"secondary"},
    {name:"Plank",              sets:3, reps:"45-60s",tier:"secondary"},
    {name:"Russian Twist",      sets:3, reps:"20",   tier:"accessory"},
    {name:"Pallof Press",       sets:3, reps:"12-15",tier:"accessory"},
  ],
};

// Progressive overload: suggest ~5% increase, or same weight if first session
function suggestWeight(lastSets) {
  if (!lastSets?.length) return null;
  const top = Math.max(...lastSets.map(s => parseFloat(s.weight)||0));
  if (!top) return null;
  // Round to nearest 2.5
  return Math.round((top * 1.05) / 2.5) * 2.5;
}

// Epley 1RM formula: weight * (1 + reps/30)
const epley = (w, r) => r === 1 ? w : Math.round(w * (1 + r / 30));
const best1RM = sets => Math.max(0, ...sets.map(s => {
  const w = parseFloat(s.weight), r = parseFloat(s.reps);
  return (w > 0 && r > 0) ? epley(w, r) : 0;
}));

const MEASUREMENT_FIELDS = [
  {key:"bodyWeight", label:"Body Weight", unit:"lbs"},
  {key:"waist",      label:"Waist",       unit:"in"},
  {key:"chest",      label:"Chest",       unit:"in"},
  {key:"hips",       label:"Hips",        unit:"in"},
  {key:"arms",       label:"Arms",        unit:"in"},
  {key:"thighs",     label:"Thighs",      unit:"in"},
];

// ── Design tokens ─────────────────────────────────────────────────────────────
const A   = "#b4ff4f";   // electric lime
const A2  = "#4fffdb";   // cyan mint
const A3  = "#ff6b35";   // warm orange
const A4  = "#bf8bff";   // violet
const BG  = "#060608";   // void black
const S1  = "#0d0e12";   // surface 1
const S2  = "#13151c";   // surface 2
const S3  = "#1a1d27";   // surface 3
const S4  = "#21253300"; // hover surface
const BD  = "#ffffff0d"; // ghost border
const BD2 = "#ffffff1a"; // visible border
const TXT = "#eeeef2";   // primary text
const T2  = "#7a8499";   // secondary text
const T3  = "#3d4455";   // muted text

const CARD  = S2;
const CARD2 = S3;

const toISO = d => d.toISOString().split("T")[0];
const parseD = str => { const [y,m,d]=str.split("-").map(Number); return new Date(y,m-1,d); };
const fmtS = str => parseD(str).toLocaleDateString("en-US",{month:"short",day:"numeric"});
const fmtLong = str => parseD(str).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const fmtMon = d => d.toLocaleDateString("en-US",{month:"long",year:"numeric"});
const uid = () => Math.random().toString(36).slice(2,9);
const vol = sets => sets.reduce((a,s)=>(parseFloat(s.weight)||0)*(parseFloat(s.reps)||0)+a,0);

const FF_HEAD = "'Clash Display', 'Syne', sans-serif";
const FF_BODY = "'Cabinet Grotesk', 'DM Sans', sans-serif";
const FF_MONO = "'JetBrains Mono', 'Fira Code', monospace";

// CSS injected via useEffect below

const btn = (bg, color = BG, extra = {}) => ({
  background: bg, border: "none", color,
  cursor: "pointer", fontFamily: FF_HEAD, fontWeight: 700,
  letterSpacing: "-0.01em", borderRadius: 12,
  padding: "12px 20px", fontSize: 14,
  transition: "opacity 0.15s, transform 0.1s",
  ...extra,
});

const ghostBtn = (color = T2, extra = {}) => ({
  background: "#ffffff08", border: `1px solid ${BD2}`, color,
  cursor: "pointer", fontFamily: FF_BODY, letterSpacing: "0.01em",
  borderRadius: 10, padding: "9px 16px", fontSize: 13,
  transition: "background 0.15s, color 0.15s",
  ...extra,
});

const inputStyle = {
  background: S3, border: `1px solid ${BD2}`, color: TXT,
  padding: "12px 14px", fontSize: 14, fontFamily: FF_BODY,
  borderRadius: 12, outline: "none", width: "100%", boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const card = (extra = {}) => ({
  background: S2, border: `1px solid ${BD}`,
  borderRadius: 18, padding: "16px", ...extra,
});

// ── ChartTooltip ─────────────────────────────────────────────────────────────

// ── SVG Icon library ─────────────────────────────────────────────────────────
function Icon({name, size=20, color="currentColor", style={}}) {
  const s = {width:size, height:size, display:"inline-block", flexShrink:0, ...style};
  const p = {fill:"none", stroke:color, strokeWidth:1.6, strokeLinecap:"round", strokeLinejoin:"round"};
  switch(name) {
    case "home": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path {...p} d="M9 22V12h6v10"/></svg>;
    case "target": return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9"/><circle {...p} cx="12" cy="12" r="5"/><circle {...p} cx="12" cy="12" r="1"/></svg>;
    case "plus": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M12 5v14M5 12h14"/></svg>;
    case "calendar-week": return <svg {...s} viewBox="0 0 24 24"><rect {...p} x="3" y="4" width="18" height="18" rx="2"/><path {...p} d="M16 2v4M8 2v4M3 10h18"/><path {...p} d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>;
    case "chart-line": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M3 17l5-5 4 4 9-9"/><path {...p} d="M14 7h7v7"/></svg>;
    case "flame": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M12 21c-4.4 0-8-3.6-8-8 0-5 4-9 6-11 0 3 2 5 4 5-1-2 0-4 2-5 0 4 4 5 4 9 0 4.4-3.6 8-8 8z"/></svg>;
    case "calendar": return <svg {...s} viewBox="0 0 24 24"><rect {...p} x="3" y="4" width="18" height="18" rx="2"/><path {...p} d="M16 2v4M8 2v4M3 10h18"/></svg>;
    case "ruler": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M21.5 11.5l-9-9a1 1 0 00-1.4 0l-8 8a1 1 0 000 1.4l9 9a1 1 0 001.4 0l8-8a1 1 0 000-1.4z"/><path {...p} d="M9.5 6.5l1 1M12.5 9.5l1 1M15.5 12.5l1 1M6.5 9.5l1 1"/></svg>;
    case "settings": return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
    case "history": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M3 12a9 9 0 109-9H3"/><path {...p} d="M3 3v6h6"/><path {...p} d="M12 7v5l3 3"/></svg>;
    case "trophy": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M6 9H3V4h3M18 9h3V4h-3"/><path {...p} d="M6 4h12v8a6 6 0 01-12 0V4z"/><path {...p} d="M12 18v4M8 22h8"/></svg>;
    case "dumbbell": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M6 5v14M18 5v14"/><path {...p} d="M3 7h3v10H3zM18 7h3v10h-3z"/><path {...p} d="M6 12h12"/></svg>;
    case "weight": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M12 3a2 2 0 100 4 2 2 0 000-4z"/><path {...p} d="M5 7h14l2 14H3L5 7z"/></svg>;
    case "fire-streak": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M8.5 14c0-3 2-5 4-7-1 3 1 5 3 5a3 3 0 01-3 4c-2.2 0-4-1.8-4-2z"/><path {...p} d="M12 21a7 7 0 007-7c0-4-3-7-5-9-1 3-2 4-4 4 1-2 0-4-2-4-1 3-3 5-3 9a7 7 0 007 7z"/></svg>;
    case "timer": return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="13" r="8"/><path {...p} d="M12 9v4l3 2"/><path {...p} d="M9 2h6M12 2v3"/></svg>;
    case "muscle": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M6.5 6.5S4 8 4 11c0 4 4 6 4 6l1-1s-3-2-3-5c0-2 1.5-3.5 1.5-3.5L6.5 6.5z"/><path {...p} d="M9 4c0 0-2 1-2 4s2 5 4 5 4-2 4-5c0-2-1-3.5-1-3.5L9 4z"/><path {...p} d="M17.5 6.5S20 8 20 11c0 4-4 6-4 6l-1-1s3-2 3-5c0-2-1.5-3.5-1.5-3.5L17.5 6.5z"/></svg>;
    case "rest": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M3 7h8L3 17h8M13 7h8L13 17h8"/></svg>;
    case "check-circle": return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M8 12l3 3 5-5"/></svg>;
    case "x-circle": return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M15 9l-6 6M9 9l6 6"/></svg>;
    case "clock-pending": return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9" strokeDasharray="4 2"/><path {...p} d="M12 7v5l3 3"/></svg>;
    case "flag": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path {...p} d="M4 22v-7"/></svg>;
    case "sleep": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M3 12h2M7.05 7.05l1.41 1.41M12 3v2M16.95 7.05l-1.41 1.41M21 12h-2M12 19a7 7 0 100-14 5 5 0 000 10"/></svg>;
    case "play": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M8 5l11 7-11 7V5z"/></svg>;
    case "next": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M5 12h14M14 7l5 5-5 5"/></svg>;
    case "finish": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M5 12h14M14 7l5 5-5 5"/><circle {...p} cx="5" cy="12" r="2"/></svg>;
    case "alert-down": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M12 2l10 18H2L12 2z"/><path {...p} d="M12 10v4M12 16.5v.5"/></svg>;
    case "alert-warn": return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M12 8v4M12 15.5v.5"/></svg>;
    case "close": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M18 6L6 18M6 6l12 12"/></svg>;
    case "youtube": return <svg {...s} viewBox="0 0 24 24"><rect {...p} x="2" y="5" width="20" height="14" rx="3"/><path {...p} d="M10 9l5 3-5 3V9z"/></svg>;
    case "search": return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="11" cy="11" r="7"/><path {...p} d="M16.5 16.5L21 21"/></svg>;
    case "book": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M4 19V5a2 2 0 012-2h13v13H6a2 2 0 000 4h13"/></svg>;
    case "trash": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>;
    case "edit": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path {...p} d="M18.5 2.5a2 2 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
    case "chevron-right": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M9 6l6 6-6 6"/></svg>;
    case "chevron-down": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M6 9l6 6 6-6"/></svg>;
    case "up": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case "down": return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M12 5v14M5 12l7 7 7-7"/></svg>;
    default: return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9"/></svg>;
  }
}

// ── AddExToPlan: add a new exercise to an edited plan ────────────────────────
function AddExToPlan({planTargets, allExercises, editingPlan, setEditingPlan}) {
  const [addEx, setAddEx] = useState(EXERCISES[0]);

  function addExercise(exName, bp) {
    const newEx = {name:exName, sets:3, reps:"8-12", tier:"secondary", bodyPart:bp, last:null, suggested:null};
    const existing = editingPlan.find(s => s.bodyPart === bp);
    const np = existing
      ? editingPlan.map(s => s.bodyPart !== bp ? s : {...s, exercises:[...s.exercises, newEx]})
      : [...editingPlan, {bodyPart:bp, exercises:[newEx]}];
    setEditingPlan(np);
  }

  // Pick a random exercise from a body part that isn't already in the plan
  function quickAdd(bp) {
    const pool = PLANNER_EXERCISES[bp] || [];
    const inPlan = editingPlan.flatMap(s => s.exercises.map(e => e.name));
    const available = pool.filter(e => !inPlan.includes(e.name));
    const pick = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    if (pick) addExercise(pick.name, bp);
  }

  return (
    <div style={{background:S3, border:"1px dashed "+BD2, borderRadius:10, padding:"12px", marginBottom:12}}>
      <div style={{fontFamily:FF_HEAD, fontWeight:700, fontSize:11, color:T2, marginBottom:10, textTransform:"uppercase"}}>Add Exercise</div>

      {/* Quick-add body part pills */}
      <div style={{fontFamily:FF_BODY, fontSize:11, color:T3, marginBottom:6}}>Quick add by body part</div>
      <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:14}}>
        {BODY_PARTS.map(bp => (
          <button key={bp} onClick={() => quickAdd(bp)} style={{
            fontFamily:FF_BODY, fontSize:11, fontWeight:500,
            background:S2, color:T2,
            border:"1px solid "+BD2,
            borderRadius:8, padding:"5px 10px", cursor:"pointer",
            transition:"all 0.15s"
          }}
          onMouseEnter={e=>{e.currentTarget.style.background=A2+"22";e.currentTarget.style.color=A2;e.currentTarget.style.borderColor=A2;}}
          onMouseLeave={e=>{e.currentTarget.style.background=S2;e.currentTarget.style.color=T2;e.currentTarget.style.borderColor=BD2;}}
          >{bp}</button>
        ))}
      </div>

      {/* Or pick a specific exercise */}
      <div style={{fontFamily:FF_BODY, fontSize:11, color:T3, marginBottom:6}}>Or pick a specific exercise</div>
      <div style={{display:"flex", gap:8}}>
        <div style={{flex:1}}>
          <ExercisePicker value={addEx} onChange={setAddEx} extraOptions={allExercises} />
        </div>
        <button onClick={() => addExercise(addEx, editingPlan[0]?.bodyPart || BODY_PARTS[0])} style={{
          background:A2, color:"#060608", border:"none", borderRadius:8,
          padding:"0 14px", fontSize:12, fontWeight:700,
          fontFamily:FF_HEAD, cursor:"pointer", flexShrink:0,
          display:"flex", alignItems:"center", gap:5
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add
        </button>
      </div>
    </div>
  );
}

// ── ExercisePicker: searchable grouped dropdown ───────────────────────────────
function ExercisePicker({value, onChange, extraOptions=[], style={}}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useState(() => ({current:null}))[0];
  const allOpts = [...new Set([...EXERCISES, ...extraOptions])];
  const filtered = search.trim() ? allOpts.filter(ex => ex.toLowerCase().includes(search.toLowerCase())) : null;
  const grouped = filtered ? {"Results": filtered} : Object.fromEntries(
    Object.entries(EXERCISE_CATEGORIES).map(([cat, exs]) => [cat, exs.filter(ex => allOpts.includes(ex))]).filter(([,exs]) => exs.length > 0)
  );
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div style={{position:"relative",...style}} ref={el => ref.current=el}>
      <div onClick={()=>setOpen(o=>!o)} style={{
        background:S3, border:"1px solid " + (open ? A+"66" : BD2), color:TXT,
        padding:"11px 36px 11px 14px", fontSize:14, fontFamily:FF_BODY,
        borderRadius:10, cursor:"pointer", userSelect:"none", position:"relative",
        transition:"border-color 0.2s", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"
      }}>
        {value}
        <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%) rotate(" + (open?180:0) + "deg)",color:T2,fontSize:11,transition:"transform 0.2s"}}>▾</span>
      </div>
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:999,
          background:S1,border:`1px solid ${BD2}`,borderRadius:12,boxShadow:"0 20px 60px #000c",overflow:"hidden",minWidth:260}}>
          <div style={{padding:"10px",borderBottom:`1px solid ${BD}`}}>
            <input autoFocus placeholder="Search exercises…" value={search}
              onChange={e=>setSearch(e.target.value)} onClick={e=>e.stopPropagation()}
              style={{...inputStyle,background:S2,borderRadius:8,padding:"9px 12px",fontSize:13}}/>
          </div>
          <div style={{maxHeight:280,overflowY:"auto"}}>
            {Object.entries(grouped).map(([cat, exs]) => (
              <div key={cat}>
                <div style={{fontSize:10,color:T3,letterSpacing:"0.04em",padding:"8px 14px 3px",
                  background:S1,position:"sticky",top:0,fontFamily:FF_HEAD,fontWeight:700,textTransform:"uppercase"}}>{cat}</div>
                {exs.map(ex => (
                  <div key={ex} onClick={()=>{onChange(ex);setOpen(false);setSearch("");}}
                    style={{padding:"10px 14px",fontSize:13,cursor:"pointer",fontFamily:FF_BODY,
                      color:ex===value?A:TXT,background:ex===value?A+"10":"transparent",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=A+"18"}
                    onMouseLeave={e=>e.currentTarget.style.background=ex===value?A+"10":"transparent"}
                  >{ex}</div>
                ))}
              </div>
            ))}
            {Object.values(grouped).every(g=>g.length===0) && (
              <div style={{padding:"24px",color:T3,fontSize:13,textAlign:"center",fontFamily:FF_BODY}}>No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChartTip({active,payload,label}) {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:S2,border:`1px solid ${BD2}`,padding:"10px 14px",borderRadius:12,
      fontFamily:FF_BODY,fontSize:12,boxShadow:"0 8px 32px #000a"}}>
      <div style={{color:T2,marginBottom:5,fontSize:11}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color,fontWeight:600}}>{p.name}: <span style={{color:TXT}}>{typeof p.value==="number"?p.value.toLocaleString():p.value}</span></div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [logs, setLogs]                 = useState(null);
  const [templates, setTemplates]       = useState(null);
  const [measurements, setMeasurements] = useState(null);
  const [view, setView]                 = useState("dashboard");

  // Log view state
  const [logMode, setLogMode]           = useState("free"); // "free" | "template" | "workout"
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [sessionSets, setSessionSets]   = useState({});
  const [freeEx, setFreeEx]             = useState(EXERCISES[0]);
  const [freeSets, setFreeSets]         = useState([{weight:"",reps:""}]);
  const [freeCustom, setFreeCustom]     = useState("");
  const [flash, setFlash]               = useState("");

  // Workout view state
  const [workoutExIdx, setWorkoutExIdx] = useState(0);   // current exercise index
  const [workoutSets, setWorkoutSets]   = useState([]);  // sets logged for current exercise
  const [workoutWeight, setWorkoutWeight] = useState(""); // current weight input
  const [workoutReps, setWorkoutReps]   = useState("");   // current reps input
  const [workoutStartTime, setWorkoutStartTime] = useState(null); // Date.now()
  const [workoutRestTime, setWorkoutRestTime] = useState(0); // total rest seconds
  const [workoutSummary, setWorkoutSummary] = useState(null); // shown at end

  // Plan editing state
  const [editingPlan, setEditingPlan]   = useState(null); // copy of planResult being edited

  // Builder state
  const [editingTpl, setEditingTpl]     = useState(null);
  const [tplName, setTplName]           = useState("");
  const [tplTag, setTplTag]             = useState("");
  const [tplExercises, setTplExercises] = useState([]);
  const [addExName, setAddExName]       = useState(EXERCISES[0]);
  const [tplDuration, setTplDuration]   = useState(60); // minutes

  // Charts state
  const [chartEx, setChartEx]           = useState(EXERCISES[0]);

  // Calendar state
  const [calMonth, setCalMonth]         = useState(new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const [calSel, setCalSel]             = useState(null);

  // Body measurements state

  // PR date range state
  const [prDays, setPrDays]             = useState(90);   // days window for weight PRs
  const [volDays, setVolDays]           = useState(30);   // days window for volume PRs

  // Planner state
  const [planTargets, setPlanTargets]   = useState([]);
  const [planResult, setPlanResult]     = useState(null);
  const [planDuration, setPlanDuration] = useState(60); // minutes
  const [exModal, setExModal]           = useState(null);

  // Rest timer
  const [restTimer, setRestTimer]       = useState(null); // {secs, total, running}
  const [restInterval, setRestInterval] = useState(null);

  // Quick-add numpad
  const [quickAdd, setQuickAdd]         = useState(null); // {exName, field:'weight'|'reps', value:'', setIdx}
  const [quickSets, setQuickSets]       = useState([]); // [{weight,reps}] for quick session

  // PR flash
  const [prFlash, setPrFlash]           = useState(null); // exercise name that just hit PR

  // Weekly schedule
  const [schedule, setSchedule]         = useState({});
  const [schedDragging, setSchedDragging] = useState(null); // templateId being dragged

  // Intelligence alerts
  const [alerts, setAlerts]             = useState([]); // [{type:'deload'|'plateau', exercise, message}]

  const today = toISO(new Date());

  // Inject global styles
  useEffect(() => {
    const el = document.createElement("style");
    el.id = "ironlog-styles";
    if (!document.getElementById("ironlog-styles")) {
      el.textContent = [
        "* { box-sizing: border-box; margin: 0; padding: 0; }",
        "html { -webkit-tap-highlight-color: transparent; }",
        "body { background: #060608; color: #eeeef2; overscroll-behavior: none; }",
        "::-webkit-scrollbar { width: 3px; height: 3px; }",
        "::-webkit-scrollbar-track { background: transparent; }",
        "::-webkit-scrollbar-thumb { background: #ffffff14; border-radius: 99px; }",
        "@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }",
        ".su  { animation: slideUp 0.4s ease-out both; }",
        ".su2 { animation: slideUp 0.4s 0.06s ease-out both; }",
        ".su3 { animation: slideUp 0.4s 0.12s ease-out both; }",
        ".su4 { animation: slideUp 0.4s 0.18s ease-out both; }",
        "input, textarea, select { font-family: inherit; }",
        "input:focus { outline: none; }",
        "input::placeholder, textarea::placeholder { color: #3d4455; }",
        "button { font-family: inherit; }",
        ".card { background: #13151c; border: 1px solid #ffffff0d; border-radius: 18px; transition: border-color 0.2s, box-shadow 0.2s; }",
        ".card:hover { border-color: #ffffff18; }",
        ".card-glow:hover { border-color: #b4ff4f28; box-shadow: 0 0 32px rgba(180,255,79,0.04); }",
        ".tab-item { transition: color 0.2s; }",
        ".tab-item:hover { color: #eeeef2 !important; }",
        ".ex-row { transition: background 0.15s; border-radius: 10px; }",
        ".ex-row:hover { background: #1a1d27; }",
        ".range-btn { transition: background 0.15s, color 0.15s, border-color 0.15s; }",
        ".range-btn:hover { border-color: #ffffff30 !important; color: #eeeef2 !important; }",
        ".bp-card { transition: border-color 0.2s, background 0.2s, transform 0.15s; cursor: pointer; }",
        ".bp-card:hover { border-color: #ffffff25 !important; transform: translateY(-1px); }",
        ".btn-primary { background: #b4ff4f; color: #060608; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; padding: 13px 22px; cursor: pointer; transition: transform 0.1s, box-shadow 0.2s, background 0.15s; box-shadow: 0 4px 24px rgba(180,255,79,0.13); }",
        ".btn-primary:hover { background: #c2ff6e; }",
        ".btn-primary:active { transform: scale(0.97); }",
        ".btn-ghost { background: rgba(255,255,255,0.03); color: #7a8499; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; font-size: 13px; font-weight: 500; padding: 9px 16px; cursor: pointer; transition: background 0.15s, color 0.15s; }",
        ".btn-ghost:hover { background: rgba(255,255,255,0.07); color: #eeeef2; }",
      ].join(" ");
      document.head.appendChild(el);
    }
    return () => { const s = document.getElementById("ironlog-styles"); if(s) s.remove(); };
  }, []);

  // ── Load ──
  useEffect(()=>{
    try {
      const l = localStorage.getItem(STORAGE_LOGS);
      const t = localStorage.getItem(STORAGE_TEMPLATES);
      const m = localStorage.getItem(STORAGE_MEASUREMENTS);
      const sc = localStorage.getItem(STORAGE_SCHEDULE);
      setLogs(l ? JSON.parse(l) : {});
      setTemplates(t ? JSON.parse(t) : []);
      setMeasurements(m ? JSON.parse(m) : []);
      setSchedule(sc ? JSON.parse(sc) : {});
    } catch {
      setLogs({});
      setTemplates([]);
      setMeasurements([]);
      setSchedule({});
    }
  },[]);

  function persistSchedule(ns) {
    setSchedule(ns);
    try { localStorage.setItem(STORAGE_SCHEDULE, JSON.stringify(ns)); } catch {}
  }

  function persistLogs(nl) {
    setLogs(nl);
    try { localStorage.setItem(STORAGE_LOGS, JSON.stringify(nl)); } catch {}
  }
  function persistTemplates(nt) {
    setTemplates(nt);
    try { localStorage.setItem(STORAGE_TEMPLATES, JSON.stringify(nt)); } catch {}
  }
  function persistMeasurements(nm) {
    setMeasurements(nm);
    try { localStorage.setItem(STORAGE_MEASUREMENTS, JSON.stringify(nm)); } catch {}
  }
  function saveBodyMeasurement() {
    const entry = {date: today, ...bodyForm};
    const filtered = measurements.filter(m => m.date !== today);
    persistMeasurements([...filtered, entry].sort((a,b)=>a.date.localeCompare(b.date)));
    setBodyFlash(true); setTimeout(()=>setBodyFlash(false), 1400);
  }

  // ── Rest Timer ──
  function startRestTimer(secs = 60) {
    if (restInterval) clearInterval(restInterval);
    setRestTimer({secs, total: secs, running: true});
    const iv = setInterval(() => {
      setRestTimer(prev => {
        if (!prev || prev.secs <= 1) {
          clearInterval(iv);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return {secs: 0, total: prev?.total || secs, running: false};
        }
        return {...prev, secs: prev.secs - 1};
      });
    }, 1000);
    setRestInterval(iv);
  }
  function stopRestTimer() {
    if (restInterval) clearInterval(restInterval);
    setRestTimer(null);
    setRestInterval(null);
  }

  // ── PR detection ──
  function checkForPR(exName, newSets, existingLogs) {
    const allMaxW = Object.values(existingLogs).flatMap(day =>
      day.filter(e => e.exercise === exName).flatMap(e => e.sets.map(s => parseFloat(s.weight)||0))
    );
    const prevBest = allMaxW.length ? Math.max(...allMaxW) : 0;
    const newBest = Math.max(...newSets.map(s => parseFloat(s.weight)||0));
    return newBest > prevBest && newBest > 0;
  }

  // ── Intelligence: deload + plateau detection ──
  function computeAlerts(logsData) {
    const newAlerts = [];
    const allDatesLocal = Object.keys(logsData).sort((a,b) => b.localeCompare(a));

    // Weekly volume by exercise
    const weeklyByEx = {};
    allDatesLocal.forEach(d => {
      const dt = parseD(d); const mon = new Date(dt);
      mon.setDate(dt.getDate() - ((dt.getDay()+6)%7));
      const wk = toISO(mon);
      logsData[d].forEach(e => {
        if (!weeklyByEx[e.exercise]) weeklyByEx[e.exercise] = {};
        weeklyByEx[e.exercise][wk] = (weeklyByEx[e.exercise][wk]||0) + vol(e.sets);
      });
    });

    Object.entries(weeklyByEx).forEach(([ex, weeks]) => {
      const sorted = Object.entries(weeks).sort(([a],[b]) => b.localeCompare(a));
      if (sorted.length < 3) return;

      // Deload: volume dropping 3 weeks in a row
      const [w0v, w1v, w2v] = sorted.slice(0,3).map(([,v]) => v);
      if (w0v < w1v * 0.85 && w1v < w2v * 0.85) {
        newAlerts.push({type:'deload', exercise:ex, message: ex + " volume has dropped 3 weeks in a row. Consider a structured deload week."});
      }

      // Plateau: same max weight for 4+ sessions
      const sessions = allDatesLocal
        .filter(d => logsData[d].some(e => e.exercise === ex))
        .slice(0, 8)
        .map(d => Math.max(...logsData[d].filter(e=>e.exercise===ex).flatMap(e=>e.sets.map(s=>parseFloat(s.weight)||0))));
      if (sessions.length >= 4) {
        const recent4 = sessions.slice(0,4);
        const spread = Math.max(...recent4) - Math.min(...recent4);
        if (spread <= 2.5 && Math.min(...recent4) > 0) {
          newAlerts.push({type:'plateau', exercise:ex, message: ex + ": no weight increase in 4 sessions. Try a deload, drop sets, or add pause reps."});
        }
      }
    });
    return newAlerts;
  }

  // ── Pre-fill last session weights ──
  function getLastWeights(exName) {
    for (const d of Object.keys(logs).sort((a,b) => b.localeCompare(a))) {
      const entry = logs[d]?.find(e => e.exercise === exName);
      if (entry) return entry.sets.map(s => ({weight: s.weight, reps: s.reps}));
    }
    return null;
  }

  // ── Free log with PR detection ──
  function saveFreeSets() {
    const valid = freeSets.filter(s=>s.weight&&s.reps);
    if (!valid.length) return;
    const ex = freeCustom.trim() || freeEx;
    const isPR = checkForPR(ex, valid, logs);
    const entry = {exercise:ex, date:today, templateId:null, sets:valid};
    const nl = {...logs, [today]:[...(logs[today]||[]), entry]};
    persistLogs(nl);
    setAlerts(computeAlerts(nl));
    if (isPR) { setPrFlash(ex); setTimeout(()=>setPrFlash(null), 3000); }
    startRestTimer(60);
    setFreeSets([{weight:"",reps:""}]); setFreeCustom("");
    setFlash("free"); setTimeout(()=>setFlash(""),1400);
  }

  // ── Template workout with pre-fill ──
  function startTemplateWorkout(tpl) {
    // Start with EMPTY sets — last session data is shown as hints only, not pre-logged
    const ss = {};
    tpl.exercises.forEach(e => {
      ss[e.id] = [];
    });
    setSessionSets(ss);
    setActiveTemplate(tpl);
    setWorkoutExIdx(0);
    setWorkoutSets([]);
    setWorkoutWeight("");
    setWorkoutReps("");
    setWorkoutStartTime(Date.now());
    setWorkoutRestTime(0);
    setWorkoutSummary(null);
    setLogMode("workout");
  }

  function finishWorkout(allEntries, startTime, totalRestSecs) {
    if (!allEntries.length) return;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const totalVol = allEntries.reduce((a, e) => a + vol(e.sets), 0);
    // Check PRs
    allEntries.forEach(entry => {
      if (checkForPR(entry.exercise, entry.sets, logs)) {
        setPrFlash(entry.exercise);
        setTimeout(()=>setPrFlash(null), 3000);
      }
    });
    const nl = {...logs, [today]: [...(logs[today]||[]), ...allEntries]};
    persistLogs(nl);
    setAlerts(computeAlerts(nl));
    stopRestTimer();
    setWorkoutSummary({
      entries: allEntries,
      elapsedSecs: elapsed,
      restSecs: totalRestSecs,
      totalVolume: Math.round(totalVol),
      prCount: allEntries.filter(e => checkForPR(e.exercise, e.sets, logs)).length,
    });
    setLogMode("summary");
  }

  function saveTemplateSession() {
    const entries = activeTemplate.exercises.map(e=>({
      exercise:e.name, date:today, templateId:activeTemplate.id,
      sets:sessionSets[e.id]?.filter(s=>s.weight&&s.reps)||[]
    })).filter(e=>e.sets.length>0);
    if (!entries.length) return;
    finishWorkout(entries, workoutStartTime || Date.now(), workoutRestTime);
    setActiveTemplate(null); setSessionSets({});
    setFlash("tpl"); setTimeout(()=>setFlash(""),1400);
  }

  // ── Template builder ──
  function newTemplate() {
    setEditingTpl("new");
    setTplName(""); setTplTag(""); setTplExercises([]);
  }
  function editTemplate(tpl) {
    setEditingTpl(tpl.id);
    setTplName(tpl.name); setTplTag(tpl.tag||"");
    setTplDuration(tpl.duration||60);
    setTplExercises(tpl.exercises.map(e=>({...e})));
  }
  function addExToTpl() {
    setTplExercises(prev=>[...prev,{id:uid(),name:addExName,targetSets:3,targetReps:"8-10",notes:""}]);
  }
  function updateTplEx(id,field,val) {
    setTplExercises(prev=>prev.map(e=>e.id===id?{...e,[field]:val}:e));
  }
  function removeTplEx(id) { setTplExercises(prev=>prev.filter(e=>e.id!==id)); }
  function moveTplEx(id,dir) {
    setTplExercises(prev=>{
      const idx=prev.findIndex(e=>e.id===id); if(idx<0) return prev;
      const next=[...prev];
      const swap=idx+dir; if(swap<0||swap>=next.length) return prev;
      [next[idx],next[swap]]=[next[swap],next[idx]]; return next;
    });
  }
  function saveTpl() {
    if(!tplName.trim()||!tplExercises.length) return;
    const obj={id:editingTpl==="new"?uid():editingTpl,name:tplName.trim(),tag:tplTag.trim(),duration:tplDuration,exercises:tplExercises};
    const nt = editingTpl==="new"
      ? [...templates,obj]
      : templates.map(t=>t.id===obj.id?obj:t);
    persistTemplates(nt);
    setEditingTpl(null);
  }
  function deleteTpl(id) {
    persistTemplates(templates.filter(t=>t.id!==id));
  }

  if(!logs||!templates||!measurements) return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",
      color:T3,fontFamily:FF_BODY,letterSpacing:"0.2em"}}>LOADING...</div>
  );

  // ── Derived data ──
  const allDates = Object.keys(logs).sort((a,b)=>b.localeCompare(a));
  const allExercises = [...new Set([...EXERCISES,...allDates.flatMap(d=>logs[d].map(e=>e.exercise))])];

  function getProgressSeries(ex) {
    return allDates.filter(d=>logs[d].some(e=>e.exercise===ex)).map(d=>{
      const entries=logs[d].filter(e=>e.exercise===ex);
      const maxW=Math.max(...entries.flatMap(e=>e.sets.map(s=>parseFloat(s.weight)||0)));
      const totalVol=entries.reduce((a,e)=>a+vol(e.sets),0);
      const max1RM=Math.max(...entries.flatMap(e=>e.sets.map(s=>{
        const w=parseFloat(s.weight), r=parseFloat(s.reps);
        return (w>0&&r>0)?epley(w,r):0;
      })));
      return {date:fmtS(d),rawDate:d,maxWeight:maxW,volume:Math.round(totalVol),est1RM:max1RM||null};
    }).reverse();
  }

  // Weekly volume PRs: for each exercise, track each week's volume and flag if it's a new all-time high
  // Weekly volume PRs now computed inline with getWeeklyVolumePRs(days)

  function getWeeklyVolume() {
    const weeks={};
    allDates.forEach(d=>{
      const dt=parseD(d); const mon=new Date(dt); mon.setDate(dt.getDate()-((dt.getDay()+6)%7));
      const wk=toISO(mon);
      weeks[wk]=(weeks[wk]||0)+Math.round(logs[d].reduce((a,e)=>a+vol(e.sets),0));
    });
    return Object.entries(weeks).sort(([a],[b])=>a.localeCompare(b)).slice(-12)
      .map(([wk,v])=>({week:fmtS(wk),vol:v}));
  }

  function getMuscleRadar() {
    const counts={};
    allDates.slice(0,30).forEach(d=>logs[d].forEach(e=>{
      const mg=MUSCLE_GROUPS[e.exercise]||"Other";
      counts[mg]=(counts[mg]||0)+1;
    }));
    return Object.entries(counts).map(([muscle,count])=>({muscle,count}));
  }

  function getPRs(days) {
    const cutoff = toISO(new Date(Date.now() - days * 864e5));
    const prevCutoff = toISO(new Date(Date.now() - days * 2 * 864e5));
    // Best weight in the window
    const inWindow = {}, beforeWindow = {};
    allDates.forEach(d => {
      logs[d].forEach(e => {
        const maxW = Math.max(...e.sets.map(s => parseFloat(s.weight)||0));
        if (maxW <= 0) return;
        if (d >= cutoff) {
          if (!inWindow[e.exercise] || maxW > inWindow[e.exercise].weight)
            inWindow[e.exercise] = { weight: maxW, date: d };
        } else if (d >= prevCutoff) {
          if (!beforeWindow[e.exercise] || maxW > beforeWindow[e.exercise].weight)
            beforeWindow[e.exercise] = { weight: maxW, date: d };
        }
      });
    });
    return Object.entries(inWindow)
      .map(([ex, cur]) => {
        const prev = beforeWindow[ex];
        const change = prev ? +(cur.weight - prev.weight).toFixed(1) : null;
        const pct = prev ? +((change / prev.weight) * 100).toFixed(1) : null;
        return [ex, { ...cur, prevWeight: prev?.weight ?? null, change, pct }];
      })
      .sort(([,a],[,b]) => b.weight - a.weight)
      .slice(0, 8);
  }

  function getWeeklyVolumePRs(days) {
    const cutoff = toISO(new Date(Date.now() - days * 864e5));
    const prevCutoff = toISO(new Date(Date.now() - days * 2 * 864e5));
    const byEx = {};
    allDates.forEach(d => {
      const dt = parseD(d); const mon = new Date(dt);
      mon.setDate(dt.getDate() - ((dt.getDay()+6)%7));
      const wk = toISO(mon);
      logs[d].forEach(e => {
        if (!byEx[e.exercise]) byEx[e.exercise] = {};
        if (!byEx[e.exercise][wk]) byEx[e.exercise][wk] = {vol:0, inWindow:false, inPrev:false};
        byEx[e.exercise][wk].vol += vol(e.sets);
        if (d >= cutoff) byEx[e.exercise][wk].inWindow = true;
        else if (d >= prevCutoff) byEx[e.exercise][wk].inPrev = true;
      });
    });
    const results = [];
    Object.entries(byEx).forEach(([ex, weeks]) => {
      const windowWeeks = Object.entries(weeks).filter(([,v])=>v.inWindow).map(([wk,v])=>({wk,vol:v.vol}));
      const prevWeeks   = Object.entries(weeks).filter(([,v])=>v.inPrev).map(([wk,v])=>({wk,vol:v.vol}));
      if (!windowWeeks.length) return;
      const bestNow  = Math.max(...windowWeeks.map(w=>w.vol));
      const bestPrev = prevWeeks.length ? Math.max(...prevWeeks.map(w=>w.vol)) : null;
      const change = bestPrev !== null ? +(bestNow - bestPrev).toFixed(0) : null;
      const pct    = bestPrev !== null ? +((change / bestPrev) * 100).toFixed(1) : null;
      const bestWk = windowWeeks.find(w=>w.vol===bestNow)?.wk ?? "";
      results.push({ exercise: ex, week: bestWk, volume: Math.round(bestNow), bestPrev: bestPrev ? Math.round(bestPrev) : null, change, pct });
    });
    return results.sort((a,b) => (b.pct??-999) - (a.pct??-999)).slice(0, 8);
  }

  // Last time a template was done
  function lastDone(tplId) {
    for(const d of allDates) {
      if(logs[d].some(e=>e.templateId===tplId)) return d;
    }
    return null;
  }
  // How many times a template was done
  function timesLogged(tplId) {
    return allDates.filter(d=>logs[d].some(e=>e.templateId===tplId)).length;
  }

  // Calendar
  // ── Planner helpers ──
  // Get last date a body part was trained and days since
  function getBodyPartHistory() {
    const lastTrained = {}; // bodyPart -> {date, daysAgo}
    BODY_PARTS.forEach(bp => {
      const mg = BODY_PART_MUSCLE[bp];
      for (const d of allDates) {
        const hit = logs[d].some(e => {
          const exMG = MUSCLE_GROUPS[e.exercise];
          if (exMG !== mg) return false;
          // More specific: check if exercise matches body part
          const cat = Object.entries(EXERCISE_CATEGORIES).find(([,exs]) => exs.includes(e.exercise))?.[0] || "";
          if (bp === "Biceps") return cat.includes("Biceps");
          if (bp === "Triceps") return cat.includes("Triceps");
          if (bp === "Quads") return cat.includes("Quads");
          if (bp === "Hamstrings" || bp === "Glutes") return cat.includes("Hamstrings");
          if (bp === "Calves") return cat.includes("Calves");
          return exMG === mg;
        });
        if (hit) {
          const daysAgo = Math.floor((Date.now() - parseD(d).getTime()) / 864e5);
          lastTrained[bp] = { date: d, daysAgo };
          break;
        }
      }
      if (!lastTrained[bp]) lastTrained[bp] = null;
    });
    return lastTrained;
  }

  // Get last session data for a specific exercise name
  function getLastExSession(exName) {
    for (const d of allDates) {
      const entry = logs[d].find(e => e.exercise === exName);
      if (entry) return { date: d, sets: entry.sets };
    }
    return null;
  }

  // Get full history for an exercise (all sessions, newest first)
  function getFullExHistory(exName) {
    return allDates
      .filter(d => logs[d].some(e => e.exercise === exName))
      .map(d => {
        const entry = logs[d].find(e => e.exercise === exName);
        const maxW = Math.max(...entry.sets.map(s => parseFloat(s.weight)||0));
        const est = best1RM(entry.sets);
        return { date: d, sets: entry.sets, maxW, est1RM: est||null };
      });
  }

  // Duration → exercise budget
  // ~5-6 min per exercise (2-3 working sets + 60-90s rest each)
  // minus ~5 min warmup/transition overhead
  function exBudget(minutes) {
    if (minutes <= 15) return 2;
    if (minutes <= 30) return 4;
    if (minutes <= 45) return 6;
    if (minutes <= 60) return 8;
    if (minutes <= 75) return 10;
    return 12;
  }

  function generatePlan(targets, durationMins) {
    const budget = exBudget(durationMins);
    // Distribute budget across body parts — primaries first, then secondaries
    const allExercises = targets.flatMap(bp => {
      const template = PLANNER_EXERCISES[bp] || [];
      return template.map(ex => {
        const last = getLastExSession(ex.name);
        const suggested = last ? suggestWeight(last.sets) : null;
        return { ...ex, bodyPart: bp, last, suggested };
      });
    });

    // Pick: fill primaries first across all body parts, then secondaries, then accessories
    const picked = [];
    for (const tier of ["primary", "secondary", "accessory"]) {
      for (const ex of allExercises) {
        if (ex.tier === tier && picked.length < budget) {
          // Avoid picking same exercise twice
          if (!picked.find(p => p.name === ex.name)) picked.push(ex);
        }
      }
    }

    // Group back by body part, preserving order
    const grouped = {};
    picked.forEach(ex => {
      if (!grouped[ex.bodyPart]) grouped[ex.bodyPart] = [];
      grouped[ex.bodyPart].push(ex);
    });

    return targets
      .filter(bp => grouped[bp]?.length)
      .map(bp => ({ bodyPart: bp, exercises: grouped[bp] }));
  }

  function getCalDays() {
    const y=calMonth.getFullYear(),m=calMonth.getMonth();
    const first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate();
    const cells=[];
    for(let i=0;i<first;i++) cells.push(null);
    for(let d=1;d<=days;d++) cells.push(toISO(new Date(y,m,d)));
    return cells;
  }

  const progressSeries = getProgressSeries(chartEx);
  const weeklyVol = getWeeklyVolume();
  const muscleRadar = getMuscleRadar();
  const prs = getPRs(prDays);
  const calDays = getCalDays();
  const totalWorkouts = allDates.length;
  const totalVolume = allDates.reduce((a,d)=>a+logs[d].reduce((b,e)=>b+vol(e.sets),0),0);
  const streak = (()=>{ let s=0,d=new Date(); while(logs[toISO(d)]){s++;d.setDate(d.getDate()-1);} return s; })();
  const weeklyVolPRs = getWeeklyVolumePRs(volDays);

  const nav = [
    {id:"dashboard", label:"Home",    fullLabel:"Dashboard",    icon:"home"},
    {id:"plan",      label:"Plan",    fullLabel:"Smart Planner",icon:"target"},
    {id:"log",       label:"Log",     fullLabel:"Log Workout",  icon:"plus"},
    {id:"schedule",  label:"Week",    fullLabel:"Weekly Schedule", icon:"calendar-week"},
    {id:"charts",    label:"Stats",   fullLabel:"Statistics",   icon:"chart-line"},
    {id:"heatmap",   label:"Heat",    fullLabel:"Heatmap",      icon:"flame"},
    {id:"calendar",  label:"Cal",     fullLabel:"Calendar",     icon:"calendar"},
    {id:"builder",   label:"Build",   fullLabel:"Builder",      icon:"settings"},
    {id:"history",   label:"Log",     fullLabel:"History",      icon:"history"},
  ];

  // ── Template progress: last session data for each exercise in template
  function getLastSessionData(tpl) {
    const byEx = {};
    for(const d of allDates) {
      const entries = logs[d].filter(e=>e.templateId===tpl.id);
      if(!entries.length) continue;
      for(const entry of entries) {
        if(!byEx[entry.exercise]) byEx[entry.exercise]={date:d,sets:entry.sets};
      }
      if(Object.keys(byEx).length===tpl.exercises.length) break;
    }
    return byEx;
  }

  // ── Template progress chart: volume over sessions
  function getTemplateSessions(tpl) {
    const sessions=[];
    for(const d of [...allDates].reverse()) {
      const entries=logs[d].filter(e=>e.templateId===tpl.id);
      if(!entries.length) continue;
      const totalV=entries.reduce((a,e)=>a+vol(e.sets),0);
      sessions.push({date:fmtS(d),volume:Math.round(totalV)});
    }
    return sessions;
  }

  const tierColor = t => t==="primary" ? A : t==="secondary" ? A2 : A3;
  const tierLabel = t => t==="primary" ? "Primary" : t==="secondary" ? "Secondary" : "Accessory";

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:BG,color:TXT,fontFamily:FF_BODY}}>
      {/* ── PR Flash ── */}
      {prFlash && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:9998,pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"linear-gradient(135deg,"+A+"22,"+A+"44)",border:"2px solid "+A,borderRadius:24,padding:"28px 40px",textAlign:"center",backdropFilter:"blur(20px)"}}>
            <Icon name="trophy" size={48} color={A} style={{marginBottom:8}} />
            <div style={{fontFamily:FF_HEAD,fontSize:22,fontWeight:800,color:A}}>NEW PR!</div>
            <div style={{fontFamily:FF_BODY,fontSize:14,color:TXT,marginTop:4}}>{prFlash}</div>
          </div>
        </div>
      )}

      {/* ── Rest Timer Bar ── */}
      {restTimer && (
        <div style={{position:"fixed",top:54,left:0,right:0,zIndex:300,background:S1,borderBottom:"1px solid "+BD2,padding:"8px 16px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,height:4,background:S3,borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",background:restTimer.secs===0?"#ef4444":A,borderRadius:99,width:(restTimer.secs/restTimer.total*100)+"%",transition:"width 1s linear,background 0.3s"}}/>
          </div>
          <div style={{fontFamily:FF_MONO,fontSize:15,fontWeight:600,color:restTimer.secs===0?"#ef4444":restTimer.secs<10?A3:TXT,minWidth:36,textAlign:"right"}}>
            {restTimer.secs===0?"Done":Math.floor(restTimer.secs/60)+":"+(restTimer.secs%60).toString().padStart(2,"0")}
          </div>
          <div style={{display:"flex",gap:6}}>
            {[30,45,60].map(s=>(
              <button key={s} onClick={()=>startRestTimer(s)} style={{...ghostBtn(T3),padding:"3px 7px",fontSize:10,borderRadius:6}}>{s}s</button>
            ))}
            <button onClick={stopRestTimer} style={{...ghostBtn("#ef4444"),padding:"3px 8px",fontSize:11,borderRadius:6,display:"flex",alignItems:"center"}}><Icon name="close" size={11} color="#ef4444" /></button>
          </div>
        </div>
      )}

      {/* ── Intelligence Alerts Banner ── */}
      {alerts.length > 0 && (
        <div style={{position:"fixed",bottom:72,left:8,right:8,zIndex:250,display:"flex",flexDirection:"column",gap:6,pointerEvents:"none"}}>
          {alerts.slice(0,2).map((a,i)=>(
            <div key={i} style={{background:a.type==="deload"?A3+"dd":"#f59e0bdd",borderRadius:12,padding:"10px 14px",display:"flex",gap:10,alignItems:"flex-start",backdropFilter:"blur(12px)"}}>
              <Icon name={a.type==="deload"?"alert-down":"alert-warn"} size={16} color="#0d0d0d" />
              <div style={{fontFamily:FF_BODY,fontSize:12,color:"#0d0d0d",flex:1,fontWeight:500}}>{a.message}</div>
              <button style={{background:"none",border:"none",cursor:"pointer",color:"#0d0d0d",pointerEvents:"all",display:"flex",alignItems:"center"}} onClick={()=>setAlerts(prev=>prev.filter((_,j)=>j!==i))}><Icon name="close" size={14} color="#0d0d0d" /></button>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick-Add Numpad ── */}
      {quickAdd && (
        <div onClick={()=>setQuickAdd(null)} style={{position:"fixed",inset:0,background:"#000a",zIndex:9997,display:"flex",alignItems:"flex-end"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:S1,borderRadius:"20px 20px 0 0",width:"100%",padding:"20px 16px 32px"}}>
            <div style={{fontFamily:FF_HEAD,fontSize:16,fontWeight:700,color:TXT,marginBottom:4}}>{quickAdd.exName}</div>
            <div style={{fontFamily:FF_BODY,fontSize:12,color:T2,marginBottom:16}}>Enter {quickAdd.field}</div>
            <div style={{fontFamily:FF_MONO,fontSize:36,fontWeight:700,color:A,textAlign:"center",marginBottom:16,minHeight:48,background:S3,borderRadius:12,padding:"8px 0"}}>
              {quickAdd.value || "—"}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
              {["1","2","3","4","5","6","7","8","9",".","0","⌫"].map(k=>(
                <button key={k} onClick={()=>{
                  if (k==="⌫") setQuickAdd(q=>({...q,value:q.value.slice(0,-1)}));
                  else if (k==="." && quickAdd.value.includes(".")) return;
                  else setQuickAdd(q=>({...q,value:q.value+k}));
                }} style={{background:S3,border:"1px solid "+BD2,borderRadius:12,padding:"16px",fontSize:18,fontWeight:600,fontFamily:FF_MONO,color:TXT,cursor:"pointer"}}>
                  {k==="⌫" ? <Icon name="close" size={16} color={TXT} /> : k}
                </button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>setQuickAdd(null)} style={{...ghostBtn(T2),padding:"14px",borderRadius:12,fontSize:14,textAlign:"center"}}>Cancel</button>
              <button onClick={()=>{
                if (!quickAdd.value) return;
                const updated = [...quickSets];
                if (!updated[quickAdd.setIdx]) updated[quickAdd.setIdx] = {weight:"",reps:""};
                updated[quickAdd.setIdx] = {...updated[quickAdd.setIdx],[quickAdd.field]:quickAdd.value};
                setQuickSets(updated);
                // If weight, move to reps; if reps, close
                if (quickAdd.field==="weight") {
                  setQuickAdd({...quickAdd,field:"reps",value:""});
                } else {
                  setQuickAdd(null);
                }
              }} style={{...btn(A),padding:"14px",borderRadius:12,fontSize:14,textAlign:"center"}}>
                {quickAdd.field==="weight"?"→ Reps":"Add Set"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exercise Detail Modal ── */}
      {exModal && (() => {
        const hist = exModal.history;
        const youtubeUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(exModal.name + " exercise how to form");
        const maxAllTime = hist.length ? Math.max(...hist.map(h=>h.maxW)) : null;
        const chartData = [...hist].reverse().map(h => ({ date: fmtS(h.date), weight: h.maxW, est1RM: h.est1RM }));
        return (
          <div onClick={() => setExModal(null)} style={{
            position:"fixed",inset:0,background:"#000000cc",zIndex:9999,
            display:"flex",alignItems:"flex-end",justifyContent:"center",
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background:S1,border:`1px solid ${BD}`,borderRadius:"8px 8px 0 0",
              width:"100%",maxWidth:600,maxHeight:"88vh",overflowY:"auto",
              padding:"0 0 32px",
            }}>
              {/* Handle bar */}
              <div style={{display:"flex",justifyContent:"center",padding:"10px 0 0"}}>
                <div style={{width:36,height:4,borderRadius:8,background:T3}}/>
              </div>

              {/* Header */}
              <div style={{padding:"14px 18px 12px",borderBottom:`1px solid ${BD}`}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:900,letterSpacing:"0.06em",marginBottom:4}}>{exModal.name}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,color:tierColor(exModal.tier),background:tierColor(exModal.tier)+"18",
                        border:`1px solid ${tierColor(exModal.tier)}33`,borderRadius:8,padding:"2px 7px",letterSpacing:"0.04em"}}>
                        {tierLabel(exModal.tier)}
                      </span>
                      {maxAllTime && (
                        <span style={{fontSize:10,color:A,background:A+"12",border:`1px solid ${A}33`,
                          borderRadius:8,padding:"2px 7px",letterSpacing:"0.04em"}}>
                          PR: {maxAllTime} lb
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setExModal(null)} style={{
                    background:"none",border:`1px solid ${BD}`,color:T2,
                    width:30,height:30,borderRadius:"50%",cursor:"pointer",
                    fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
                  }}><Icon name="close" size={12} color="currentColor" /></button>
                </div>
              </div>

              <div style={{padding:"14px 18px"}}>
                {/* How-to links */}
                <div style={{display:"flex",gap:8,marginBottom:18}}>
                  <a href={youtubeUrl} target="_blank" rel="noreferrer" style={{
                    flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                    background:"#ff000018",border:"1px solid #ff000033",borderRadius:10,
                    padding:"9px 12px",textDecoration:"none",color:"#ff6666",
                    fontSize:10,fontWeight:700,letterSpacing:"0.04em",fontFamily:FF_BODY
                  }}>
                    <Icon name="youtube" size={14} color="#ff6666" style={{marginRight:6}} /> YouTube How-To
                  </a>
                  <a href={"https://www.google.com/search?q=" + encodeURIComponent(exModal.name + " exercise technique muscles worked")}
                    target="_blank" rel="noreferrer" style={{
                    flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                    background:A2+"12",border:`1px solid ${A2}33`,borderRadius:10,
                    padding:"9px 12px",textDecoration:"none",color:A2,
                    fontSize:10,fontWeight:700,letterSpacing:"0.04em",fontFamily:FF_BODY
                  }}>
                    <Icon name="book" size={14} color={A2} style={{marginRight:6}} /> Technique Guide
                  </a>
                </div>

                {/* Target for today */}
                {exModal.suggested && (
                  <div style={{background:A2+"0f",border:`1px solid ${A2}22`,borderRadius:12,
                    padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:11,color:A2,letterSpacing:"0.04em",marginBottom:4}}>TODAY'S TARGET</div>
                      <div style={{fontSize:10,color:T2}}>+5% progressive overload from last session</div>
                    </div>
                    <div style={{fontSize:30,fontWeight:800,fontFamily:FF_HEAD,letterSpacing:"-0.03em",color:A2}}>
                      {exModal.suggested}<span style={{fontSize:11,color:T2,marginLeft:3}}>lb</span>
                    </div>
                  </div>
                )}

                {/* Weight history chart */}
                {chartData.length >= 2 ? (
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:13,color:TXT,fontWeight:600,marginBottom:14,fontFamily:FF_HEAD}}>Weight History</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={chartData}>
                        <CartesianGrid stroke="#1a1a1a" vertical={false}/>
                        <XAxis dataKey="date" tick={{fill:T3,fontSize:10,fontFamily:FF_BODY}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:T3,fontSize:10,fontFamily:FF_BODY}} axisLine={false} tickLine={false} width={32}
                          domain={[d=>Math.floor(d*0.95), d=>Math.ceil(d*1.02)]}/>
                        <Tooltip content={<ChartTip/>}/>
                        <Line type="monotone" dataKey="weight" name="Max Weight" stroke={A} strokeWidth={2} dot={{fill:A,r:3}} activeDot={{r:5}}/>
                        {chartData.some(d=>d.est1RM) && (
                          <Line type="monotone" dataKey="est1RM" name="Est. 1RM" stroke={A2} strokeWidth={1.5}
                            strokeDasharray="4 3" dot={false} connectNulls/>
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                    <div style={{display:"flex",gap:12,marginTop:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:12,height:2,background:A}}/><span style={{fontSize:10,color:T2}}>Max weight</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:12,height:2,background:A2,borderTop:`2px dashed ${A2}`}}/><span style={{fontSize:10,color:T2}}>Est. 1RM</span>
                      </div>
                    </div>
                  </div>
                ) : chartData.length === 1 ? (
                  <div style={{background:CARD,border:`1px solid ${BD}`,borderRadius:10,padding:"12px 14px",marginBottom:16}}>
                    <div style={{fontSize:10,color:T2,letterSpacing:"0.04em",marginBottom:6}}>ONLY ONE SESSION LOGGED</div>
                    <div style={{fontSize:10,color:T2}}>Log more sessions to see your progress chart.</div>
                  </div>
                ) : (
                  <div style={{background:CARD,border:`1px solid ${BD}`,borderRadius:10,padding:"12px 14px",marginBottom:16}}>
                    <div style={{fontSize:10,color:T3,fontStyle:"italic"}}>No history logged yet for this exercise.</div>
                  </div>
                )}

                {/* Session log */}
                {hist.length > 0 && (
                  <div>
                    <div style={{fontSize:13,color:TXT,fontWeight:600,marginBottom:14,fontFamily:FF_HEAD}}>Session Log</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {hist.map((h, i) => {
                        const prevMaxW = i < hist.length-1 ? hist[i+1].maxW : null;
                        const delta = prevMaxW ? h.maxW - prevMaxW : null;
                        return (
                          <div key={h.date} style={{background:CARD,border:`1px solid ${BD}`,borderRadius:10,
                            padding:"10px 12px",borderLeft:"2px solid "+(i===0?A:BD)}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                              <span style={{fontSize:10,color:i===0?A:"#888",fontWeight:i===0?700:400}}>
                                {fmtS(h.date)}{i===0?" · MOST RECENT":""}
                              </span>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                {delta !== null && (
                                  <span style={{fontSize:11,color:delta>=0?A:A3,fontWeight:700}}>
                                    {delta>=0?"+":""}{delta}lb
                                  </span>
                                )}
                                <span style={{fontSize:11,fontWeight:700,color:i===0?A:TXT}}>{h.maxW}lb</span>
                              </div>
                            </div>
                            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                              {h.sets.map((s,j) => (
                                <span key={j} style={{fontSize:10,color:T2,background:CARD2,
                                  padding:"2px 8px",borderRadius:8}}>
                                  <span style={{color:"#a0a0a0"}}>{s.weight}</span>×<span style={{color:"#a0a0a0"}}>{s.reps}</span>
                                </span>
                              ))}
                            </div>
                            {h.est1RM && (
                              <div style={{fontSize:10,color:T3,marginTop:4}}>Est. 1RM: {h.est1RM} lb</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Top header ── */}
      <div style={{
        position:"sticky", top:0, zIndex:200,
        background:`${BG}cc`, backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
        borderBottom:`1px solid ${BD}`,
        padding:"0 20px", display:"flex", alignItems:"center",
        justifyContent:"space-between", height:54,
      }}>
        <div style={{display:"flex", alignItems:"center", gap:9}}>
          <svg width="26" height="26" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="22" fill={S3}/>
            <rect x="14" y="62" width="12" height="26" rx="3" fill={A} opacity="0.35"/>
            <rect x="30" y="50" width="12" height="38" rx="3" fill={A} opacity="0.55"/>
            <rect x="46" y="36" width="12" height="52" rx="3" fill={A} opacity="0.75"/>
            <rect x="62" y="22" width="12" height="66" rx="3" fill={A}/>
            <polyline points="20,58 36,46 52,32 68,18" fill="none" stroke={A} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="68" cy="18" r="5.5" fill={A}/>
          </svg>
          <span style={{fontFamily:FF_HEAD, fontWeight:800, fontSize:17, color:TXT, letterSpacing:"-0.03em"}}>
            Iron<span style={{color:A}}>Log</span>
          </span>
        </div>
        <div style={{fontFamily:FF_BODY, fontWeight:500, fontSize:12, color:T3, letterSpacing:"0.03em", textTransform:"uppercase"}}>
          {nav.find(n=>n.id===view)?.fullLabel}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{padding:"20px 16px 96px", maxWidth:640, margin:"0 auto"}}>

        {/* ── Bottom tab bar ── */}
        <div style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:200,
          background:`${S1}f5`, backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)",
          borderTop:`1px solid ${BD}`,
          display:"flex", alignItems:"stretch",
          paddingBottom:"env(safe-area-inset-bottom, 0px)",
        }}>
          {nav.map(({id, label, icon}) => {
            const active = view === id;
            return (
              <button key={id} className="tab-item"
                onClick={() => { setView(id); setEditingTpl(null); setActiveTemplate(null); }}
                style={{
                  flex:1, background:"none", border:"none", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", gap:2, padding:"10px 2px 12px",
                  color: active ? A : T3,
                  position:"relative",
                  minWidth:0,
                }}>
                {active && (
                  <div style={{
                    position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
                    width:28, height:2, background:A, borderRadius:"0 0 4px 4px",
                  }}/>
                )}
                <Icon name={icon} size={19} color={active ? A : T3} />
                <span style={{fontFamily:FF_BODY, fontSize:11, fontWeight:active?600:400, letterSpacing:"0.04em", textTransform:"uppercase"}}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* ═══════════════════ SCHEDULE ═══════════════════ */}
        {view==="schedule" && (
          <div>
            <div style={{fontFamily:FF_BODY,fontSize:13,color:T2,marginBottom:20}}>Drag workouts onto days to build your weekly plan.</div>

            {/* Template palette */}
            <div style={{marginBottom:20}}>
              <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:13,color:TXT,marginBottom:10}}>Your Templates</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {templates.length===0 && <div style={{color:T3,fontSize:13}}>No templates yet — create some in Builder.</div>}
                {templates.map(tpl=>(
                  <div key={tpl.id}
                    draggable
                    onDragStart={()=>setSchedDragging(tpl.id)}
                    onDragEnd={()=>setSchedDragging(null)}
                    style={{background:schedDragging===tpl.id?A+"22":S3,border:"1px solid "+(schedDragging===tpl.id?A:BD2),borderRadius:10,padding:"8px 14px",cursor:"grab",fontFamily:FF_BODY,fontSize:13,color:schedDragging===tpl.id?A:TXT,transition:"all 0.15s",userSelect:"none"}}>
                    {tpl.name}
                  </div>
                ))}
                <div
                  draggable
                  onDragStart={()=>setSchedDragging("rest")}
                  onDragEnd={()=>setSchedDragging(null)}
                  style={{background:S3,border:"1px solid "+BD2,borderRadius:10,padding:"8px 14px",cursor:"grab",fontFamily:FF_BODY,fontSize:13,color:T3,userSelect:"none"}}>
                  <Icon name="sleep" size={14} color={T3} style={{marginRight:6}} /> Rest Day
                </div>
              </div>
            </div>

            {/* Week grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
              {DAYS.map(day=>{
                const assigned = schedule[day];
                const tpl = assigned && assigned!=="rest" ? templates.find(t=>t.id===assigned) : null;
                const isToday = DAYS[((new Date().getDay()+6)%7)] === day;
                // Check if done today
                const dayDate = toISO(new Date(new Date().setDate(new Date().getDate() - ((new Date().getDay()+6)%7) + DAYS.indexOf(day))));
                const done = tpl && logs[dayDate] && logs[dayDate].some(e=>e.templateId===tpl.id);
                return (
                  <div key={day}
                    onDragOver={e=>e.preventDefault()}
                    onDrop={()=>{ if(schedDragging){ persistSchedule({...schedule,[day]:schedDragging}); setSchedDragging(null); } }}
                    onClick={()=>{ if(assigned){ persistSchedule({...schedule,[day]:undefined}); }}}
                    style={{
                      background:isToday?A+"18":S2,
                      border:"1px solid "+(isToday?A+"44":schedDragging?"#ffffff22":BD),
                      borderRadius:12,padding:"10px 6px",minHeight:90,
                      textAlign:"center",cursor:assigned?"pointer":"default",
                      transition:"border-color 0.15s,background 0.15s",
                      position:"relative",
                    }}>
                    <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:11,color:isToday?A:T3,marginBottom:6}}>{day.toUpperCase()}</div>
                    {assigned==="rest" ? (
                      <Icon name="sleep" size={20} color={T3} />
                    ) : tpl ? (
                      <>
                        {done && <div style={{position:"absolute",top:4,right:4}}><Icon name="check-circle" size={12} color={A} /></div>}
                        <div style={{fontFamily:FF_BODY,fontSize:10,color:done?A:TXT,fontWeight:600,lineHeight:1.3}}>{tpl.name}</div>
                        <div style={{fontFamily:FF_BODY,fontSize:9,color:T3,marginTop:3}}>{tpl.exercises.length} ex</div>
                        {isToday && !done && (
                          <button onClick={e=>{e.stopPropagation();startTemplateWorkout(tpl);setView("log");}} style={{...btn(A),padding:"4px 8px",fontSize:9,borderRadius:6,marginTop:6,width:"100%"}}>Start</button>
                        )}
                      </>
                    ) : (
                      <Icon name="plus" size={18} color={T3} style={{opacity:0.2}} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Adherence */}
            {Object.values(schedule).some(v=>v&&v!=="rest") && (
              <div style={{background:S2,border:"1px solid "+BD,borderRadius:14,padding:"14px",marginTop:16}}>
                <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:13,color:TXT,marginBottom:10}}>This Week's Adherence</div>
                {DAYS.map(day=>{
                  const assigned = schedule[day];
                  const tpl = assigned && assigned!=="rest" ? templates.find(t=>t.id===assigned) : null;
                  if (!tpl) return null;
                  const dayDate = toISO(new Date(new Date().setDate(new Date().getDate() - ((new Date().getDay()+6)%7) + DAYS.indexOf(day))));
                  const done = logs[dayDate]?.some(e=>e.templateId===tpl.id);
                  const isPast = new Date(dayDate) < new Date(today);
                  return (
                    <div key={day} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid "+BD}}>
                      <div style={{fontFamily:FF_BODY,fontSize:13,color:TXT}}>{day} — {tpl.name}</div>
                      <div style={{display:"flex",alignItems:"center"}}>
                        {done ? <Icon name="check-circle" size={16} color={A} /> : isPast ? <Icon name="x-circle" size={16} color="#ef4444" /> : <Icon name="clock-pending" size={16} color={T3} />}
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ PLAN ═══════════════════ */}
        {view==="plan" && (() => {
          const history = getBodyPartHistory();

          // Sort body parts: longest rest first (most recovery = most recommended)
          const sorted = BODY_PARTS.slice().sort((a, b) => {
            const da = history[a]?.daysAgo ?? 999;
            const db = history[b]?.daysAgo ?? 999;
            return db - da;
          });

          const toggleTarget = (bp) => {
            setPlanTargets(prev =>
              prev.includes(bp) ? prev.filter(x => x !== bp) : [...prev, bp]
            );
            setPlanResult(null);
          };


          const restColor = days => {
            if (days === undefined || days === null) return T3; // never trained
            if (days >= 4) return A;    // fully recovered
            if (days >= 2) return A3;   // borderline
            return "#c84444";           // too recent
          };
          const restLabel = days => {
            if (days == null) return "FRESH";
            if (days >= 4) return `${days}d — READY`;
            if (days === 1) return "1d — SORE";
            return `${days}d — RECOVERING`;
          };

          return (
            <div>
              <div style={{fontSize:10,color:T2,letterSpacing:"0.04em",marginBottom:20}}>WORKOUT PLANNER</div>

              {/* Body part recovery grid */}
              <div style={{background:S2,border:`1px solid ${BD}`,borderRadius:18,padding:"14px 12px",marginBottom:16}}>
                <div style={{fontSize:13,color:TXT,fontWeight:600,marginBottom:14,fontFamily:FF_HEAD}}>
                  Select Body Parts To Train Today
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                  {sorted.map(bp => {
                    const h = history[bp];
                    const selected = planTargets.includes(bp);
                    const rc = restColor(h?.daysAgo);
                    return (
                      <div key={bp} onClick={() => toggleTarget(bp)} style={{
                        padding:"10px 12px",borderRadius:10,cursor:"pointer",
                        border:"1px solid "+(selected?A:BD),
                        background: selected ? A+"18" : CARD2,
                        transition:"all 0.15s",
                      }}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:700,color:selected?A:TXT}}>{bp}</span>
                          {selected && <Icon name="check-circle" size={14} color={A} />}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:7,height:7,borderRadius:"50%",background:rc,flexShrink:0}}/>
                          <span style={{fontSize:11,color:rc,letterSpacing:"0.08em"}}>
                            {restLabel(h?.daysAgo)}
                          </span>
                        </div>
                        {h?.date && (
                          <div style={{fontSize:10,color:T3,marginTop:2}}>
                            Last: {fmtS(h.date)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommended banner */}
              {planTargets.length === 0 && (
                <div style={{background:A+"0f",border:`1px solid ${A}22`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
                  <div style={{fontSize:11,color:A,letterSpacing:"0.04em",marginBottom:6}}>RECOMMENDED TODAY</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {sorted.filter(bp => (history[bp]?.daysAgo ?? 999) >= 2).slice(0,4).map(bp => (
                      <button key={bp} onClick={() => toggleTarget(bp)} style={{
                        ...ghostBtn(A,{border:`1px solid ${A}44`,background:A+"12",fontSize:10,padding:"5px 12px"})
                      }}>{bp}</button>
                    ))}
                  </div>
                  <div style={{fontSize:10,color:T3,marginTop:8}}>Based on recovery time — tap to select</div>
                </div>
              )}

              {/* Duration picker + Generate button */}
              {planTargets.length > 0 && (
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:13,color:TXT,marginBottom:10}}>How long do you have?</div>
                  <div style={{display:"flex",gap:6,marginBottom:8}}>
                    {[15,30,45,60,75,90].map(mins=>(
                      <button key={mins} onClick={()=>{setPlanDuration(mins);setPlanResult(null);setEditingPlan(null);}} style={{
                        flex:1,fontFamily:FF_HEAD,fontWeight:700,fontSize:12,
                        background:planDuration===mins?A:S3,
                        color:planDuration===mins?BG:T2,
                        border:"1px solid "+(planDuration===mins?A:BD2),
                        borderRadius:10,padding:"10px 4px",cursor:"pointer",
                        transition:"all 0.15s"
                      }}>{mins}m</button>
                    ))}
                  </div>
                  <div style={{fontFamily:FF_BODY,fontSize:11,color:T3,marginBottom:14}}>
                    ~{exBudget(planDuration)} exercise{exBudget(planDuration)!==1?"s":""} · primaries picked first
                  </div>
                  <button onClick={()=>{setPlanResult(generatePlan(planTargets,planDuration));setEditingPlan(null);}} style={{
                    ...btn(A,BG),width:"100%",padding:"13px",fontSize:13,borderRadius:14
                  }}>
                    Generate {planDuration}min Plan
                  </button>
                </div>
              )}

              {/* Generated plan */}
              {planResult && (() => {
                // Use editingPlan if editing, else planResult
                const activePlan = editingPlan || planResult;
                return (
                <div>
                  {/* Summary + actions */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
                    <div>
                      <div style={{fontFamily:FF_HEAD,fontSize:15,fontWeight:800,color:TXT}}>{planTargets.join(" + ")} Day</div>
                      <div style={{fontFamily:FF_BODY,fontSize:12,color:T2,marginTop:2}}>
                        {activePlan.reduce((a,s)=>a+s.exercises.length,0)} exercises · {activePlan.reduce((a,s)=>a+s.exercises.reduce((b,e)=>b+e.sets,0),0)} sets
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setEditingPlan(activePlan.map(s=>({...s,exercises:[...s.exercises]})))} style={ghostBtn(T2,{fontSize:11,padding:"7px 12px",borderRadius:10})}>
                        <Icon name="edit" size={13} color={T2} style={{marginRight:5}} />Edit
                      </button>
                      <button onClick={() => {
                        const tpl = {
                          id: uid(), name: planTargets.join(" + ") + " Day", tag: "Planner",
                          exercises: activePlan.flatMap(s => s.exercises.map(e => ({
                            id: uid(), name: e.name, targetSets: e.sets, targetReps: e.reps, notes: ""
                          })))
                        };
                        startTemplateWorkout(tpl);
                        setView("log");
                      }} style={btn(A,BG,{fontSize:11,padding:"8px 16px",borderRadius:10})}>
                        <Icon name="play" size={14} color={BG} style={{marginRight:6}} />Start
                      </button>
                    </div>
                  </div>

                  {/* Inline editor */}
                  {editingPlan && (
                    <div style={{background:A+"0f",border:"1px solid "+A+"22",borderRadius:14,padding:"14px",marginBottom:16}}>
                      <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:13,color:A,marginBottom:12}}>Edit Plan</div>
                      {editingPlan.map((section,si)=>(
                        <div key={section.bodyPart} style={{marginBottom:14}}>
                          <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:11,color:T2,marginBottom:8,textTransform:"uppercase"}}>{section.bodyPart}</div>
                          {section.exercises.map((ex,ei)=>(
                            <div key={ex.name+ei} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                              <div style={{flex:1,fontFamily:FF_BODY,fontSize:13,color:TXT,background:S3,borderRadius:8,padding:"8px 12px"}}>{ex.name}</div>
                              <ExercisePicker
                                value={ex.name}
                                onChange={newName=>{
                                  const np = editingPlan.map((s,sj)=> sj!==si ? s : {
                                    ...s, exercises: s.exercises.map((e,ej)=> ej!==ei ? e : {...e,name:newName})
                                  });
                                  setEditingPlan(np);
                                }}
                                extraOptions={allExercises}
                                style={{width:140}}
                              />
                              <button onClick={()=>{
                                const np = editingPlan.map((s,sj)=> sj!==si ? s : {
                                  ...s, exercises: s.exercises.filter((_,ej)=>ej!==ei)
                                }).filter(s=>s.exercises.length>0);
                                setEditingPlan(np);
                              }} style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",fontSize:18,padding:"4px 8px"}}><Icon name="close" size={12} color="currentColor" /></button>
                            </div>
                          ))}
                        </div>
                      ))}
                      {/* Add new exercise to plan */}
                      <AddExToPlan
                        planTargets={planTargets}
                        allExercises={allExercises}
                        editingPlan={editingPlan}
                        setEditingPlan={setEditingPlan}
                      />
                      <div style={{display:"flex",gap:8,marginTop:8}}>
                        <button onClick={()=>setEditingPlan(null)} style={{...ghostBtn(T2),flex:1,borderRadius:10}}>Cancel</button>
                        <button onClick={()=>{setPlanResult(editingPlan);setEditingPlan(null);}} style={{...btn(A,BG),flex:2,borderRadius:10,padding:"10px"}}>Save Changes</button>
                      </div>
                    </div>
                  )}

                  {activePlan.map(section => (
                    <div key={section.bodyPart} style={{marginBottom:20}}>
                      {/* Section header */}
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <div style={{fontSize:10,fontWeight:900,color:A,letterSpacing:"0.04em"}}>{section.bodyPart.toUpperCase()}</div>
                        <div style={{flex:1,height:1,background:BD}}/>
                        {(() => {
                          const h = history[section.bodyPart];
                          return h ? (
                            <div style={{fontSize:10,color:T2}}>last trained {fmtS(h.date)}</div>
                          ) : (
                            <div style={{fontSize:11,color:A2}}>first session</div>
                          );
                        })()}
                      </div>

                      {section.exercises.map((ex, i) => {
                        const hasPrev = !!ex.last;
                        const lastMaxW = hasPrev ? Math.max(...ex.last.sets.map(s=>parseFloat(s.weight)||0)) : null;
                        const lastReps = hasPrev ? ex.last.sets.map(s=>s.reps).join("/") : null;
                        const openModal = () => setExModal({
                          name: ex.name,
                          tier: ex.tier,
                          suggested: ex.suggested,
                          history: getFullExHistory(ex.name),
                        });
                        return (
                          <div key={ex.name} onClick={openModal} style={{
                            background:S2,border:`1px solid ${BD}`,borderRadius:18,
                            padding:"12px 14px",marginBottom:8,
                            borderLeft:`3px solid ${tierColor(ex.tier)}`,
                            cursor:"pointer",transition:"border-color 0.15s, background 0.15s",
                          }}
                          onMouseEnter={e=>{e.currentTarget.style.background=CARD2;e.currentTarget.style.borderColor=A+"55";}}
                          onMouseLeave={e=>{e.currentTarget.style.background=CARD;e.currentTarget.style.borderColor=BD;}}
                          >
                            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                              {/* Left: exercise info */}
                              <div style={{flex:1}}>
                                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                                  <span style={{fontSize:12,fontWeight:700}}>{ex.name}</span>
                                  <span style={{fontSize:10,color:tierColor(ex.tier),background:tierColor(ex.tier)+"18",
                                    border:`1px solid ${tierColor(ex.tier)}33`,borderRadius:8,padding:"1px 6px",
                                    letterSpacing:"0.04em"}}>{tierLabel(ex.tier)}</span>
                                  <span style={{fontSize:10,color:T3,marginLeft:"auto"}}>tap for details ›</span>
                                </div>
                                <div style={{fontSize:10,color:T2}}>
                                  {ex.sets} sets × {ex.reps} reps
                                </div>
                                {/* Last session */}
                                {hasPrev ? (
                                  <div style={{marginTop:6,fontSize:10,color:T2}}>
                                    <span style={{color:T2}}>Last ({fmtS(ex.last.date)}): </span>
                                    {ex.last.sets.map((s,j)=>(
                                      <span key={j} style={{marginRight:6}}>
                                        <span style={{color:T2}}>{s.weight}lb×{s.reps}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{marginTop:6,fontSize:10,color:T3,fontStyle:"italic"}}>
                                    No history — start light and build
                                  </div>
                                )}
                              </div>
                              {/* Right: weight recommendation */}
                              <div style={{textAlign:"right",flexShrink:0}}>
                                {ex.suggested ? (
                                  <>
                                    <div style={{fontSize:10,color:T2,letterSpacing:"0.04em",marginBottom:2}}>TARGET</div>
                                    <div style={{fontSize:22,fontWeight:800,fontFamily:FF_HEAD,letterSpacing:"-0.02em",color:A2}}>
                                      {ex.suggested}
                                      <span style={{fontSize:10,color:T2,marginLeft:2}}>lb</span>
                                    </div>
                                    {lastMaxW && (
                                      <div style={{fontSize:11,color:A+"aa",marginTop:1}}>
                                        +{(ex.suggested-lastMaxW).toFixed(1)} from last
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div style={{fontSize:10,color:T3,textAlign:"right"}}>
                                    FIRST<br/>SESSION
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Start workout CTA at bottom */}
                  <button onClick={() => {
                    const tpl = {
                      id: uid(),
                      name: planTargets.join(" + ") + " Day",
                      tag: "Planner",
                      exercises: planResult.flatMap(s => s.exercises.map(e => ({
                        id: uid(), name: e.name,
                        targetSets: e.sets, targetReps: e.reps, notes: ""
                      })))
                    };
                    startTemplateWorkout(tpl);
                    setView("log");
                  }} style={btn(A,BG,{width:"100%",padding:"13px",fontSize:11,marginTop:4,letterSpacing:"0.04em"})}>
                    START WORKOUT →
                  </button>
                </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ═══════════════════ DASHBOARD ═══════════════════ */}
        {view==="dashboard" && (
          <div>
            <div style={{fontSize:10,color:T3,letterSpacing:"0.04em",marginBottom:18}}>
              {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).toUpperCase()}
            </div>
            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              {[
                {label:"Sessions",val:totalWorkouts,color:A,icon:"dumbbell"},
                {label:"Volume",val:Math.round(totalVolume/1000)+"k lbs",color:A2,icon:"weight"},
                {label:"Streak",val:streak+"d",color:A3,icon:"flame"},
              ].map(({label,val,color,icon})=>(
                <div key={label} className="card su" style={{padding:"14px 12px",background:`linear-gradient(145deg,${S2},${S3})`,border:`1px solid ${color}22`}}>
                  <Icon name={icon} size={22} color={color} style={{marginBottom:8}} />
                  <div style={{fontSize:22,fontWeight:800,color,fontFamily:FF_HEAD,letterSpacing:"-0.02em",lineHeight:1}}>{val}</div>
                  <div style={{fontSize:11,color:T3,marginTop:5,fontFamily:FF_BODY}}>{label}</div>
                </div>
              ))}
            </div>
            {/* Weekly volume */}
            <div className="card" style={{padding:"16px",marginBottom:12}}>
              <div style={{fontSize:12,color:T2,fontWeight:600,marginBottom:14,fontFamily:FF_BODY}}>Weekly Volume</div>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={weeklyVol} barCategoryGap="30%">
                  <XAxis dataKey="week" tick={{fill:T3,fontSize:11,fontFamily:FF_BODY}} axisLine={false} tickLine={false}/>
                  <YAxis hide/><Tooltip content={<ChartTip/>}/>
                  <Bar dataKey="vol" name="Volume" fill={A} radius={[2,2,0,0]} opacity={0.85}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* PRs */}
            {(() => {
              const RANGES = [7,30,60,90,180,365];
              return (
                <div style={{background:S2,border:`1px solid ${BD}`,borderRadius:18,padding:"14px 12px",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
                    <div style={{fontSize:10,color:T2,letterSpacing:"0.04em"}}>WEIGHT PRs</div>
                    <div style={{display:"flex",gap:3}}>
                      {RANGES.map(d=>(
                        <button key={d} onClick={()=>setPrDays(d)} style={{
                          background:prDays===d?A:"none",
                          border:"1px solid "+(prDays===d?A:BD),
                          color:prDays===d?BG:T2,
                          cursor:"pointer",fontFamily:FF_BODY,fontWeight:prDays===d?700:400,
                          fontSize:11,padding:"3px 7px",borderRadius:8,letterSpacing:"0.08em"
                        }}>{d}D</button>
                      ))}
                    </div>
                  </div>
                  {prs.length===0 ? (
                    <div style={{color:T3,fontSize:10}}>No data in this window.</div>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {prs.map(([ex,{weight,date,prevWeight,change,pct}])=>(
                        <div key={ex} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                          borderLeft:`2px solid ${A}`,paddingLeft:10,gap:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:11,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ex}</div>
                            <div style={{fontSize:10,color:T2,marginTop:1}}>{fmtS(date)}{prevWeight!==null?` · was ${prevWeight}lb`:""}</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                            {pct!==null && (
                              <span style={{
                                fontSize:10,fontWeight:700,
                                color:pct>=0?A:A3,
                                background:(pct>=0?A:A3)+"18",
                                border:"1px solid "+((pct>=0?A:A3))+"33",
                                borderRadius:8,padding:"2px 6px"
                              }}>{pct>=0?"+":""}{pct}%</span>
                            )}
                            <div style={{fontSize:16,fontWeight:900,color:A,textAlign:"right"}}>
                              {weight}<span style={{fontSize:10,color:T2,marginLeft:2}}>lb</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Radar */}
            {muscleRadar.length>0 && (
              <div style={{background:S2,border:`1px solid ${BD}`,borderRadius:18,padding:"14px 12px"}}>
                <div style={{fontSize:10,color:T2,letterSpacing:"0.04em",marginBottom:4}}>MUSCLE BALANCE</div>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={muscleRadar}>
                    <PolarGrid stroke="#1e1e1e"/>
                    <PolarAngleAxis dataKey="muscle" tick={{fill:T2,fontSize:11,fontFamily:FF_BODY}}/>
                    <Radar dataKey="count" stroke={A2} fill={A2} fillOpacity={0.15}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Quick start */}
            {templates.length>0 && (
              <div style={{marginTop:16}}>
                <div style={{fontSize:13,color:TXT,fontWeight:600,marginBottom:14,fontFamily:FF_HEAD}}>Quick Start</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {templates.slice(0,4).map(t=>(
                    <button key={t.id} onClick={()=>{setView("log");startTemplateWorkout(t);}} style={btn(A+"22",A,{border:"1px solid "+A+"44",padding:"8px 14px"})}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Strength Standards */}
            {(() => {
              const bw = measurements.length ? parseFloat(measurements[measurements.length-1]?.bodyWeight) : null;
              const lifts = Object.keys(STRENGTH_STANDARDS).filter(ex => {
                return Object.keys(logs).some(d => logs[d].some(e => e.exercise === ex));
              });
              if (!lifts.length) return null;
              return (
                <div style={{marginTop:12,background:S2,border:"1px solid "+BD,borderRadius:18,padding:"16px"}}>
                  <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:13,color:TXT,marginBottom:4}}>Strength Standards</div>
                  <div style={{fontFamily:FF_BODY,fontSize:11,color:T3,marginBottom:14}}>{bw ? "Based on "+bw+"lb bodyweight" : "Add body weight in Body tab for personalized standards"}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {lifts.slice(0,6).map(ex => {
                      const best = Math.max(...Object.keys(logs).flatMap(d=>logs[d].filter(e=>e.exercise===ex).flatMap(e=>e.sets.map(s=>parseFloat(s.weight)||0))));
                      const std = getStrengthLevel(ex, best, bw||180);
                      if (!std) return null;
                      return (
                        <div key={ex}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                            <span style={{fontFamily:FF_BODY,fontSize:12,color:TXT}}>{ex}</span>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontFamily:FF_MONO,fontSize:12,color:T2}}>{best}lb</span>
                              <span style={{fontFamily:FF_HEAD,fontSize:10,fontWeight:700,color:std.color,background:std.color+"18",padding:"2px 8px",borderRadius:99}}>{std.label}</span>
                            </div>
                          </div>
                          <div style={{height:4,background:S3,borderRadius:99,overflow:"hidden"}}>
                            <div style={{height:"100%",width:std.pct+"%",background:std.color,borderRadius:99,transition:"width 0.6s ease"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {/* Weekly Volume PRs */}
            {(() => {
              const RANGES = [7,30,60,90,180,365];
              return (
                <div style={{marginTop:12,background:S2,border:`1px solid ${BD}`,borderRadius:18,padding:"14px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
                    <div style={{fontSize:10,color:T2,letterSpacing:"0.04em"}}>VOLUME PRs</div>
                    <div style={{display:"flex",gap:3}}>
                      {RANGES.map(d=>(
                        <button key={d} onClick={()=>setVolDays(d)} style={{
                          background:volDays===d?A3:"none",
                          border:"1px solid "+(volDays===d?A3:BD),
                          color:volDays===d?BG:T2,
                          cursor:"pointer",fontFamily:FF_BODY,fontWeight:volDays===d?700:400,
                          fontSize:11,padding:"3px 7px",borderRadius:8,letterSpacing:"0.08em"
                        }}>{d}D</button>
                      ))}
                    </div>
                  </div>
                  {weeklyVolPRs.length===0 ? (
                    <div style={{color:T3,fontSize:10}}>No data in this window.</div>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {weeklyVolPRs.map((pr,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                          padding:"7px 10px",background:A3+"0e",borderLeft:`2px solid ${A3}`,borderRadius:8,gap:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:11,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{pr.exercise}</div>
                            <div style={{fontSize:10,color:T2,marginTop:1}}>
                              week of {fmtS(pr.week)}
                              {pr.bestPrev!==null?` · was ${pr.bestPrev.toLocaleString()} lbs`:""}
                            </div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                            {pr.pct!==null && (
                              <span style={{
                                fontSize:10,fontWeight:700,
                                color:pr.pct>=0?A:A3,
                                background:(pr.pct>=0?A:A3)+"18",
                                border:"1px solid "+((pr.pct>=0?A:A3))+"33",
                                borderRadius:8,padding:"2px 6px"
                              }}>{pr.pct>=0?"+":""}{pr.pct}%</span>
                            )}
                            <span style={{fontSize:13,fontWeight:900,color:A3}}>{pr.volume.toLocaleString()}<span style={{fontSize:10,color:T2,marginLeft:2}}>lbs</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══════════════════ CHARTS ═══════════════════ */}
        {view==="charts" && (
          <div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:10,color:T2,letterSpacing:"0.04em",marginBottom:8}}>EXERCISE</label>
              <ExercisePicker value={chartEx} onChange={setChartEx} extraOptions={allExercises} style={{minWidth:240}} />
            </div>
            {progressSeries.length<2 ? (
              <div style={{color:T3,fontSize:11,letterSpacing:"0.04em",padding:"40px 0"}}>LOG MORE SESSIONS TO SEE CHARTS.</div>
            ) : (<>
              <div style={{background:S2,border:`1px solid ${BD}`,borderRadius:18,padding:"14px 12px",marginBottom:12}}>
                <div style={{fontSize:13,color:TXT,fontWeight:600,marginBottom:14,fontFamily:FF_HEAD}}>Max Weight (Lbs)</div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={progressSeries}>
                    <CartesianGrid stroke="#1a1a1a" vertical={false}/>
                    <XAxis dataKey="date" tick={{fill:T3,fontSize:11,fontFamily:FF_BODY}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:T3,fontSize:11,fontFamily:FF_BODY}} axisLine={false} tickLine={false} width={34}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Line type="monotone" dataKey="maxWeight" name="Max Weight" stroke={A} strokeWidth={2} dot={{fill:A,r:3}} activeDot={{r:5}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:S2,border:`1px solid ${BD}`,borderRadius:18,padding:"14px 12px",marginBottom:12}}>
                <div style={{fontSize:10,color:T2,letterSpacing:"0.04em",marginBottom:12}}>VOLUME (lbs × reps)</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={progressSeries} barCategoryGap="30%">
                    <CartesianGrid stroke="#1a1a1a" vertical={false}/>
                    <XAxis dataKey="date" tick={{fill:T3,fontSize:11,fontFamily:FF_BODY}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:T3,fontSize:11,fontFamily:FF_BODY}} axisLine={false} tickLine={false} width={44}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Bar dataKey="volume" name="Volume" fill={A2} radius={[2,2,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {[
                  {label:"BEST",val:`${Math.max(...progressSeries.map(d=>d.maxWeight))} lbs`,color:A},
                  {label:"SESSIONS",val:progressSeries.length,color:A2},
                  {label:"TREND",val:progressSeries.at(-1)?.maxWeight>=progressSeries[0]?.maxWeight?"↑ UP":"↓ DOWN",
                   color:progressSeries.at(-1)?.maxWeight>=progressSeries[0]?.maxWeight?A:A3},
                ].map(({label,val,color})=>(
                  <div key={label} style={{background:S2,border:`1px solid ${BD}`,borderRadius:18,padding:"12px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:T2,letterSpacing:"0.04em",marginBottom:6}}>{label}</div>
                    <div style={{fontSize:13,fontWeight:900,color}}>{val}</div>
                  </div>
                ))}
              </div>
              {/* 1RM Chart */}
              {progressSeries.some(d=>d.est1RM) && (
                <div style={{background:S2,border:`1px solid ${BD}`,borderRadius:18,padding:"14px 12px",marginTop:12}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}>
                    <div style={{fontSize:10,color:T2,letterSpacing:"0.04em"}}>ESTIMATED 1RM (EPLEY)</div>
                    <div style={{fontSize:10,color:T3}}>w × (1 + reps/30)</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{fontSize:10,color:T2}}>PEAK ESTIMATE</div>
                    <div style={{fontSize:22,fontWeight:800,fontFamily:FF_HEAD,letterSpacing:"-0.02em",color:A2}}>
                      {Math.max(...progressSeries.map(d=>d.est1RM||0))}
                      <span style={{fontSize:10,color:T2,marginLeft:4}}>lbs</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={progressSeries}>
                      <CartesianGrid stroke="#1a1a1a" vertical={false}/>
                      <XAxis dataKey="date" tick={{fill:T3,fontSize:11,fontFamily:FF_BODY}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:T3,fontSize:11,fontFamily:FF_BODY}} axisLine={false} tickLine={false} width={34}/>
                      <Tooltip content={<ChartTip/>}/>
                      <Line type="monotone" dataKey="est1RM" name="Est. 1RM" stroke={A2} strokeWidth={2}
                        dot={{fill:A2,r:3}} activeDot={{r:5}} connectNulls/>
                      <Line type="monotone" dataKey="maxWeight" name="Max Weight" stroke={A} strokeWidth={1}
                        strokeDasharray="4 3" dot={false} connectNulls/>
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{display:"flex",gap:14,marginTop:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:14,height:2,background:A2}}/>
                      <span style={{fontSize:10,color:T2}}>Est. 1RM</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:14,height:2,background:A,borderTop:"2px dashed "+A}}/>
                      <span style={{fontSize:10,color:T2}}>Max Weight</span>
                    </div>
                  </div>
                </div>
              )}
            </>)}
          </div>
        )}

        {/* ═══════════════════ HEATMAP ═══════════════════ */}
        {view==="heatmap" && (() => {
          const now = new Date();
          // Build 52 weeks of days ending today
          const end = new Date(now); end.setHours(0,0,0,0);
          const start = new Date(end); start.setDate(end.getDate() - 364);
          // Align start to Sunday
          start.setDate(start.getDate() - start.getDay());
          const weeks = [];
          let cur = new Date(start);
          while (cur <= end) {
            const week = [];
            for (let i = 0; i < 7; i++) {
              const key = toISO(cur);
              const count = logs[key]?.length || 0;
              week.push({date:key, count, isFuture: cur > end});
              cur = new Date(cur); cur.setDate(cur.getDate()+1);
            }
            weeks.push(week);
          }
          const months = [];
          weeks.forEach((wk,wi)=>{
            const firstReal = wk.find(d=>!d.isFuture);
            if(!firstReal) return;
            const d = parseD(firstReal.date);
            if(d.getDate()<=7) months.push({label:d.toLocaleDateString("en-US",{month:"short"}),col:wi});
          });
          const cellSize = 13, gap = 2;
          const dayLabels = ["","M","","W","","F",""];
          const maxCount = Math.max(1,...Object.values(logs).map(e=>e.length));
          const intensityColor = (count) => {
            if(!count) return "#1a1a1a";
            const t = Math.min(count/Math.max(maxCount,4), 1);
            if(t<0.25) return A+"44";
            if(t<0.5)  return A+"77";
            if(t<0.75) return A+"aa";
            return A;
          };
          // Stats
          const totalDays = Object.keys(logs).length;
          const last30 = Object.keys(logs).filter(d=>d>=toISO(new Date(Date.now()-30*864e5))).length;
          return (
            <div>
              <div style={{fontSize:10,color:T2,letterSpacing:"0.04em",marginBottom:20}}>WORKOUT FREQUENCY — LAST 52 WEEKS</div>
              {/* Stats row */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
                {[
                  {label:"TOTAL DAYS",val:totalDays,color:A},
                  {label:"LAST 30 DAYS",val:last30,color:A2},
                  {label:"STREAK",val:streak+" days",color:A3},
                ].map(({label,val,color})=>(
                  <div key={label} style={{background:S2,border:`1px solid ${BD}`,borderRadius:18,padding:"12px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:T3,letterSpacing:"0.13em",marginBottom:5}}>{label}</div>
                    <div style={{fontSize:18,fontWeight:900,color}}>{val}</div>
                  </div>
                ))}
              </div>
              {/* Grid */}
              <div style={{background:S2,border:`1px solid ${BD}`,borderRadius:18,padding:"16px 14px",overflowX:"auto"}}>
                <div style={{display:"flex",gap:gap,marginBottom:4,marginLeft:18}}>
                  {months.map(({label,col})=>(
                    <div key={col} style={{fontSize:10,color:T2,minWidth:(cellSize+gap)*(col)+cellSize,
                      whiteSpace:"nowrap",letterSpacing:"0.06em"}}>{label}</div>
                  ))}
                </div>
                <div style={{display:"flex",gap:gap}}>
                  {/* Day labels */}
                  <div style={{display:"flex",flexDirection:"column",gap:gap,marginRight:2}}>
                    {dayLabels.map((l,i)=>(
                      <div key={i} style={{height:cellSize,fontSize:10,color:T3,display:"flex",alignItems:"center"}}>{l}</div>
                    ))}
                  </div>
                  {/* Week columns */}
                  {weeks.map((wk,wi)=>(
                    <div key={wi} style={{display:"flex",flexDirection:"column",gap:gap}}>
                      {wk.map((day,di)=>(
                        <div key={di} title={day.isFuture?"":day.count?(day.date+": "+day.count+" exercise"+(day.count!==1?"s":"")):(day.date+": rest")}
                          onClick={()=>{if(!day.isFuture&&day.count){setCalSel(day.date);setView("calendar");}}}
                          style={{
                            width:cellSize,height:cellSize,borderRadius:8,
                            background:day.isFuture?"transparent":intensityColor(day.count),
                            cursor:(!day.isFuture&&day.count)?"pointer":"default",
                            transition:"transform 0.1s",
                          }}
                          onMouseEnter={e=>{if(!day.isFuture&&day.count) e.currentTarget.style.transform="scale(1.3)";}}
                          onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                {/* Legend */}
                <div style={{display:"flex",alignItems:"center",gap:4,marginTop:12,justifyContent:"flex-end"}}>
                  <span style={{fontSize:10,color:T3,marginRight:4}}>LESS</span>
                  {["#1a1a1a",A+"44",A+"77",A+"aa",A].map((c,i)=>(
                    <div key={i} style={{width:cellSize,height:cellSize,borderRadius:8,background:c}}/>
                  ))}
                  <span style={{fontSize:10,color:T3,marginLeft:4}}>MORE</span>
                </div>
              </div>
              {/* Monthly breakdown bar chart */}
              {(() => {
                const monthCounts = {};
                Object.keys(logs).forEach(d=>{
                  const key = d.slice(0,7);
                  monthCounts[key]=(monthCounts[key]||0)+1;
                });
                const data = Object.entries(monthCounts).sort(([a],[b])=>a.localeCompare(b)).slice(-12)
                  .map(([m,count])=>({month:new Date(m+"-15").toLocaleDateString("en-US",{month:"short"}),count}));
                return (
                  <div style={{background:S2,border:`1px solid ${BD}`,borderRadius:18,padding:"14px 12px",marginTop:12}}>
                    <div style={{fontSize:13,color:TXT,fontWeight:600,marginBottom:14,fontFamily:FF_HEAD}}>Sessions Per Month</div>
                    <ResponsiveContainer width="100%" height={100}>
                      <BarChart data={data} barCategoryGap="25%">
                        <XAxis dataKey="month" tick={{fill:T3,fontSize:11,fontFamily:FF_BODY}} axisLine={false} tickLine={false}/>
                        <YAxis hide/>
                        <Tooltip content={<ChartTip/>}/>
                        <Bar dataKey="count" name="Sessions" fill={A2} radius={[2,2,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ═══════════════════ CALENDAR ═══════════════════ */}
        {view==="calendar" && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <button onClick={()=>setCalMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()-1);return n;})} style={ghostBtn(T2,{padding:"6px 14px",borderRadius:8})}>‹</button>
              <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:13,color:TXT}}>{fmtMon(calMonth).toUpperCase()}</div>
              <button onClick={()=>setCalMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()+1);return n;})} style={ghostBtn(T2,{padding:"6px 14px",borderRadius:8})}>›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
              {["S","M","T","W","T","F","S"].map((d,i)=>(
                <div key={i} style={{textAlign:"center",fontFamily:FF_BODY,fontSize:10,color:T3,padding:"3px 0"}}>{d}</div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:16}}>
              {calDays.map((day,i)=>{
                if(!day) return <div key={i}/>;
                const has=!!logs[day], isToday=day===today, isSel=day===calSel;
                const exCount=logs[day]?.length||0;
                const opacity = ["","22","44","88","ff"];
                const intensity = has ? A+(opacity[Math.min(exCount,4)]) : S2;
                return (
                  <div key={day} onClick={()=>setCalSel(isSel?null:day)} style={{
                    aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",
                    justifyContent:"center",borderRadius:8,cursor:has?"pointer":"default",
                    background:isSel?A:intensity,
                    border:"1px solid "+(isToday?A:BD),transition:"all 0.12s",position:"relative"
                  }}>
                    <span style={{fontFamily:FF_BODY,fontSize:11,fontWeight:isToday?700:400,color:isSel?"#060608":isToday?A:T2}}>
                      {parseInt(day.split("-")[2])}
                    </span>
                  </div>
                );
              })}
            </div>
            {calSel && logs[calSel] && (
              <div style={{background:S2,border:"1px solid "+BD,borderRadius:16,padding:"16px"}}>
                <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:13,color:A,marginBottom:12}}>
                  {fmtLong(calSel).toUpperCase()}
                </div>
                {logs[calSel].map((entry,i)=>(
                  <div key={i} style={{marginBottom:10,paddingLeft:10,borderLeft:"2px solid "+A}}>
                    <div style={{fontFamily:FF_HEAD,fontSize:12,fontWeight:700,marginBottom:5}}>{entry.exercise}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {entry.sets.map((s,j)=>(
                        <span key={j} style={{fontFamily:FF_MONO,fontSize:11,color:T2,background:S3,padding:"2px 8px",borderRadius:6}}>
                          {s.weight}×{s.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {calSel && !logs[calSel] && (
              <div style={{color:T3,fontSize:12,textAlign:"center",padding:"20px 0"}}>Rest day</div>
            )}
          </div>
        )}

        {/* ═══════════════════ BUILDER ═══════════════════ */}
        {view==="builder" && !editingTpl && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:15,color:TXT}}>Templates</div>
              <button onClick={newTemplate} style={btn(A,BG,{fontSize:12,padding:"9px 16px",borderRadius:10})}>+ New</button>
            </div>
            {templates.length===0 && (
              <div style={{color:T3,fontSize:13,padding:"40px 0",textAlign:"center"}}>No templates yet — create your first one.</div>
            )}
            {templates.map(tpl=>{
              const last=lastDone(tpl.id), count=timesLogged(tpl.id);
              const tplSessions=getTemplateSessions(tpl);
              const lastData=getLastSessionData(tpl);
              return (
                <div key={tpl.id} className="card" style={{marginBottom:12,overflow:"hidden"}}>
                  <div style={{padding:"14px",borderBottom:"1px solid "+BD}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                      <div>
                        <div style={{fontFamily:FF_HEAD,fontSize:15,fontWeight:800,color:TXT,marginBottom:6}}>{tpl.name}</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                          {tpl.tag && <span style={{fontFamily:FF_BODY,fontSize:10,color:A,background:A+"18",border:"1px solid "+A+"33",borderRadius:99,padding:"2px 8px"}}>{tpl.tag}</span>}
                          <span style={{fontFamily:FF_BODY,fontSize:11,color:T3}}>{tpl.exercises.length} exercises</span>
                          {tpl.duration && <span style={{fontFamily:FF_BODY,fontSize:11,color:T3}}>· {tpl.duration}min</span>}
                          {count>0 && <span style={{fontFamily:FF_BODY,fontSize:11,color:T3}}>{count}× done</span>}
                          {last && <span style={{fontFamily:FF_BODY,fontSize:11,color:T3}}>Last: {fmtS(last)}</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <button onClick={()=>editTemplate(tpl)} style={ghostBtn(T2,{padding:"6px 10px",fontSize:11,borderRadius:8})}><Icon name="edit" size={13} color={T2} /></button>
                        <button onClick={()=>{startTemplateWorkout(tpl);setView("log");}} style={btn(A,BG,{padding:"6px 14px",fontSize:11,borderRadius:8})}><Icon name="play" size={13} color={BG} /></button>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:"10px 14px"}}>
                    {tpl.exercises.map((ex,i)=>{
                      const last=lastData[ex.name];
                      const maxW=last?Math.max(...last.sets.map(s=>parseFloat(s.weight)||0)):null;
                      return (
                        <div key={ex.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                          padding:"6px 0",borderBottom:i<tpl.exercises.length-1?"1px solid "+BD:"none"}}>
                          <div>
                            <span style={{fontFamily:FF_BODY,fontSize:12,fontWeight:600,color:TXT}}>{ex.name}</span>
                            <span style={{fontFamily:FF_BODY,fontSize:11,color:T3,marginLeft:10}}>{ex.targetSets}×{ex.targetReps}</span>
                          </div>
                          {maxW!==null && <div style={{fontFamily:FF_MONO,fontSize:12,color:A,fontWeight:700}}>{maxW}lb</div>}
                        </div>
                      );
                    })}
                  </div>
                  {tplSessions.length>=2 && (
                    <div style={{padding:"0 14px 14px"}}>
                      <ResponsiveContainer width="100%" height={60}>
                        <BarChart data={tplSessions} barCategoryGap="30%">
                          <XAxis dataKey="date" tick={{fill:T3,fontSize:9,fontFamily:FF_BODY}} axisLine={false} tickLine={false}/>
                          <YAxis hide/>
                          <Tooltip content={<ChartTip/>}/>
                          <Bar dataKey="volume" name="Volume" fill={A2} radius={[2,2,0,0]} opacity={0.7}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div style={{padding:"0 14px 10px",display:"flex",justifyContent:"flex-end"}}>
                    <button onClick={()=>deleteTpl(tpl.id)} style={ghostBtn("#ef4444",{fontSize:11,padding:"4px 10px",borderRadius:8})}><Icon name="trash" size={12} color="#ef4444" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Template Editor ── */}
        {view==="builder" && editingTpl && (
          <div style={{maxWidth:500}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <button onClick={()=>setEditingTpl(null)} style={ghostBtn(T2,{padding:"6px 12px",borderRadius:8})}>← Back</button>
              <div style={{fontFamily:FF_HEAD,fontSize:14,fontWeight:800,color:TXT}}>
                {editingTpl==="new"?"New Template":"Edit Template"}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontFamily:FF_BODY,fontSize:12,color:T2,marginBottom:8}}>Workout Name</label>
              <input value={tplName} onChange={e=>setTplName(e.target.value)} placeholder="e.g. Push Day" style={inputStyle}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontFamily:FF_BODY,fontSize:12,color:T2,marginBottom:8}}>Tag (optional)</label>
              <input value={tplTag} onChange={e=>setTplTag(e.target.value)} placeholder="e.g. PPL, Strength, Hypertrophy" style={inputStyle}/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontFamily:FF_BODY,fontSize:12,color:T2,marginBottom:8}}>How long do you want to work out?</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[15,30,45,60,75,90].map(mins=>(
                  <button key={mins} onClick={()=>setTplDuration(mins)} style={{
                    flex:1,background:tplDuration===mins?A:S3,
                    border:"1px solid "+(tplDuration===mins?A:BD2),
                    borderRadius:10,padding:"10px 4px",
                    fontFamily:FF_HEAD,fontWeight:700,fontSize:13,
                    color:tplDuration===mins?BG:T2,cursor:"pointer",minWidth:48
                  }}>{mins}m</button>
                ))}
              </div>
              <div style={{fontFamily:FF_BODY,fontSize:11,color:T3,marginTop:8}}>
                {tplDuration<=15?"2 exercises (express)":tplDuration<=30?"4 exercises":tplDuration<=45?"6 exercises":tplDuration<=60?"8 exercises":tplDuration<=75?"10 exercises":"12 exercises"}
              </div>
            </div>
            <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:13,color:TXT,marginBottom:12}}>Exercises</div>
            {tplExercises.length===0 && (
              <div style={{color:T3,fontSize:12,marginBottom:12}}>No exercises added yet.</div>
            )}
            {tplExercises.map((ex,i)=>(
              <div key={ex.id} style={{background:S3,border:"1px solid "+BD2,borderRadius:12,padding:"12px",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontFamily:FF_BODY,fontSize:13,fontWeight:600,color:TXT}}>{ex.name}</div>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>moveTplEx(ex.id,-1)} disabled={i===0} style={ghostBtn(i===0?T3:T2,{padding:"3px 8px",fontSize:11,borderRadius:6})}><Icon name="up" size={13} color={T2} /></button>
                    <button onClick={()=>moveTplEx(ex.id,1)} disabled={i===tplExercises.length-1} style={ghostBtn(i===tplExercises.length-1?T3:T2,{padding:"3px 8px",fontSize:11,borderRadius:6})}><Icon name="down" size={13} color={T2} /></button>
                    <button onClick={()=>removeTplEx(ex.id)} style={ghostBtn(T2,{padding:"3px 8px",fontSize:11,borderRadius:6})}><Icon name="close" size={12} color="currentColor" /></button>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
                  <div>
                    <div style={{fontFamily:FF_BODY,fontSize:10,color:T3,marginBottom:4}}>Sets</div>
                    <input type="number" min="1" max="20" value={ex.targetSets}
                      onChange={e=>updateTplEx(ex.id,"targetSets",parseInt(e.target.value)||1)}
                      style={{...inputStyle,textAlign:"center"}}/>
                  </div>
                  <div>
                    <div style={{fontFamily:FF_BODY,fontSize:10,color:T3,marginBottom:4}}>Reps / Target</div>
                    <input value={ex.targetReps} onChange={e=>updateTplEx(ex.id,"targetReps",e.target.value)}
                      placeholder="8-12" style={inputStyle}/>
                  </div>
                </div>
                <div>
                  <div style={{fontFamily:FF_BODY,fontSize:10,color:T3,marginBottom:4}}>Notes</div>
                  <input value={ex.notes} onChange={e=>updateTplEx(ex.id,"notes",e.target.value)}
                    placeholder="e.g. pause at bottom…" style={inputStyle}/>
                </div>
              </div>
            ))}
            <div style={{background:S3,border:"1px dashed "+BD2,borderRadius:12,padding:"12px",marginBottom:16}}>
              <div style={{fontFamily:FF_BODY,fontSize:12,color:T2,marginBottom:8}}>Add exercise</div>
              <div style={{display:"flex",gap:8}}>
                <ExercisePicker value={addExName} onChange={setAddExName} extraOptions={allExercises} style={{flex:1}}/>
                <button onClick={addExToTpl} style={btn(A,BG,{flexShrink:0,padding:"11px 16px",borderRadius:10})}>Add</button>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setEditingTpl(null)} style={ghostBtn(T2,{flex:1,padding:"12px",borderRadius:12,textAlign:"center"})}>Cancel</button>
              <button onClick={saveTpl} disabled={!tplName.trim()||!tplExercises.length}
                style={btn(!tplName.trim()||!tplExercises.length?S3:A,!tplName.trim()||!tplExercises.length?T3:BG,{flex:2,padding:"12px",borderRadius:12})}>
                Save Template
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════ WORKOUT SUMMARY ═══════════════════ */}
        {view==="log" && logMode==="summary" && workoutSummary && (
          <div>
            <div style={{textAlign:"center",marginBottom:28}}>
              <Icon name="trophy" size={48} color={A} style={{marginBottom:12}} />
              <div style={{fontFamily:FF_HEAD,fontWeight:800,fontSize:24,color:TXT,marginBottom:4}}>Workout Complete!</div>
              <div style={{fontFamily:FF_BODY,fontSize:13,color:T2}}>Great session</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              {[
                {label:"Total Time",val:Math.floor(workoutSummary.elapsedSecs/60)+"m "+((workoutSummary.elapsedSecs%60)+"s"),icon:"timer",color:A},
                {label:"Active Time",val:Math.floor((workoutSummary.elapsedSecs-workoutSummary.restSecs)/60)+"m",icon:"muscle",color:A2},
                {label:"Rest Time",val:Math.floor(workoutSummary.restSecs/60)+"m "+((workoutSummary.restSecs%60)+"s"),icon:"rest",color:A3},
                {label:"Volume",val:workoutSummary.totalVolume.toLocaleString()+"lb",icon:"weight",color:A4},
              ].map(({label,val,icon,color})=>(
                <div key={label} style={{background:S2,border:"1px solid "+color+"22",borderRadius:16,padding:"16px",textAlign:"center"}}>
                  <Icon name={icon} size={24} color={color} style={{marginBottom:8}} />
                  <div style={{fontFamily:FF_HEAD,fontSize:20,fontWeight:800,color,letterSpacing:"-0.02em"}}>{val}</div>
                  <div style={{fontFamily:FF_BODY,fontSize:11,color:T3,marginTop:4}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{background:S2,border:"1px solid "+BD,borderRadius:16,padding:"16px",marginBottom:16}}>
              <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:14,color:TXT,marginBottom:14}}>Exercises</div>
              {workoutSummary.entries.map((e,i)=>{
                const maxW = e.sets.length ? Math.max(...e.sets.map(s=>parseFloat(s.weight)||0)) : 0;
                const totalV = Math.round(vol(e.sets));
                const isPR = checkForPR(e.exercise, e.sets, logs);
                return (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<workoutSummary.entries.length-1?"1px solid "+BD:"none"}}>
                    <div>
                      <div style={{fontFamily:FF_BODY,fontSize:13,fontWeight:600,color:TXT,display:"flex",alignItems:"center",gap:6}}>
                        {e.exercise}
                        {isPR && <Icon name="trophy" size={14} color={A} />}
                      </div>
                      <div style={{fontFamily:FF_BODY,fontSize:11,color:T3,marginTop:2}}>{e.sets.length} sets · {totalV.toLocaleString()}lb</div>
                    </div>
                    <div style={{fontFamily:FF_MONO,fontSize:14,fontWeight:700,color:maxW>0?A:T3}}>{maxW>0?maxW+"lb":"—"}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={()=>{setLogMode("free");setWorkoutSummary(null);setActiveTemplate(null);}} style={{...btn(A,BG),width:"100%",padding:"14px",fontSize:14,borderRadius:14}}>
              Done
            </button>
          </div>
        )}

        {/* ═══════════════════ WORKOUT VIEW ═══════════════════ */}
        {view==="log" && logMode==="workout" && activeTemplate && (() => {
          const exercises = activeTemplate.exercises;
          const ex = exercises[workoutExIdx];
          if (!ex) return null;
          const exSets = sessionSets[ex.id] || [];
          const lastW = getLastWeights(ex.name);
          const suggested = lastW ? suggestWeight(lastW) : null;
          const isLast = workoutExIdx === exercises.length - 1;

          function logSet() {
            if (!workoutWeight || !workoutReps) return;
            const newSet = {weight: workoutWeight, reps: workoutReps};
            const ns = {...sessionSets};
            ns[ex.id] = [...(ns[ex.id]||[]), newSet];
            setSessionSets(ns);
            // Carry weight forward to next set, clear reps
            setWorkoutReps("");
            // Keep weight filled for next set (common gym behavior)
            startRestTimer(60);
            setWorkoutRestTime(prev => prev + 60);
          }

          function nextExercise() {
            if (isLast) {
              const entries = exercises.map(e=>({
                exercise:e.name, date:today, templateId:activeTemplate.id,
                sets:(sessionSets[e.id]||[]).filter(s=>s.weight&&s.reps)
              })).filter(e=>e.sets.length>0);
              finishWorkout(entries, workoutStartTime, workoutRestTime);
            } else {
              setWorkoutExIdx(i => i+1);
              setWorkoutWeight(""); setWorkoutReps("");
              stopRestTimer();
            }
          }

          return (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
                <div style={{flex:1,height:4,background:S3,borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",background:A,borderRadius:99,width:((workoutExIdx/exercises.length)*100)+"%",transition:"width 0.4s ease"}}/>
                </div>
                <div style={{fontFamily:FF_MONO,fontSize:11,color:T3,flexShrink:0}}>{workoutExIdx+1}/{exercises.length}</div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontFamily:FF_BODY,fontSize:11,color:T3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>{activeTemplate.name}</div>
                <div style={{fontFamily:FF_HEAD,fontWeight:800,fontSize:26,color:TXT,letterSpacing:"-0.02em",lineHeight:1.1,marginBottom:8}}>{ex.name}</div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontFamily:FF_BODY,fontSize:12,color:T2}}>{ex.targetSets} sets × {ex.targetReps} reps</span>
                  {suggested && <span style={{fontFamily:FF_HEAD,fontSize:12,fontWeight:700,color:A,background:A+"18",padding:"2px 10px",borderRadius:99}}>Target: {suggested}lb</span>}
                  {lastW && <span style={{fontFamily:FF_BODY,fontSize:11,color:T3}}>Last: {Math.max(...lastW.map(s=>parseFloat(s.weight)||0))}lb</span>}
                </div>
              </div>
              {exSets.length > 0 && (
                <div style={{background:S2,border:"1px solid "+BD,borderRadius:14,padding:"12px 14px",marginBottom:16}}>
                  <div style={{fontFamily:FF_HEAD,fontWeight:600,fontSize:12,color:T2,marginBottom:10}}>Logged Sets</div>
                  {exSets.map((s,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:i<exSets.length-1?"1px solid "+BD:"none"}}>
                      <span style={{fontFamily:FF_BODY,fontSize:12,color:T3}}>Set {i+1}</span>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <span style={{fontFamily:FF_MONO,fontSize:14,fontWeight:700,color:TXT}}>{s.weight}lb × {s.reps}</span>
                        <button onClick={()=>{const ns={...sessionSets};ns[ex.id]=(ns[ex.id]||[]).filter((_,j)=>j!==i);setSessionSets(ns);}} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center"}}>
                          <Icon name="close" size={14} color="#ef4444" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{background:S2,border:"1px solid "+BD2,borderRadius:16,padding:"16px",marginBottom:16}}>
                <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:13,color:TXT,marginBottom:14}}>
                  Set {exSets.length + 1}
                  {lastW && (
                    <span style={{fontFamily:FF_BODY,fontSize:11,fontWeight:400,color:T3,marginLeft:8}}>
                      last session: {lastW.slice(0, ex.targetSets).map(s=>s.weight+"×"+s.reps).join(", ")}
                    </span>
                  )}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <div>
                    <div style={{fontFamily:FF_BODY,fontSize:11,color:T3,marginBottom:6}}>Weight (lbs)</div>
                    <input type="number" inputMode="decimal"
                      placeholder={lastW?.[exSets.length]?.weight || (suggested?String(suggested):"")}
                      value={workoutWeight}
                      onChange={e=>setWorkoutWeight(e.target.value)}
                      style={{...inputStyle,fontSize:22,fontWeight:700,fontFamily:FF_MONO,textAlign:"center",padding:"14px 8px",borderRadius:12}}/>
                  </div>
                  <div>
                    <div style={{fontFamily:FF_BODY,fontSize:11,color:T3,marginBottom:6}}>Reps</div>
                    <input type="number" inputMode="numeric"
                      placeholder={lastW?.[exSets.length]?.reps || ex.targetReps.split("-")[0] || "8"}
                      value={workoutReps}
                      onChange={e=>setWorkoutReps(e.target.value)}
                      style={{...inputStyle,fontSize:22,fontWeight:700,fontFamily:FF_MONO,textAlign:"center",padding:"14px 8px",borderRadius:12}}/>
                  </div>
                </div>
                {suggested && (
                  <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                    {[-10,-5,0,5,10].map(d=>{
                      const w = suggested+d;
                      return (
                        <button key={d} onClick={()=>setWorkoutWeight(String(w))} style={{
                          flex:1,background:workoutWeight===String(w)?A+"22":S3,
                          border:"1px solid "+(workoutWeight===String(w)?A:BD2),
                          borderRadius:8,padding:"6px 4px",fontFamily:FF_MONO,fontSize:12,
                          color:workoutWeight===String(w)?A:T2,cursor:"pointer",fontWeight:600,minWidth:40
                        }}>{w}</button>
                      );
                    })}
                  </div>
                )}
                <button onClick={logSet} disabled={!workoutWeight||!workoutReps}
                  style={{...btn(!workoutWeight||!workoutReps?S3:A,!workoutWeight||!workoutReps?T3:BG),width:"100%",padding:"13px",fontSize:14,borderRadius:12}}>
                  Log Set
                </button>
              </div>
              {restTimer && (
                <div style={{background:restTimer.secs===0?"#ef444418":A+"12",border:"1px solid "+(restTimer.secs===0?"#ef4444":A)+"44",borderRadius:14,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{fontFamily:FF_MONO,fontSize:28,fontWeight:800,color:restTimer.secs===0?"#ef4444":A,minWidth:64}}>
                    {restTimer.secs===0?"GO!":Math.floor(restTimer.secs/60)+":"+(restTimer.secs%60).toString().padStart(2,"0")}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{height:6,background:S3,borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",background:restTimer.secs===0?"#ef4444":A,borderRadius:99,width:((restTimer.secs/restTimer.total)*100)+"%",transition:"width 1s linear"}}/>
                    </div>
                    <div style={{fontFamily:FF_BODY,fontSize:11,color:T3,marginTop:4}}>Rest</div>
                  </div>
                  <button onClick={stopRestTimer} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center"}}>
                    <Icon name="close" size={18} color={T3} />
                  </button>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr 2fr",gap:8}}>
                <button
                  onClick={()=>{ if(workoutExIdx>0){ setWorkoutExIdx(i=>i-1); setWorkoutWeight(""); setWorkoutReps(""); stopRestTimer(); } }}
                  disabled={workoutExIdx===0}
                  style={{
                    ...ghostBtn(workoutExIdx===0?T3:T2),
                    padding:"13px 14px",borderRadius:12,
                    opacity:workoutExIdx===0?0.3:1,
                    display:"flex",alignItems:"center",gap:4
                  }}>
                  <Icon name="chevron-right" size={16} color={workoutExIdx===0?T3:T2} style={{transform:"rotate(180deg)"}} />
                </button>
                <button onClick={()=>{setView("log");setLogMode("free");setActiveTemplate(null);stopRestTimer();}} style={{...ghostBtn(T2),padding:"13px",borderRadius:12,fontSize:13,textAlign:"center"}}>
                  Quit
                </button>
                <button onClick={nextExercise} style={{...btn(isLast?"#22c55e":A,BG),padding:"13px",fontSize:14,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {isLast
                    ? <><Icon name="flag" size={16} color={BG} />Finish</>
                    : <><span>Next</span><Icon name="chevron-right" size={16} color={BG} /></>}
                </button>
              </div>
              <div style={{marginTop:20,background:S2,border:"1px solid "+BD,borderRadius:14,padding:"12px 14px"}}>
                <div style={{fontFamily:FF_HEAD,fontWeight:600,fontSize:12,color:T2,marginBottom:10}}>Up Next</div>
                {exercises.map((e,i)=>(
                  <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",opacity:i<workoutExIdx?0.4:1}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:i===workoutExIdx?A:S3,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {i<workoutExIdx
                        ? <Icon name="check-circle" size={12} color={A} />
                        : i===workoutExIdx
                          ? <div style={{width:8,height:8,borderRadius:"50%",background:BG}}/>
                          : <span style={{fontFamily:FF_MONO,fontSize:9,color:T3}}>{i+1}</span>}
                    </div>
                    <span style={{fontFamily:FF_BODY,fontSize:12,color:i===workoutExIdx?TXT:T3,fontWeight:i===workoutExIdx?600:400}}>{e.name}</span>
                    {i===workoutExIdx && <span style={{fontSize:10,background:A+"18",color:A,padding:"1px 8px",borderRadius:99,fontFamily:FF_HEAD,fontWeight:700}}>Now</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════ LOG (free + template picker) ═══════════════════ */}
        {view==="log" && (logMode==="free" || logMode==="template") && (
          <div>
            {!activeTemplate && (
              <div style={{display:"flex",gap:0,marginBottom:20,border:"1px solid "+BD,borderRadius:10,overflow:"hidden",width:"fit-content"}}>
                {[["free","Free Log"],["template","From Template"]].map(([m,label])=>(
                  <button key={m} onClick={()=>setLogMode(m)} style={{
                    background:logMode===m?A:S2,color:logMode===m?BG:T2,
                    border:"none",cursor:"pointer",padding:"10px 18px",fontSize:12,
                    fontFamily:FF_BODY,fontWeight:logMode===m?600:400
                  }}>{label}</button>
                ))}
              </div>
            )}
            {logMode==="template" && !activeTemplate && (
              <div>
                <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:14,color:TXT,marginBottom:14}}>Choose a Template</div>
                {templates.length===0 && (
                  <div style={{color:T3,fontSize:13}}>No templates yet. <span style={{color:A,cursor:"pointer"}} onClick={()=>setView("builder")}>Create one →</span></div>
                )}
                {templates.map(tpl=>(
                  <div key={tpl.id} onClick={()=>startTemplateWorkout(tpl)} className="card card-glow"
                    style={{padding:"16px",marginBottom:10,cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontFamily:FF_HEAD,fontSize:14,fontWeight:700,marginBottom:4}}>{tpl.name}</div>
                        <div style={{fontFamily:FF_BODY,fontSize:11,color:T3}}>{tpl.exercises.map(e=>e.name).join(" · ")}</div>
                      </div>
                      <Icon name="play" size={20} color={A} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {logMode==="free" && (
              <div style={{maxWidth:420}}>
                <div style={{fontFamily:FF_BODY,fontSize:12,color:T3,marginBottom:16}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
                <div style={{marginBottom:14}}>
                  <label style={{display:"block",fontFamily:FF_BODY,fontSize:12,color:T2,marginBottom:8}}>Exercise</label>
                  <ExercisePicker value={freeEx} onChange={setFreeEx} extraOptions={allExercises} />
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{display:"block",fontFamily:FF_BODY,fontSize:12,color:T2,marginBottom:8}}>Or custom</label>
                  <input placeholder="Cable Fly, Face Pull…" value={freeCustom} onChange={e=>setFreeCustom(e.target.value)} style={inputStyle}/>
                </div>
                <div style={{marginBottom:16}}>
                  <div style={{display:"flex",gap:8,marginBottom:8}}>
                    <span style={{fontFamily:FF_BODY,fontSize:10,color:T3,width:26}}>#</span>
                    <span style={{fontFamily:FF_BODY,fontSize:10,color:T3,flex:1,textAlign:"center"}}>Weight</span>
                    <span style={{fontFamily:FF_BODY,fontSize:10,color:T3,flex:1,textAlign:"center"}}>Reps</span>
                    <span style={{width:28}}/>
                  </div>
                  {freeSets.map((s,i)=>(
                    <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                      <span style={{fontFamily:FF_MONO,fontSize:11,color:T3,width:26}}>{String(i+1).padStart(2,"0")}</span>
                      <input type="text" placeholder="135" value={s.weight}
                        onChange={e=>setFreeSets(freeSets.map((x,j)=>j===i?{...x,weight:e.target.value}:x))}
                        style={{...inputStyle,flex:1,padding:"11px 8px",textAlign:"center",fontSize:15,fontWeight:600,fontFamily:FF_MONO}}/>
                      <input type="number" placeholder="8" value={s.reps}
                        onChange={e=>setFreeSets(freeSets.map((x,j)=>j===i?{...x,reps:e.target.value}:x))}
                        style={{...inputStyle,flex:1,padding:"11px 8px",textAlign:"center",fontSize:15,fontWeight:600,fontFamily:FF_MONO}}/>
                      <button onClick={()=>setFreeSets(freeSets.filter((_,j)=>j!==i))}
                        style={{...ghostBtn("#ef4444"),width:28,height:38,padding:0,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8}}>
                        <Icon name="close" size={12} color="#ef4444" />
                      </button>
                    </div>
                  ))}
                  <button onClick={()=>setFreeSets([...freeSets,{weight:"",reps:""}])}
                    style={{...ghostBtn(T3),width:"100%",borderStyle:"dashed",marginTop:4,fontSize:12}}>+ Add Set</button>
                </div>
                <button onClick={saveFreeSets} style={{...btn(flash==="free"?A2:A,BG),width:"100%",padding:"13px",fontSize:14,borderRadius:14}}>
                  {flash==="free" ? <><Icon name="check-circle" size={14} color={BG} style={{marginRight:6}} />Saved</> : "Save Workout"}
                </button>
                {logs[today]?.length>0 && (
                  <div style={{marginTop:24}}>
                    <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:13,color:TXT,marginBottom:12}}>Today</div>
                    {logs[today].map((entry,i)=>(
                      <div key={i} style={{marginBottom:8,padding:"12px 14px",background:S2,borderRadius:12,borderLeft:"3px solid "+A}}>
                        <div style={{fontFamily:FF_HEAD,fontSize:12,fontWeight:700,marginBottom:6}}>{entry.exercise}</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {entry.sets.map((s,j)=>(<span key={j} style={{fontFamily:FF_MONO,fontSize:11,color:T2}}>{s.weight}×{s.reps}</span>))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ HISTORY ═══════════════════ */}
        {view==="history" && (
          <div style={{maxWidth:520}}>
            {allDates.length===0 && <div style={{color:T3,fontSize:13,padding:"40px 0",textAlign:"center"}}>No workouts logged yet.</div>}
            {allDates.map(date=>(
              <div key={date} style={{marginBottom:24}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontFamily:FF_HEAD,fontWeight:700,fontSize:12,color:A,letterSpacing:"0.04em"}}>
                    {parseD(date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}).toUpperCase()}
                  </div>
                  <div style={{fontFamily:FF_BODY,fontSize:11,color:T3}}>
                    {Math.round(logs[date].reduce((a,e)=>a+vol(e.sets),0)).toLocaleString()} lbs
                  </div>
                </div>
                {logs[date].map((entry,i)=>(
                  <div key={i} style={{marginBottom:8,padding:"12px 14px",background:S2,borderRadius:12,borderLeft:"2px solid "+A}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                      <div style={{fontFamily:FF_HEAD,fontSize:12,fontWeight:700,color:TXT}}>{entry.exercise}</div>
                      {entry.templateId && (
                        <span style={{fontFamily:FF_BODY,fontSize:10,color:A+"99",background:A+"12",borderRadius:99,padding:"2px 8px"}}>
                          {templates.find(t=>t.id===entry.templateId)?.name||"template"}
                        </span>
                      )}
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {entry.sets.map((s,j)=>(
                        <span key={j} style={{fontFamily:FF_MONO,fontSize:11,color:T2}}>
                          <span style={{color:TXT}}>{s.weight}</span>lb×<span style={{color:TXT}}>{s.reps}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
