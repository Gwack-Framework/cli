/**
 * Create Project Command
 *
 * Creates a new Gwack Framework project
 */

import { mkdir, writeFile, copyFile } from 'fs/promises';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
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
        "@gwack/js": "^0.1.0"
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

    console.log(chalk.green('Project created successfully!'));
    console.log('\n');
    console.log(chalk.gray('\t Next steps:'));
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
  // Resolve root-level shims directory regardless of running from src or dist
  const here = dirname(fileURLToPath(import.meta.url));
  // here = .../dist/cli (when built) or .../src/cli (when dev)
  // package root is two levels up from dist/cli or src/cli
  const pkgRoot = join(here, '..', '..');
  const shimsDir = join(pkgRoot, 'shims');
  const nmShimsDir = join(process.cwd(), 'node_modules', '@gwack', 'cli', 'shims');
  // Create pages/index.vue from shim
  let indexPage;
  try {
    let shimPath = join(shimsDir, 'index-page.vue.tmpl');
    if (existsSync(shimPath)) {
      indexPage = readFileSync(shimPath, 'utf8');
    } else {
      // fallback to node_modules installation path
      shimPath = join(nmShimsDir, 'index-page.vue.tmpl');
      if (existsSync(shimPath)) {
        indexPage = readFileSync(shimPath, 'utf8');
      } else {
        throw new Error('Shim not found');
      }
    }
  } catch (error) {
    console.error('Could not read index page shim');
  }
  if (typeof indexPage === 'string') {
    await writeFile(join(projectPath, 'pages/index.vue'), indexPage);
  }

  // gwack.config.js
  let config;
  try {
    let shimPath = join(shimsDir, 'gwack.config.tmpl');
    if (existsSync(shimPath)) {
      config = readFileSync(shimPath, 'utf8');
    } else {
      shimPath = join(nmShimsDir, 'gwack.config.tmpl');
      if (existsSync(shimPath)) {
        config = readFileSync(shimPath, 'utf8');
      } else {
        throw new Error('Shim not found');
      }
    }
  } catch (error) {
    console.error('Could not read config shim');
  }
  if (typeof config === 'string') {
    await writeFile(join(projectPath, 'gwack.config.js'), config);
  }

  // index.html
  let html;
  try {
    let shimPath = join(shimsDir, 'index.html.tmpl');
    if (existsSync(shimPath)) {
      html = readFileSync(shimPath, 'utf8');
    } else {
      shimPath = join(nmShimsDir, 'index.html.tmpl');
      if (existsSync(shimPath)) {
        html = readFileSync(shimPath, 'utf8');
      } else {
        throw new Error('Shim not found');
      }
    }
  } catch (error) {
    console.error('Could not read HTML shim');
    return
  }
  if (typeof html === 'string') {
    await writeFile(join(projectPath, 'index.html'), html);
  }
}
