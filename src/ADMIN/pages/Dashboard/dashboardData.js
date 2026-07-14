export const dashboardSummary = {
  todaysProduction: 2560,
  inProcess: 542,
  completed: 2018,
  rejected: 12,
  efficiency: 98.7,
};

export const productionPipeline = [
  { id: 1, line: "SMT", stage: "Stage 1", name: "PCB Grouping", count: 820, status: "Running", progress: 100, color: "#2563EB" },
  { id: 2, line: "SMT", stage: "Stage 2", name: "SMI Input", count: 790, status: "Running", progress: 90, color: "#2563EB" },
  { id: 3, line: "SMT", stage: "Stage 3", name: "PCB Soldering", count: 760, status: "Running", progress: 82, color: "#2563EB" },
  { id: 4, line: "SMT", stage: "Stage 4", name: "SMI Output", count: 735, status: "Running", progress: 75, color: "#2563EB" },

  { id: 5, line: "AI", stage: "Stage 5", name: "AI Input Scanning", count: 710, status: "Running", progress: 70, color: "#16A34A" },
  { id: 6, line: "AI", stage: "Stage 6", name: "AI Output Scanning", count: 690, status: "Running", progress: 66, color: "#16A34A" },

  { id: 7, line: "DIP", stage: "Stage 7", name: "AI Input Scanning", count: 660, status: "Running", progress: 61, color: "#F59E0B" },
  { id: 8, line: "DIP", stage: "Stage 8", name: "Programming Stage", count: 625, status: "Running", progress: 56, color: "#F59E0B" },
  { id: 9, line: "DIP", stage: "Stage 9", name: "FCT / NOP Stage", count: 592, status: "Waiting", progress: 48, color: "#F59E0B" },
  { id: 10, line: "DIP", stage: "Stage 10", name: "Output Stage / Packaging", count: 560, status: "Completed", progress: 100, color: "#16A34A" },
];

export const recentActivity = [
  {
    qr: "PCB00012451",
    stage: "Stage 4",
    line: "AI",
    time: "10:45 AM",
    status: "Completed",
  },
  {
    qr: "PCB00012452",
    stage: "Stage 2",
    line: "SMD",
    time: "10:44 AM",
    status: "Running",
  },
  {
    qr: "PCB00012453",
    stage: "Stage 7",
    line: "DIP",
    time: "10:43 AM",
    status: "Waiting",
  },
];

export const lineStatus = [
  {
    line: "SMD",
    status: "Running",
    color: "#16A34A",
  },
  {
    line: "AI",
    status: "Running",
    color: "#16A34A",
  },
  {
    line: "DIP",
    status: "Maintenance",
    color: "#F59E0B",
  },
];