#!/usr/bin/env node

import { listAllDesigns, listAllProjects } from '../src/services/stitchImporter.js';

(async () => {
  try {
    console.log('📥 Fetching projects and designs from Google Stitch...\n');

    const [projects, designs] = await Promise.all([
      listAllProjects(),
      listAllDesigns(),
    ]);

    if (!projects || projects.length === 0) {
      console.log('❌ No projects found in your Stitch account');
      process.exit(0);
    }

    console.log(`✅ Found ${projects.length} project(s) and ${designs.length} design(s)\n`);

    console.log('📋 PROJECTS:\n');
    projects.forEach((project, idx) => {
      console.log(`${idx + 1}. ${project.name}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Designs: ${designs.filter(d => d.projectId === project.id).length}`);
      console.log();
    });

    console.log('\n🎨 DESIGNS:\n');
    designs.forEach((design, idx) => {
      console.log(`${idx + 1}. [${design.projectName}] ${design.name}`);
      console.log(`   Screen ID: ${design.id}`);
      console.log(`   Project ID: ${design.projectId}`);
      console.log();
    });

    console.log('\n💡 USAGE:');
    console.log('Tell Claude: "Import the Stitch design named \'<Design Name>\' from project \'<Project Name>\'"');
    console.log('Claude will fetch the design and convert it to React/HTML as needed.\n');
  } catch (error) {
    console.error('❌ Error fetching designs:', error.message);
    process.exit(1);
  }
})();
