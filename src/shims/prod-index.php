<?php

/**
 * Entry Point
 *
 * This file bootstraps the framework for deployments.
 */

// Autoload composer dependencies
require_once __DIR__ . '/vendor/autoload.php';

use Gwack\Core\Application;
use Gwack\Core\Routing\FileBasedRouter;

// If using the PHP built-in server, serve static files from .output/public
if (php_sapi_name() === 'cli-server') {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    $publicRoot = realpath(__DIR__ . '/public') ?: (__DIR__ . '/public');

    $docCandidate = realpath(__DIR__ . $uri);
    if ($docCandidate && is_file($docCandidate) && str_starts_with($docCandidate, realpath(__DIR__))) {
        return false; // Built-in server will serve this file
    }

    $inPublic = $uri;
    if (str_starts_with($inPublic, '/public/')) {
        $inPublic = substr($inPublic, strlen('/public'));
    }

    if ($inPublic === '/' || $inPublic === '') {
        $inPublic = '/index.html';
    }

    $publicCandidate = realpath($publicRoot . $inPublic);
    if ($publicCandidate && is_file($publicCandidate) && str_starts_with($publicCandidate, $publicRoot)) {
        $ext = pathinfo($publicCandidate, PATHINFO_EXTENSION);
        $mime = [
            'html' => 'text/html; charset=UTF-8',
            'js' => 'application/javascript; charset=UTF-8',
            'css' => 'text/css; charset=UTF-8',
            'map' => 'application/json; charset=UTF-8',
            'json' => 'application/json; charset=UTF-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'ico' => 'image/x-icon',
            'webp' => 'image/webp',
        ][$ext] ?? 'application/octet-stream';
        header('Content-Type: ' . $mime);
        readfile($publicCandidate);
        return;
    }

    if (!str_contains($uri, '.') && !str_starts_with($uri, '/api')) {
        $indexFile = "$publicRoot/index.html";
        if (is_file($indexFile)) {
            header('Content-Type: text/html; charset=UTF-8');
            readfile($indexFile);
            return;
        }
    }
}

// Create the application rooted at .output
$app = new Application(__DIR__);

$app->configure([
    'env' => 'production',
    'debug' => false,
    'api' => [
        'prefix' => '/api'
    ]
]);

// Boot the framework
$app->boot();

// Set up file-based routing if server/ exists
$serverDir = __DIR__ . '/server';
if (is_dir($serverDir)) {
    $fileRouter = new FileBasedRouter($app->getContainer());
    $fileRouter->discoverRoutes($serverDir);
}

// Handle the incoming request
$app->run();
