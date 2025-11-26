import { DockerInstance } from './src/dockerInstance';
import { ConfigReader } from './src/configReader';

console.log('=== Testing Custom Claude Code Installation ===\n');

async function testInstall() {
    try {
        const reader = new ConfigReader({
            configDir: '.fsc',
            throwOnMissing: false,
            readSupplementaryConfig: true
        });

        const config = reader.readConfig();
        const docker = new DockerInstance(config);

        console.log('Starting container...');
        const containerName = await docker.startContainer('node:latest', 'claude-install-test');
        console.log(`✓ Container started: ${containerName}\n`);

        // Install prerequisites
        console.log('Installing prerequisites...');
        let result = await docker.runCommandAsync(
            'apt-get update && apt-get install -y curl',
            120
        );
        console.log('✓ apt-get update completed\n');

        console.log('Installing Node.js 20...');
        result = await docker.runCommandAsync(
            'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs',
            180
        );
        console.log('✓ Node.js installed\n');

        // Check versions
        result = await docker.runCommands(['node --version']);
        console.log('Node.js version:', result.output.trim());

        result = await docker.runCommands(['npm --version']);
        console.log('npm version:', result.output.trim(), '\n');

        // Install Claude Code with custom command (without proxy)
        console.log('Installing Claude Code from custom source (without proxy)...');
        console.log('Command: unset http_proxy && npm install -g https://gaccode.com/claudecode/install --registry=https://registry.npmmirror.com\n');

        result = await docker.runCommandAsync(
            'unset http_proxy && unset https_proxy && unset HTTP_PROXY && unset HTTPS_PROXY && npm install -g https://gaccode.com/claudecode/install --registry=https://registry.npmmirror.com',
            300
        );

        console.log('Installation status:', result.status);
        console.log('\nInstallation output (last 1000 chars):');
        console.log(result.output.slice(-1000));

        if (result.status !== 'success') {
            console.log('\nInstallation error:', result.error);
        }

        // Check if claude is installed
        console.log('\n--- Verification ---\n');
        result = await docker.runCommands(['which claude']);
        console.log('Claude location:', result.output.trim());

        result = await docker.runCommands(['claude --version 2>&1 || echo "Version check failed"']);
        console.log('Claude version:', result.output.trim());

        result = await docker.runCommands(['claude --help 2>&1 | head -10 || echo "Help failed"']);
        console.log('\nClaude help (first 10 lines):');
        console.log(result.output);

        // Test with environment variables
        console.log('\n--- Testing with API credentials ---\n');
        const testCmd = `export ANTHROPIC_BASE_URL=https://gaccode.com/claudecode && export ANTHROPIC_AUTH_TOKEN=${config.anthropicAPIKey} && export IS_SANDBOX=1 && echo "Testing claude..." && timeout 10 claude --version 2>&1 || echo "Command timed out or failed"`;

        result = await docker.runCommandAsync(testCmd, 30);
        console.log('Test result:', result.output);

        // Cleanup
        console.log('\n--- Cleanup ---');
        await docker.shutdownContainer();
        console.log('✓ Container removed');

        console.log('\n=== Test Complete ===');

        if (result.status === 'success') {
            console.log('\n✅ Claude Code installation SUCCESSFUL!');
            console.log('You can now run the full system.');
        } else {
            console.log('\n⚠️  Installation completed but verification had issues.');
            console.log('Check the output above for details.');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

testInstall();
