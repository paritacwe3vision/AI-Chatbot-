import { useState, useEffect, useRef, useCallback } from 'react'
import Chatbot from './components/chatbot/Chatbot.jsx'

/* ─── Icon Components (inline SVG for zero-dep) ─── */
const Icons = {
  Menu: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  X: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Compass: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.2"/>
    </svg>
  ),
  Target: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  TrendingUp: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  BookOpen: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Users: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Award: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
  Briefcase: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  Lightbulb: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6"/><path d="M10 22h4"/>
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
    </svg>
  ),
  Rocket: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Star: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Mail: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Phone: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Linkedin: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
    </svg>
  ),
  Github: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  Twitter: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
}

/* ─── Intersection Observer Hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, isInView]
}

/* ─── AnimatedCounter ─── */
function AnimatedCounter({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const [ref, isInView] = useInView()

  useEffect(() => {
    if (!isInView) return
    let start = 0
    const increment = end / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [isInView, end, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

/* ═══════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const navLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'Services', href: '#services' },
    { label: 'Roadmaps', href: '#roadmaps' },
    { label: 'Resources', href: '#resources' },
    { label: 'Testimonials', href: '#testimonials' },
    { label: 'Contact', href: '#contact' },
  ]

  return (
    <nav
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass py-3 shadow-lg shadow-black/20' : 'py-5 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <Icons.Compass />
          </div>
          <span className="font-display text-xl font-bold text-white tracking-tight">
            Career<span className="text-accent-400">Path</span>
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-slate-400 hover:text-white transition-colors duration-300 relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-accent-500 after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-4">
          <a
            href="#contact"
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-accent-500/25 transition-all duration-300 hover:-translate-y-0.5"
          >
            Get Started
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          id="mobile-menu-toggle"
          className="lg:hidden text-slate-300 hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <Icons.X /> : <Icons.Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-500 ${
          mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pt-4 pb-6 glass mt-2 mx-4 rounded-xl space-y-1">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-4 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setMobileOpen(false)}
            className="block mt-3 text-center py-2.5 px-4 rounded-lg bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-medium"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════ */
function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Glows */}
      <div className="glow-orb w-[600px] h-[600px] bg-accent-500 -top-40 -left-40" />
      <div className="glow-orb w-[500px] h-[500px] bg-emerald-500 -bottom-32 -right-32 opacity-10" />
      <div className="glow-orb w-[300px] h-[300px] bg-rose-500 top-1/3 right-1/4 opacity-8" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-xs text-slate-300 font-medium tracking-wide uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Trusted by 50,000+ professionals
        </div>

        {/* Heading */}
        <h1 className="animate-fade-in-up delay-100 font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-white mb-6" style={{ animationFillMode: 'both' }}>
          Navigate Your
          <br />
          <span className="gradient-text">Career Journey</span>
          <br />
          With Confidence
        </h1>

        {/* Subheading */}
        <p className="animate-fade-in-up delay-300 max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed mb-10" style={{ animationFillMode: 'both' }}>
          Expert guidance, proven roadmaps, and actionable resources to help you
          build a fulfilling career — from your first job to the C-suite.
        </p>

        {/* CTAs */}
        <div className="animate-fade-in-up delay-400 flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationFillMode: 'both' }}>
          <a
            href="#services"
            className="group px-8 py-4 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold text-base hover:shadow-xl hover:shadow-accent-500/30 transition-all duration-300 hover:-translate-y-1 flex items-center gap-2"
          >
            Explore Services
            <span className="transition-transform duration-300 group-hover:translate-x-1"><Icons.ArrowRight /></span>
          </a>
          <a
            href="#roadmaps"
            className="px-8 py-4 rounded-xl border border-slate-700 text-slate-300 font-semibold text-base hover:border-slate-500 hover:text-white hover:bg-white/5 transition-all duration-300"
          >
            View Roadmaps
          </a>
        </div>

        {/* Stats Row */}
        <div className="animate-fade-in-up delay-600 mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto" style={{ animationFillMode: 'both' }}>
          {[
            { value: 50, suffix: 'K+', label: 'Professionals Guided' },
            { value: 200, suffix: '+', label: 'Career Paths' },
            { value: 95, suffix: '%', label: 'Success Rate' },
            { value: 12, suffix: '+', label: 'Years Experience' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-display text-3xl font-bold text-white">
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <a href="#services" className="text-slate-500 hover:text-slate-300 transition-colors">
          <Icons.ChevronDown />
        </a>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   SERVICES SECTION
   ═══════════════════════════════════════════════════ */
function Services() {
  const [ref, isInView] = useInView()

  const services = [
    {
      icon: <Icons.Target />,
      title: 'Career Assessment',
      description: 'Discover your strengths, values, and ideal career path through comprehensive personality and skills evaluation.',
      color: 'from-accent-500/20 to-accent-600/20',
      borderColor: 'border-accent-500/20',
      iconColor: 'text-accent-400',
    },
    {
      icon: <Icons.BookOpen />,
      title: 'Skill Development',
      description: 'Personalized learning plans with curated courses, certifications, and hands-on projects to build in-demand skills.',
      color: 'from-emerald-500/20 to-emerald-400/20',
      borderColor: 'border-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      icon: <Icons.Briefcase />,
      title: 'Job Strategy',
      description: 'Expert resume reviews, interview coaching, and job search strategies tailored to your target industry.',
      color: 'from-amber-500/20 to-amber-400/20',
      borderColor: 'border-amber-500/20',
      iconColor: 'text-amber-400',
    },
    {
      icon: <Icons.Users />,
      title: 'Mentorship Network',
      description: 'Connect with industry leaders and experienced mentors who provide guidance, feedback, and networking opportunities.',
      color: 'from-rose-500/20 to-rose-400/20',
      borderColor: 'border-rose-500/20',
      iconColor: 'text-rose-400',
    },
    {
      icon: <Icons.TrendingUp />,
      title: 'Career Transition',
      description: 'Strategic planning and support for pivoting into new industries, roles, or entrepreneurial ventures.',
      color: 'from-accent-500/20 to-purple-500/20',
      borderColor: 'border-purple-500/20',
      iconColor: 'text-purple-400',
    },
    {
      icon: <Icons.Award />,
      title: 'Leadership Coaching',
      description: 'Develop executive presence, management skills, and strategic thinking to advance into leadership positions.',
      color: 'from-cyan-500/20 to-cyan-400/20',
      borderColor: 'border-cyan-500/20',
      iconColor: 'text-cyan-400',
    },
  ]

  return (
    <section id="services" className="relative py-28 overflow-hidden">
      <div className="glow-orb w-[400px] h-[400px] bg-accent-500 top-20 -right-40 opacity-10" />
      
      <div ref={ref} className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="text-xs font-semibold text-accent-400 tracking-[0.2em] uppercase">What We Offer</span>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
            Comprehensive Career
            <span className="gradient-text"> Services</span>
          </h2>
          <p className="max-w-xl mx-auto text-slate-400">
            Everything you need to plan, build, and accelerate your professional journey.
          </p>
        </div>

        {/* Service Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <div
              key={i}
              className={`group relative p-7 rounded-2xl glass-light ${service.borderColor} border hover:border-opacity-50 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-black/20 ${
                isInView ? 'animate-fade-in-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${i * 100 + 200}ms`, animationFillMode: 'both' }}
            >
              {/* Gradient Background on Hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center ${service.iconColor} mb-5`}>
                  {service.icon}
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-3">{service.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{service.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   ROADMAPS SECTION
   ═══════════════════════════════════════════════════ */
function Roadmaps() {
  const [ref, isInView] = useInView()
  const [activeTab, setActiveTab] = useState(0)

  const roadmaps = [
    {
      title: 'Tech & Engineering',
      subtitle: 'Software, Data, AI & Cloud',
      steps: [
        { phase: 'Foundation', items: ['Programming Fundamentals', 'Data Structures & Algorithms', 'Version Control (Git)'] },
        { phase: 'Specialization', items: ['Choose Your Track (Frontend / Backend / ML)', 'Build Portfolio Projects', 'Open Source Contributions'] },
        { phase: 'Growth', items: ['System Design Mastery', 'Technical Leadership', 'Architecture & Strategy'] },
        { phase: 'Leadership', items: ['Engineering Management', 'CTO / VP Engineering Track', 'Thought Leadership'] },
      ],
    },
    {
      title: 'Business & Strategy',
      subtitle: 'MBA, Consulting, Product',
      steps: [
        { phase: 'Foundation', items: ['Business Fundamentals', 'Financial Literacy', 'Communication Skills'] },
        { phase: 'Specialization', items: ['Strategy Frameworks', 'Data Analysis', 'Project Management'] },
        { phase: 'Growth', items: ['Cross-functional Leadership', 'P&L Ownership', 'Executive Communication'] },
        { phase: 'Leadership', items: ['C-Suite Preparation', 'Board Management', 'Industry Influence'] },
      ],
    },
    {
      title: 'Design & Creative',
      subtitle: 'UX, Brand, Motion Design',
      steps: [
        { phase: 'Foundation', items: ['Design Principles & Theory', 'Typography & Color', 'Core Design Tools'] },
        { phase: 'Specialization', items: ['User Research & Testing', 'Design Systems', 'Prototyping & Animation'] },
        { phase: 'Growth', items: ['Design Strategy', 'Team Leadership', 'Cross-platform Design'] },
        { phase: 'Leadership', items: ['VP of Design', 'Chief Design Officer', 'Design Evangelism'] },
      ],
    },
  ]

  const current = roadmaps[activeTab]

  return (
    <section id="roadmaps" className="relative py-28 overflow-hidden">
      <div className="glow-orb w-[500px] h-[500px] bg-emerald-500 -left-60 top-1/3 opacity-8" />

      <div ref={ref} className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="text-xs font-semibold text-emerald-400 tracking-[0.2em] uppercase">Career Roadmaps</span>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
            Your Path to
            <span className="gradient-text"> Success</span>
          </h2>
          <p className="max-w-xl mx-auto text-slate-400">
            Step-by-step career roadmaps crafted by industry experts for every stage of your journey.
          </p>
        </div>

        {/* Tabs */}
        <div className={`flex flex-wrap justify-center gap-3 mb-12 ${isInView ? 'animate-fade-in-up delay-200' : 'opacity-0'}`} style={{ animationFillMode: 'both' }}>
          {roadmaps.map((rm, i) => (
            <button
              key={i}
              id={`roadmap-tab-${i}`}
              onClick={() => setActiveTab(i)}
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === i
                  ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25'
                  : 'glass text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="font-semibold">{rm.title}</div>
              <div className="text-xs opacity-70 mt-0.5">{rm.subtitle}</div>
            </button>
          ))}
        </div>

        {/* Roadmap Timeline */}
        <div className={`max-w-4xl mx-auto ${isInView ? 'animate-fade-in-up delay-300' : 'opacity-0'}`} style={{ animationFillMode: 'both' }}>
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-accent-500/50 via-emerald-500/50 to-amber-500/50 hidden sm:block" />

            {current.steps.map((step, i) => {
              const colors = ['bg-accent-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']
              const textColors = ['text-accent-400', 'text-emerald-400', 'text-amber-400', 'text-rose-400']
              return (
                <div key={`${activeTab}-${i}`} className="relative flex gap-6 mb-8 last:mb-0 group animate-fade-in-up" style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both' }}>
                  {/* Dot */}
                  <div className={`hidden sm:flex w-12 h-12 rounded-full ${colors[i]} bg-opacity-20 items-center justify-center shrink-0 z-10 ring-4 ring-slate-950`}>
                    <div className={`w-3 h-3 rounded-full ${colors[i]}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6 rounded-2xl glass-light border border-white/5 hover:border-white/10 transition-all duration-300 group-hover:-translate-y-1">
                    <span className={`text-xs font-bold tracking-[0.15em] uppercase ${textColors[i]}`}>
                      Phase {i + 1} — {step.phase}
                    </span>
                    <ul className="mt-4 space-y-2.5">
                      {step.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-slate-300">
                          <span className={`mt-0.5 ${textColors[i]}`}><Icons.CheckCircle /></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   RESOURCES SECTION
   ═══════════════════════════════════════════════════ */
function Resources() {
  const [ref, isInView] = useInView()

  const resources = [
    {
      category: 'Resume Guide',
      title: 'Craft a Standout Resume in 2025',
      description: 'Modern resume strategies that pass ATS systems and impress hiring managers.',
      readTime: '8 min read',
      tag: 'Popular',
      tagColor: 'bg-accent-500/20 text-accent-400',
    },
    {
      category: 'Interview Prep',
      title: 'Master Behavioral Interviews',
      description: 'STAR method, common questions, and frameworks to ace any behavioral interview.',
      readTime: '12 min read',
      tag: 'Essential',
      tagColor: 'bg-emerald-500/20 text-emerald-400',
    },
    {
      category: 'Networking',
      title: 'Build a Powerful Professional Network',
      description: 'Strategic networking approaches that create genuine connections and open doors.',
      readTime: '6 min read',
      tag: 'New',
      tagColor: 'bg-amber-500/20 text-amber-400',
    },
    {
      category: 'Salary Guide',
      title: 'Negotiate Your Salary Like a Pro',
      description: 'Data-driven negotiation tactics and scripts to maximize your compensation.',
      readTime: '10 min read',
      tag: 'Trending',
      tagColor: 'bg-rose-500/20 text-rose-400',
    },
  ]

  return (
    <section id="resources" className="relative py-28 overflow-hidden">
      <div className="glow-orb w-[400px] h-[400px] bg-amber-500 -right-40 top-1/4 opacity-8" />

      <div ref={ref} className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="text-xs font-semibold text-amber-400 tracking-[0.2em] uppercase">Knowledge Hub</span>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
            Career
            <span className="gradient-text-warm"> Resources</span>
          </h2>
          <p className="max-w-xl mx-auto text-slate-400">
            Free guides, templates, and expert articles to supercharge your career growth.
          </p>
        </div>

        {/* Resource Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {resources.map((resource, i) => (
            <article
              key={i}
              className={`group relative p-7 rounded-2xl glass-light border border-white/5 hover:border-white/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer ${
                isInView ? 'animate-fade-in-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${i * 120 + 200}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{resource.category}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${resource.tagColor}`}>
                  {resource.tag}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold text-white mb-2 group-hover:text-accent-300 transition-colors duration-300">
                {resource.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{resource.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{resource.readTime}</span>
                <span className="text-accent-400 text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  Read More <Icons.ArrowRight />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   TESTIMONIALS SECTION
   ═══════════════════════════════════════════════════ */
function Testimonials() {
  const [ref, isInView] = useInView()

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Senior Product Manager at Google',
      text: 'CareerPath helped me transition from engineering to product management. The roadmaps and mentorship were instrumental in landing my dream role.',
      rating: 5,
    },
    {
      name: 'Marcus Johnson',
      role: 'Lead Designer at Stripe',
      text: 'The career assessment opened my eyes to strengths I never knew I had. Within 6 months, I was promoted to lead designer. Incredible guidance.',
      rating: 5,
    },
    {
      name: 'Priya Patel',
      role: 'Engineering Manager at Meta',
      text: "Going from IC to management was daunting. CareerPath's leadership coaching gave me the frameworks and confidence to make the leap successfully.",
      rating: 5,
    },
  ]

  return (
    <section id="testimonials" className="relative py-28 overflow-hidden">
      <div className="glow-orb w-[400px] h-[400px] bg-accent-500 left-1/3 top-0 opacity-8" />

      <div ref={ref} className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="text-xs font-semibold text-accent-400 tracking-[0.2em] uppercase">Success Stories</span>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
            What Our
            <span className="gradient-text"> Clients Say</span>
          </h2>
          <p className="max-w-xl mx-auto text-slate-400">
            Real stories from professionals who transformed their careers with our guidance.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`relative p-7 rounded-2xl glass-light border border-white/5 hover:border-accent-500/20 transition-all duration-500 hover:-translate-y-2 ${
                isInView ? 'animate-fade-in-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${i * 150 + 200}ms`, animationFillMode: 'both' }}
            >
              {/* Stars */}
              <div className="flex gap-1 text-amber-400 mb-5">
                {[...Array(t.rating)].map((_, j) => <Icons.Star key={j} />)}
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed mb-6 italic">"{t.text}"</p>
              
              {/* Avatar & Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white font-bold text-sm">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   FAQ SECTION
   ═══════════════════════════════════════════════════ */
function FAQ() {
  const [ref, isInView] = useInView()
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      q: 'How does CareerPath create personalized career plans?',
      a: 'We use a comprehensive assessment combining your skills, interests, personality traits, and market data to create a tailored roadmap. Our AI-powered matching system pairs you with relevant mentors and resources.',
    },
    {
      q: 'What career stages do you support?',
      a: 'We support professionals at every stage — from students and early-career individuals to mid-level professionals seeking advancement and senior leaders targeting C-suite positions.',
    },
    {
      q: 'How long does a typical career transition take?',
      a: 'Timelines vary, but most clients see meaningful progress within 3-6 months. Career transitions typically take 6-12 months with our structured approach and support system.',
    },
    {
      q: 'Do you offer group coaching or workshops?',
      a: 'Yes! We offer both 1-on-1 coaching and group workshops covering resume writing, interview preparation, salary negotiation, and leadership development. Group sessions are available monthly.',
    },
    {
      q: 'What industries do your mentors cover?',
      a: 'Our mentor network spans 30+ industries including Technology, Finance, Healthcare, Design, Marketing, Consulting, and more. Each mentor has 10+ years of industry experience.',
    },
  ]

  return (
    <section className="relative py-28 overflow-hidden">
      <div ref={ref} className="max-w-3xl mx-auto px-6">
        {/* Section Header */}
        <div className={`text-center mb-16 ${isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="text-xs font-semibold text-slate-400 tracking-[0.2em] uppercase">FAQ</span>
          <h2 className="font-display text-4xl font-bold text-white mt-3 mb-4">
            Frequently Asked
            <span className="gradient-text"> Questions</span>
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`rounded-xl glass-light border border-white/5 overflow-hidden transition-all duration-500 ${
                isInView ? 'animate-fade-in-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${i * 100 + 200}ms`, animationFillMode: 'both' }}
            >
              <button
                id={`faq-${i}`}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/3 transition-colors"
              >
                <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
                <span className={`text-slate-400 shrink-0 transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}>
                  <Icons.ChevronDown />
                </span>
              </button>
              <div className={`transition-all duration-500 overflow-hidden ${openIndex === i ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   CTA BANNER
   ═══════════════════════════════════════════════════ */
function CTABanner() {
  const [ref, isInView] = useInView()

  return (
    <section className="relative py-20 overflow-hidden">
      <div ref={ref} className="max-w-5xl mx-auto px-6">
        <div className={`relative rounded-3xl overflow-hidden p-12 lg:p-16 text-center ${isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent-600 via-accent-500 to-purple-600 animate-gradient" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />

          <div className="relative z-10">
            <h2 className="font-display text-3xl lg:text-5xl font-bold text-white mb-4">
              Ready to Transform Your Career?
            </h2>
            <p className="max-w-lg mx-auto text-white/80 mb-8">
              Join 50,000+ professionals who have accelerated their careers with our expert guidance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#contact"
                className="px-8 py-4 rounded-xl bg-white text-accent-600 font-bold text-base hover:shadow-2xl hover:shadow-black/30 transition-all duration-300 hover:-translate-y-1 flex items-center gap-2"
              >
                Start Your Journey
                <Icons.ArrowRight />
              </a>
              <a
                href="#services"
                className="px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all duration-300"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   CONTACT SECTION
   ═══════════════════════════════════════════════════ */
function Contact() {
  const [ref, isInView] = useInView()
  const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
    setFormState({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <section id="contact" className="relative py-28 overflow-hidden">
      <div className="glow-orb w-[400px] h-[400px] bg-accent-500 -left-40 bottom-0 opacity-10" />

      <div ref={ref} className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className={`text-center mb-16 ${isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="text-xs font-semibold text-accent-400 tracking-[0.2em] uppercase">Get In Touch</span>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
            Let's Start Your
            <span className="gradient-text"> Journey</span>
          </h2>
          <p className="max-w-xl mx-auto text-slate-400">
            Have questions? Ready to take the next step? Reach out — we'd love to hear from you.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div className={`lg:col-span-2 space-y-6 ${isInView ? 'animate-slide-in-left delay-200' : 'opacity-0'}`} style={{ animationFillMode: 'both' }}>
            {[
              { icon: <Icons.Mail />, label: 'Email', value: 'hello@careerpath.com', href: 'mailto:hello@careerpath.com' },
              { icon: <Icons.Phone />, label: 'Phone', value: '+1 (555) 123-4567', href: 'tel:+15551234567' },
              { icon: <Icons.MapPin />, label: 'Location', value: 'San Francisco, CA', href: '#' },
            ].map((item, i) => (
              <a key={i} href={item.href} className="group flex items-start gap-4 p-5 rounded-xl glass-light border border-white/5 hover:border-accent-500/20 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-400 shrink-0 group-hover:bg-accent-500/20 transition-colors">
                  {item.icon}
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">{item.label}</div>
                  <div className="text-sm text-white font-medium">{item.value}</div>
                </div>
              </a>
            ))}

            {/* Social Links */}
            <div className="flex gap-3 pt-2">
              {[
                { icon: <Icons.Linkedin />, label: 'LinkedIn' },
                { icon: <Icons.Twitter />, label: 'Twitter' },
                { icon: <Icons.Github />, label: 'GitHub' },
              ].map((social, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-lg glass-light border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-accent-500/30 transition-all duration-300"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <form
            onSubmit={handleSubmit}
            className={`lg:col-span-3 p-8 rounded-2xl glass-light border border-white/5 space-y-5 ${isInView ? 'animate-slide-in-right delay-200' : 'opacity-0'}`}
            style={{ animationFillMode: 'both' }}
          >
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="name" className="text-xs text-slate-400 font-medium mb-1.5 block">Full Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formState.name}
                  onChange={e => setFormState({ ...formState, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25 transition-all"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-xs text-slate-400 font-medium mb-1.5 block">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formState.email}
                  onChange={e => setFormState({ ...formState, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25 transition-all"
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="subject" className="text-xs text-slate-400 font-medium mb-1.5 block">Subject</label>
              <input
                id="subject"
                type="text"
                required
                value={formState.subject}
                onChange={e => setFormState({ ...formState, subject: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25 transition-all"
                placeholder="Career Consultation"
              />
            </div>
            <div>
              <label htmlFor="message" className="text-xs text-slate-400 font-medium mb-1.5 block">Message</label>
              <textarea
                id="message"
                rows="4"
                required
                value={formState.message}
                onChange={e => setFormState({ ...formState, message: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25 transition-all resize-none"
                placeholder="Tell us about your career goals..."
              />
            </div>
            <button
              id="contact-submit"
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold text-base hover:shadow-lg hover:shadow-accent-500/25 transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {submitted ? (
                <>
                  <Icons.CheckCircle /> Message Sent Successfully!
                </>
              ) : (
                <>
                  Send Message <Icons.ArrowRight />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════ */
function Footer() {
  const links = {
    Services: ['Career Assessment', 'Skill Development', 'Job Strategy', 'Mentorship', 'Leadership Coaching'],
    Resources: ['Resume Guide', 'Interview Prep', 'Networking Tips', 'Salary Guide', 'Blog'],
    Company: ['About Us', 'Our Team', 'Careers', 'Press', 'Contact'],
  }

  return (
    <footer className="relative border-t border-white/5 bg-slate-950 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#hero" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
                <Icons.Compass />
              </div>
              <span className="font-display text-lg font-bold text-white tracking-tight">
                Career<span className="text-accent-400">Path</span>
              </span>
            </a>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs mb-5">
              Expert career guidance and proven roadmaps to help professionals at every stage achieve their goals.
            </p>
            <div className="flex gap-3">
              {[
                { icon: <Icons.Linkedin />, label: 'LinkedIn' },
                { icon: <Icons.Twitter />, label: 'Twitter' },
                { icon: <Icons.Github />, label: 'GitHub' },
              ].map((social, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-300"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="font-display text-sm font-semibold text-white mb-4">{heading}</h4>
              <ul className="space-y-2.5">
                {items.map(item => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors duration-300">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">© 2025 CareerPath. All rights reserved.</p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookies'].map(link => (
              <a key={link} href="#" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════ */
export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 overflow-x-hidden">
      <Navbar />
      <Hero />
      <Services />
      <Roadmaps />
      <Resources />
      <Testimonials />
      <FAQ />
      <CTABanner />
      <Contact />
      <Footer />
      {/* Floating Chatbot */}
      <Chatbot />
    </div>
  )
}
