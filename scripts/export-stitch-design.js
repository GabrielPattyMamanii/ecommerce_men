import { Stitch, StitchToolClient } from '@google/stitch-sdk';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });
  return env;
}

async function exportDesign() {
  try {
    const envVars = loadEnv();
    const apiKey = envVars.VITE_GOOGLE_STITCH_API_KEY;

    if (!apiKey) {
      console.error('❌ VITE_GOOGLE_STITCH_API_KEY no encontrado');
      process.exit(1);
    }

    console.log('🔍 Extrayendo diseño de Stitch...\n');

    const toolClient = new StitchToolClient({ apiKey });
    await toolClient.connect();

    const stitch = new Stitch(toolClient);
    const projects = await stitch.projects();
    const project = projects[0];

    const screens = await project.screens();
    const minimoScreen = screens.find(s => s.data?.title?.includes('Minimalista'));

    if (!minimoScreen) {
      console.error('❌ Diseño Minimalista no encontrado');
      process.exit(1);
    }

    console.log(`✅ Diseño encontrado: ${minimoScreen.data.title}\n`);

    // Obtener el HTML del diseño
    let html = minimoScreen.data.htmlCode;

    if (!html) {
      console.error('❌ No se pudo obtener el HTML del diseño');
      process.exit(1);
    }

    // Si es un objeto con downloadUrl, descargar el archivo
    if (typeof html === 'object' && html.downloadUrl) {
      console.log('⬇️ Descargando HTML desde URL...');
      const response = await fetch(html.downloadUrl);
      html = await response.text();
    } else if (typeof html === 'object') {
      html = JSON.stringify(html, null, 2);
    }

    // Guardar el HTML en un archivo
    const outputPath = path.resolve('./stitch-minimalista-design.html');
    fs.writeFileSync(outputPath, html, 'utf-8');

    console.log(`✅ HTML guardado en: ${outputPath}`);
    console.log(`\n📊 Tamaño: ${(html.length / 1024).toFixed(2)} KB`);
    console.log(`\n🎨 Primeras 1000 caracteres del HTML:`);
    console.log(html.substring(0, 1000));

  } catch (error) {
    console.error('❌ Error:');
    console.error(error.message || JSON.stringify(error, null, 2));
  }
}

exportDesign();
