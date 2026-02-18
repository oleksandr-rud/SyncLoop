#!/usr/bin/env node

import { runCli } from "../dist/bin/cli.js";

const exitCode = await runCli();
process.exit(exitCode);
