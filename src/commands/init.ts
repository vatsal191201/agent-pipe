import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function initCommand(name: string): void {
  const dir = join(process.cwd(), name);

  if (existsSync(dir)) {
    throw new Error(`Directory "${name}" already exists. Choose a different name.`);
  }

  mkdirSync(dir, { recursive: true });

  // pipe.json
  const manifest = {
    name,
    version: "1.0.0",
    description: "A custom pipe step",
    main: "index.js",
    engine: "node",
    configSchema: {},
  };
  writeFileSync(join(dir, "pipe.json"), JSON.stringify(manifest, null, 2) + "\n");

  // index.js
  const indexJs = `// Custom pipe step: ${name}
// Usage: echo "input" | pipe ${name}

export default {
  name: "${name}",
  description: "A custom pipe step",
  configSchema: {
    // Add config options here:
    // example: { type: "string", default: "value", description: "An example option" }
  },
  run: async function* (ctx) {
    // ctx.input -- the text piped in
    // ctx.config -- config overrides from -c key=value
    // ctx.globalConfig -- global pipe config

    // Process the input
    const result = ctx.input.toUpperCase();

    // Yield output (streamed to stdout)
    yield result;

    // Return metadata (emitted to stderr as [pipe:meta])
    return { step: "${name}" };
  },
};
`;
  writeFileSync(join(dir, "index.js"), indexJs);

  // README.md
  const readme = `# ${name}

A custom step for [Agent Pipe](https://github.com/vatsal191201/agent-pipe).

## Usage

\`\`\`bash
echo "input" | pipe ${name}
\`\`\`

## Install

Copy this directory to \`~/.pipe/steps/${name}/\`, or run:

\`\`\`bash
pipe install ./${name}
\`\`\`

## Config Options

None yet. Add options in \`pipe.json\` and \`index.js\`.
`;
  writeFileSync(join(dir, "README.md"), readme);

  // Print summary
  console.log(`Created step "${name}":`);
  console.log(`  ${name}/pipe.json     Step manifest`);
  console.log(`  ${name}/index.js      Step implementation`);
  console.log(`  ${name}/README.md     Documentation`);
  console.log("");
  console.log("To use locally:");
  console.log(`  cp -r ${name} ~/.pipe/steps/`);
  console.log(`  echo "test" | pipe ${name}`);
  console.log("");
  console.log("To publish:");
  console.log(`  pipe publish ${name}/`);
}
