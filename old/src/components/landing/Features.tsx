import { BarChart3, PieChart, CreditCard, Zap, Shield, TrendingUp, Smile, Frown } from "lucide-react"

export default function Features() {
    return (
        <section className="py-12 bg-transparent relative overflow-hidden">
            <div className="container px-4 md:px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(100px,auto)]">

                    {/* 1. Visual Data (Top Left) */}
                    <div className="col-span-12 md:col-span-3 bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-lg flex items-center justify-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                        <div className="w-12 h-12 rounded-full bg-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-400/30">
                            <div className="grid grid-cols-2 gap-1">
                                <div className="w-2 h-2 bg-white rounded-sm"></div>
                                <div className="w-2 h-2 bg-white rounded-sm"></div>
                                <div className="w-2 h-2 bg-white rounded-sm"></div>
                                <div className="w-2 h-2 bg-white rounded-sm"></div>
                            </div>
                        </div>
                        <span className="text-lg font-semibold text-gray-700">Visual Data</span>
                    </div>

                    {/* 2. Marketing & Sales Hub (Center Top) */}
                    <div className="col-span-12 md:col-span-4 row-span-2 bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-lg relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />

                        {/* Flow Lines (SVG) */}
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20" style={{ zIndex: 0 }}>
                            <path d="M80 80 C 80 150, 180 150, 180 200" stroke="#ff4d79" strokeWidth="4" fill="none" strokeDasharray="10 5" />
                            <path d="M300 80 C 300 150, 200 150, 200 200" stroke="#00c6ff" strokeWidth="4" fill="none" strokeDasharray="10 5" />
                        </svg>

                        <div className="relative z-10 flex justify-between mb-12">
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-2">
                                    <Zap className="w-6 h-6 text-pink-500" />
                                </div>
                                <div className="bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">Marketing</div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                                    <CreditCard className="w-6 h-6 text-blue-500" />
                                </div>
                                <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">Sales</div>
                            </div>
                        </div>

                        <div className="relative z-10 flex justify-center">
                            <div className="relative">
                                <div className="w-32 h-32 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 border-4 border-white">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" className="w-24 h-24" />
                                </div>
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-blue-600 text-sm font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                                    <TrendingUp className="w-4 h-4" /> 200%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Finance Management (Right Top) */}
                    <div className="col-span-12 md:col-span-5 row-span-2 bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-lg hover:scale-[1.02] transition-transform duration-300">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Easy & convenient management of finance,</h3>
                        <p className="text-gray-600 mb-8 flex items-center gap-2">invoices, payment cards <span className="text-xl">💳</span></p>

                        <div className="relative h-48 perspective-1000">
                            <div className="absolute left-0 top-0 w-48 h-32 bg-gradient-to-br from-blue-100 to-white rounded-xl shadow-lg border border-white transform rotate-[-10deg] z-10 flex flex-col p-4 justify-between">
                                <div className="w-8 h-5 bg-red-500/20 rounded-sm" />
                                <div className="w-full h-2 bg-gray-100 rounded-full" />
                            </div>
                            <div className="absolute left-12 top-8 w-48 h-32 bg-gradient-to-br from-cyan-400 to-cyan-300 rounded-xl shadow-lg border border-white transform rotate-[-5deg] z-20 flex flex-col p-4 justify-between">
                                <div className="w-8 h-5 bg-white/20 rounded-sm" />
                                <div className="w-12 h-6 bg-blue-800 rounded-md self-end" />
                            </div>
                            <div className="absolute left-24 top-16 w-48 h-32 bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-white transform rotate-[5deg] z-30 flex flex-col p-4 justify-between">
                                <div className="w-8 h-5 bg-orange-500/20 rounded-sm" />
                                <div className="w-8 h-8 bg-orange-500/20 rounded-full self-end" />
                            </div>
                        </div>
                    </div>

                    {/* 4. Report (Left Middle) */}
                    <div className="col-span-12 md:col-span-3 row-span-2 bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-lg relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                        <div className="bg-cyan-100 text-cyan-600 px-3 py-1 rounded-full text-xs font-bold w-fit mb-4 mx-auto">Report</div>
                        <h3 className="text-center text-gray-800 font-medium mb-1">Reduce errors and increase accuracy</h3>
                        <p className="text-center text-gray-800 font-medium mb-6">in data reporting 🤩</p>

                        <div className="bg-blue-500 rounded-t-2xl p-4 pb-0 h-48 relative mt-auto mx-4 shadow-lg shadow-blue-500/30">
                            <div className="bg-white rounded-t-xl p-3 h-full shadow-inner relative z-10 transform translate-y-2 scale-95 opacity-80"></div>
                            <div className="bg-white rounded-t-xl p-3 h-full shadow-lg relative z-20 -mt-[90%]">
                                <div className="flex gap-2 mb-2">
                                    <div className="w-1/2 h-2 bg-gray-100 rounded-full" />
                                    <div className="w-1/4 h-2 bg-gray-100 rounded-full" />
                                </div>
                                <div className="flex gap-2 mb-4">
                                    <div className="w-1/3 h-2 bg-gray-100 rounded-full" />
                                </div>
                                <div className="flex items-end justify-between h-16 gap-1">
                                    {[40, 70, 50, 80, 60].map((h, i) => (
                                        <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-blue-100 rounded-t-sm" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5. Business Tracking (Center Bottom) */}
                    <div className="col-span-12 md:col-span-4 row-span-2 bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-lg flex flex-col items-center text-center hover:scale-[1.02] transition-transform duration-300">
                        <div className="text-blue-500 font-medium mb-2">Business</div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-8">Real-time tracking results</h3>

                        <div className="w-full h-48 relative mt-auto">
                            {/* Wave Chart */}
                            <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
                                    </linearGradient>
                                </defs>
                                <path d="M0 80 C 50 80, 50 40, 100 40 C 150 40, 150 90, 200 90 C 250 90, 250 20, 300 20 V 100 H 0 Z" fill="url(#waveGradient)" />
                                <path d="M0 80 C 50 80, 50 40, 100 40 C 150 40, 150 90, 200 90 C 250 90, 250 20, 300 20" fill="none" stroke="#2563eb" strokeWidth="3" />

                                {/* Highlight Point */}
                                <circle cx="200" cy="90" r="6" fill="white" stroke="#2563eb" strokeWidth="3" />
                            </svg>

                            {/* Months */}
                            <div className="flex justify-between text-xs text-white bg-blue-400/50 rounded-full px-4 py-1 mt-2 backdrop-blur-sm">
                                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span className="bg-white text-blue-600 px-2 rounded-full font-bold">May</span><span>Jun</span><span>Jul</span>
                            </div>
                        </div>
                    </div>

                    {/* 6. Cost Optimization (Right Bottom) */}
                    <div className="col-span-12 md:col-span-5 bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-lg hover:scale-[1.02] transition-transform duration-300">
                        <h3 className="text-lg font-medium text-gray-800 mb-8">Cost optimization, performance improvement</h3>

                        <div className="relative h-32 overflow-hidden flex justify-center items-end">
                            <div className="w-64 h-32 bg-blue-100 rounded-t-full relative overflow-hidden">
                                <div className="absolute bottom-0 left-0 w-full h-full bg-blue-500 origin-bottom transform rotate-[-45deg]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}></div>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-white rounded-t-full flex items-end justify-between px-4 pb-2">
                                    <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-600"><Smile size={16} /></div>
                                    <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600"><Frown size={16} /></div>
                                </div>
                                {/* Needle */}
                                <div className="absolute bottom-0 left-1/2 w-1 h-24 bg-cyan-400 origin-bottom transform rotate-[-30deg] rounded-full z-10"></div>
                            </div>
                        </div>
                    </div>

                    {/* 7. Data Driven (Left Bottom) */}
                    <div className="col-span-12 md:col-span-3 bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-lg flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform duration-300">
                        <h3 className="text-sm font-bold text-gray-800 mb-4">Make data-driven decisions 💯</h3>
                        <div className="grid grid-cols-7 gap-2">
                            {Array.from({ length: 14 }).map((_, i) => (
                                <div key={i} className={`w-6 h-6 rounded-md ${[0, 3, 5, 8, 10, 13].includes(i) ? 'bg-blue-500' : 'bg-blue-100'} transition-colors duration-500`} />
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}
