import { Command } from "commander";
import { VERSION } from "./version.js";
import { runStep } from "./commands/run-step.js";
import { loadLocalSteps } from "./steps/loader.js";

// Load user-defined steps from ~/.pipe/steps/ before parsing commands
await loadLocalSteps();

const program = new Command();

program
  .name("pipe")
  .description("The Unix philosophy for AI agents")
  .version(VERSION);

program
  .command("list")
  .description("List available steps")
  .action(async () => {
    const { listCommand } = await import("./commands/list.js");
    listCommand();
  });

program
  .command("init <name>")
  .description("Scaffold a new custom step")
  .action(async (name: string) => {
    const { initCommand } = await import("./commands/init.js");
    initCommand(name);
  });

program
  .command("save <name> <definition>")
  .description("Save a pipeline definition")
  .action(async (name: string, definition: string) => {
    const { saveCommand } = await import("./commands/save.js");
    saveCommand(name, definition);
  });

program
  .command("run <name>")
  .description("Run a saved pipeline")
  .action(async (name: string) => {
    const { runPipelineCommand } = await import("./commands/run-pipeline.js");
    await runPipelineCommand(name);
  });

const configCmd = program
  .command("config")
  .description("Manage configuration");

configCmd
  .command("set <key> <value>")
  .description("Set a config value (dot-notation supported)")
  .action(async (key: string, value: string) => {
    const { configSetCommand } = await import("./commands/config-cmd.js");
    configSetCommand(key, value);
  });

configCmd
  .command("get <key>")
  .description("Get a config value")
  .action(async (key: string) => {
    const { configGetCommand } = await import("./commands/config-cmd.js");
    configGetCommand(key);
  });

configCmd
  .command("list")
  .description("List all config values (API keys masked)")
  .action(async () => {
    const { configListCommand } = await import("./commands/config-cmd.js");
    configListCommand();
  });

program
  .command("info <step>")
  .description("Show detailed information about a step")
  .action(async (stepName: string) => {
    const { infoCommand } = await import("./commands/info.js");
    infoCommand(stepName);
  });

program
  .command("compare <models...>")
  .description("Compare multiple models on the same input")
  .option("-c, --config <pairs...>", "Config overrides (key=value)")
  .action(async (models: string[], options: { config?: string[] }) => {
    const { compareCommand } = await import("./commands/compare.js");
    await compareCommand(models, options);
  });

program
  .command("cost")
  .description("Analyze pipeline cost from [pipe:meta] data")
  .action(async () => {
    const { costCommand } = await import("./commands/cost.js");
    await costCommand();
  });

program
  .command("install <source>")
  .description("Install a step from a local path or git URL")
  .action(async (source: string) => {
    const { installCommand } = await import("./commands/install.js");
    installCommand(source);
  });

program
  .command("publish [dir]")
  .description("Publish a step (shows sharing instructions)")
  .action(async (dir?: string) => {
    const { publishCommand } = await import("./commands/publish.js");
    publishCommand(dir);
  });

program
  .command("uninstall <name>")
  .description("Uninstall a custom step")
  .action(async (name: string) => {
    const { uninstallCommand } = await import("./commands/uninstall.js");
    uninstallCommand(name);
  });

const arenaCmd = program
  .command("arena")
  .description("Competitive pipeline challenges");

arenaCmd
  .command("create <name>")
  .requiredOption("-d, --description <desc>", "Challenge description")
  .action(async (name: string, opts: { description: string }) => {
    const { arenaCreate } = await import("./commands/arena.js");
    arenaCreate(name, opts.description);
  });

arenaCmd
  .command("add-case <challenge>")
  .requiredOption("-i, --input <text>", "Test input")
  .requiredOption("-e, --expected <text>", "Expected output")
  .action(async (challenge: string, opts: { input: string; expected: string }) => {
    const { arenaAddCase } = await import("./commands/arena.js");
    arenaAddCase(challenge, opts.input, opts.expected);
  });

arenaCmd
  .command("run <challenge>")
  .argument("<pipeline...>", "Pipeline command to run")
  .action(async (challenge: string, pipeline: string[]) => {
    const { arenaRun } = await import("./commands/arena.js");
    await arenaRun(challenge, pipeline);
  });

arenaCmd
  .command("leaderboard <challenge>")
  .action(async (challenge: string) => {
    const { arenaLeaderboard } = await import("./commands/arena.js");
    arenaLeaderboard(challenge);
  });

arenaCmd
  .command("list")
  .action(async () => {
    const { arenaList } = await import("./commands/arena.js");
    arenaList();
  });

program
  .argument("[step]", "Step to execute")
  .option("-c, --config <pairs...>", "Config overrides (key=value)")
  .action(async (step: string | undefined, options: { config?: string[] }) => {
    if (!step) {
      program.help();
      return;
    }
    await runStep(step, options);
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
