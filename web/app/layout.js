"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
require("./globals.css");
const jetbrainsMono = (0, google_1.JetBrains_Mono)({
    subsets: ["latin"],
    variable: "--font-mono",
});
exports.metadata = {
    title: "Universal CLI | The Ultimate Local AI Assistant",
    description: "A hacker-style CLI for managing local LLMs, file systems, and more.",
};
function RootLayout({ children, }) {
    return (<html lang="en">
      <body className={`${jetbrainsMono.variable} font-mono bg-[#050505] text-green-500 antialiased selection:bg-green-500/30 selection:text-green-200`}>
        <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none"/>
        {children}
      </body>
    </html>);
}
