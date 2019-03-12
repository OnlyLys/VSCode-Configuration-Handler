'use strict';
var shell = require('shelljs');

// Delete the temporary `/.test-environment` directory containing the multi-root workspace
shell.rm('-rf', './.test-environment');
