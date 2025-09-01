# Gwack CLI

A command-line tool for building full-stack PHP + Vue.js applications. Handles build configurations and frontend-backend integration.

## What is this?

Gwack CLI is the companion tool for the Gwack Framework - a PHP framework with Vue.js integration. It provides development tooling and handles project setup and build processes.

## Quick Start

```bash
# Install globally
npm install -g @gwack/cli

# Or use with npx (no installation required)
npx gwack create my-awesome-app

# Create a new project
gwack create my-awesome-app
# or
npx gwack create my-awesome-app

# Start developing
cd my-awesome-app
gwack dev
# or
npx @gwack/cli dev
```

That's it! You'll have a running PHP backend and Vue.js frontend with the necessary configuration.

## What can it do?

### `gwack create <project-name>`

Creates a new Gwack project with default configuration and file structure.

### `gwack dev`

Starts the development environment with hot reloading for Vue components and PHP backend.

**Options:**

- `-p, --port <port>` - Frontend port (default: 3000)
- `--php-port <port>` - PHP server port (default: 8080)
- `-h, --host <host>` - Host to bind to (default: localhost)

### `gwack build`

Builds the application for production with optimization and asset minification.

**Options:**

- `-o, --output <dir>` - Where to put the built files (default: dist)

## Requirements

- Node.js 18+
- PHP 8.3+
- Composer

## Getting Help

For issues, bugs, or feature requests:

- Check out the [main Gwack Framework repository](https://github.com/Gwack-Framework/gwack)
- Open an issue on GitHub

## License

[MIT](LICENSE)
