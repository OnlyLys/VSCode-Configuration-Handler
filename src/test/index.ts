// Use the VS Code test runner (which is Mocha based)

import * as testRunner from 'vscode/lib/testrunner';

// Mocha options. See: https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically#set-options
testRunner.configure({ 
    ui: 'bdd', 
    useColors: true 
});

module.exports = testRunner;