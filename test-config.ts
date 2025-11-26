import { ConfigReader } from './src/configReader';
import { SWEAgentType } from './src/config';

console.log('=== Testing Configuration ===\n');

try {
    const reader = new ConfigReader({
        configDir: '.fsc',
        throwOnMissing: false,
        readSupplementaryConfig: true
    });

    const config = reader.readConfig();

    console.log('Configuration loaded successfully!');
    console.log('\nConfiguration details:');
    console.log('- Agent Type:', config.agentType);
    console.log('- API Base URL:', config.anthropicAPIBaseUrl);
    console.log('- API Key Export Needed:', config.anthropicAPIKeyExportNeeded);
    console.log('- Max Docker Containers:', config.maxDockerContainers);
    console.log('- Max Parallel Containers:', config.maxParallelDockerContainers);
    console.log('- Docker Memory (MB):', config.dockerMemoryMB);
    console.log('- Docker CPU Cores:', config.dockerCpuCores);
    console.log('- Max Tasks:', config.maxTasks);
    console.log('- Work Style:', config.workStyle);

    if (config.agentType === SWEAgentType.CLAUDE_CODE) {
        console.log('\n✓ Claude Code agent configured correctly');
        if (config.anthropicAPIBaseUrl === 'https://gaccode.com/claudecode') {
            console.log('✓ Custom API base URL is set correctly');
        }
    }

    console.log('\n=== Configuration Test Passed ===');
} catch (error) {
    console.error('❌ Configuration test failed:', error);
    process.exit(1);
}
