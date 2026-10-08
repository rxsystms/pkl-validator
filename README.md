# PKL Validator

Catch configuration mistakes before they reach production.

CUE Validator helps you validate the currently open .pkl files against the nearest local `.pkl` schema in your workspace. It gives you instant feedback while you edit, so schema drift, missing fields, and invalid values are caught early instead of during deployment.

A minimal VS Code extension that runs the local `pkl` CLI against open PKL files and reports errors in the Problems panel.

## Features

- Validates `.pkl` files on save and as you edit
- Runs `pkl eval <file>`
- Maps PKL diagnostics into VS Code diagnostics

## Usage

1. Install the extension in VS Code.
2. Ensure the `pkl` binary is available on your PATH.
3. Open a `.pkl` file and edit it.

If the `pkl` CLI is not on your PATH, set the `PKL_BIN` environment variable to the full binary path.


## Important runtime requirement

A `pkl` binary must be available on your PATH. If not, install `pkl` using `homebrew` (Mac) or `apt` (Debian), etc.




# Developers

## Quickstart

```bash
npm i

npm run compile

# run local development server with:
cd pkl-validator
code --extensionDevelopmentPath="$PWD"


# bump version
npm version patch --no-git-tag-version







# publish with:
# registered at: https://marketplace.visualstudio.com/manage
# https://dev.azure.com/{username}/_usersSettings/tokens

# Get {username} by navigating to: https://dev.azure.com/ (authenticated)
# 
# See: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace
npm install -g @vscode/vsce
# install az cli: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux?view=azure-cli-latest&pivots=apt
az login # follow instructions...
az account get-access-token

PUBLISHER_NAME=rxsystms
vsce login $PUBLISHER_NAME

vsce package
# upload the .vsix file to VS marketplace

vsce publish

# view at: https://marketplace.visualstudio.com/manage/publishers/rxsystms/extensions/pkl-validator/hub

```

## Usage

1. Open a workspace that contains a `.pkl` file in the same directory or a parent directory.
2. Open a .pkl file to validate.
3. Run the command `PKL: Validate current file` or let the extension validate automatically on save.

The extension looks for the nearest `.pkl` file and runs:

```bash
pkl eval ./<yourfile>.pkl
```

It then highlights any matching problems directly in the active document.