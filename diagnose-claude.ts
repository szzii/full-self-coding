import { DockerInstance } from './src/dockerInstance';
import { ConfigReader } from './src/configReader';

console.log('=== Diagnosing Claude Code Installation ===\n');

async function diagnose() {
    try {
        const reader = new ConfigReader({
            configDir: '.fsc',
            throwOnMissing: false,
            readSupplementaryConfig: true
        });

        const config = reader.readConfig();
        const docker = new DockerInstance(config);

        console.log('Starting container...');
        const containerName = await docker.startContainer('node:latest', 'claude-diagnose');
        console.log(`✓ Container started: ${containerName}\n`);

        // Step 1: Install Node.js and dependencies
        console.log('Step 1: Installing Node.js...');
        let result = await docker.runCommandAsync(
            'apt-get update && apt-get install -y curl',
            120
        );
        console.log('apt-get result:', result.status);

        console.log('\nStep 2: Installing Node.js 20...');
        result = await docker.runCommandAsync(
            'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -',
            120
        );
        console.log('Node.js setup result:', result.status);

        result = await docker.runCommandAsync(
            'apt-get install -y nodejs',
            120
        );
        console.log('Node.js install result:', result.status);

        // Check Node and npm versions
        console.log('\nStep 3: Checking Node.js and npm versions...');
        result = await docker.runCommands(['node --version']);
        console.log('Node version:', result.output);

        result = await docker.runCommands(['npm --version']);
        console.log('npm version:', result.output);

        // Step 4: Try to install Claude Code
        console.log('\nStep 4: Installing Claude Code...');
        result = await docker.runCommandAsync(
            'npm install -g @anthropic-ai/claude-code',
            300
        );
        console.log('Claude Code install status:', result.status);
        console.log('Install output:', result.output);
        if (result.error) {
            console.log('Install error:', result.error);
        }

        // Step 5: Check if claude command exists
        console.log('\nStep 5: Checking claude command...');
        result = await docker.runCommands(['which claude']);
        console.log('Claude location:', result.output);

        result = await docker.runCommands(['claude --version 2>&1 || echo "Claude command failed"']);
        console.log('Claude version:', result.output);

        // Step 6: Test with environment variables
        console.log('\nStep 6: Testing with environment variables...');
        const testCommand = `export ANTHROPIC_BASE_URL=https://gaccode.com/claudecode && export ANTHROPIC_AUTH_TOKEN=sk-ant-oat01-3d16c2d5def79025c5a9f12e8d44b6f73828803e2a9083b7732cbe2ba04406c8 && echo "Env vars set" && claude --version`;

        result = await docker.runCommandAsync(testCommand, 60);
        console.log('Test command status:', result.status);
        console.log('Test command output:', result.output);
        if (result.error) {
            console.log('Test command error:', result.error);
        }

        // Step 7: Try simpler claude command
        console.log('\nStep 7: Testing simple claude help...');
        result = await docker.runCommandAsync('claude --help', 30);
        console.log('Claude help status:', result.status);
        console.log('Claude help output (first 500 chars):', result.output.substring(0, 500));

        console.log('\n=== Cleanup ===');
        await docker.shutdownContainer();
        console.log('Container cleaned up');

    } catch (error) {
        console.error('❌ Diagnosis failed:', error);
    }
}

diagnose();
