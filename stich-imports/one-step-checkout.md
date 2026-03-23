<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>URBN MAN - Tech Checkout</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script>
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "tech-black": "#0a0a0a",
                        "tech-dark": "#121212",
                        "tech-panel": "#1a1a1a",
                        "tech-border": "#333333",
                        "tech-blue": "#00f0ff","tech-blue-dim": "#005f66",
                        "tech-accent": "#2de2e6",
                    },
                    fontFamily: {
                        "display": ["Inter", "sans-serif"],
                        "mono": ["JetBrains Mono", "monospace"],
                        "body": ["Inter", "sans-serif"]
                    },
                    borderRadius: {
                        "DEFAULT": "0px","sm": "0px",
                        "md": "2px",
                        "lg": "0px",
                        "xl": "4px",
                    },
                    boxShadow: {
                        "glow": "0 0 10px rgba(0, 240, 255, 0.3)",
                        "glow-sm": "0 0 5px rgba(0, 240, 255, 0.2)",
                    }
                },
            },
        }
    </script>
<style type="text/tailwindcss">
        @layer utilities {
            .text-tech-glow {
                text-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
            }
            .border-tech-gradient {
                border-image: linear-gradient(to right, #333, #00f0ff, #333) 1;
            }
        }
        ::selection {
            background-color: #00f0ff;
            color: #000;
        }
    </style>
</head>
<body class="bg-tech-black text-gray-200 font-display antialiased overflow-x-hidden">
<header class="sticky top-0 z-40 flex items-center justify-between whitespace-nowrap border-b border-tech-border bg-tech-black/95 backdrop-blur-md px-10 py-4 shadow-md">
<div class="flex items-center gap-8">
<div class="flex items-center gap-3 text-white">
<div class="size-8 text-tech-blue flex items-center justify-center border border-tech-blue/30 bg-tech-blue/10">
<span class="material-symbols-outlined text-2xl">grid_view</span>
</div>
<h2 class="text-white text-xl font-black leading-tight tracking-tighter uppercase font-mono">URBN<span class="text-tech-blue">.TECH</span></h2>
</div>
<div class="hidden lg:flex items-center gap-8 font-mono text-xs tracking-widest uppercase">
<a class="text-gray-400 hover:text-tech-blue transition-colors" href="#">New_Arrivals</a>
<a class="text-gray-400 hover:text-tech-blue transition-colors" href="#">Apparel_V2</a>
<a class="text-gray-400 hover:text-tech-blue transition-colors" href="#">Footwear_Pro</a>
<a class="text-gray-400 hover:text-tech-blue transition-colors" href="#">Gear</a>
<a class="text-tech-blue hover:text-white transition-colors animate-pulse" href="#">[SALE_ACCESS]</a>
</div>
</div>
<div class="flex flex-1 justify-end gap-6 items-center">
<label class="hidden md:flex flex-col min-w-40 !h-10 max-w-64 group">
<div class="flex w-full flex-1 items-stretch border border-tech-border bg-tech-dark overflow-hidden group-focus-within:border-tech-blue transition-all">
<div class="text-gray-500 flex items-center justify-center pl-3">
<span class="material-symbols-outlined text-[18px]">search</span>
</div>
<input class="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-gray-200 focus:outline-0 bg-transparent h-full placeholder:text-gray-600 px-3 text-xs font-mono tracking-wide border-none focus:ring-0 uppercase" placeholder="SEARCH_DATABASE..."/>
</div>
</label>
<div class="flex gap-4">
<button class="flex size-10 cursor-pointer items-center justify-center border border-tech-border bg-tech-dark hover:bg-tech-panel text-gray-400 hover:text-tech-blue transition-all">
<span class="material-symbols-outlined text-[20px]">person</span>
</button>
<button class="flex size-10 cursor-pointer items-center justify-center border border-tech-blue bg-tech-blue/10 text-tech-blue shadow-glow-sm hover:bg-tech-blue/20 transition-all relative">
<span class="material-symbols-outlined text-[20px]">shopping_bag</span>
<span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-tech-blue text-[10px] font-bold text-black font-mono">3</span>
</button>
</div>
</div>
</header>
<div class="relative flex min-h-screen w-full flex-col lg:flex-row">
<main class="flex-1 px-6 py-10 lg:px-20 lg:py-12 max-w-[1200px] mx-auto w-full">
<div class="mb-10 border-b border-tech-border pb-6 flex justify-between items-end">
<div>
<h1 class="text-3xl font-black tracking-tighter text-white sm:text-4xl mb-2 uppercase font-mono">
<span class="text-tech-blue">01.</span> Checkout
                </h1>
<p class="text-gray-500 flex items-center gap-2 text-xs uppercase tracking-widest font-mono">
<span class="material-symbols-outlined text-tech-blue text-sm">lock_person</span> 
                    Encrypted Connection // Protocol V.4
                </p>
</div>
<div class="hidden sm:block">
<div class="flex items-center gap-1 text-xs text-gray-500 font-mono">
<span>STATUS:</span>
<span class="text-green-500 animate-pulse">ONLINE</span>
</div>
</div>
</div>
<div class="grid grid-cols-1 gap-12 lg:grid-cols-12">
<div class="lg:col-span-7 space-y-10">
<section class="bg-tech-dark border border-tech-border p-6 relative overflow-hidden">
<div class="absolute top-0 left-0 w-1 h-full bg-gray-700"></div>
<div class="flex items-center justify-between mb-6 border-b border-tech-border pb-4">
<h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
<span class="material-symbols-outlined text-tech-blue text-sm">contact_mail</span>
                            Contact_Data
                        </h3>
<a class="text-xs font-medium text-tech-blue hover:text-white font-mono uppercase transition-colors" href="#">&lt; Log_In /&gt;</a>
</div>
<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
<div class="col-span-2">
<label class="block text-xs font-bold text-gray-400 mb-2 uppercase font-mono">Email Address</label>
<input class="w-full bg-tech-black border border-tech-border text-white px-4 py-3 text-sm focus:border-tech-blue focus:ring-1 focus:ring-tech-blue transition-all placeholder-gray-700 font-mono" placeholder="USER@DOMAIN.COM" type="email"/>
</div>
<div class="col-span-2 flex items-center gap-3 mt-1 group cursor-pointer">
<div class="relative flex items-center">
<input class="peer h-4 w-4 appearance-none border border-gray-500 bg-tech-black checked:border-tech-blue checked:bg-tech-blue transition-all" id="newsletter" type="checkbox"/>
<span class="material-symbols-outlined absolute left-0 top-0 pointer-events-none hidden text-black text-sm peer-checked:block">check</span>
</div>
<label class="text-xs text-gray-400 font-mono uppercase group-hover:text-tech-blue transition-colors cursor-pointer" for="newsletter">Subscribe to tactical updates</label>
</div>
</div>
</section>
<section class="bg-tech-dark border border-tech-border p-6 relative overflow-hidden">
<div class="absolute top-0 left-0 w-1 h-full bg-gray-700"></div>
<h3 class="text-sm font-bold text-white mb-6 border-b border-tech-border pb-4 uppercase tracking-wider font-mono flex items-center gap-2">
<span class="material-symbols-outlined text-tech-blue text-sm">local_shipping</span>
                        Shipping_Logistics
                    </h3>
<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
<div>
<label class="block text-xs font-bold text-gray-400 mb-2 uppercase font-mono">First Name</label>
<input class="w-full bg-tech-black border border-tech-border text-white px-4 py-3 text-sm focus:border-tech-blue focus:ring-1 focus:ring-tech-blue transition-all font-mono" placeholder="" type="text"/>
</div>
<div>
<label class="block text-xs font-bold text-gray-400 mb-2 uppercase font-mono">Last Name</label>
<input class="w-full bg-tech-black border border-tech-border text-white px-4 py-3 text-sm focus:border-tech-blue focus:ring-1 focus:ring-tech-blue transition-all font-mono" placeholder="" type="text"/>
</div>
<div class="col-span-2">
<label class="block text-xs font-bold text-gray-400 mb-2 uppercase font-mono">Address Line 1</label>
<input class="w-full bg-tech-black border border-tech-border text-white px-4 py-3 text-sm focus:border-tech-blue focus:ring-1 focus:ring-tech-blue transition-all font-mono" placeholder="" type="text"/>
</div>
<div>
<label class="block text-xs font-bold text-gray-400 mb-2 uppercase font-mono">City / Sector</label>
<input class="w-full bg-tech-black border border-tech-border text-white px-4 py-3 text-sm focus:border-tech-blue focus:ring-1 focus:ring-tech-blue transition-all font-mono" placeholder="" type="text"/>
</div>
<div>
<label class="block text-xs font-bold text-gray-400 mb-2 uppercase font-mono">Postal Code</label>
<input class="w-full bg-tech-black border border-tech-border text-white px-4 py-3 text-sm focus:border-tech-blue focus:ring-1 focus:ring-tech-blue transition-all font-mono" placeholder="" type="text"/>
</div>
</div>
</section>
<section class="bg-tech-dark border border-tech-border p-6 relative overflow-hidden">
<div class="absolute top-0 left-0 w-1 h-full bg-tech-blue shadow-[0_0_10px_#00f0ff]"></div>
<h3 class="text-sm font-bold text-white mb-6 border-b border-tech-border pb-4 uppercase tracking-wider font-mono flex items-center gap-2">
<span class="material-symbols-outlined text-tech-blue text-sm">credit_card</span>
                        Payment_Method
                    </h3>
<div class="border border-tech-border bg-tech-black/50 overflow-hidden">
<div class="border-b border-tech-border p-4">
<div class="flex items-center justify-between">
<div class="flex items-center gap-3">
<div class="relative flex items-center">
<input checked="" class="peer h-4 w-4 appearance-none rounded-full border border-gray-500 bg-tech-black checked:border-tech-blue checked:bg-tech-black transition-all" id="cc" name="payment" type="radio"/>
<div class="absolute inset-0 m-auto h-2 w-2 rounded-full bg-tech-blue opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
</div>
<label class="font-bold text-white uppercase font-mono text-sm" for="cc">Credit Card</label>
</div>
<div class="flex gap-2 text-gray-500">
<span class="material-symbols-outlined">credit_card</span>
<span class="material-symbols-outlined">lock</span>
</div>
</div>
<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 bg-tech-panel/50 p-4 border border-tech-border">
<div class="col-span-2">
<input class="w-full bg-tech-black border border-tech-border text-white px-4 py-3 text-sm focus:border-tech-blue focus:ring-1 focus:ring-tech-blue transition-all font-mono placeholder-gray-600" placeholder="0000 0000 0000 0000" type="text"/>
</div>
<div>
<input class="w-full bg-tech-black border border-tech-border text-white px-4 py-3 text-sm focus:border-tech-blue focus:ring-1 focus:ring-tech-blue transition-all font-mono placeholder-gray-600" placeholder="MM / YY" type="text"/>
</div>
<div>
<input class="w-full bg-tech-black border border-tech-border text-white px-4 py-3 text-sm focus:border-tech-blue focus:ring-1 focus:ring-tech-blue transition-all font-mono placeholder-gray-600" placeholder="CVC" type="text"/>
</div>
</div>
</div>
<div class="p-4 bg-tech-panel/20 hover:bg-tech-panel/40 transition-colors">
<div class="flex items-center justify-between">
<div class="flex items-center gap-3">
<div class="relative flex items-center">
<input class="peer h-4 w-4 appearance-none rounded-full border border-gray-500 bg-tech-black checked:border-tech-blue checked:bg-tech-black transition-all" id="paypal" name="payment" type="radio"/>
<div class="absolute inset-0 m-auto h-2 w-2 rounded-full bg-tech-blue opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
</div>
<label class="font-bold text-gray-300 uppercase font-mono text-sm" for="paypal">PayPal</label>
</div>
<div class="text-blue-400 italic font-bold text-lg opacity-80">PayPal</div>
</div>
</div>
</div>
</section>
<button class="group w-full relative overflow-hidden bg-tech-blue py-4 text-center transition-all hover:shadow-glow">
<div class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
<span class="relative text-black text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3">
                        Initiate Payment $562.00
                        <span class="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
</span>
</button>
<div class="flex items-center justify-center gap-3 text-xs text-tech-blue font-mono border border-tech-blue/20 bg-tech-blue/5 py-3">
<span class="material-symbols-outlined text-lg">verified_user</span>
<span class="uppercase tracking-wide">30-Day Performance Guarantee</span>
</div>
</div>
<div class="hidden lg:block lg:col-span-5 relative">
<div class="sticky top-24 p-6 bg-tech-dark border border-tech-border shadow-2xl">
<div class="flex justify-between items-center mb-6 border-b border-tech-border pb-4">
<h3 class="text-lg font-bold text-white uppercase font-mono">Order_Manifest</h3>
<span class="text-xs text-gray-500 font-mono">[3 ITEMS]</span>
</div>
<div class="space-y-4 font-mono text-sm">
<div class="flex justify-between">
<span class="text-gray-400 uppercase">Subtotal</span>
<span class="font-medium text-white">$542.00</span>
</div>
<div class="flex justify-between">
<span class="text-gray-400 uppercase">Shipping</span>
<span class="font-bold text-tech-blue uppercase">Free [Standard]</span>
</div>
<div class="flex justify-between">
<span class="text-gray-400 uppercase">Tax [Est.]</span>
<span class="font-medium text-white">$20.00</span>
</div>
<div class="h-px bg-tech-border my-4"></div>
<div class="flex justify-between text-base font-bold items-center">
<span class="text-white uppercase tracking-wider">Total Amount</span>
<span class="text-tech-blue text-2xl text-tech-glow">$562.00</span>
</div>
</div>
<div class="mt-8 space-y-4">
<div class="flex gap-4 p-3 bg-tech-black/50 border border-tech-border/50">
<div class="h-16 w-12 bg-gray-800 border border-gray-700 overflow-hidden">
<img alt="Linen Jacket" class="h-full w-full object-cover grayscale opacity-80 hover:grayscale-0 transition-all duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0pGNaoE0_N__jwMqY2d6F9gjTcdftT6Oo78VoEOFkaN5PyY7GcSHA3jYkq5h9D_WdVt-997gO3SaaGq4QcW3TRP9bPvrs2uOEHXDXFPfk8DX7StLg7L3_Ka0xaWHTPnFP-YAf7myMr1UPFs6-4XxdEfdE9Z7F53_FlvTTNLK-uWqXsarbyREf3Mb38vNxNfX52e8-v0CC92p5a3xvaNXbEC2cp3Tb0w9bnjxPZNK2cV5wVnay6Oc_3Er1yTJRc22t-Wru4fDjKZyR"/>
</div>
<div class="flex flex-col justify-center">
<span class="text-xs font-bold text-white uppercase">Relaxed Fit Jacket</span>
<span class="text-[10px] text-gray-500 font-mono">QTY: 1</span>
</div>
</div>
<div class="flex gap-4 p-3 bg-tech-black/50 border border-tech-border/50">
<div class="h-16 w-12 bg-gray-800 border border-gray-700 overflow-hidden">
<img alt="Sneakers" class="h-full w-full object-cover grayscale opacity-80 hover:grayscale-0 transition-all duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeymrPqleX-ea-M9umROMAR1fPpaEhxo6rHC42f7LySEjY5C1kD1putf733ugxi07Ohghvdh7uihAHWLQpf1adI9y-_Z5tR2QGfEpzaR3pWN7WUBYWoCdyIGfeJwLtI6Gcqo_baFTB-7abERT6gs19EU88lFbraof5Tc5j7AWk5M-3htlNNaPFztok6nMzz61H11yZ65m_J56PP92V-U6RqKAyjBxyBp1PKgcYAOcypuUcSdgFjWFgd7ZP_2rpORLZnIpgAzwdGik0"/>
</div>
<div class="flex flex-col justify-center">
<span class="text-xs font-bold text-white uppercase">Urban Sneakers</span>
<span class="text-[10px] text-gray-500 font-mono">QTY: 1</span>
</div>
</div>
<div class="flex gap-4 p-3 bg-tech-black/50 border border-tech-border/50">
<div class="h-16 w-12 bg-gray-800 border border-gray-700 overflow-hidden">
<img alt="Wallet" class="h-full w-full object-cover grayscale opacity-80 hover:grayscale-0 transition-all duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8G7az9cdmJHnMsW9KBMpsDjggrI-wvyJvkb-lxtqvJnJ1WsgaaVUKeqBuzXclLRpIq6J0vS9g5rfGpCcVwUgMQSDMpd0PXBU5dT-FYOjSp0y2xdBTQp3tIiExTbH1NOFUXSSC_MWTmXc0B5uTydtwhuruggyMpi5XfQBjWsV7NurWtDjWIESgV-BP0bgILybGg2gt17_zj-PThZKJqLaPc4lCnrFAho6e0F7AXJjEBifKouYPoQ_clstSL0ZuXju8l2YQ4KqXdcaB"/>
</div>
<div class="flex flex-col justify-center">
<span class="text-xs font-bold text-white uppercase">Cardholder V1</span>
<span class="text-[10px] text-gray-500 font-mono">QTY: 1</span>
</div>
</div>
</div>
</div>
</div>
</div>
</main>
<aside class="fixed inset-y-0 right-0 z-50 w-full max-w-md transform bg-tech-dark border-l border-tech-blue/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-in-out sm:w-[450px] flex flex-col h-full">
<div class="flex items-center justify-between border-b border-tech-border px-6 py-5 bg-tech-dark/95 backdrop-blur">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-tech-blue">shopping_cart</span>
<h2 class="text-lg font-bold text-white uppercase tracking-widest font-mono">Equipment Bag</h2>
<span class="flex h-5 w-5 items-center justify-center bg-tech-blue text-xs font-bold text-black font-mono">3</span>
</div>
<button class="flex h-8 w-8 items-center justify-center border border-gray-700 bg-tech-black hover:border-tech-blue hover:text-tech-blue text-gray-400 transition-all">
<span class="material-symbols-outlined text-sm">close</span>
</button>
</div>
<div class="px-6 py-5 bg-tech-panel border-b border-tech-border">
<div class="mb-3 flex items-center justify-between text-xs font-mono uppercase">
<span class="font-bold text-tech-blue flex items-center gap-2">
<span class="material-symbols-outlined text-sm">rocket_launch</span>
                    Logistics cost: WAIVED
                </span>
<span class="text-gray-500">Threshold: $200</span>
</div>
<div class="h-1 w-full bg-gray-800 relative">
<div class="absolute h-full w-full bg-tech-blue shadow-glow"></div>
</div>
</div>
<div class="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-tech-dark custom-scrollbar">
<div class="flex gap-4 group relative">
<div class="absolute -left-2 top-0 bottom-0 w-[2px] bg-tech-blue opacity-0 group-hover:opacity-100 transition-opacity"></div>
<div class="h-28 w-24 flex-shrink-0 overflow-hidden border border-gray-700 bg-tech-black relative">
<div class="absolute inset-0 bg-tech-blue/10 z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
<img alt="Linen Jacket" class="h-full w-full object-cover object-center grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0pGNaoE0_N__jwMqY2d6F9gjTcdftT6Oo78VoEOFkaN5PyY7GcSHA3jYkq5h9D_WdVt-997gO3SaaGq4QcW3TRP9bPvrs2uOEHXDXFPfk8DX7StLg7L3_Ka0xaWHTPnFP-YAf7myMr1UPFs6-4XxdEfdE9Z7F53_FlvTTNLK-uWqXsarbyREf3Mb38vNxNfX52e8-v0CC92p5a3xvaNXbEC2cp3Tb0w9bnjxPZNK2cV5wVnay6Oc_3Er1yTJRc22t-Wru4fDjKZyR"/>
</div>
<div class="flex flex-1 flex-col justify-between py-1">
<div>
<div class="flex justify-between items-start">
<h3 class="text-sm font-bold text-white leading-tight uppercase font-mono tracking-tight">Relaxed Fit Linen Jacket</h3>
<p class="text-sm font-bold text-tech-blue font-mono">$185</p>
</div>
<p class="mt-1 text-[10px] text-gray-500 uppercase tracking-wider font-mono">Spec: Beige // Sz: M</p>
</div>
<div class="flex items-center justify-between">
<div class="flex items-center border border-gray-700 bg-tech-black">
<button class="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">-</button>
<span class="px-3 py-1 text-xs font-bold text-white font-mono">1</span>
<button class="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">+</button>
</div>
<button class="text-[10px] font-bold text-gray-500 uppercase hover:text-red-500 transition-colors tracking-wider border-b border-transparent hover:border-red-500">
                            Remove_Item
                        </button>
</div>
</div>
</div>
<div class="flex gap-4 group relative">
<div class="absolute -left-2 top-0 bottom-0 w-[2px] bg-tech-blue opacity-0 group-hover:opacity-100 transition-opacity"></div>
<div class="h-28 w-24 flex-shrink-0 overflow-hidden border border-gray-700 bg-tech-black relative">
<div class="absolute inset-0 bg-tech-blue/10 z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
<img alt="Sneakers" class="h-full w-full object-cover object-center grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeymrPqleX-ea-M9umROMAR1fPpaEhxo6rHC42f7LySEjY5C1kD1putf733ugxi07Ohghvdh7uihAHWLQpf1adI9y-_Z5tR2QGfEpzaR3pWN7WUBYWoCdyIGfeJwLtI6Gcqo_baFTB-7abERT6gs19EU88lFbraof5Tc5j7AWk5M-3htlNNaPFztok6nMzz61H11yZ65m_J56PP92V-U6RqKAyjBxyBp1PKgcYAOcypuUcSdgFjWFgd7ZP_2rpORLZnIpgAzwdGik0"/>
</div>
<div class="flex flex-1 flex-col justify-between py-1">
<div>
<div class="flex justify-between items-start">
<h3 class="text-sm font-bold text-white leading-tight uppercase font-mono tracking-tight">Urban Street Sneakers</h3>
<p class="text-sm font-bold text-tech-blue font-mono">$299</p>
</div>
<p class="mt-1 text-[10px] text-gray-500 uppercase tracking-wider font-mono">Spec: Wht/Red // Sz: 10</p>
</div>
<div class="flex items-center justify-between">
<div class="flex items-center border border-gray-700 bg-tech-black">
<button class="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">-</button>
<span class="px-3 py-1 text-xs font-bold text-white font-mono">1</span>
<button class="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">+</button>
</div>
<button class="text-[10px] font-bold text-gray-500 uppercase hover:text-red-500 transition-colors tracking-wider border-b border-transparent hover:border-red-500">
                            Remove_Item
                        </button>
</div>
</div>
</div>
<div class="flex gap-4 group relative">
<div class="absolute -left-2 top-0 bottom-0 w-[2px] bg-tech-blue opacity-0 group-hover:opacity-100 transition-opacity"></div>
<div class="h-28 w-24 flex-shrink-0 overflow-hidden border border-gray-700 bg-tech-black relative">
<div class="absolute inset-0 bg-tech-blue/10 z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
<img alt="Leather Wallet" class="h-full w-full object-cover object-center grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8G7az9cdmJHnMsW9KBMpsDjggrI-wvyJvkb-lxtqvJnJ1WsgaaVUKeqBuzXclLRpIq6J0vS9g5rfGpCcVwUgMQSDMpd0PXBU5dT-FYOjSp0y2xdBTQp3tIiExTbH1NOFUXSSC_MWTmXc0B5uTydtwhuruggyMpi5XfQBjWsV7NurWtDjWIESgV-BP0bgILybGg2gt17_zj-PThZKJqLaPc4lCnrFAho6e0F7AXJjEBifKouYPoQ_clstSL0ZuXju8l2YQ4KqXdcaB"/>
</div>
<div class="flex flex-1 flex-col justify-between py-1">
<div>
<div class="flex justify-between items-start">
<h3 class="text-sm font-bold text-white leading-tight uppercase font-mono tracking-tight">Minimalist Cardholder</h3>
<p class="text-sm font-bold text-tech-blue font-mono">$58</p>
</div>
<p class="mt-1 text-[10px] text-gray-500 uppercase tracking-wider font-mono">Spec: Blk Lthr</p>
</div>
<div class="flex items-center justify-between">
<div class="flex items-center border border-gray-700 bg-tech-black">
<button class="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">-</button>
<span class="px-3 py-1 text-xs font-bold text-white font-mono">1</span>
<button class="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">+</button>
</div>
<button class="text-[10px] font-bold text-gray-500 uppercase hover:text-red-500 transition-colors tracking-wider border-b border-transparent hover:border-red-500">
                            Remove_Item
                        </button>
</div>
</div>
</div>
</div>
<div class="border-t border-tech-border bg-tech-panel p-6 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] z-20">
<div class="mb-5 space-y-2 font-mono text-sm">
<div class="flex justify-between text-gray-400">
<span class="uppercase">Subtotal</span>
<span>$542.00</span>
</div>
<div class="flex justify-between text-gray-400">
<span class="uppercase">Shipping</span>
<span class="text-tech-blue uppercase">Free</span>
</div>
<div class="flex justify-between text-lg font-bold text-white mt-2">
<span class="uppercase tracking-wider">Total</span>
<span class="text-tech-glow">$542.00</span>
</div>
<p class="text-[10px] text-gray-600 mt-1 uppercase tracking-wide">Taxes calculated at next step.</p>
</div>
<button class="w-full group relative flex items-center justify-center gap-2 bg-white hover:bg-tech-blue py-4 transition-all duration-300">
<span class="text-black text-sm font-black uppercase tracking-widest group-hover:pr-4 transition-all">Proceed to Checkout</span>
<span class="material-symbols-outlined text-black text-sm absolute right-4 opacity-0 group-hover:opacity-100 transition-all duration-300">arrow_forward</span>
</button>
<div class="mt-4 flex justify-center gap-2 opacity-40">
<span class="material-symbols-outlined text-2xl text-white">lock</span>
<span class="material-symbols-outlined text-2xl text-white">verified_user</span>
<span class="material-symbols-outlined text-2xl text-white">shield</span>
</div>
</div>
</aside>
<div aria-hidden="true" class="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity"></div>
</div>

</body></html>