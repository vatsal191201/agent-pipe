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
