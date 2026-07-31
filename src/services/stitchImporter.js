import { StitchToolClient, Stitch } from '@google/stitch-sdk';

let stitchInstance = null;

/**
 * Initialize Stitch instance with API key from env
 */
function getStitch() {
  if (stitchInstance) return stitchInstance;

  const apiKey = process.env.STITCH_API_KEY || import.meta.env?.VITE_GOOGLE_STITCH_API_KEY;

  if (!apiKey) {
    throw new Error('STITCH_API_KEY not configured. Set VITE_GOOGLE_STITCH_API_KEY in .env.local');
  }

  const client = new StitchToolClient({ apiKey });
  stitchInstance = new Stitch(client);

  return stitchInstance;
}

/**
 * List all projects from Stitch account
 */
export async function listAllProjects() {
  try {
    const stitch = getStitch();
    const projects = await stitch.projects() || [];

    return projects.map(p => ({
      id: p.id || p.projectId,
      name: p.data?.title || p.data?.name || 'Untitled Project',
      data: p.data,
    }));
  } catch (error) {
    console.error('Error listing Stitch projects:', error);
    throw error;
  }
}

/**
 * List all designs/screens across all projects
 */
export async function listAllDesigns() {
  try {
    const stitch = getStitch();
    const projects = await stitch.projects() || [];

    const allScreens = [];

    for (const project of projects) {
      try {
        const screens = await project.screens();
        const projectName = project.data?.title || 'Untitled';

        allScreens.push(...screens.map(screen => ({
          id: screen.id || screen.screenId,
          name: screen.data?.name || screen.data?.title || 'Untitled Screen',
          projectId: project.id,
          projectName,
          data: screen.data,
        })));
      } catch (err) {
        console.warn(`Failed to fetch screens from project ${project.id}:`, err.message);
      }
    }

    return allScreens;
  } catch (error) {
    console.error('Error listing Stitch designs:', error);
    throw error;
  }
}

/**
 * Get HTML code for a specific design
 * @param {string} projectId - The project ID in Stitch
 * @param {string} screenId - The screen/design ID in Stitch
 */
export async function getDesignHTML(projectId, screenId) {
  try {
    const stitch = getStitch();
    const project = stitch.project(projectId);
    const screen = await project.getScreen(screenId);

    const html = await screen.getHtml();

    return {
      id: screen.id,
      name: screen.data?.name || 'Untitled',
      html,
      projectId,
    };
  } catch (error) {
    console.error('Error getting design HTML:', error);
    throw error;
  }
}

/**
 * Get image/screenshot for a specific design
 * @param {string} projectId - The project ID in Stitch
 * @param {string} screenId - The screen/design ID in Stitch
 */
export async function getDesignImage(projectId, screenId) {
  try {
    const stitch = getStitch();
    const project = stitch.project(projectId);
    const screen = await project.getScreen(screenId);

    const imageUrl = await screen.getImage();

    return {
      id: screen.id,
      name: screen.data?.name || 'Untitled',
      imageUrl,
      projectId,
    };
  } catch (error) {
    console.error('Error getting design image:', error);
    throw error;
  }
}

/**
 * Get all details for a specific design
 */
export async function getDesignDetails(projectId, screenId) {
  try {
    const stitch = getStitch();
    const project = stitch.project(projectId);
    const screen = await project.getScreen(screenId);

    const [html, imageUrl] = await Promise.all([
      screen.getHtml(),
      screen.getImage(),
    ]);

    return {
      id: screen.id,
      name: screen.data?.name || 'Untitled',
      projectId,
      projectName: project.data?.title || 'Untitled',
      html,
      imageUrl,
      data: screen.data,
    };
  } catch (error) {
    console.error('Error getting design details:', error);
    throw error;
  }
}
