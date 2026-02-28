import AnimateOnScroll from "@/components/AnimateOnScroll";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="fixed inset-0 grid-background pointer-events-none" />
      <div className="relative">
        <Navbar />
        <Hero />
        <StatsBar />
        <Problem />
        <HowItWorks />
        <Features />
        <CallToAction />
        <Footer />
      </div>
    </div>
  );
}

/* ─── Navbar ─── */
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] backdrop-blur-2xl bg-background/70">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <span className="font-semibold text-lg tracking-tight">Sales Co-Pilot</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {["Problem", "How It Works", "Features"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
              {item}
            </a>
          ))}
        </div>

        <a href="/clients" className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 text-sm font-medium text-white hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.97] transition-all duration-200">
          Launch App
        </a>
      </div>
    </nav>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16">
      <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-blue-500/[0.07] rounded-full blur-[120px] animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] bg-violet-500/[0.07] rounded-full blur-[120px] animate-pulse-glow pointer-events-none" style={{ animationDelay: "2s" }} />

      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-0 w-full grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="opacity-0 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/[0.08] text-blue-400 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            QuackHacks &apos;26 — ADP Challenge
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
            Close More Deals<br />with{" "}
            <span className="gradient-text">Real-Time Intelligence</span>
          </h1>

          <p className="text-lg lg:text-xl text-slate-400 leading-relaxed mb-10 max-w-lg">
            Research prospects in seconds. Get AI-powered suggestions during live calls. Never miss a follow-up again.
          </p>

          <div className="flex flex-wrap gap-4">
            <a href="/clients" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 font-semibold text-white hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.97] transition-all duration-200">
              Get Started
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <a href="#how-it-works" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-700 text-slate-300 font-medium hover:border-slate-500 hover:text-white hover:bg-white/[0.03] active:scale-[0.97] transition-all duration-200">
              See How It Works
            </a>
          </div>
        </div>

        <div className="hidden lg:block opacity-0 animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <ProductMockup />
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float opacity-40">
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
        </svg>
      </div>
    </section>
  );
}

/* ─── Product Mockup ─── */
function ProductMockup() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-surface shadow-2xl shadow-black/50 overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[11px] text-slate-500 ml-2 font-mono">Sales Co-Pilot — Live Call with Sarah Chen</span>
      </div>

      <div className="grid grid-cols-5">
        {/* Transcript */}
        <div className="col-span-3 p-5 border-r border-white/[0.06]">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] mb-4">Live Transcript</div>
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-semibold text-blue-400">You</span>
              <p className="text-[12px] text-slate-300/90 mt-0.5 leading-relaxed">Thanks for joining today, Sarah. I know you&apos;ve been evaluating a few options...</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-emerald-400">Sarah Chen</span>
              <p className="text-[12px] text-slate-300/90 mt-0.5 leading-relaxed">Yeah, we&apos;ve been looking at Gong pretty seriously, but the pricing has gotten out of hand.</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-blue-400">You</span>
              <p className="text-[12px] text-slate-300/90 mt-0.5 leading-relaxed">
                I hear that a lot actually
                <span className="inline-block w-[2px] h-3.5 bg-blue-400 animate-blink ml-0.5 align-text-bottom" />
              </p>
            </div>
          </div>
        </div>

        {/* Suggestion */}
        <div className="col-span-2 p-5">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] mb-4">AI Suggestion</div>
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/[0.04] p-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Competitor Intel</span>
            </div>
            <p className="text-[12px] text-slate-300 leading-relaxed">
              Gong charges <span className="text-white font-semibold">$100–150/seat</span>. Our Pro plan is <span className="text-white font-semibold">$99/seat</span> with real-time suggestions they don&apos;t offer.
            </p>
            <div className="mt-3 pt-3 border-t border-orange-500/10">
              <p className="text-[11px] text-slate-400 italic leading-relaxed">&ldquo;The key difference is we help you during the call, not just after...&rdquo;</p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[9px] text-slate-600 font-mono">web_search</span>
              <span className="text-[9px] text-slate-700">·</span>
              <span className="text-[9px] text-slate-600 font-mono">product_context</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-t border-white/[0.06] bg-white/[0.015]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[10px] text-slate-500">Recording</span>
        </div>
        <span className="text-[10px] text-slate-700">|</span>
        <span className="text-[10px] text-slate-500 font-mono">05:23</span>
        <span className="text-[10px] text-slate-700">|</span>
        <span className="text-[10px] text-emerald-500/70">PII Protected</span>
      </div>
    </div>
  );
}

/* ─── Stats Bar ─── */
function StatsBar() {
  const stats = [
    { value: "10×", label: "Faster pre-call research" },
    { value: "< 5s", label: "Suggestion latency" },
    { value: "100%", label: "PII protected" },
  ];
  return (
    <section className="relative border-y border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <AnimateOnScroll>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-0 sm:divide-x sm:divide-white/[0.06]">
            {stats.map((s) => (
              <div key={s.label} className="text-center px-4">
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">{s.value}</div>
                <div className="text-sm text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}

/* ─── Problem ─── */
function Problem() {
  const problems = [
    {
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
      title: "Information Overload",
      desc: "Hours wasted scraping LinkedIn, company sites, and news articles before every single call. Repetitive, time-consuming, incomplete.",
    },
    {
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>,
      title: "Context Switching",
      desc: "Looking up competitor pricing while trying to build rapport. The moment you break eye contact to search, you lose the conversation.",
    },
    {
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
      title: "Administrative Debt",
      desc: "Remembering action items, writing summaries, updating CRM — all after the call. Details slip, follow-ups get missed, deals stall.",
    },
  ];
  return (
    <section id="problem" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <AnimateOnScroll className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-400 uppercase tracking-[0.2em] mb-3">The Problem</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Sales Professionals Deserve Better</h2>
          <p className="text-slate-400 mt-4 max-w-2xl mx-auto text-lg">Forced to choose between being present and being informed. Every call is a balancing act that shouldn&apos;t exist.</p>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <AnimateOnScroll key={p.title} delay={i * 120}>
              <div className="h-full rounded-2xl border border-white/[0.06] bg-surface/50 p-8 card-hover cursor-default">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-white/[0.06] flex items-center justify-center text-blue-400 mb-6">
                  {p.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{p.title}</h3>
                <p className="text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  const phases = [
    { step: "01", title: "Research", subtitle: "Before the call", desc: "Click a button. The system scrapes LinkedIn, company data, competitors, and news in parallel. PII is masked. A concise briefing is ready in seconds.", accent: "from-blue-500 to-cyan-400", accentText: "text-blue-400", accentBorder: "border-blue-500/20", accentBg: "bg-blue-500/[0.06]" },
    { step: "02", title: "Live Assist", subtitle: "During the call", desc: "AI listens via real-time transcription. A smart classifier detects key moments — competitor mentions, objections, pricing questions — and surfaces suggestions instantly.", accent: "from-violet-500 to-purple-400", accentText: "text-violet-400", accentBorder: "border-violet-500/20", accentBg: "bg-violet-500/[0.06]" },
    { step: "03", title: "Synthesize", subtitle: "After the call", desc: "Call summary, action items checklist, and personalized coaching feedback — generated automatically the moment the call ends. No manual notes required.", accent: "from-emerald-500 to-teal-400", accentText: "text-emerald-400", accentBorder: "border-emerald-500/20", accentBg: "bg-emerald-500/[0.06]" },
  ];
  return (
    <section id="how-it-works" className="py-24 lg:py-32 border-t border-white/[0.04]">
      <div className="mx-auto max-w-7xl px-6">
        <AnimateOnScroll className="text-center mb-20">
          <p className="text-sm font-semibold text-violet-400 uppercase tracking-[0.2em] mb-3">How It Works</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Three Phases. One Seamless Experience.</h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {phases.map((p, i) => (
            <AnimateOnScroll key={p.step} delay={i * 150}>
              <div className={`relative h-full rounded-2xl border ${p.accentBorder} ${p.accentBg} p-8 card-hover cursor-default`}>
                <div className={`text-[80px] font-black leading-none ${p.accentText} opacity-[0.07] absolute top-4 right-6 select-none pointer-events-none`}>{p.step}</div>
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.accent} flex items-center justify-center text-white text-sm font-bold mb-6 shadow-lg`}>{p.step}</div>
                <h3 className="text-xl font-semibold mb-1">{p.title}</h3>
                <p className={`text-sm ${p.accentText} mb-4`}>{p.subtitle}</p>
                <p className="text-slate-400 leading-relaxed text-[15px]">{p.desc}</p>
                {i < 2 && (
                  <div className="hidden lg:block absolute top-1/2 -right-5 -translate-y-1/2 z-10">
                    <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </div>
                )}
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
function Features() {
  const features = [
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>, title: "Real-Time Transcription", desc: "ElevenLabs Scribe V2 captures both sides of the call with speaker attribution via dual audio streams." },
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>, title: "Smart Classifier", desc: "A lightweight Groq-powered classifier triggers suggestions only at key moments — no notification fatigue." },
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>, title: "PII Protection", desc: "Microsoft Presidio masks sensitive data before any LLM processing. Emails, phones, names — scrubbed automatically." },
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L11.42 5m-5.1 5.07h13.25M4.5 12a7.5 7.5 0 1015 0 7.5 7.5 0 00-15 0z" /></svg>, title: "MCP Tool Integration", desc: "Web search, product context, and client research — the AI agent calls the right tool at the right moment via FastMCP." },
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>, title: "Groq-Powered Speed", desc: "Sub-second inference via Groq hardware. The classifier decides in < 300ms. Suggestions arrive while the topic is still live." },
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>, title: "Post-Call Intelligence", desc: "Structured summaries, prioritized action items, and personalized coaching — generated automatically when the call ends." },
  ];
  return (
    <section id="features" className="py-24 lg:py-32 border-t border-white/[0.04]">
      <div className="mx-auto max-w-7xl px-6">
        <AnimateOnScroll className="text-center mb-16">
          <p className="text-sm font-semibold text-emerald-400 uppercase tracking-[0.2em] mb-3">Features</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Built for the Modern Sales Team</h2>
          <p className="text-slate-400 mt-4 max-w-2xl mx-auto text-lg">Every component designed for speed, privacy, and real-time relevance.</p>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <AnimateOnScroll key={f.title} delay={i * 80}>
              <div className="group h-full rounded-2xl border border-white/[0.06] bg-surface/40 p-7 card-hover cursor-default">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-300 mb-5 group-hover:text-blue-400 group-hover:border-blue-500/20 group-hover:bg-blue-500/[0.06] transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-[15px] leading-relaxed">{f.desc}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CallToAction() {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <AnimateOnScroll>
          <div className="relative rounded-3xl border border-white/[0.06] bg-surface/60 overflow-hidden px-8 py-16 lg:px-16 lg:py-20 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.06] via-transparent to-violet-500/[0.06] pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">
                Ready to Transform<br /><span className="gradient-text">Your Sales Calls?</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10">
                Stop choosing between being present and being informed. Let AI handle the research, the real-time intelligence, and the follow-ups.
              </p>
              <a href="/clients" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-lg font-semibold text-white hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.97] transition-all duration-200">
                Get Started Now
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
          </div>
          <span className="text-sm text-slate-400">Sales Co-Pilot</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <span>QuackHacks &apos;26</span>
          <span className="text-slate-700">·</span>
          <span>ADP Challenge</span>
          <span className="text-slate-700">·</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
