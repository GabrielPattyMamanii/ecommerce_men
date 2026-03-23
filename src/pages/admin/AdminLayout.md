< !DOCTYPE html >

    <html class="dark" lang="en"><head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>Technical Admin Dashboard Overview</title>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <script id="tailwind-config">
            tailwind.config = {
                darkMode: "class",
            theme: {
                extend: {
                colors: {
                "primary": "#0d46f2",
            "background-light": "#f5f6f8",
            "background-dark": "#101422",
            "surface-dark": "#1a1f30",
            "accent-blue": "#3b82f6",
            "accent-green": "#10b981",
            "accent-red": "#ef4444",
                    },
            fontFamily: {
                "display": ["Space Grotesk", "sans-serif"],
            "sans": ["Space Grotesk", "sans-serif"]
                    },
            borderRadius: {
                "DEFAULT": "0.125rem",
            "sm": "0.125rem",
            "lg": "0.25rem",
            "xl": "0.5rem",
            "full": "9999px"
                    },
                },
            },
        }
        </script>
        <style>
            .glow-text {
                text - shadow: 0 0 10px rgba(13, 70, 242, 0.5);
        }
            .glow-chart path {
                filter: drop-shadow(0 0 4px rgba(13, 70, 242, 0.4));
        }
            /* Custom scrollbar for technical feel */
            ::-webkit-scrollbar {
                width: 6px;
        }
            ::-webkit-scrollbar-track {
                background: #101422; 
        }
            ::-webkit-scrollbar-thumb {
                background: #2a3450;
            border-radius: 2px;
        }
            ::-webkit-scrollbar-thumb:hover {
                background: #0d46f2; 
        }
        </style>
    </head>
        <body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display antialiased overflow-hidden">
            <div class="flex h-screen w-full">
                <!-- Sidebar -->
                <aside class="hidden w-64 flex-col border-r border-slate-800 bg-background-dark dark:bg-[#0c101b] lg:flex">
                    <div class="flex h-16 items-center gap-3 px-6 border-b border-slate-800">
                        <div class="flex h-8 w-8 items-center justify-center rounded bg-primary text-white">
                            <span class="material-symbols-outlined text-[20px]">hexagon</span>
                        </div>
                        <span class="text-lg font-bold tracking-widest text-white">TECH_ADMIN</span>
                    </div>
                    <div class="flex flex-1 flex-col justify-between p-4">
                        <nav class="flex flex-col gap-2">
                            <p class="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 mt-2">Main Menu</p>
                            <a class="flex items-center gap-3 rounded px-4 py-3 bg-primary/10 text-primary border-l-2 border-primary transition-all" href="#">
                                <span class="material-symbols-outlined">dashboard</span>
                                <span class="text-sm font-medium">Dashboard</span>
                            </a>
                            <a class="flex items-center gap-3 rounded px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors" href="#">
                                <span class="material-symbols-outlined">inventory_2</span>
                                <span class="text-sm font-medium">Inventory</span>
                            </a>
                            <a class="flex items-center gap-3 rounded px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors" href="#">
                                <span class="material-symbols-outlined">shopping_cart</span>
                                <span class="text-sm font-medium">Orders</span>
                                <span class="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">12</span>
                            </a>
                            <a class="flex items-center gap-3 rounded px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors" href="#">
                                <span class="material-symbols-outlined">group</span>
                                <span class="text-sm font-medium">Customers</span>
                            </a>
                            <a class="flex items-center gap-3 rounded px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors" href="#">
                                <span class="material-symbols-outlined">monitoring</span>
                                <span class="text-sm font-medium">Analytics</span>
                            </a>
                        </nav>
                        <div class="flex flex-col gap-4">
                            <div class="rounded border border-slate-800 bg-slate-900/50 p-4">
                                <div class="flex items-center gap-3 mb-2">
                                    <div class="bg-center bg-no-repeat bg-cover rounded h-8 w-8 grayscale opacity-80" data-alt="Abstract male fashion portrait" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuD8QTxn3kSVmzfqN0afqOacHwvj2vVfYJwpSFGwlk9Il4PiiJTT-fZYcbRLdafRvbCoLm-CRsiQHacHiow_nTuu56kMPipoucc_45Xswr-eBGsvc3cOnrstZ59mJVJjnKmLuaYbzY5JfJwHZY9cpmGqr7hS_alP2-Dd-1HcRA2YCNMWzHM9x4bry6Sd-Ghh9flsnAhDSksaJyJS9Oa-nJagT52PeQzihce_QcfjUAmhAYoV_4rv31EHD7yRhFaADV5iV3pTF-kLecOF");'></div>
                                    <div>
                                        <p class="text-xs font-bold text-white">SYS_ADMIN_01</p>
                                        <p class="text-[10px] text-primary">ONLINE • V.2.4</p>
                                    </div>
                                </div>
                                <button class="flex w-full items-center justify-center gap-2 rounded bg-slate-800 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                                    <span class="material-symbols-outlined text-[16px]">logout</span>
                                    LOGOUT
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>
                <!-- Main Content -->
                <main class="flex flex-1 flex-col overflow-y-auto bg-background-light dark:bg-background-dark relative">
                    <!-- Technical Grid Background Overlay -->
                    <div class="absolute inset-0 pointer-events-none opacity-[0.03]" style="background-image: linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px); background-size: 40px 40px;"></div>
                    <!-- Header -->
                    <header class="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-800 bg-background-dark/90 backdrop-blur px-8">
                        <div class="flex items-center gap-4 text-white">
                            <button class="lg:hidden text-slate-400 hover:text-white">
                                <span class="material-symbols-outlined">menu</span>
                            </button>
                            <h2 class="text-lg font-bold tracking-tight uppercase glow-text">Performance Overview</h2>
                        </div>
                        <div class="flex items-center gap-6">
                            <div class="relative hidden sm:block">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                    <span class="material-symbols-outlined text-[20px]">search</span>
                                </span>
                                <input class="h-10 w-64 rounded border border-slate-700 bg-slate-900/50 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono tracking-wide" placeholder="SEARCH DATABASE..." type="text" />
                            </div>
                            <div class="flex items-center gap-4">
                                <button class="relative rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                                    <span class="material-symbols-outlined">notifications</span>
                                    <span class="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background-dark"></span>
                                </button>
                                <div class="h-8 w-px bg-slate-800"></div>
                                <div class="bg-center bg-no-repeat bg-cover rounded h-9 w-9 ring-2 ring-slate-800" data-alt="Admin user profile picture" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBxV5Akmn1yxtJtHWMNQ2-V4oZpzMBhxaIZUdlEr5VZOuZz9dkEiHxPKfGFkYMToE2rn6xo2xaoTtrpSMmOnoCVO_cRNhnqMBZGNmUDDLuvalkglSoKt6ICoolOkyXi4_cbMtvBAAIo2dn7lvAhtOfFD9V6ADXpAObNERlCG6lvtRV74nY8mMEeFmP5vSzfMX3qj2M-ljkEdgTETfg1lp-5KORq76IcFxxkodP8bKML_ZOpRbYWNYavnF4tEIpXdajbAd0HY899Tw8-");'></div>
                            </div>
                        </div>
                    </header>
                    <div class="p-8 relative z-0">
                        <!-- KPI Grid -->
                        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                            <!-- KPI 1 -->
                            <div class="group relative overflow-hidden rounded border border-slate-800 bg-[#161b2e] p-6 hover:border-primary/50 transition-colors">
                                <div class="absolute right-0 top-0 h-16 w-16 bg-gradient-to-br from-primary/10 to-transparent blur-2xl"></div>
                                <div class="flex items-start justify-between">
                                    <div>
                                        <p class="text-xs font-medium text-slate-400 uppercase tracking-widest">Live Visitors</p>
                                        <h3 class="mt-2 text-3xl font-bold text-white tracking-tight">1,245</h3>
                                    </div>
                                    <span class="flex items-center rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500">
                                        <span class="material-symbols-outlined text-[16px] mr-1">trending_up</span>
                                        +12%
                                    </span>
                                </div>
                                <div class="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div class="h-full bg-primary w-[75%]"></div>
                                </div>
                            </div>
                            <!-- KPI 2 -->
                            <div class="group relative overflow-hidden rounded border border-slate-800 bg-[#161b2e] p-6 hover:border-primary/50 transition-colors">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <p class="text-xs font-medium text-slate-400 uppercase tracking-widest">Today's Revenue</p>
                                        <h3 class="mt-2 text-3xl font-bold text-white tracking-tight">$14,320</h3>
                                    </div>
                                    <span class="flex items-center rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500">
                                        <span class="material-symbols-outlined text-[16px] mr-1">trending_up</span>
                                        +8%
                                    </span>
                                </div>
                                <div class="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div class="h-full bg-white w-[60%]"></div>
                                </div>
                            </div>
                            <!-- KPI 3 -->
                            <div class="group relative overflow-hidden rounded border border-slate-800 bg-[#161b2e] p-6 hover:border-primary/50 transition-colors">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <p class="text-xs font-medium text-slate-400 uppercase tracking-widest">Pending Shipments</p>
                                        <h3 class="mt-2 text-3xl font-bold text-white tracking-tight">42</h3>
                                    </div>
                                    <span class="flex items-center rounded bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-500">
                                        <span class="material-symbols-outlined text-[16px] mr-1">trending_down</span>
                                        -2%
                                    </span>
                                </div>
                                <div class="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div class="h-full bg-rose-500 w-[20%]"></div>
                                </div>
                            </div>
                            <!-- KPI 4 -->
                            <div class="group relative overflow-hidden rounded border border-slate-800 bg-[#161b2e] p-6 hover:border-primary/50 transition-colors">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <p class="text-xs font-medium text-slate-400 uppercase tracking-widest">Active Returns</p>
                                        <h3 class="mt-2 text-3xl font-bold text-white tracking-tight">8</h3>
                                    </div>
                                    <span class="flex items-center rounded bg-slate-700/50 px-2 py-1 text-xs font-medium text-slate-400">
                                        <span class="material-symbols-outlined text-[16px] mr-1">remove</span>
                                        0%
                                    </span>
                                </div>
                                <div class="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div class="h-full bg-slate-400 w-[10%]"></div>
                                </div>
                            </div>
                        </div>
                        <!-- Charts Section -->
                        <div class="grid gap-6 lg:grid-cols-3 mb-8">
                            <!-- Main Chart -->
                            <div class="lg:col-span-2 rounded border border-slate-800 bg-[#161b2e] p-6">
                                <div class="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 class="text-lg font-bold text-white uppercase tracking-wider">Sales Performance</h3>
                                        <div class="flex items-center gap-2 mt-1">
                                            <span class="text-2xl font-bold text-white">$48.5k</span>
                                            <span class="text-sm text-emerald-500 font-medium">+15.3%</span>
                                            <span class="text-xs text-slate-500">vs last 7 days</span>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button class="px-3 py-1 rounded bg-slate-800 text-xs font-bold text-white hover:bg-primary transition-colors">1D</button>
                                        <button class="px-3 py-1 rounded bg-primary text-xs font-bold text-white">1W</button>
                                        <button class="px-3 py-1 rounded bg-slate-800 text-xs font-bold text-white hover:bg-primary transition-colors">1M</button>
                                    </div>
                                </div>
                                <div class="relative h-[300px] w-full pt-4 glow-chart">
                                    <!-- Simulated Chart SVG -->
                                    <svg class="h-full w-full overflow-visible" preserveaspectratio="none" viewbox="0 0 800 300">
                                        <!-- Grid Lines -->
                                        <line stroke="#1e293b" stroke-dasharray="4 4" x1="0" x2="800" y1="0" y2="0"></line>
                                        <line stroke="#1e293b" stroke-dasharray="4 4" x1="0" x2="800" y1="75" y2="75"></line>
                                        <line stroke="#1e293b" stroke-dasharray="4 4" x1="0" x2="800" y1="150" y2="150"></line>
                                        <line stroke="#1e293b" stroke-dasharray="4 4" x1="0" x2="800" y1="225" y2="225"></line>
                                        <line stroke="#1e293b" stroke-dasharray="4 4" x1="0" x2="800" y1="300" y2="300"></line>
                                        <!-- Gradient Fill -->
                                        <defs>
                                            <lineargradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                                <stop offset="0%" stop-color="#0d46f2" stop-opacity="0.3"></stop>
                                                <stop offset="100%" stop-color="#0d46f2" stop-opacity="0"></stop>
                                            </lineargradient>
                                        </defs>
                                        <path d="M0,220 C100,220 150,150 200,180 C250,210 300,100 400,120 C500,140 550,50 600,80 C650,110 700,40 800,60 L800,300 L0,300 Z" fill="url(#chartGradient)"></path>
                                        <!-- Line -->
                                        <path d="M0,220 C100,220 150,150 200,180 C250,210 300,100 400,120 C500,140 550,50 600,80 C650,110 700,40 800,60" fill="none" stroke="#0d46f2" stroke-width="3"></path>
                                        <!-- Data Points -->
                                        <circle cx="400" cy="120" fill="#0d46f2" r="4" stroke="white" stroke-width="2"></circle>
                                        <circle cx="600" cy="80" fill="#0d46f2" r="4" stroke="white" stroke-width="2"></circle>
                                    </svg>
                                </div>
                                <div class="flex justify-between mt-4 text-xs font-mono text-slate-500 uppercase">
                                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                                </div>
                            </div>
                            <!-- Secondary Chart/Traffic -->
                            <div class="rounded border border-slate-800 bg-[#161b2e] p-6 flex flex-col">
                                <div class="mb-4">
                                    <h3 class="text-lg font-bold text-white uppercase tracking-wider">Traffic Source</h3>
                                    <p class="text-xs text-slate-400 mt-1">Real-time user acquisition</p>
                                </div>
                                <div class="flex-1 flex flex-col gap-6 justify-center">
                                    <div class="space-y-4">
                                        <div>
                                            <div class="flex justify-between text-sm font-medium mb-1">
                                                <span class="text-white">Direct</span>
                                                <span class="text-slate-400">45%</span>
                                            </div>
                                            <div class="h-2 w-full rounded bg-slate-800 overflow-hidden">
                                                <div class="h-full bg-white w-[45%]"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div class="flex justify-between text-sm font-medium mb-1">
                                                <span class="text-white">Social Media</span>
                                                <span class="text-slate-400">32%</span>
                                            </div>
                                            <div class="h-2 w-full rounded bg-slate-800 overflow-hidden">
                                                <div class="h-full bg-primary w-[32%]"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div class="flex justify-between text-sm font-medium mb-1">
                                                <span class="text-white">Organic Search</span>
                                                <span class="text-slate-400">18%</span>
                                            </div>
                                            <div class="h-2 w-full rounded bg-slate-800 overflow-hidden">
                                                <div class="h-full bg-indigo-500 w-[18%]"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div class="flex justify-between text-sm font-medium mb-1">
                                                <span class="text-white">Referral</span>
                                                <span class="text-slate-400">5%</span>
                                            </div>
                                            <div class="h-2 w-full rounded bg-slate-800 overflow-hidden">
                                                <div class="h-full bg-slate-600 w-[5%]"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="rounded bg-slate-900/50 p-4 border border-slate-800">
                                        <div class="flex items-center gap-3">
                                            <div class="p-2 bg-emerald-500/10 rounded text-emerald-500">
                                                <span class="material-symbols-outlined">bolt</span>
                                            </div>
                                            <div>
                                                <p class="text-xs text-slate-400 font-mono">SYSTEM STATUS</p>
                                                <p class="text-sm font-bold text-white">OPTIMAL PERFORMANCE</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Recent Activity Table -->
                        <div class="rounded border border-slate-800 bg-[#161b2e] overflow-hidden">
                            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                                <h3 class="text-lg font-bold text-white uppercase tracking-wider">Recent Activity</h3>
                                <button class="text-xs font-bold text-primary hover:text-white transition-colors uppercase">View All</button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-sm text-slate-400">
                                    <thead class="bg-slate-900/50 text-xs uppercase text-slate-500 font-mono">
                                        <tr>
                                            <th class="px-6 py-3 font-semibold tracking-wider">Order ID</th>
                                            <th class="px-6 py-3 font-semibold tracking-wider">Product</th>
                                            <th class="px-6 py-3 font-semibold tracking-wider">Customer</th>
                                            <th class="px-6 py-3 font-semibold tracking-wider">Status</th>
                                            <th class="px-6 py-3 font-semibold tracking-wider text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-800">
                                        <tr class="hover:bg-slate-800/30 transition-colors">
                                            <td class="px-6 py-4 font-mono text-white">#ORD-7329</td>
                                            <td class="px-6 py-4">
                                                <div class="flex items-center gap-3">
                                                    <div class="h-8 w-8 rounded bg-slate-800 bg-center bg-cover" data-alt="Technical fabric jacket thumbnail" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCYbrkvBfCHBIfjcIj8O4PuT51IfPsd9G78QiRHOIgawuXgwp8jKDSoDgqnwbSpfJ-5izadTAoOVVuQVSkTdHKCcWOK6Zs2e9MXv11k8nYuhN7qIbaSdmNtvTYZF2MP0xhVVO_UFzWr-pmzng81nPZgG3odCivelfylr6vfI1pAelqlHHqZ3vDaaRIdvTbdY_MsHDypaT36sJu2FZncyfTfhSANxIhu1rwy2Bo2LMKWFfV7BD6MKI4moJZgQvEnZnOum1scGPDHjIfs");'></div>
                                                    <span class="font-medium text-white">Tech-Shell Jacket v2</span>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">Alex M.</td>
                                            <td class="px-6 py-4">
                                                <span class="inline-flex items-center rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">Completed</span>
                                            </td>
                                            <td class="px-6 py-4 text-right font-mono text-white">$245.00</td>
                                        </tr>
                                        <tr class="hover:bg-slate-800/30 transition-colors">
                                            <td class="px-6 py-4 font-mono text-white">#ORD-7328</td>
                                            <td class="px-6 py-4">
                                                <div class="flex items-center gap-3">
                                                    <div class="h-8 w-8 rounded bg-slate-800 bg-center bg-cover" data-alt="Compression running pants thumbnail" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDwK74U4r4ckKWHOULto4hrAoIRRIUiu-aRY3g9jenq9j8Sz7qj94VLywmYYgG4AvUR-OhCaH2d8m0z37YmXU3EYBmEKjzcJnVJPNpxp6TZ9Mvz5ZiN4KQPscZ9tp2PSwNw1wSOA53HN3ACkT0mD8wO-SuLI7aJfWjWyxWSmcny_lR-4BG2zu406bEqG4Z_a8cXBm2q5jMHCD4En_F3mllC7uWyVyTrgapuYPWceYPtWTsj9_rK3wSGtl-x27LqQMfgKmb4A_Q7uwFg");'></div>
                                                    <span class="font-medium text-white">Compression Run Tights</span>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">Sarah K.</td>
                                            <td class="px-6 py-4">
                                                <span class="inline-flex items-center rounded bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-500/20">Processing</span>
                                            </td>
                                            <td class="px-6 py-4 text-right font-mono text-white">$89.00</td>
                                        </tr>
                                        <tr class="hover:bg-slate-800/30 transition-colors">
                                            <td class="px-6 py-4 font-mono text-white">#ORD-7327</td>
                                            <td class="px-6 py-4">
                                                <div class="flex items-center gap-3">
                                                    <div class="h-8 w-8 rounded bg-slate-800 bg-center bg-cover" data-alt="Mesh knit sneakers thumbnail" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCN3-R4hUutSHCbXJhx-NdB00HwdtNpr4HiC0ZXTJi7lv2I27XUBCkbAYpu-ved48bHcl18lXZBcXPsLOMBNQGFr9G3ao4wL3LUgFBYapjwLCoO80XtqHoacoK9qD--F_r5ljdB8XxNpe9l_cMRv_dasCwTgDj6Ub89HyiNYS4-5A9eyhUWGcl8RT5IgMdNKPQiV9xARB2BYOIf2mI-vC523hPaAhQNPBk9MnFC_ml4wZTfx8VTjOqZ3Dp6OP-vpDDeOHWOSJD_GHC5");'></div>
                                                    <span class="font-medium text-white">Velocity Knit Runner</span>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">James R.</td>
                                            <td class="px-6 py-4">
                                                <span class="inline-flex items-center rounded bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500 ring-1 ring-inset ring-blue-500/20">Shipped</span>
                                            </td>
                                            <td class="px-6 py-4 text-right font-mono text-white">$165.00</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </body></html>