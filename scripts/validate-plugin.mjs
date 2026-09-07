#!/usr/bin/env node

/**
 * Validates this single-plugin repo against Cursor Marketplace rules:
 * https://cursor.com/docs/reference/plugins
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const errors = [];
const warnings = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const kebabNamePattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const allowedVariableKeywords = new Set([
  "type",
  "title",
  "description",
  "default",
  "enum",
  "const",
  "properties",
  "required",
  "items",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minProperties",
  "maxProperties",
]);

const requiredSkills = [
  "splatchat-connect",
  "splatchat-sdr",
  "splatchat-meeting-bot",
];

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    addError(`${context} contains invalid JSON (${filePath}): ${error.message}`);
    return null;
  }
}

function normalizeNewlines(content) {
  return content.replace(/\r\n/g, "\n");
}

function parseFrontmatter(content) {
  const normalized = normalizeNewlines(content);
  if (!normalized.startsWith("---\n")) {
    return null;
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return null;
  }

  const frontmatterBlock = normalized.slice(4, closingIndex);
  const fields = {};

  for (const line of frontmatterBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = value;
  }

  return fields;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return false;
  }
  if (path.isAbsolute(value)) {
    return false;
  }
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function collectPlaceholders(value, found = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\$\{([A-Z][A-Z0-9_]*)\}/g)) {
      found.add(match[1]);
    }
    return found;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectPlaceholders(entry, found);
    }
    return found;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      collectPlaceholders(entry, found);
    }
  }
  return found;
}

function validateVariableSchema(schema, pathLabel) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    addError(`${pathLabel} must be a JSON Schema object.`);
    return;
  }

  for (const key of Object.keys(schema)) {
    if (!allowedVariableKeywords.has(key)) {
      addError(`${pathLabel} uses unsupported keyword "${key}".`);
    }
  }

  if (schema.type !== "object") {
    addError(`${pathLabel}.type must be "object".`);
  }
  if (!schema.properties || typeof schema.properties !== "object") {
    addError(`${pathLabel}.properties is required.`);
    return;
  }

  for (const [name, property] of Object.entries(schema.properties)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
      addError(`${pathLabel}.properties.${name} should be an UPPER_SNAKE_CASE variable name.`);
    }
    if (!property || typeof property !== "object") {
      addError(`${pathLabel}.properties.${name} must be an object.`);
      continue;
    }
    for (const key of Object.keys(property)) {
      if (!allowedVariableKeywords.has(key)) {
        addError(`${pathLabel}.properties.${name} uses unsupported keyword "${key}".`);
      }
    }
  }

  if (schema.required !== undefined) {
    if (!Array.isArray(schema.required) || schema.required.some((item) => typeof item !== "string")) {
      addError(`${pathLabel}.required must be an array of strings.`);
    }
  }
}

function containsEmDash(text) {
  return text.includes("\u2014") || text.includes("\u2013");
}

async function main() {
  const marketplacePath = path.join(repoRoot, ".cursor-plugin", "marketplace.json");
  if (await pathExists(marketplacePath)) {
    addError(
      "This repo is a single Cursor Plugin. Remove .cursor-plugin/marketplace.json so marketplace publish treats the root plugin as the package."
    );
  }

  const requiredFiles = [
    ".cursor-plugin/plugin.json",
    "mcp.json",
    "README.md",
    "LICENSE",
    "assets/logo.png",
    "scripts/validate-plugin.mjs",
  ];
  for (const file of requiredFiles) {
    if (!(await pathExists(path.join(repoRoot, file)))) {
      addError(`Missing required file: ${file}`);
    }
  }

  const manifestPath = path.join(repoRoot, ".cursor-plugin", "plugin.json");
  const manifest = await readJsonFile(manifestPath, "Cursor Plugin manifest");
  if (!manifest) {
    summarizeAndExit();
    return;
  }

  if (typeof manifest.name !== "string" || !pluginNamePattern.test(manifest.name)) {
    addError(
      '"name" must be lowercase kebab-case and start/end with an alphanumeric character (e.g. splatchat).'
    );
  } else if (manifest.name !== "splatchat") {
    addError(`Expected plugin name "splatchat", found "${manifest.name}".`);
  }

  if (typeof manifest.version !== "string" || manifest.version !== "1.0.0") {
    addError('"version" must be "1.0.0".');
  }

  if (typeof manifest.description !== "string" || manifest.description.trim().length < 20) {
    addError('"description" must clearly explain the plugin\'s purpose.');
  }

  if (!manifest.author || manifest.author.name !== "SplatChat" || manifest.author.email !== "hello@splatchat.com") {
    addError('"author" must be { "name": "SplatChat", "email": "hello@splatchat.com" }.');
  }

  if (manifest.homepage !== "https://splatchat.com") {
    addError('"homepage" must be https://splatchat.com');
  }
  if (manifest.repository !== "https://github.com/naffis/splatchat-cursor") {
    addError('"repository" must be https://github.com/naffis/splatchat-cursor');
  }
  if (manifest.license !== "MIT") {
    addError('"license" must be MIT.');
  }

  if (typeof manifest.logo !== "string") {
    addError('"logo" is required and must be a relative path.');
  } else if (!isSafeRelativePath(manifest.logo)) {
    addError('"logo" must be a committed relative path (no .., no absolute URL).');
  } else if (!(await pathExists(path.join(repoRoot, manifest.logo)))) {
    addError(`"logo" references a missing file: ${manifest.logo}`);
  }

  const pathFields = ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers"];
  for (const field of pathFields) {
    const value = manifest[field];
    const candidates = [];
    if (typeof value === "string") {
      candidates.push(value);
    } else if (Array.isArray(value)) {
      candidates.push(...value.filter((entry) => typeof entry === "string"));
    }
    for (const candidate of candidates) {
      if (!isSafeRelativePath(candidate)) {
        addError(`Field "${field}" has an unsafe path "${candidate}".`);
        continue;
      }
      if (!(await pathExists(path.join(repoRoot, candidate)))) {
        addError(`Field "${field}" references a missing path "${candidate}".`);
      }
    }
  }

  if (!manifest.variables) {
    addError('"variables" must declare SPLATCHAT_API_KEY.');
  } else {
    validateVariableSchema(manifest.variables, "variables");
    const properties = manifest.variables.properties ?? {};
    if (!properties.SPLATCHAT_API_KEY) {
      addError("variables.properties must include SPLATCHAT_API_KEY.");
    } else {
      if (properties.SPLATCHAT_API_KEY.title !== "SplatChat API Key") {
        addError('SPLATCHAT_API_KEY.title must be "SplatChat API Key".');
      }
      const description = properties.SPLATCHAT_API_KEY.description ?? "";
      if (!description.includes("https://splatchat.com/workspace")) {
        addError("SPLATCHAT_API_KEY.description must point to https://splatchat.com/workspace.");
      }
    }
    const required = manifest.variables.required ?? [];
    if (!required.includes("SPLATCHAT_API_KEY")) {
      addError("variables.required must include SPLATCHAT_API_KEY.");
    }
  }

  const mcpPath = path.join(repoRoot, "mcp.json");
  const mcp = await readJsonFile(mcpPath, "MCP config");
  if (mcp) {
    const servers = mcp.mcpServers;
    if (!servers || typeof servers !== "object" || !servers.splatchat) {
      addError("mcp.json must define mcpServers.splatchat.");
    } else {
      const server = servers.splatchat;
      if (server.url !== "https://mcp.splatchat.com/mcp") {
        addError(
          "mcpServers.splatchat.url must be the public HTTPS MCP: https://mcp.splatchat.com/mcp"
        );
      }
      if (server.command) {
        addError("mcpServers.splatchat must not use stdio/command; marketplace clients expect public HTTPS.");
      }
      if (typeof server.url === "string" && (server.url.includes("localhost") || server.url.startsWith("http://"))) {
        addError("MCP URL must be public HTTPS (no localhost, no http).");
      }
      const auth = server.headers?.Authorization;
      if (auth !== "Bearer ${SPLATCHAT_API_KEY}") {
        addError(
          'mcpServers.splatchat.headers.Authorization must be "Bearer ${SPLATCHAT_API_KEY}" with no hardcoded secret.'
        );
      }
    }

    const placeholders = collectPlaceholders(mcp);
    const declared = new Set(Object.keys(manifest.variables?.properties ?? {}));
    for (const name of placeholders) {
      if (!declared.has(name)) {
        addError(`mcp.json uses \${${name}} which is not declared in plugin.json variables.`);
      }
    }
    for (const name of declared) {
      if (!placeholders.has(name)) {
        addWarning(`plugin.json declares ${name} but mcp.json does not use \${${name}}.`);
      }
    }
  }

  const skillsDir = path.join(repoRoot, "skills");
  if (!(await pathExists(skillsDir))) {
    addError("Missing skills/ directory.");
  } else {
    const skillEntries = await fs.readdir(skillsDir, { withFileTypes: true });
    const skillNames = skillEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    for (const skillName of requiredSkills) {
      if (!skillNames.includes(skillName)) {
        addError(`Missing skills/${skillName}/`);
      }
    }

    for (const skillName of skillNames) {
      if (!kebabNamePattern.test(skillName)) {
        addError(`Skill directory "${skillName}" must be kebab-case.`);
      }
      const skillPath = path.join(skillsDir, skillName, "SKILL.md");
      if (!(await pathExists(skillPath))) {
        addError(`Missing skills/${skillName}/SKILL.md`);
        continue;
      }
      const content = await fs.readFile(skillPath, "utf8");
      const parsed = parseFrontmatter(content);
      if (!parsed) {
        addError(`skills/${skillName}/SKILL.md is missing YAML frontmatter.`);
      } else {
        if (parsed.name !== skillName) {
          addError(`skills/${skillName}/SKILL.md frontmatter name must be "${skillName}".`);
        }
        if (!parsed.description) {
          addError(`skills/${skillName}/SKILL.md frontmatter description is required.`);
        }
      }
      if (containsEmDash(content)) {
        addError(`skills/${skillName}/SKILL.md contains an em dash or en dash. Use ASCII punctuation.`);
      }
    }
  }

  const readme = await fs.readFile(path.join(repoRoot, "README.md"), "utf8").catch(() => "");
  if (readme) {
    if (!readme.includes("https://splatchat.com/workspace")) {
      addError("README must tell users to create a key at https://splatchat.com/workspace.");
    }
    if (!readme.includes("https://mcp.splatchat.com/mcp")) {
      addError("README must document https://mcp.splatchat.com/mcp.");
    }
    if (!readme.includes("SPLATCHAT_API_KEY")) {
      addError("README must mention SPLATCHAT_API_KEY.");
    }
    if (containsEmDash(readme)) {
      addError("README.md contains an em dash or en dash. Use ASCII punctuation.");
    }
  }

  const secretPattern = /pk_[A-Za-z0-9]{8,}/g;
  const walkTargets = [repoRoot];
  while (walkTargets.length > 0) {
    const current = walkTargets.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walkTargets.push(entryPath);
        continue;
      }
      if (!/\.(json|md|mdc|mjs|js|txt|yml|yaml)$/i.test(entry.name)) {
        continue;
      }
      const text = await fs.readFile(entryPath, "utf8");
      const matches = text.match(secretPattern) ?? [];
      if (matches.length > 0) {
        addError(`Possible hardcoded API key in ${path.relative(repoRoot, entryPath)}: ${matches[0]}`);
      }
    }
  }

  summarizeAndExit();
}

function summarizeAndExit() {
  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
    console.log("");
  }

  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Validation passed.");
}

await main();
