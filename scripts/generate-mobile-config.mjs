import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Cargar variables de entorno desde .env.local y .env
dotenv.config({ path: '.env.local' })
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const storeName = process.env.VITE_STORE_NAME || 'Mi Tienda'

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar definidas en .env')
    process.exit(1)
}

const mobileConfig = {
    version: 1,
    storeName,
    supabaseUrl,
    supabaseAnonKey,
    features: {
        products: true,
        coupons: true,
        categories: true,
        staffUsers: true,
        orders: true,
        inventory: false
    }
}

const publicDir = path.resolve('public')
const outputPath = path.resolve(publicDir, 'mobile-config.json')

// Crear directorio public si no existe
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
}

fs.writeFileSync(outputPath, JSON.stringify(mobileConfig, null, 2))
console.log(`✅ mobile-config.json generado en ${outputPath}`)
