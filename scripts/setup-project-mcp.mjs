import { spawn } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const serverPath = path.join(projectRoot, 'server', 'mcp-server.mjs');
const configDirectory = path.join(projectRoot, '.codex');
const configPath = path.join(configDirectory, 'config.toml');
const blockStart = '# BEGIN jlpt-master-deck MCP';
const blockEnd = '# END jlpt-master-deck MCP';

await access(serverPath);
await verifyMcpServer();
await mkdir(configDirectory, { recursive: true });

const currentConfig = await readFile(configPath, 'utf8').catch((error) => {
  if (error.code === 'ENOENT') {
    return '';
  }
  throw error;
});

const managedBlock = [
  blockStart,
  '[mcp_servers.jlpt_review]',
  'command = "node"',
  'args = ["server/mcp-server.mjs"]',
  `cwd = "${escapeTomlString(projectRoot)}"`,
  'startup_timeout_sec = 20',
  'tool_timeout_sec = 60',
  blockEnd,
].join('\n');

const nextConfig = updateConfig(currentConfig, managedBlock);
await writeFile(configPath, `${nextConfig.trim()}\n`, 'utf8');

console.log('Configured project MCP: .codex/config.toml');
console.log('Verified MCP server: jlpt_review');
console.log('Restart Codex, trust this project if prompted, then use /mcp to confirm the connection.');

function escapeTomlString(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function updateConfig(config, managedBlock) {
  const managedPattern = new RegExp(`${escapeRegExp(blockStart)}[\\s\\S]*?${escapeRegExp(blockEnd)}`, 'g');
  const managedMatches = [...config.matchAll(managedPattern)];
  if (managedMatches.length > 1) {
    throw new Error('Multiple managed jlpt_review MCP blocks found in .codex/config.toml. Remove duplicates and retry.');
  }
  if (managedMatches.length === 1) {
    return config.replace(managedPattern, managedBlock);
  }

  const sectionPattern = /(^|\n)\[mcp_servers\.jlpt_review\][\s\S]*?(?=\n\[[^\]]+\]|\s*$)/g;
  const sectionMatches = [...config.matchAll(sectionPattern)];
  if (sectionMatches.length > 1) {
    throw new Error('Multiple jlpt_review MCP sections found in .codex/config.toml. Remove duplicates and retry.');
  }
  if (sectionMatches.length === 1) {
    return config.replace(sectionPattern, `${sectionMatches[0][1]}${managedBlock}\n`);
  }

  return config.trim() ? `${config.trim()}\n\n${managedBlock}` : managedBlock;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function verifyMcpServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverPath], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('MCP server verification timed out.'));
    }, 5000);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`MCP server exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`));
        return;
      }

      const responses = stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const initialization = responses.find((response) => response.id === 1);
      const tools = responses.find((response) => response.id === 2)?.result?.tools;
      if (initialization?.result?.serverInfo?.name !== 'jlpt-local-mcp' || !tools?.some((tool) => tool.name === 'login')) {
        reject(new Error('MCP server started but did not return the expected jlpt_review tools.'));
        return;
      }
      resolve();
    });

    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })}\n`);
    child.stdin.end(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })}\n`);
  });
}
