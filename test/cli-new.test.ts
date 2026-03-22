import { readFile, rm } from "fs/promises";
import { join } from "path";
import { createProject } from "../src/cli/commands/new";

describe("CLI new command", () => {
  const projectName = "cnzr-new-app";
  const projectPath = join(process.cwd(), projectName);

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true });
  });

  test("scaffolds project with cnzr 2.0 template", async () => {
    await createProject(projectName, {});

    const pkgRaw = await readFile(join(projectPath, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);

    expect(pkg.dependencies.cnzr).toBe("^2.0.0");

    const indexRaw = await readFile(join(projectPath, "src", "index.ts"), "utf-8");
    expect(indexRaw).toContain("from 'cnzr'");
  });

  test("accepts custom metadata options", async () => {
    await createProject(projectName, { description: "Demo app" });

    const pkgRaw = await readFile(join(projectPath, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);

    expect(pkg.description).toBe("Demo app");
  });
});
