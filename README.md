# README

This repository contains utility classes to manipulate configurations of VS Code extensions. The 

It's primarily a shared dependency for VS Code extensions that I am working on. As such, documentation will be sparse.

This package is mainly to be pulled in as a dependency and then have its class imported for use during development of VS Code extensions. There are no other uses.

Types are included


# Testing

Given that this repositroy.

There are two ways to perform testing:
 1. Open the root directory in VS Code. It will then recognize this project as an extension. You can then start an extension testing instance.
 1. Running `npm test` in the command line. This will automatically download VS Code then run it as a testing instance.

