<?php

/**
 * Gwack Framework Entry Point
 *
 * This file bootstraps the framework and handles all incoming requests
 * Automatically generated.
 */

require_once '../vendor/autoload.php';

use Gwack\Core\Application;
use Gwack\Core\Routing\FileBasedRouter;

// Create the application
$app = new Application(__DIR__ . '/..');

// Configure for development
$app->configure([
    'env' => 'development',
    'debug' => true,
    'api' => [
        'prefix' => '/api'
    ]
]);

// Boot the framework
$app->boot();

// Set up file-based routing if server/ exists
$serverDir = __DIR__ . '/../server';
if (is_dir($serverDir)) {
    $fileRouter = new FileBasedRouter($app->getContainer());
    $fileRouter->discoverRoutes($serverDir);
}

// Handle the incoming request
$app->run();
