<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Technical Gear Product Detail Page</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&amp;family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              colors: {
                "primary": "#00f0ff",
                "primary-dark": "#00a3cc",
                "accent": "#2d3446",
                "background-dark": "#050505",
                "surface": "#0a0f14",
                "surface-light": "#131a24",
                "neon-blue": "#00f0ff",
                "tech-grey": "#8b9bb4"
              },
              fontFamily: {
                "display": ["Chakra Petch", "sans-serif"],
                "body": ["Inter", "sans-serif"]
              },
              boxShadow: {
                'neon': '0 0 5px theme("colors.primary"), 0 0 20px theme("colors.primary")',
                'neon-sm': '0 0 2px theme("colors.primary"), 0 0 10px theme("colors.primary")',
              }
            },
          },
        }
    </script>
<style type="text/tailwindcss">
        @layer utilities {
            .clip-path-slant {
                clip-path: polygon(0 0, 100% 0, 95% 100%, 0% 100%);
            }
            .clip-path-hex {
                clip-path: polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%);
            }
            .grid-bg {
                background-image: linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px);
                background-size: 20px 20px;
            }
        }
    </style>
</head>
<body class="bg-background-dark font-body antialiased text-slate-200 min-h-screen flex flex-col selection:bg-primary selection:text-black">
<header class="sticky top-0 z-50 w-full border-b border-surface-light bg-background-dark/90 backdrop-blur-md">
<div class="px-6 md:px-10 py-4 max-w-[1440px] mx-auto flex items-center justify-between">
<div class="flex items-center gap-10">
<a class="flex items-center gap-3 group" href="#">
<div class="size-8 text-primary transition-transform group-hover:rotate-180 duration-700">
<span class="material-symbols-outlined text-[32px]">deployed_code</span>
</div>
<span class="text-2xl font-bold tracking-widest text-white font-display uppercase">TEK<span class="text-primary">GEAR</span></span>
</a>
<nav class="hidden md:flex items-center gap-8 font-display tracking-wider text-sm">
<a class="text-tech-grey hover:text-primary transition-colors uppercase" href="#">New Tech</a>
<a class="text-white hover:text-primary transition-colors uppercase border-b border-primary" href="#">Outerwear</a>
<a class="text-tech-grey hover:text-primary transition-colors uppercase" href="#">Base Layers</a>
<a class="text-tech-grey hover:text-primary transition-colors uppercase" href="#">Utility</a>
</nav>
</div>
<div class="flex items-center gap-6">
<div class="hidden lg:flex items-center w-64 bg-surface border border-surface-light rounded-sm px-3 py-2 focus-within:border-primary focus-within:shadow-neon-sm transition-all group">
<span class="material-symbols-outlined text-tech-grey group-focus-within:text-primary text-[20px]">search</span>
<input class="bg-transparent border-none text-sm w-full focus:ring-0 placeholder:text-slate-600 text-white font-display tracking-wide uppercase" placeholder="Search system..." type="text"/>
</div>
<div class="flex items-center gap-4">
<button class="text-tech-grey hover:text-primary transition-colors">
<span class="material-symbols-outlined text-[24px]">person</span>
</button>
<button class="text-tech-grey hover:text-primary transition-colors relative group">
<span class="material-symbols-outlined text-[24px] group-hover:animate-pulse">shopping_cart</span>
<span class="absolute -top-1 -right-1 size-2 bg-primary shadow-neon-sm rounded-full"></span>
</button>
</div>
</div>
</div>
</header>
<main class="flex-grow w-full max-w-[1440px] mx-auto px-6 md:px-10 py-8 relative">
<div class="absolute inset-0 grid-bg pointer-events-none z-0"></div>
<div class="relative z-10 flex items-center gap-2 text-xs font-display tracking-widest text-tech-grey mb-8 uppercase">
<a class="hover:text-primary transition-colors" href="#">System</a>
<span class="material-symbols-outlined text-[12px] text-primary">chevron_right</span>
<a class="hover:text-primary transition-colors" href="#">Outerwear</a>
<span class="material-symbols-outlined text-[12px] text-primary">chevron_right</span>
<span class="text-white">Spectre Shell V.03</span>
</div>
<div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 relative z-10">
<div class="lg:col-span-7 space-y-4">
<div class="aspect-[4/5] w-full bg-surface rounded-none clip-path-hex overflow-hidden relative group border border-surface-light hover:border-primary/50 transition-colors">
<div class="absolute top-4 left-4 z-20 flex flex-col gap-2">
<span class="bg-primary/10 border border-primary/30 text-primary px-3 py-1 text-[10px] font-display font-bold uppercase tracking-wider backdrop-blur-sm">Waterproof Lvl 3</span>
<span class="bg-surface/80 border border-slate-700 text-slate-300 px-3 py-1 text-[10px] font-display font-bold uppercase tracking-wider backdrop-blur-sm">Breathable</span>
</div>
<div class="w-full h-full bg-center bg-cover transition-transform duration-700 group-hover:scale-110 grayscale-[30%] group-hover:grayscale-0" data-alt="Technical jacket front view" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCYBI3nMLg4qgdT8_gAj_wI7hfoDMzjQINOXASjujQ94t-BLaSPaysrh1T-54nepMTneVtw-9Ao473WSTGuZctzZLeZA-27eNiG8uAdyrcElHTW5MiNLoUkowJiOpjvEkQupmlTDa_2qOjnWCdUs1tEd8g4aE1UUqUaOJaUnRtlqDjbMO3DcLOO8stAaC_Jhtpxt8mId7UZ1ZJYatOL4-hTpt4VMv7l7yjnhFtBCyhlIjGqciEFv5ZcajnhsxQDzd0CGHY1tBDRvOG1");'>
</div>
<div class="absolute inset-0 pointer-events-none border border-white/5 p-4 flex flex-col justify-between">
<div class="flex justify-between items-start">
<div class="w-2 h-2 border-t border-l border-primary"></div>
<div class="w-2 h-2 border-t border-r border-primary"></div>
</div>
<div class="flex justify-between items-end">
<div class="w-2 h-2 border-b border-l border-primary"></div>
<div class="w-2 h-2 border-b border-r border-primary"></div>
</div>
</div>
<div class="absolute bottom-4 left-4 right-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
<span class="bg-black/80 backdrop-blur border border-primary/50 text-primary px-3 py-1 font-display text-xs uppercase tracking-widest">Scanning Texture...</span>
</div>
</div>
<div class="grid grid-cols-4 gap-4">
<button class="aspect-square bg-surface overflow-hidden border border-primary relative group">
<div class="w-full h-full bg-center bg-cover opacity-80 group-hover:opacity-100 transition-opacity" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCRMGMWjLEXyJlFy3jWu6fokrV7lf9VgMJfS7KU70U2kzvDeqfHVZDr44apPFKsesdjRdzg48JJxwgp5FqwEF1Y82mYa2TmW1PtvVpglELmRU1fH1GDAukf_jDWAwYXTDyto1ziJOtMR-SurQj8BgAGEaxuckkvoAkFC5SNFJ6Ske2NHHyWVnNj3cwFV1zmQ_JGXU0PsoVgSK_MrjM_fF2RaSSIgyYbXAoHcW5pPXPFY_LLKOIWfJs7f1CQBU5Vj6c0UImvoVlqkP_B");'></div>
<div class="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors"></div>
</button>
<button class="aspect-square bg-surface overflow-hidden border border-surface-light hover:border-tech-grey relative group transition-colors">
<div class="w-full h-full bg-center bg-cover grayscale" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDAqIhJ63kd9YfcMHXxAz6D1_rOsL-K-ClpMklbHfxwR_UR6T0HB7zzcubRIjk4l-W49ZVhnJ6MNppnQB5u3j_aAVVAaq1CmHbHQs3UdbTnokR3x8ArJgENOogwH6_s5BBr4HU5DUNpeYTgdw6grxl1bczpHlFeSgRO1RSAxE-ehTuef7sXPEjLhMWJVZY42-5gfk-xeZUhIjmFgOCLv0Nn8nivPdiug4rgQlQUlesFDZDfwKB63ObfMdP19H6ia34AKuFnD91q1FEf");'></div>
</button>
<button class="aspect-square bg-surface overflow-hidden border border-surface-light hover:border-tech-grey relative group transition-colors">
<div class="w-full h-full bg-center bg-cover grayscale" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDEHLRbkBfHU7Y_E6Iwv8AG7VyZ2qZlcc5WRsDS14kWVYxLiyGlZ1JEVBUmV0eiBZ5QJIcgl2YTAK1d6wg9a2OWC8tK2bLYwajt4c7UFfaJ1heF3T9rwrCeGWbUtlxAGLx_-jRVt0hTLDztcwtdlelHymmk_Yw2T0XkxISuZtK_cgEhuRew5miiwhQyDLkuol2OLwcqLiPsjdPWo2h0YHLZSMBmcmwFPYGB4qsH9DtB4_o0IERSh0Dput59FSHHBMLsIGrnKHMvHngw");'></div>
<div class="absolute bottom-1 right-1 bg-black/70 px-1 text-[8px] text-white font-display">FABRIC DETAIL</div>
</button>
<button class="aspect-square bg-surface overflow-hidden border border-surface-light hover:border-tech-grey relative group transition-colors">
<div class="w-full h-full bg-center bg-cover grayscale" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuA-Gf-Zg8gmulXHNXIGEBWRP93x9NWTJnXNkaEPU5Zzv4E13mt-pacHZhVYhRINL3ksPiGiPE6ZzHEiuo4v-QLmhr-aAAKJr6Ly3JfqADPBD31RztDBnB7b01QROZoRDrH8vfQpKVx3QLiAC2VczotPWXG1qfLFhKGtdT4Q3aGUITqqEJJWe4UhRRy0Q1MOYjIUZKJYJClvT4Ojvqsp0gG8SA9cd7fj2WaaVl8nLwNE8EEq0bEauPXBgDqsTjbeMzVs0BuZ9IHsq4Z5");'></div>
</button>
</div>
</div>
<div class="lg:col-span-5 flex flex-col h-full">
<div class="sticky top-24">
<div class="mb-4 flex items-center gap-3">
<span class="material-symbols-outlined text-primary text-sm animate-pulse">wifi_tethering</span>
<span class="text-primary text-xs font-display font-bold uppercase tracking-widest">Series V.03 // Available</span>
</div>
<h1 class="text-4xl lg:text-5xl font-bold font-display text-white mb-2 leading-none uppercase tracking-tight">Spectre<br/><span class="text-transparent bg-clip-text bg-gradient-to-r from-slate-400 to-slate-700">Shell Jacket</span></h1>
<div class="flex items-end gap-6 mb-6 border-b border-surface-light pb-6 mt-4">
<p class="text-3xl font-display font-medium text-primary">$450.00</p>
<div class="flex items-center gap-1 mb-1">
<div class="flex text-primary">
<span class="material-symbols-outlined text-[16px] filled" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined text-[16px] filled" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined text-[16px] filled" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined text-[16px] filled" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined text-[16px] filled" style="font-variation-settings: 'FILL' 1; opacity: 0.5;">star</span>
</div>
<span class="text-xs font-display text-tech-grey ml-2 tracking-wide">[128 LOGS]</span>
</div>
</div>
<div class="mb-8 p-4 bg-surface border border-surface-light relative overflow-hidden">
<div class="absolute top-0 right-0 p-1">
<span class="material-symbols-outlined text-surface-light text-4xl opacity-20">science</span>
</div>
<p class="text-slate-400 text-sm leading-relaxed font-light">
                        Engineered with <span class="text-white font-medium">GORE-TEX PRO™</span> membrane technology. The Spectre Shell offers extreme weather protection in a lightweight chassis. Features articulated sleeves for maximum mobility and reinforced Ripstop panels in high-abrasion zones.
                    </p>
</div>
<div class="grid grid-cols-3 gap-2 mb-8">
<div class="flex flex-col items-center justify-center p-3 bg-surface border border-surface-light hover:border-primary/50 transition-colors group cursor-help">
<span class="material-symbols-outlined text-slate-400 group-hover:text-primary mb-1">water_drop</span>
<span class="text-[10px] uppercase font-display tracking-widest text-slate-500 group-hover:text-white">Hydro-Shield</span>
</div>
<div class="flex flex-col items-center justify-center p-3 bg-surface border border-surface-light hover:border-primary/50 transition-colors group cursor-help">
<span class="material-symbols-outlined text-slate-400 group-hover:text-primary mb-1">air</span>
<span class="text-[10px] uppercase font-display tracking-widest text-slate-500 group-hover:text-white">Aero-Vent</span>
</div>
<div class="flex flex-col items-center justify-center p-3 bg-surface border border-surface-light hover:border-primary/50 transition-colors group cursor-help">
<span class="material-symbols-outlined text-slate-400 group-hover:text-primary mb-1">shield</span>
<span class="text-[10px] uppercase font-display tracking-widest text-slate-500 group-hover:text-white">Ripstop Lvl 5</span>
</div>
</div>
<div class="mb-8">
<span class="text-xs font-display font-bold text-tech-grey mb-3 block uppercase tracking-widest">Unit Color <span class="text-primary ml-2">// MIDNIGHT_BLK</span></span>
<div class="flex gap-4">
<button aria-label="Black" class="size-12 clip-path-hex bg-black border border-primary shadow-neon-sm flex items-center justify-center relative group">
<span class="absolute inset-0 bg-primary/10"></span>
<span class="material-symbols-outlined text-primary text-[16px]">check</span>
</button>
<button aria-label="Grey" class="size-12 clip-path-hex bg-slate-600 border border-transparent hover:border-white transition-all opacity-70 hover:opacity-100"></button>
<button aria-label="Olive" class="size-12 clip-path-hex bg-[#3d4c38] border border-transparent hover:border-white transition-all opacity-70 hover:opacity-100"></button>
</div>
</div>
<div class="mb-8">
<div class="flex justify-between items-center mb-3">
<span class="text-xs font-display font-bold text-tech-grey uppercase tracking-widest">Size Configuration</span>
<button class="text-xs text-primary hover:text-white transition-colors flex items-center gap-1 font-display tracking-wide">
<span class="material-symbols-outlined text-[14px]">straighten</span> CALIBRATE SIZE
                        </button>
</div>
<div class="grid grid-cols-5 gap-2">
<button class="h-10 border border-surface-light bg-surface-light/50 text-slate-600 cursor-not-allowed flex items-center justify-center text-xs font-display relative overflow-hidden" disabled="">
                            XS
                            <div class="absolute inset-0 flex items-center justify-center">
<div class="w-full h-px bg-slate-700 -rotate-45"></div>
</div>
</button>
<button class="h-10 border border-surface-light bg-surface hover:bg-surface-light hover:border-primary/50 text-slate-300 hover:text-white transition-all flex items-center justify-center text-xs font-display font-bold">S</button>
<button class="h-10 border border-primary bg-primary/10 text-primary flex items-center justify-center text-xs font-display font-bold shadow-neon-sm relative overflow-hidden">
                            M
                            <span class="absolute top-0 right-0 w-1 h-1 bg-primary"></span>
<span class="absolute bottom-0 left-0 w-1 h-1 bg-primary"></span>
</button>
<button class="h-10 border border-surface-light bg-surface hover:bg-surface-light hover:border-primary/50 text-slate-300 hover:text-white transition-all flex items-center justify-center text-xs font-display font-bold">L</button>
<button class="h-10 border border-surface-light bg-surface hover:bg-surface-light hover:border-primary/50 text-slate-300 hover:text-white transition-all flex items-center justify-center text-xs font-display font-bold">XL</button>
</div>
</div>
<div class="flex flex-col gap-4 mb-8">
<button class="w-full h-14 bg-primary hover:bg-white text-black clip-path-slant font-display font-bold text-lg transition-all transform active:scale-[0.99] flex items-center justify-between px-8 group relative overflow-hidden">
<span class="z-10 flex items-center gap-2">INITIATE PURCHASE <span class="material-symbols-outlined text-sm">arrow_forward</span></span>
<span class="z-10 font-mono text-sm">$450.00</span>
<div class="absolute inset-0 bg-white translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 z-0"></div>
</button>
<button class="w-full h-12 bg-transparent border border-tech-grey text-tech-grey hover:border-primary hover:text-primary rounded-none clip-path-slant font-display text-sm tracking-wider transition-colors flex items-center justify-center gap-2 uppercase">
<span class="material-symbols-outlined text-[18px]">bookmark</span>
                        Save to Data Bank
                    </button>
</div>
<div class="border-t border-surface-light mt-4">
<div class="flex gap-6 mb-4 border-b border-surface-light">
<button class="py-3 text-primary border-b-2 border-primary text-xs font-display font-bold uppercase tracking-widest">Tech Specs</button>
<button class="py-3 text-slate-500 hover:text-slate-300 text-xs font-display font-bold uppercase tracking-widest transition-colors">Logistics</button>
<button class="py-3 text-slate-500 hover:text-slate-300 text-xs font-display font-bold uppercase tracking-widest transition-colors">Care Protocol</button>
</div>
<div class="space-y-3 py-2">
<div class="flex justify-between items-center text-sm border-b border-surface-light/50 pb-2 border-dashed">
<span class="text-slate-500 font-mono text-xs uppercase">Material</span>
<span class="text-slate-300 font-medium text-right">3L GORE-TEX Pro</span>
</div>
<div class="flex justify-between items-center text-sm border-b border-surface-light/50 pb-2 border-dashed">
<span class="text-slate-500 font-mono text-xs uppercase">Water Column</span>
<span class="text-slate-300 font-medium text-right">28,000 mm</span>
</div>
<div class="flex justify-between items-center text-sm border-b border-surface-light/50 pb-2 border-dashed">
<span class="text-slate-500 font-mono text-xs uppercase">Breathability</span>
<span class="text-slate-300 font-medium text-right">RET &lt; 6</span>
</div>
<div class="flex justify-between items-center text-sm pb-2">
<span class="text-slate-500 font-mono text-xs uppercase">Weight</span>
<span class="text-slate-300 font-medium text-right">420g (Size M)</span>
</div>
</div>
</div>
</div>
</div>
</div>
<div class="mt-24 mb-16 border-t border-surface-light pt-16 relative">
<div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background-dark px-4 text-tech-grey text-xs font-display uppercase tracking-widest border border-surface-light py-1">
            User Feedback Data
        </div>
<div class="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
<div>
<h2 class="text-2xl font-bold font-display text-white mb-2 uppercase">Field Reports</h2>
<div class="flex items-center gap-2">
<span class="text-4xl font-display font-bold text-primary">4.8</span>
<div class="flex flex-col">
<div class="flex text-primary text-xs">
<span class="material-symbols-outlined filled text-[14px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[14px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[14px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[14px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[14px]" style="font-variation-settings: 'FILL' 1; opacity: 0.5;">star</span>
</div>
<span class="text-slate-500 text-xs font-mono mt-1">BASED ON 128 VERIFIED LOGS</span>
</div>
</div>
</div>
<button class="px-6 py-2.5 bg-surface hover:bg-surface-light border border-tech-grey hover:border-primary text-white font-display text-sm tracking-wider uppercase transition-all">
                Submit Report
            </button>
</div>
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
<div class="bg-surface p-6 border-l-2 border-primary shadow-lg relative group hover:bg-surface-light transition-colors">
<div class="absolute top-2 right-2 opacity-20 group-hover:opacity-100 transition-opacity">
<span class="material-symbols-outlined text-primary">verified</span>
</div>
<div class="flex items-center gap-3 mb-4">
<div class="size-10 rounded-sm bg-slate-700 bg-cover bg-center grayscale" data-alt="Reviewer portrait man" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDxFTa-Xg6KNhg8fnFplxwnCyYK7Gng_rXpoUUV4z-M6P_OiA_PbGsy5SwyTeDcl1i9byXCEzWM9hnNuPDaRGnTXokN9wtAcX-IuvvvwtRoIyMPUPkApDNiWeHa3nnNq7K04C7br7xddoa1nLLa0C_yOnRbIwXhvOgMq2EefiYKurvW4QA9j6BQEpixEmpjyv9Z8nBfSeU1XUi57jzrgp60ssshi_s3ngCobHEIvoTRCVEhZbITzqRjLLIT_dIEkDyn-Y19YT_10gjj");'></div>
<div>
<h4 class="text-sm font-bold font-display text-white uppercase tracking-wide">Marcus T.</h4>
<p class="text-[10px] text-primary font-mono">OPERATOR LVL 1</p>
</div>
</div>
<div class="flex text-primary mb-3 text-xs">
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
</div>
<h5 class="font-bold text-white text-sm mb-2 uppercase">Systems optimal</h5>
<p class="text-slate-400 text-xs leading-relaxed mb-4 font-light">Structure is impeccable. Mobility unimpeded during high-stress movement. Fits true to spec parameters.</p>
<div class="flex gap-2 mt-auto">
<div class="h-12 w-12 border border-slate-600 bg-cover bg-center cursor-pointer hover:border-primary transition-colors" data-alt="Customer photo of jacket in city" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDc7NiU5aEf1R0SWL7lEDkOgeUFx60AyMNkXq03p7rpKmf_k0lCntEDmFp96f7Mn1g95sryIdVmLP9AFBx0_VuITzVwEJB960UhrBDe6mRNdvSC3y-VGU6tpwLpgYY__-qp48O0sMCzdQrGt254_ISFbNdMPmfS4vniSPWWs8TgolUmWEI7WrD2lZxYpn_QC6pQIB4kVx0TpM4MP85u82Y0MfcLzos68SNxFKzmA3d0Y6jPEsDz9d6YN015TIreydbP-77me-x8y1AE");'></div>
</div>
</div>
<div class="bg-surface p-6 border-l-2 border-slate-700 hover:border-primary transition-colors relative group hover:bg-surface-light">
<div class="flex items-center gap-3 mb-4">
<div class="size-10 rounded-sm bg-slate-700 bg-cover bg-center grayscale" data-alt="Reviewer portrait woman" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuAAqwiRJY65sgu2HhPYkX6q_q59nYVrXHlUpzKQPdkdaDgA7Ipad1z6V6DvWyM_-3Go7SAwnDbir_TK-ITo-iUttOQ4ptn-95OpoxAVZeccUPUbnPAuJW-Tc5VnqEIJvv2UQZB0oB1b12gi7vw15RH-4j4sFwRxsPFuPkytfVk0sJAaifDfDpfFbzKW6cr0scOd3LceW3Bu_BcF0pxEuhLu2Tg3x2HOG3yi2G-r_gR9naHfNkXk25yUAX9_Q67aAO_TJm5XE82UDV_N");'></div>
<div>
<h4 class="text-sm font-bold font-display text-white uppercase tracking-wide">Sarah J.</h4>
<p class="text-[10px] text-primary font-mono">OPERATOR LVL 2</p>
</div>
</div>
<div class="flex text-primary mb-3 text-xs">
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
</div>
<h5 class="font-bold text-white text-sm mb-2 uppercase">Thermal Reg. Efficient</h5>
<p class="text-slate-400 text-xs leading-relaxed font-light">Acquired for partner unit. Layering capacity is sufficient. Thermal retention exceeds expectations for shell weight.</p>
</div>
<div class="bg-surface p-6 border-l-2 border-slate-700 hover:border-primary transition-colors relative group hover:bg-surface-light">
<div class="flex items-center gap-3 mb-4">
<div class="size-10 rounded-sm bg-surface-light border border-slate-700 flex items-center justify-center text-primary font-bold font-display text-xs">
                        DK
                    </div>
<div>
<h4 class="text-sm font-bold font-display text-white uppercase tracking-wide">David K.</h4>
<p class="text-[10px] text-slate-500 font-mono">UNVERIFIED</p>
</div>
</div>
<div class="flex text-primary mb-3 text-xs">
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
<span class="material-symbols-outlined filled text-[12px]" style="font-variation-settings: 'FILL' 0; opacity: 0.3;">star</span>
</div>
<h5 class="font-bold text-white text-sm mb-2 uppercase">Hardware Stiffness</h5>
<p class="text-slate-400 text-xs leading-relaxed font-light">Visuals are striking. Matte finish absorbs light well. Zipper mechanism required break-in period. Acceptable tolerances.</p>
</div>
</div>
</div>
</main>
<footer class="bg-surface border-t border-surface-light py-12 mt-auto relative overflow-hidden">
<div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMCwgMjQwLCAyNTUsIDAuMDUpIi8+PC9zdmc+')] opacity-20"></div>
<div class="max-w-[1440px] mx-auto px-6 md:px-10 flex flex-col md:flex-row justify-between gap-12 relative z-10">
<div class="flex flex-col gap-6">
<div class="flex items-center gap-3">
<div class="size-8 text-primary">
<span class="material-symbols-outlined text-[32px]">deployed_code</span>
</div>
<div class="flex flex-col">
<span class="text-xl font-bold font-display uppercase tracking-widest text-white">TEK<span class="text-primary">GEAR</span></span>
<span class="text-[10px] text-tech-grey tracking-widest uppercase">Performance Systems</span>
</div>
</div>
<p class="text-xs text-slate-500 max-w-xs font-light leading-relaxed">
                Advanced technical apparel designed for urban utility and extreme conditions. Engineered in Future-Tokyo labs.
            </p>
</div>
<div class="flex gap-16 flex-wrap">
<div>
<h4 class="font-bold font-display text-white mb-6 uppercase text-sm tracking-wider border-b border-primary/50 pb-2 inline-block">Apparel</h4>
<ul class="space-y-3 text-xs text-slate-400 font-display tracking-wide uppercase">
<li><a class="hover:text-primary transition-colors" href="#">Shells</a></li>
<li><a class="hover:text-primary transition-colors" href="#">Insulation</a></li>
<li><a class="hover:text-primary transition-colors" href="#">Pants</a></li>
<li><a class="hover:text-primary transition-colors" href="#">Archive Sale</a></li>
</ul>
</div>
<div>
<h4 class="font-bold font-display text-white mb-6 uppercase text-sm tracking-wider border-b border-primary/50 pb-2 inline-block">System</h4>
<ul class="space-y-3 text-xs text-slate-400 font-display tracking-wide uppercase">
<li><a class="hover:text-primary transition-colors" href="#">Shipping Protocols</a></li>
<li><a class="hover:text-primary transition-colors" href="#">Return Authorization</a></li>
<li><a class="hover:text-primary transition-colors" href="#">Tech Support</a></li>
<li><a class="hover:text-primary transition-colors" href="#">Warranty</a></li>
</ul>
</div>
</div>
</div>
<div class="max-w-[1440px] mx-auto px-6 md:px-10 mt-12 pt-8 border-t border-surface-light flex justify-between items-center text-[10px] text-slate-600 font-mono uppercase">
<p>© 2024 TEKGEAR INDUSTRIES. ALL RIGHTS RESERVED.</p>
<div class="flex gap-6">
<a class="hover:text-primary transition-colors" href="#">Privacy</a>
<a class="hover:text-primary transition-colors" href="#">Terms</a>
<a class="hover:text-primary transition-colors" href="#">Sitemap</a>
</div>
</div>
</footer>

</body></html>