#!/usr/bin/env node

/**
 * HyperDrive CLI Tool
 * 
 * A command-line interface for optimizing AI models with HyperDrive.
 * 
 * Usage:
 *   npx hyperdrive optimize <model.onnx> --target <device> --quantization <type>
 *   npx hyperdrive list
 *   npx hyperdrive status <jobId>
 * 
 * Examples:
 *   npx hyperdrive optimize model.onnx --target edge-tpu --quantization INT8
 *   npx hyperdrive list
 *   npx hyperdrive status abc123
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const HYPERDRIVE_API_URL = process.env.HYPERDRIVE_API_URL || 'http://localhost:5000';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logBanner() {
    log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ⚡ HyperDrive CLI - AI Model Optimization                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`, 'cyan');
}

function showHelp() {
    logBanner();
    log('USAGE:', 'bright');
    console.log('  hyperdrive <command> [options]');
    console.log('');
    log('COMMANDS:', 'bright');
    console.log('  optimize <file>    Optimize a model file');
    console.log('  list               List all optimization jobs');
    console.log('  status <jobId>     Check the status of a job');
    console.log('  insights           View optimization insights');
    console.log('  help               Show this help message');
    console.log('');
    log('OPTIONS for optimize:', 'bright');
    console.log('  --target, -t       Target device (e.g., edge-tpu, nvidia-a100, cpu)');
    console.log('  --quantization, -q Quantization type (e.g., INT8, FP16, INT4)');
    console.log('  --strategy, -s     Optimization strategy (e.g., latency, size, balanced)');
    console.log('');
    log('EXAMPLES:', 'bright');
    console.log('  hyperdrive optimize resnet50.onnx --target edge-tpu -q INT8');
    console.log('  hyperdrive list');
    console.log('  hyperdrive status a1b2c3d4');
    console.log('');
    log('ENVIRONMENT VARIABLES:', 'bright');
    console.log('  HYPERDRIVE_API_URL    API endpoint (default: http://localhost:5000)');
    console.log('');
}

async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${HYPERDRIVE_API_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        if (error.message.includes('ECONNREFUSED')) {
            log('✗ Cannot connect to HyperDrive API. Is the server running?', 'red');
            log(`  Expected URL: ${HYPERDRIVE_API_URL}`, 'dim');
        } else {
            log(`✗ Error: ${error.message}`, 'red');
        }
        process.exit(1);
    }
}

async function listJobs() {
    log('Fetching jobs...', 'dim');
    const jobs = await fetchAPI('/api/jobs');

    if (jobs.length === 0) {
        log('No optimization jobs found.', 'yellow');
        return;
    }

    log(`\nFound ${jobs.length} jobs:\n`, 'bright');

    console.log('┌────────────────────┬────────────────────────────┬─────────────┬─────────────┐');
    console.log('│ ID                 │ File                       │ Status      │ Reduction   │');
    console.log('├────────────────────┼────────────────────────────┼─────────────┼─────────────┤');

    for (const job of jobs) {
        const id = job.id.slice(0, 18).padEnd(18);
        const name = (job.fileName || 'Unknown').slice(0, 26).padEnd(26);
        const status = (job.status || 'pending').padEnd(11);
        const reduction = job.sizeReduction ? `${job.sizeReduction}%`.padEnd(11) : '-'.padEnd(11);

        const statusColor = job.status === 'completed' ? colors.green :
            job.status === 'running' ? colors.blue :
                job.status === 'failed' ? colors.red : '';

        console.log(`│ ${id} │ ${name} │ ${statusColor}${status}${colors.reset} │ ${reduction} │`);
    }

    console.log('└────────────────────┴────────────────────────────┴─────────────┴─────────────┘');
}

async function getStatus(jobId) {
    if (!jobId) {
        log('✗ Please provide a job ID', 'red');
        console.log('  Usage: hyperdrive status <jobId>');
        process.exit(1);
    }

    log(`Fetching job ${jobId}...`, 'dim');
    const job = await fetchAPI(`/api/jobs/${jobId}`);

    log(`\n⚡ Job Details\n`, 'cyan');
    console.log(`  ID:            ${job.id}`);
    console.log(`  File:          ${job.fileName}`);
    console.log(`  Status:        ${job.status}`);
    console.log(`  Progress:      ${job.progress}%`);

    if (job.config) {
        console.log('');
        log('  Configuration:', 'bright');
        console.log(`    Quantization: ${job.config.quantization}`);
        console.log(`    Target:       ${job.config.targetDevice}`);
        console.log(`    Strategy:     ${job.config.strategy}`);
    }

    if (job.status === 'completed') {
        console.log('');
        log('  Results:', 'green');
        console.log(`    Size Reduction: ${job.sizeReduction}%`);
        console.log(`    Original Size:  ${formatBytes(job.fileSize)}`);
        if (job.optimizedLatency) {
            console.log(`    Latency:        ${job.optimizedLatency}ms (was ${job.originalLatency}ms)`);
        }
    }

    console.log('');
}

async function getInsights() {
    log('Fetching insights...', 'dim');
    const insights = await fetchAPI('/api/insights');

    log(`\n📊 Optimization Insights\n`, 'cyan');

    console.log(`  Total Models Optimized: ${colors.bright}${insights.totalModelsOptimized}${colors.reset}`);
    console.log(`  Total Size Saved:       ${colors.green}${insights.totalSizeSavedGB} GB${colors.reset}`);
    console.log(`  Avg Size Reduction:     ${colors.green}${insights.avgSizeReduction}%${colors.reset}`);
    console.log(`  Avg Latency Reduction:  ${colors.green}${insights.avgLatencyReduction}%${colors.reset}`);
    console.log('');

    log('  Estimated Savings:', 'bright');
    console.log(`    Monthly: ${colors.green}$${insights.estimatedMonthlySavings}${colors.reset}`);
    console.log(`    Annual:  ${colors.green}$${insights.estimatedAnnualSavings}${colors.reset}`);
    console.log('');

    if (Object.keys(insights.quantizationBreakdown).length > 0) {
        log('  Quantization Usage:', 'bright');
        for (const [type, count] of Object.entries(insights.quantizationBreakdown)) {
            console.log(`    ${type}: ${count} models`);
        }
    }
    console.log('');
}

async function optimizeModel(filePath, options) {
    if (!filePath) {
        log('✗ Please provide a model file path', 'red');
        console.log('  Usage: hyperdrive optimize <file> [options]');
        process.exit(1);
    }

    // Verify file exists
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
        log(`✗ File not found: ${fullPath}`, 'red');
        process.exit(1);
    }

    const stats = fs.statSync(fullPath);
    const fileName = path.basename(fullPath);

    log(`\n⚡ Optimizing: ${fileName}\n`, 'cyan');
    console.log(`  Path:         ${fullPath}`);
    console.log(`  Size:         ${formatBytes(stats.size)}`);
    console.log(`  Target:       ${options.target || 'auto'}`);
    console.log(`  Quantization: ${options.quantization || 'INT8'}`);
    console.log(`  Strategy:     ${options.strategy || 'balanced'}`);
    console.log('');

    log('Note: In production, this would upload the file to HyperDrive API.', 'yellow');
    log('Currently running in demo mode.', 'yellow');
    console.log('');

    // Simulate optimization progress
    log('Starting optimization...', 'dim');

    for (let progress = 0; progress <= 100; progress += 10) {
        process.stdout.write(`\r  Progress: [${getProgressBar(progress)}] ${progress}%`);
        await sleep(200);
    }

    console.log('\n');
    log('✓ Optimization complete!', 'green');
    log('  Simulated Results:', 'bright');
    console.log(`    Size Reduction: 48%`);
    console.log(`    Latency:        12ms (was 45ms)`);
    console.log(`    Accuracy Drop:  <0.5%`);
    console.log('');
}

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getProgressBar(percent, width = 30) {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return `${colors.green}${'█'.repeat(filled)}${colors.dim}${'░'.repeat(empty)}${colors.reset}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function parseArgs(args) {
    const options = {};
    let currentFlag = null;

    for (const arg of args) {
        if (arg.startsWith('--')) {
            currentFlag = arg.slice(2);
            options[currentFlag] = true;
        } else if (arg.startsWith('-')) {
            const shortFlags = { t: 'target', q: 'quantization', s: 'strategy' };
            currentFlag = shortFlags[arg.slice(1)] || arg.slice(1);
            options[currentFlag] = true;
        } else if (currentFlag) {
            options[currentFlag] = arg;
            currentFlag = null;
        }
    }

    return options;
}

// Main entry point
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === 'help' || command === '--help' || command === '-h') {
        showHelp();
        return;
    }

    logBanner();

    switch (command) {
        case 'list':
            await listJobs();
            break;

        case 'status':
            await getStatus(args[1]);
            break;

        case 'insights':
            await getInsights();
            break;

        case 'optimize':
            const options = parseArgs(args.slice(2));
            await optimizeModel(args[1], options);
            break;

        default:
            log(`✗ Unknown command: ${command}`, 'red');
            console.log('  Run "hyperdrive help" for usage information.');
            process.exit(1);
    }
}

main().catch(error => {
    log(`✗ Error: ${error.message}`, 'red');
    process.exit(1);
});
