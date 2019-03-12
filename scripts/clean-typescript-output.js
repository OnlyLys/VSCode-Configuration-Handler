'use strict';
var shell = require('shelljs');

// Clear the `out' directory before each build to clear out stale files
shell.rm('-rf', './out');