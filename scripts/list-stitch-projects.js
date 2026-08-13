import { Stitch, StitchToolClient } from '@google/stitch-sdk';
import fs from 'fs';
import path from 'path';

// Leer .env.local manualmente
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

async function listProjects() {
  try {
    const envVars = loadEnv();
    const apiKey = envVars.VITE_GOOGLE_STITCH_API_KEY;

    if (!apiKey) {
      console.error('❌ VITE_GOOGLE_STITCH_API_KEY no encontrado en .env.local');
      process.exit(1);
    }

    console.log('🔍 Conectando a Google Stitch...\n');

    // Inicializar StitchToolClient con el apiKey
    const toolClient = new StitchToolClient({ apiKey });
    await toolClient.connect();

    // Crear instancia de Stitch con el cliente
    const stitch = new Stitch(toolClient);

    // Obtener todos los proyectos disponibles
    const projects = await stitch.projects();

    if (!projects || projects.length === 0) {
      console.log('❌ No hay proyectos disponibles en tu cuenta de Stitch');
      return;
    }

    console.log(`✅ Encontrados ${projects.length} proyecto(s):\n`);

    for (let i = 0; i < Math.min(projects.length, 11); i++) {
      const project = projects[i];

      // Obtener el título de data.title
      const title = project.data?.title || `Proyecto ${i + 1}`;
      const projectId = project.projectId || `ID-${i + 1}`;

      console.log(`${i + 1}. ${title}`);
      console.log(`   ID: ${projectId}`);
      console.log();
    }

    console.log('\n💡 Dime el número del proyecto que quieras usar para los horarios.');

  } catch (error) {
    console.error('❌ Error al conectar con Stitch:');
    console.error(error.message || JSON.stringify(error, null, 2));
    console.error('\nVerifica que:');
    console.error('1. El token VITE_GOOGLE_STITCH_API_KEY está en .env.local');
    console.error('2. El token es válido en Google Cloud');
    console.error('3. Tienes proyectos creados en Google Stitch');
  }
}

listProjects();
