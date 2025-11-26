import { DockerInstance } from './src/dockerInstance';
import { ConfigReader } from './src/configReader';

console.log('=== Testing Docker Proxy Configuration ===\n');

async function testProxy() {
    try {
        // Read config
        const reader = new ConfigReader({
            configDir: '.fsc',
            throwOnMissing: false,
            readSupplementaryConfig: true
        });

        const config = reader.readConfig();

        console.log('Configuration loaded:');
        console.log('- HTTP Proxy:', config.httpProxy || process.env.http_proxy || 'not set');
        console.log('- HTTPS Proxy:', config.httpsProxy || process.env.https_proxy || 'not set');
        console.log();

        // Create docker instance with config
        const docker = new DockerInstance(config);

        console.log('Starting Docker container with proxy settings...');
        const containerName = await docker.startContainer('node:latest', 'proxy-test');

        console.log(`✓ Container started: ${containerName}\n`);

        // Test proxy settings inside container
        console.log('Checking environment variables inside container...');
        const result = await docker.runCommands(['env | grep -i proxy || echo "No proxy env vars found"']);

        console.log('Container environment:');
        console.log(result.output);

        // Test network connectivity
        console.log('\nTesting network connectivity (curl)...');
        const curlTest = await docker.runCommands([
            'apt-get update > /dev/null 2>&1 || true',
            'apt-get install -y curl > /dev/null 2>&1 || true',
            'curl -I https://www.google.com 2>&1 | head -5 || echo "Network test failed"'
        ], 60);

        console.log('Network test result:');
        console.log(curlTest.output);

        // Cleanup
        console.log('\nCleaning up...');
        await docker.shutdownContainer();

        console.log('\n=== Proxy Test Completed Successfully ===');
    } catch (error) {
        console.error('❌ Proxy test failed:', error);
        process.exit(1);
    }
}

testProxy();
