import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Play, Zap, Palette, BarChart3, Shield } from 'lucide-react';
import { Link } from 'wouter';
import { BlurText } from '@/components/ui/blur-text';
import { VideoBackground } from '@/components/landing/video-background';

function FadeTop({ height = '200px' }) {
  return (
    <div 
      className="absolute top-0 left-0 right-0 pointer-events-none z-0" 
      style={{ height, background: 'linear-gradient(to top, transparent, black)' }} 
    />
  );
}

function FadeBottom({ height = '200px' }) {
  return (
    <div 
      className="absolute bottom-0 left-0 right-0 pointer-events-none z-0" 
      style={{ height, background: 'linear-gradient(to bottom, transparent, black)' }} 
    />
  );
}

function Navbar() {
  return (
    <nav className="fixed top-4 left-0 right-0 z-50 px-8 lg:px-16 py-3 flex items-center justify-between pointer-events-auto">
      <div className="flex-shrink-0">
        <img src="/src/assets/logo-icon.png" alt="Logo" className="h-12 w-12 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
      </div>
      
      <div className="hidden md:flex items-center justify-center liquid-glass rounded-full px-1.5 py-1">
        <a href="#home" className="px-3 py-2 text-sm font-medium text-foreground/90 font-body hover:text-white transition-colors">Home</a>
        <a href="#services" className="px-3 py-2 text-sm font-medium text-foreground/90 font-body hover:text-white transition-colors">Capabilities</a>
        <a href="#process" className="px-3 py-2 text-sm font-medium text-foreground/90 font-body hover:text-white transition-colors">Process</a>
        <Link href="/login" className="px-3 py-2 text-sm font-medium text-foreground/90 font-body hover:text-white transition-colors">Log In</Link>
        <Link href="/signup">
          <button className="ml-2 bg-white text-black rounded-full px-3.5 py-1.5 text-sm font-body font-medium flex items-center gap-1 hover:bg-gray-200 transition-colors">
            Get Started <ArrowUpRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
      
      <div className="md:hidden flex items-center gap-4">
        <Link href="/login" className="text-sm font-medium text-foreground/90 font-body hover:text-white transition-colors">Log In</Link>
        <Link href="/signup">
          <button className="bg-white text-black rounded-full px-3 py-1 text-sm font-body font-medium flex items-center gap-1 hover:bg-gray-200 transition-colors">
            Start <ArrowUpRight className="h-3 w-3" />
          </button>
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section id="home" className="relative overflow-visible" style={{ height: '1000px' }}>
      <VideoBackground 
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4"
        poster="/images/hero_bg.jpeg"
        className="absolute left-0 w-full h-auto object-contain z-0"
        style={{ top: '20%' }}
      />
      <div className="absolute inset-0 bg-black/5 z-0 pointer-events-none" />
      <FadeBottom height="300px" />
      
      <div className="absolute inset-0 flex flex-col items-center z-10" style={{ paddingTop: '150px' }}>
        <div className="flex items-center gap-2 liquid-glass rounded-full px-1 py-1 pr-4 mb-6">
          <div className="bg-white text-black rounded-full px-3 py-1 text-xs font-semibold font-body">New</div>
          <span className="text-white/90 text-sm font-medium font-body">Introducing HyperDrive Model Optimization.</span>
        </div>
        
        <BlurText 
          text="The AI Performance Your Infrastructure Deserves"
          className="text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic text-white leading-[0.8] max-w-2xl tracking-[-4px] text-center mb-6"
          delay={100}
        />
        
        <motion.p 
          className="text-sm md:text-base text-white font-body font-light leading-tight text-center max-w-md mb-8"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
          animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          Blazing fast inference. Minimal memory footprint. Built for scale, refined by experts. This is model deployment, wildly reimagined.
        </motion.p>
        
        <motion.div 
          className="flex items-center gap-4"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
          animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          <Link href="/signup">
            <button className="liquid-glass-strong rounded-full px-5 py-2.5 text-white font-body font-medium flex items-center gap-2 hover:bg-white/10 transition-colors">
              Get Started <ArrowUpRight className="h-4 w-4" />
            </button>
          </Link>
          <button className="text-white font-body font-medium px-4 py-2 flex items-center gap-2 hover:text-white/80 transition-colors">
            <Play className="h-4 w-4 fill-white" /> Watch the Film
          </button>
        </motion.div>
        
        <div className="mt-auto pb-8 pt-16 flex flex-col items-center w-full max-w-5xl px-6">
          <div className="liquid-glass rounded-full px-4 py-1.5 mb-8">
            <span className="text-xs text-white/70 font-body uppercase tracking-widest">Trusted by the teams behind</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-16 w-full">
            <span className="text-2xl md:text-3xl font-heading italic text-white/50 hover:text-white transition-colors cursor-default">Stripe</span>
            <span className="text-2xl md:text-3xl font-heading italic text-white/50 hover:text-white transition-colors cursor-default">Vercel</span>
            <span className="text-2xl md:text-3xl font-heading italic text-white/50 hover:text-white transition-colors cursor-default">Linear</span>
            <span className="text-2xl md:text-3xl font-heading italic text-white/50 hover:text-white transition-colors cursor-default">Notion</span>
            <span className="text-2xl md:text-3xl font-heading italic text-white/50 hover:text-white transition-colors cursor-default">Figma</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function StartSection() {
  return (
    <section id="process" className="relative w-full min-h-[500px] flex items-center justify-center py-24 overflow-hidden border-t border-white/5">
      <VideoBackground 
        src="https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8"
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-40"
      />
      <FadeTop height="200px" />
      <FadeBottom height="200px" />
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto px-6">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body mb-6">
          How It Works
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9] mb-6">
          You upload it. We optimize it.
        </h2>
        <p className="text-white/60 font-body font-light text-sm md:text-base max-w-xl mx-auto mb-8">
          Share your ONNX or PyTorch weights. HyperDrive handles the rest&mdash;quantization, layer fusion, benchmarking. Ready for production in seconds.
        </p>
        <Link href="/signup">
          <button className="liquid-glass-strong rounded-full px-6 py-3 text-white font-body font-medium flex items-center gap-2 hover:scale-105 transition-transform">
            Get Started <ArrowUpRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
    </section>
  );
}

function FeaturesChess() {
  return (
    <section id="services" className="py-24 px-6 max-w-6xl mx-auto relative z-10">
      <div className="flex flex-col items-center mb-16 text-center">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body mb-6">
          Capabilities
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9]">
          Pro features. Zero complexity.
        </h2>
      </div>

      <div className="space-y-24">
        {/* Row 1 */}
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24">
          <div className="flex-1 space-y-6">
            <h3 className="text-3xl md:text-4xl font-heading italic text-white leading-tight">
              Designed for speed.<br />Built to perform.
            </h3>
            <p className="text-white/60 font-body font-light text-sm md:text-base">
              Every layer is analyzed. We leverage cutting-edge techniques like INT8 quantization and TensorRT fusion to make models 3x faster out of the box.
            </p>
            <button className="liquid-glass-strong rounded-full px-6 py-2.5 text-white font-body font-medium flex items-center gap-2 mt-4 hover:scale-105 transition-transform w-fit">
              Learn more <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 w-full">
            <div className="liquid-glass rounded-2xl overflow-hidden aspect-[4/3] bg-black/50 p-2">
              <img 
                src="https://motionsites.ai/assets/hero-finlytic-preview-CV9g0FHP.gif" 
                alt="Feature preview" 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-24">
          <div className="flex-1 space-y-6">
            <h3 className="text-3xl md:text-4xl font-heading italic text-white leading-tight">
              Monitor Drift.<br />Automatically.
            </h3>
            <p className="text-white/60 font-body font-light text-sm md:text-base">
              HyperDrive monitors live data drift, accuracy drops, and performance in real time. We let you know exactly when to retrain.
            </p>
            <button className="liquid-glass-strong rounded-full px-6 py-2.5 text-white font-body font-medium flex items-center gap-2 mt-4 hover:scale-105 transition-transform w-fit">
              See how it works <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 w-full">
            <div className="liquid-glass rounded-2xl overflow-hidden aspect-[4/3] bg-black/50 p-2">
              <img 
                src="https://motionsites.ai/assets/hero-wealth-preview-B70idl_u.gif" 
                alt="Feature preview" 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  return (
    <section className="py-24 px-6 max-w-6xl mx-auto relative z-10 border-t border-white/5">
      <div className="flex flex-col items-center mb-16 text-center">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body mb-6">
          Why Us
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9]">
          The difference is everything.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="liquid-glass rounded-2xl p-6 flex flex-col items-start hover:-translate-y-1 transition-transform duration-300">
          <div className="liquid-glass-strong rounded-full w-10 h-10 flex items-center justify-center mb-6">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <h4 className="text-white font-body font-medium text-lg mb-2">Milliseconds, Not Seconds</h4>
          <p className="text-white/60 font-body font-light text-sm">
            Drop inference latency dramatically. Because waiting isn't an option for real-time AI.
          </p>
        </div>
        
        <div className="liquid-glass rounded-2xl p-6 flex flex-col items-start hover:-translate-y-1 transition-transform duration-300">
          <div className="liquid-glass-strong rounded-full w-10 h-10 flex items-center justify-center mb-6">
            <Palette className="h-4 w-4 text-white" />
          </div>
          <h4 className="text-white font-body font-medium text-lg mb-2">Precision Maintained</h4>
          <p className="text-white/60 font-body font-light text-sm">
            Quantize models down to footprint fractions while maintaining high accuracy and F1 scores.
          </p>
        </div>
        
        <div className="liquid-glass rounded-2xl p-6 flex flex-col items-start hover:-translate-y-1 transition-transform duration-300">
          <div className="liquid-glass-strong rounded-full w-10 h-10 flex items-center justify-center mb-6">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <h4 className="text-white font-body font-medium text-lg mb-2">Edge Ready</h4>
          <p className="text-white/60 font-body font-light text-sm">
            Deploy smaller weights to low-compute edge devices without sacrificing capabilities.
          </p>
        </div>
        
        <div className="liquid-glass rounded-2xl p-6 flex flex-col items-start hover:-translate-y-1 transition-transform duration-300">
          <div className="liquid-glass-strong rounded-full w-10 h-10 flex items-center justify-center mb-6">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <h4 className="text-white font-body font-medium text-lg mb-2">Secure & Private</h4>
          <p className="text-white/60 font-body font-light text-sm">
            All optimizations happen in memory. Your raw model weights are never exposed or stored.
          </p>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="relative w-full py-32 overflow-hidden border-y border-white/5">
      <VideoBackground 
        src="https://stream.mux.com/NcU3HlHeF7CUL86azTTzpy3Tlb00d6iF3BmCdFslMJYM.m3u8"
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-30 mix-blend-screen"
        style={{ filter: 'saturate(0)' }}
      />
      <FadeTop height="200px" />
      <FadeBottom height="200px" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="liquid-glass rounded-3xl p-12 md:p-16 w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left">
            <div>
              <div className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white mb-2">1M+</div>
              <div className="text-white/60 font-body font-light text-sm">Inferences Optimized</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white mb-2">99.9%</div>
              <div className="text-white/60 font-body font-light text-sm">Precision Kept</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white mb-2">3.2x</div>
              <div className="text-white/60 font-body font-light text-sm">Speedup Average</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white mb-2">80%</div>
              <div className="text-white/60 font-body font-light text-sm">Memory Reduction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-24 px-6 max-w-6xl mx-auto relative z-10">
      <div className="flex flex-col items-center mb-16 text-center">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body mb-6">
          What They Say
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9]">
          Don't take our word for it.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="liquid-glass rounded-2xl p-8 flex flex-col justify-between hover:bg-white/5 transition-colors cursor-default">
          <p className="text-white/80 font-body font-light text-sm italic mb-8">
            "We took our ResNet-50 PyTorch model and shrank the memory footprint by 78% without noticeable accuracy degradation."
          </p>
          <div>
            <div className="text-white font-body font-medium text-sm">Sarah Chen</div>
            <div className="text-white/50 font-body font-light text-xs">ML Engineer, Luminary</div>
          </div>
        </div>
        
        <div className="liquid-glass rounded-2xl p-8 flex flex-col justify-between hover:bg-white/5 transition-colors cursor-default">
          <p className="text-white/80 font-body font-light text-sm italic mb-8">
            "Inference speeds up 4x. That's not a typo. The platform just works seamlessly when targeting TensorRT."
          </p>
          <div>
            <div className="text-white font-body font-medium text-sm">Marcus Webb</div>
            <div className="text-white/50 font-body font-light text-xs">Head of AI, Arcline</div>
          </div>
        </div>
        
        <div className="liquid-glass rounded-2xl p-8 flex flex-col justify-between hover:bg-white/5 transition-colors cursor-default">
          <p className="text-white/80 font-body font-light text-sm italic mb-8">
            "They didn't just optimize our weights. They saved us thousands in cloud inference costs. World-class."
          </p>
          <div>
            <div className="text-white font-body font-medium text-sm">Elena Voss</div>
            <div className="text-white/50 font-body font-light text-xs">CTO, Helix</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaFooter() {
  return (
    <section className="relative w-full pt-32 pb-0 overflow-hidden">
      <VideoBackground 
        src="https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8"
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-40"
      />
      <FadeTop height="200px" />
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto px-6 h-full min-h-[400px]">
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-heading italic text-white leading-[0.85] mb-6">
          Your next website starts here.
        </h2>
        <p className="text-white/60 font-body font-light text-sm md:text-base max-w-xl mx-auto mb-10">
          Book a free strategy call. See what AI-powered design can do. No commitment, no pressure. Just possibilities.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-32">
          <Link href="/signup">
            <button className="liquid-glass-strong rounded-full px-6 py-3 text-white font-body font-medium w-full sm:w-auto hover:scale-105 transition-transform flex items-center justify-center gap-2">
              Sign Up Now <ArrowUpRight className="h-4 w-4" />
            </button>
          </Link>
          <Link href="/login">
            <button className="bg-white text-black rounded-full px-6 py-3 font-body font-medium w-full sm:w-auto hover:bg-gray-200 transition-colors">
              Log In to Dashboard
            </button>
          </Link>
        </div>

        <footer className="w-full mt-auto pt-8 pb-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white/40 text-xs font-body">
            &copy; 2026 HyperDrive. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-white/40 text-xs font-body">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </footer>
      </div>
    </section>
  );
}

export default function HeroPage() {
  return (
    <div className="landing-theme bg-black min-h-screen selection:bg-white/20">
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <div className="bg-black">
          <StartSection />
          <FeaturesChess />
          <FeaturesGrid />
          <Stats />
          <Testimonials />
          <CtaFooter />
        </div>
      </div>
    </div>
  );
}
