"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const Terminal_1 = require("@/components/Terminal");
function Home() {
    return (<main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/10 via-black to-black -z-10"/>
      
      <div className="z-10 w-full max-w-5xl flex flex-col gap-8">
        
        {/* Header / Hero */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
            UNIVERSAL CLI
          </h1>
          <p className="text-green-500/60 max-w-2xl mx-auto text-lg">
            The bridge between your Local LLMs and your Filesystem. 
            <span className="block text-sm mt-2 opacity-50">Secure. Fast. Private.</span>
          </p>
        </header>

        {/* The Terminal Interface */}
        <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <Terminal_1.Terminal />
        </div>

        {/* Footer info */}
        <footer className="text-center text-zinc-600 text-xs mt-12">
          <p>Designed for engineers, hackers, and privacy enthusiasts.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="https://github.com/mromasze/universal-cli" target="_blank" className="hover:text-green-400 transition-colors">GitHub</a>
            <span>•</span>
            <a href="#" className="hover:text-green-400 transition-colors">Documentation</a>
            <span>•</span>
            <span>v0.1.0 (Alpha)</span>
          </div>
        </footer>

      </div>
    </main>);
}
