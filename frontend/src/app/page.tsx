import Link from "next/link";
import { StarfieldCanvas } from "@/components/StarfieldCanvas";

const PREVIEW_TASKS = [
  {
    letter: "A",
    title: "Maximum Subarray Parity",
    tags: [
      { label: "Prefix Sums", tone: "purple" },
      { label: "DP", tone: "blue" },
    ],
    rate: "56/68 (82%)",
    pct: 82,
    barColor: "bg-emerald-400",
    points: 100,
    status: "solved",
    href: "/c/spring-collegiate-invitational-2026/problems/a",
  },
  {
    letter: "B",
    title: "Campus Shuttle Network",
    tags: [
      { label: "Graphs", tone: "purple" },
      { label: "BFS", tone: "blue" },
    ],
    rate: "42/68 (61%)",
    pct: 61,
    barColor: "bg-emerald-400",
    points: 100,
    status: "solved",
    href: "/c/spring-collegiate-invitational-2026/problems/b",
  },
  {
    letter: "C",
    title: "Lexicographical Tree Walks",
    tags: [
      { label: "Trees", tone: "purple" },
      { label: "Strings", tone: "blue" },
    ],
    rate: "19/68 (27%)",
    pct: 27,
    barColor: "bg-amber-400",
    points: 100,
    status: "attempted",
    href: "/c/spring-collegiate-invitational-2026/problems/c",
  },
  {
    letter: "D",
    title: "Quantum Coin Grid",
    tags: [
      { label: "Combinatorics", tone: "purple" },
      { label: "Math", tone: "blue" },
    ],
    rate: "9/68 (13%)",
    pct: 13,
    barColor: "bg-purple-400",
    points: 100,
    status: "untried",
    href: "/c/spring-collegiate-invitational-2026/problems/d",
  },
  {
    letter: "E",
    title: "Hyperlane Topology Optimization",
    tags: [
      { label: "Max Flow", tone: "purple" },
      { label: "Hard", tone: "rose" },
    ],
    rate: "3/68 (4%)",
    pct: 4,
    barColor: "bg-purple-400",
    points: 100,
    status: "untried",
    href: "/c/spring-collegiate-invitational-2026/problems/e",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-[#0a0118] text-slate-100 min-h-screen relative overflow-x-hidden selection:bg-purple-600 selection:text-white">
      {/* LAYER 1: Background, Starfield & Top Ambient Radiance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <StarfieldCanvas />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-900/10 blur-[130px] rounded-full" />
      </div>

      {/* LAYER 2: Perspective Fan Lines & Floor/Ceiling Wireframe */}
      <div className="absolute top-0 left-0 w-full h-[950px] pointer-events-none overflow-hidden z-[1]">
        <svg
          className="w-full h-full opacity-45"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 1600 950"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gridHGrad" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#c47fe5" stopOpacity="0" />
              <stop offset="25%" stopColor="#dbbdf7" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.32" />
              <stop offset="75%" stopColor="#dbbdf7" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#c47fe5" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rayVGradTop" x1="0%" x2="0%" y1="100%" y2="0%">
              <stop offset="0%" stopColor="#dbbdf7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#c47fe5" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="rayVGradBottom" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#dbbdf7" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#c47fe5" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#8338c4" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="url(#rayVGradTop)" strokeWidth="1">
            <line x1="800" x2="-200" y1="510" y2="0" />
            <line x1="800" x2="20" y1="510" y2="0" />
            <line x1="800" x2="220" y1="510" y2="0" />
            <line x1="800" x2="410" y1="510" y2="0" />
            <line x1="800" x2="580" y1="510" y2="0" />
            <line x1="800" x2="720" y1="510" y2="0" />
            <line x1="800" x2="800" y1="510" y2="0" />
            <line x1="800" x2="880" y1="510" y2="0" />
            <line x1="800" x2="1020" y1="510" y2="0" />
            <line x1="800" x2="1190" y1="510" y2="0" />
            <line x1="800" x2="1380" y1="510" y2="0" />
            <line x1="800" x2="1580" y1="510" y2="0" />
            <line x1="800" x2="1800" y1="510" y2="0" />
          </g>
          <g stroke="url(#gridHGrad)" strokeWidth="1">
            <path d="M 0 495 C 400 498, 1200 498, 1600 495" opacity="0.3" />
            <path d="M 0 470 C 400 475, 1200 475, 1600 470" opacity="0.25" />
            <path d="M 0 425 C 400 435, 1200 435, 1600 425" opacity="0.22" />
            <path d="M 0 355 C 400 370, 1200 370, 1600 355" opacity="0.18" />
            <path d="M 0 240 C 400 265, 1200 265, 1600 240" opacity="0.12" />
            <path d="M 0 70 C 400 110, 1200 110, 1600 70" opacity="0.08" />
          </g>
          <g stroke="url(#rayVGradBottom)" strokeWidth="1.1">
            <line x1="800" x2="-350" y1="510" y2="950" />
            <line x1="800" x2="-80" y1="510" y2="950" />
            <line x1="800" x2="150" y1="510" y2="950" />
            <line x1="800" x2="340" y1="510" y2="950" />
            <line x1="800" x2="520" y1="510" y2="950" />
            <line x1="800" x2="680" y1="510" y2="950" />
            <line x1="800" x2="800" y1="510" y2="950" />
            <line x1="800" x2="920" y1="510" y2="950" />
            <line x1="800" x2="1080" y1="510" y2="950" />
            <line x1="800" x2="1260" y1="510" y2="950" />
            <line x1="800" x2="1450" y1="510" y2="950" />
            <line x1="800" x2="1680" y1="510" y2="950" />
            <line x1="800" x2="1950" y1="510" y2="950" />
          </g>
          <g stroke="url(#gridHGrad)" strokeWidth="1">
            <line opacity="0.75" x1="0" x2="1600" y1="520" y2="520" />
            <line opacity="0.55" x1="0" x2="1600" y1="535" y2="535" />
            <line opacity="0.45" x1="0" x2="1600" y1="560" y2="560" />
            <line opacity="0.35" x1="0" x2="1600" y1="600" y2="600" />
            <line opacity="0.25" x1="0" x2="1600" y1="660" y2="660" />
            <line opacity="0.18" x1="0" x2="1600" y1="745" y2="745" />
            <line opacity="0.1" x1="0" x2="1600" y1="860" y2="860" />
          </g>
        </svg>
      </div>

      {/* LAYER 3: Glowing Sunrise Purple Horizon */}
      <div className="absolute top-[510px] left-0 w-full pointer-events-none select-none z-[2]">
        <div className="horizon-glow-core" />
        <div className="horizon-laser-streak" />
      </div>

      {/* NAVIGATION BAR */}
      <header className="w-full relative z-40 px-6 lg:px-12 py-6 transition-all">
        <nav
          aria-label="Main Navigation"
          className="max-w-7xl mx-auto flex items-center justify-between"
        >
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-200 text-white font-bold text-base">
              P
            </div>
            <span className="text-white font-bold text-2xl tracking-tight font-sans">
              Podium
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-9 text-[14px] font-medium text-[#c4bfda]">
            <Link
              href="/contests"
              className="text-white hover:text-purple-300 transition-colors duration-150 font-semibold"
            >
              Contests
            </Link>
            <Link
              href="/contests"
              className="hover:text-white transition-colors duration-150"
            >
              Leaderboard
            </Link>
            <Link
              href="/contests"
              className="hover:text-white transition-colors duration-150"
            >
              Submissions
            </Link>
            <Link
              href="/contests"
              className="hover:text-white transition-colors duration-150"
            >
              Docs
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <Link
              href="/contests"
              className="text-[14px] font-medium text-slate-200 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/contests"
              className="text-[14px] font-medium text-white px-5 py-1.5 rounded-full border border-purple-500/30 bg-purple-600/20 hover:bg-purple-600/30 hover:border-purple-300/50 backdrop-blur-sm transition-all duration-200 shadow-sm shadow-purple-500/20"
            >
              Launch Contest
            </Link>
          </div>
        </nav>
      </header>

      {/* LAYER 5: Hero Content */}
      <main className="relative z-[20] pt-14 sm:pt-20 text-center px-4 max-w-5xl mx-auto">
        <h1 className="hero-title-gradient text-5xl sm:text-[68px] font-bold tracking-[-2px] mb-5">
          New Era of Competitive Programming
        </h1>
        <p className="text-[#948da6] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8 font-normal">
          Live algorithmic contests, real-time leaderboards, and automated evaluation. Level up your coding club with production-grade contest hosting.
        </p>
        <div className="inline-block mb-14">
          <Link
            href="/contests"
            className="cta-pill-btn px-6 py-2.5 rounded-full text-slate-100 text-[13.5px] font-medium flex items-center justify-center gap-2"
          >
            <span>Explore live contests</span>
            <svg
              className="w-3.5 h-3.5 text-purple-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M13 7l5 5m0 0l-5 5m5-5H6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </Link>
        </div>
      </main>

      {/* LAYER 4: Product Dashboard Window Preview */}
      <section className="relative z-[10] max-w-6xl mx-auto px-4 -mt-2 pb-24">
        <div className="dashboard-mockup-wrapper overflow-hidden relative shadow-2xl border border-purple-400/30">
          <div className="flex flex-col md:flex-row min-h-[580px]">
            <aside className="w-full md:w-60 bg-[#0c051a]/90 border-b md:border-b-0 md:border-r border-white/5 p-4 flex flex-col justify-between shrink-0 text-[13px]">
              <div>
                <Link
                  href="/contests"
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] border border-white/5 text-slate-300 mb-5 hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-purple-600/40 text-purple-200 flex items-center justify-center text-xs font-bold shrink-0">
                      P
                    </div>
                    <span className="font-medium text-slate-200 truncate">
                      Podium › ACM Club
                    </span>
                  </div>
                  <svg
                    className="w-3.5 h-3.5 text-slate-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </Link>

                <div className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Contest
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/c/spring-collegiate-invitational-2026"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.08] text-white font-medium border border-white/10 shadow-sm"
                  >
                    <svg
                      className="w-4 h-4 text-purple-400 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="8" r="6" />
                      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                    </svg>
                    <span className="truncate">Contest Arena</span>
                  </Link>
                  <Link
                    href="/contests"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] transition-colors"
                  >
                    <svg
                      className="w-4 h-4 opacity-70 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Contests</span>
                  </Link>
                  <Link
                    href="/c/spring-collegiate-invitational-2026/leaderboard"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] transition-colors"
                  >
                    <svg
                      className="w-4 h-4 opacity-70 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18 20V10M12 20V4M6 20v-6" />
                    </svg>
                    <span>Live Leaderboard</span>
                  </Link>
                  <Link
                    href="/c/spring-collegiate-invitational-2026/submissions"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] transition-colors"
                  >
                    <svg
                      className="w-4 h-4 opacity-70 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <span>Submissions</span>
                  </Link>
                </nav>
              </div>

              <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 px-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Judge Online
                </span>
                <span>v3.2</span>
              </div>
            </aside>

            <div className="flex-1 flex flex-col bg-[#100820]/75 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <h2 className="font-semibold text-white text-[15px]">
                    Featured Problems
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-300 ml-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Arena Live</span>
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <Link
                    href="/c/spring-collegiate-invitational-2026"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 transition-colors"
                  >
                    <span>Enter Contest Arena →</span>
                  </Link>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto styled-scrollbar">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-[11px] font-medium text-slate-400 border-b border-white/5 bg-white/[0.01]">
                      <th className="py-3 px-5 font-normal w-12">#</th>
                      <th className="py-3 px-4 font-normal">
                        Problem Name &amp; Topics
                      </th>
                      <th className="py-3 px-4 font-normal">Solve Rate</th>
                      <th className="py-3 px-3 font-normal">Points</th>
                      <th className="py-3 px-4 font-normal">Status</th>
                      <th className="py-3 px-5 text-right font-normal">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-slate-300">
                    {PREVIEW_TASKS.map((task) => (
                      <tr
                        key={task.letter}
                        className="hover:bg-purple-500/[0.04] transition-colors"
                      >
                        <td className="py-3 px-5 font-bold text-purple-300 font-mono">
                          {task.letter}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-[13px]">
                              {task.title}
                            </span>
                            {task.tags.map((tag) => (
                              <span
                                key={tag.label}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                  tag.tone === "purple"
                                    ? "bg-purple-500/15 text-purple-300 border-purple-500/20"
                                    : tag.tone === "blue"
                                      ? "bg-blue-500/15 text-blue-300 border-blue-500/20"
                                      : "bg-rose-500/15 text-rose-300 border-rose-500/20"
                                }`}
                              >
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-24 bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`${task.barColor} h-1.5 rounded-full`}
                                style={{ width: `${task.pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-slate-300 text-[11px]">
                              {task.rate}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-200">
                          {task.points}
                        </td>
                        <td className="py-3 px-4">
                          {task.status === "solved" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                              Solved
                            </span>
                          )}
                          {task.status === "attempted" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                              Attempted
                            </span>
                          )}
                          {task.status === "untried" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-slate-400 border border-white/10">
                              Not attempted
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <Link
                            href={task.href}
                            className="text-purple-300 hover:text-white font-medium hover:underline text-xs"
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="relative z-[20] pt-16 pb-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(10, 1, 24, 0.6) 20%, rgba(10, 1, 24, 0.95) 60%, #0a0118 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-16">
            <div className="lg:col-span-2 space-y-4">
              <Link href="/" className="items-center gap-2.5 group inline-flex">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-200 text-white font-bold text-base">
                  P
                </div>
                <span className="text-white font-bold text-2xl tracking-tight font-sans">
                  Podium
                </span>
              </Link>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
                The competitive programming arena for collegiate chapters, high-school olympiads, and ICPC regional practice.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
                Platform
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <Link
                    className="hover:text-purple-300 transition-colors"
                    href="/contests"
                  >
                    Live Contests
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
                Resources
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <Link
                    className="hover:text-purple-300 transition-colors"
                    href="/contests"
                  >
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>© 2026 Podium Technologies Inc. All rights reserved.</div>
            <div>Crafted for algorithmic excellence.</div>
          </div>
        </div>

        <div
          className="relative w-full select-none pointer-events-none pt-6 pb-2 flex flex-col items-center justify-end overflow-hidden"
          style={{
            background:
              "radial-gradient(85% 90% at 50% 100%, rgba(168, 85, 247, 0.32) 0%, rgba(120, 40, 200, 0.14) 45%, transparent 80%)",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[1100px] h-[320px] bg-purple-600/30 blur-[130px] rounded-full pointer-events-none -bottom-10" />
          </div>
          <div
            className="w-full text-center font-serif text-[18vw] lg:text-[19.5vw] font-normal tracking-tight select-none relative z-10 mx-auto px-2 leading-none"
            style={{
              background:
                "linear-gradient(180deg, #eedbff 0%, #d8b4fe 25%, #a855f7 65%, #6b21a8 95%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter:
                "drop-shadow(0 0 45px rgba(168, 85, 247, 0.55)) drop-shadow(0 0 100px rgba(147, 51, 234, 0.35))",
            }}
          >
            Podium
          </div>
        </div>
      </footer>
    </div>
  );
}
