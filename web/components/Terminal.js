"use client";
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Terminal = Terminal;
const react_1 = __importStar(require("react"));
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const WELCOME_MESSAGE = [
    "Initializing Universal CLI v0.1.0...",
    "Loading core modules... [OK]",
    "Connecting to local neural engine... [OK]",
    "System ready. Type 'help' to start.",
];
function Terminal() {
    const [history, setHistory] = (0, react_1.useState)([]);
    const [input, setInput] = (0, react_1.useState)("");
    const [isTyping, setIsTyping] = (0, react_1.useState)(false);
    const scrollRef = (0, react_1.useRef)(null);
    const inputRef = (0, react_1.useRef)(null);
    // Initial boot sequence
    (0, react_1.useEffect)(() => {
        let delay = 0;
        WELCOME_MESSAGE.forEach((msg, i) => {
            delay += 500;
            setTimeout(() => {
                addLine("system", msg);
            }, delay);
        });
    }, []);
    // Auto-scroll
    (0, react_1.useEffect)(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);
    const addLine = (type, content) => {
        setHistory((prev) => [
            ...prev,
            { id: Math.random().toString(36).substr(2, 9), type, content },
        ]);
    };
    const handleCommand = async (cmd) => {
        const command = cmd.trim().toLowerCase();
        if (command === "clear") {
            setHistory([]);
            return;
        }
        if (command === "help") {
            simulateTyping([
                "Available commands:",
                "  features  - Show core capabilities",
                "  install   - Installation instructions",
                "  about     - What is Universal CLI?",
                "  clear     - Clear terminal",
            ]);
            return;
        }
        if (command === "features") {
            setHistory(prev => [...prev, {
                    id: 'features-' + Date.now(),
                    type: 'component',
                    content: <FeaturesGrid />
                }]);
            return;
        }
        if (command === "install") {
            simulateTyping([
                "To install Universal CLI, run:",
                "npm install -g @universal-cli/core (Coming Soon)",
                "For now, clone the repo and run locally."
            ]);
            return;
        }
        if (command === "about") {
            simulateTyping([
                "Universal CLI is a next-gen terminal assistant.",
                "It connects Local LLMs (Ollama) with your filesystem.",
                "No cloud dependency. Total privacy. Infinite power."
            ]);
            return;
        }
        simulateTyping([`Command not found: ${command}. Type 'help' for available commands.`]);
    };
    const simulateTyping = (lines) => {
        setIsTyping(true);
        let delay = 0;
        lines.forEach((line, index) => {
            delay += 50; // Delay between lines
            setTimeout(() => {
                addLine("ai", line);
                if (index === lines.length - 1)
                    setIsTyping(false);
            }, delay);
        });
    };
    const onSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping)
            return;
        const cmd = input;
        addLine("user", cmd);
        setInput("");
        // Simulate processing delay
        setTimeout(() => handleCommand(cmd), 300);
    };
    const focusInput = () => {
        inputRef.current?.focus();
    };
    return (<div className="w-full max-w-4xl mx-auto h-[600px] bg-black/90 rounded-lg border border-green-500/30 overflow-hidden flex flex-col shadow-[0_0_50px_-10px_rgba(34,197,94,0.3)] font-mono text-sm md:text-base relative" onClick={focusInput}>
        {/* Terminal Header */}
        <div className="bg-zinc-900/90 border-b border-green-500/20 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <lucide_react_1.Terminal className="w-4 h-4 text-green-500"/>
                <span className="text-green-500/80 font-bold tracking-wider">UNIVERSAL_CLI_TERM</span>
            </div>
            <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50"/>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"/>
                <div className="w-3 h-3 rounded-full bg-green-500/50"/>
            </div>
        </div>

        {/* Terminal Body */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-2 scroll-smooth">
            <framer_motion_1.AnimatePresence>
                {history.map((line) => (<framer_motion_1.motion.div key={line.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={(0, utils_1.cn)("break-words", {
                "text-green-400": line.type === "system",
                "text-white font-bold": line.type === "user",
                "text-green-200": line.type === "ai",
            })}>
                        {line.type === "user" && <span className="text-green-600 mr-2">➜ ~</span>}
                        {line.type === "ai" && <span className="text-purple-400 mr-2">🤖</span>}
                        {line.content}
                    </framer_motion_1.motion.div>))}
            </framer_motion_1.AnimatePresence>
            
            {/* Active Input Line */}
            <form onSubmit={onSubmit} className="flex items-center gap-2 mt-4">
                <span className="text-green-500">➜</span>
                <span className="text-blue-400">~/universe</span>
                <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-white caret-green-500" autoFocus spellCheck="false" autoComplete="off"/>
            </form>
            <div className="h-4"/> {/* Spacer */}
        </div>
    </div>);
}
function FeaturesGrid() {
    const features = [
        { icon: lucide_react_1.ShieldCheck, title: "Local First", desc: "Your data never leaves your machine. Privacy by design." },
        { icon: lucide_react_1.Cpu, title: "Ollama Integration", desc: "Seamlessly connect with local models like Llama 3, Mistral." },
        { icon: lucide_react_1.Zap, title: "System Control", desc: "Safe filesystem access to read, write, and analyze code." },
    ];
    return (<div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
            {features.map((f, i) => (<div key={i} className="bg-green-900/20 border border-green-500/30 p-4 rounded hover:bg-green-900/30 transition-colors">
                    <f.icon className="w-6 h-6 text-green-400 mb-2"/>
                    <h3 className="font-bold text-green-300">{f.title}</h3>
                    <p className="text-xs text-green-100/70">{f.desc}</p>
                </div>))}
        </div>);
}
