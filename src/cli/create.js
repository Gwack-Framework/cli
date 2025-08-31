/**
 * Create Project Command
 *
 * Creates a new Gwack Framework project
 */

import { mkdir, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

/**
 * Create command handler
 *
 * @param {string} name - Project name
 * @param {Object} options - Create options
 * @param {string} options.template - Template to use
 */
export async function createCommand(name, options) {
  console.log(chalk.blue.bold(`🚀 Creating new Gwack project: ${name}\n`));

  try {
    const projectPath = join(process.cwd(), name);

    // Create project structure
    await mkdir(projectPath, { recursive: true });
    await mkdir(join(projectPath, 'pages'), { recursive: true });

    // Create package.json
    const packageJson = {
      name: name,
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'gwack dev',
        build: 'gwack build',
        preview: 'gwack preview'
      },
      dependencies: {
        "vue": "^3.4.0",
        "vue-router": "^4.2.0"
      }
    };

    await writeFile(
      join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create basic files
    await createBasicFiles(projectPath);

    console.log(chalk.green('✅ Project created successfully!'));
    console.log(chalk.gray('\n📦 Next steps:'));
    console.log(chalk.gray(`   cd ${name}`));
    console.log(chalk.gray('   npm install'));
    console.log(chalk.gray('   npm run dev'));

  } catch (error) {
    console.error(chalk.red('❌ Failed to create project:'));
    console.error(error.message);
    process.exit(1);
  }
}

async function createBasicFiles(projectPath) {
  // Create pages/index.vue
  const indexPage = `<template>
    <div class="home">
      <h1>Welcome to Gwack Framework!</h1>
      <p>Your high-performance PHP framework with Vue.js frontend</p>

      <div class="posts" v-if="posts">
        <h2>Posts</h2>
        <div v-for="post in posts" :key="post.id" class="post">
          <h3>{{ post.title }}</h3>
          <p>{{ post.content }}</p>
        </div>
      </div>
    </div>
  </template>

  <script setup>
  const posts = ref([])

  onMounted(async () => {
    try {
      posts.value = await $fetch('api/posts')
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    }
  })
  </script>

  <style scoped>
  .home {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .post {
    border: 1px solid #eee;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 4px;
  }
  </style>`;

  await writeFile(join(projectPath, 'pages/index.vue'), indexPage);

  // Create server/api/posts/index.php
  const postsRoute = `<?php

  use Gwack\\Framework\\Context;
  use Gwack\\Framework\\Http\\Request;

  return function (Context $context, Request $request) {
      // Sample data - replace with your database logic
      $posts = [
          [
              'id' => 1,
              'title' => 'Welcome to Gwack Framework',
              'content' => 'This is your first post from the PHP backend!'
          ],
          [
              'id' => 2,
              'title' => 'High Performance',
              'content' => 'Built for speed with optimized routing and container system.'
          ]
      ];

      return json($posts);
  };
  `;

  await writeFile(join(projectPath, 'server/api/posts/index.php'), postsRoute);

  // Create gwack.config.js
  const config = `export default {
    // Framework configuration
    php: {
      port: 8000
    },
    frontend: {
      port: 3000
    },

    // Build configuration
    build: {
      target: 'es2020'
    }
  }`;

  await writeFile(join(projectPath, 'gwack.config.js'), config);
}
