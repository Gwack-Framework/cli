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

    // Create composer.json
    const composerName = name.includes('/')
      ? name
      : `app/${name.toLowerCase().replace(/[^a-z0-9_.-]+/g, '-')}`;
    const composerJson = {
      name: composerName,
      description: 'Gwack',
      type: 'project',
      require: {
        php: '>=8.3',
        'gwack/core': '1.0'
      },
      'minimum-stability': 'dev',
      'prefer-stable': true,
      autoload: {
        'psr-4': {
          'App\\': '.'
        }
      },
      config: {
        'allow-plugins': {
          'php-http/discovery': true
        }
      }
    };

    await writeFile(
      join(projectPath, 'composer.json'),
      JSON.stringify(composerJson, null, 2)
    );

    // Create basic files
    await createBasicFiles(projectPath);

    console.log(chalk.green('✅ Project created successfully!'));
    console.log(chalk.gray('\n📦 Next steps:'));
    console.log(chalk.gray(`   cd ${name}`));
    console.log(chalk.gray('   composer install'));
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
    <p>Your fav PHP framework with Vue.js frontend</p>
  </div>
</template>
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

  // Create index.html so Vite has an entry
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gwack App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/.gwack/entry.js"></script>
  </body>
</html>`;
  await writeFile(join(projectPath, 'index.html'), html);
}
