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

async function listDesigns() {
  try {
    const envVars = loadEnv();
    const apiKey = envVars.VITE_GOOGLE_STITCH_API_KEY;

    if (!apiKey) {
      console.error('❌ VITE_GOOGLE_STITCH_API_KEY no encontrado en .env.local');
      process.exit(1);
    }

    console.log('🔍 Conectando a Google Stitch...\n');

    const toolClient = new StitchToolClient({ apiKey });
    await toolClient.connect();

    const stitch = new Stitch(toolClient);
    const projects = await stitch.projects();

    if (!projects || projects.length === 0) {
      console.log('❌ No hay proyectos disponibles');
      process.exit(1);
    }

    const project = projects[0];
    const projectTitle = project.data?.title || 'Proyecto sin título';

    console.log(`📁 ${projectTitle}\n`);
    console.log(`Diseños disponibles:\n`);

    const screens = await project.screens();

    if (!screens || screens.length === 0) {
      console.log('❌ No hay pantallas en este proyecto');
      process.exit(0);
    }

    screens.forEach((screen, index) => {
      const title = screen.data?.title || screen.title || screen.name || `Diseño ${index + 1}`;
      console.log(`${index + 1}. ${title}`);
    });

  } catch (error) {
    console.error('❌ Error:');
    console.error(error.message || JSON.stringify(error, null, 2));
  }
}

listDesigns();
