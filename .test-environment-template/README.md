Please do not modify the contents of this `.test-environment-template` directory.

This directory contains a multi-root workspace and exists in order to allow us to test the extension
in a realistic scenario.

When tests are started, the setup step will copy this directory into a temporary `test-environment` 
directory within the package root folder. The tests will then be run in that copied directory. That 
directory will be deleted once the tests are complete. 

Therefore, you can think of this `.test-environment-template` directory as the template of the 
environment which the tests will be run on.