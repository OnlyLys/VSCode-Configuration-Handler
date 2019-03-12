'use strict';
var shell = require('shelljs');

// Make a copy of the template test environment containing the multi-root workspace
shell.rm('-rf', './.test-environment');
shell.cp('-r', './.test-environment-template', './.test-environment');