import * as cp from 'child_process'
import * as path from 'path'
import * as vscode from 'vscode'

const diagnosticCollection = vscode.languages.createDiagnosticCollection('pkl-validator')

function detectPklBinary(): string {
  const explicit = process.env.PKL_BIN
  if (explicit && explicit.trim()) {
    return explicit.trim()
  }

  return 'pkl'
}

function supportsDocument(document: vscode.TextDocument): boolean {
  if (document.uri.scheme !== 'file') {
    return false
  }

  return path.extname(document.fileName).toLowerCase() === '.pkl'
}

function parsePklDiagnostics(output: string, targetPath: string): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = []
  const target = path.resolve(targetPath)
  const lines = output.split(/\r?\n/)

  let pendingMessage = ''
  let pendingFile: string | undefined
  let pendingLine = 1
  let pendingColumn = 1

  const flushDiagnostic = (): void => {
    if (!pendingMessage.trim()) {
      return
    }

    const resolvedFile = pendingFile ? path.resolve(pendingFile) : target
    const isTargetFile = resolvedFile === target
    const line = isTargetFile ? Math.max(1, pendingLine) : 1
    const column = isTargetFile ? Math.max(1, pendingColumn) : 1
    const start = new vscode.Position(line - 1, column - 1)
    const end = new vscode.Position(line - 1, Math.max(column, column + 1))

    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(start, end),
        pendingMessage.trim(),
        vscode.DiagnosticSeverity.Error,
      ),
    )

    pendingMessage = ''
    pendingFile = undefined
    pendingLine = 1
    pendingColumn = 1
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed) {
      continue
    }

    const atMatch = trimmed.match(/^at\s+.*?\((?:file:\/\/)?(.+?\.pkl),\s*line\s+(\d+)(?:,\s*col\s+(\d+))?\)\s*$/)
    if (atMatch) {
      const file = decodeURIComponent(atMatch[1])
      pendingFile = file
      pendingLine = Number(atMatch[2])
      pendingColumn = Number(atMatch[3] ?? '1')
      flushDiagnostic()
      continue
    }

    if (pendingMessage) {
      pendingMessage += ` ${trimmed}`
    } else {
      pendingMessage = trimmed
    }
  }

  if (pendingMessage.trim()) {
    flushDiagnostic()
  }

  return diagnostics
}

async function validateDocument(document: vscode.TextDocument): Promise<void> {
  if (!supportsDocument(document)) {
    diagnosticCollection.delete(document.uri)
    return
  }

  const pklBinary = detectPklBinary()
  const result = cp.spawnSync(pklBinary, ['eval', document.fileName], {
    encoding: 'utf-8',
    env: process.env,
  })

  // A zero exit code means valid Pkl; stdout is the eval result, not an error.
  if (result.status === 0) {
    diagnosticCollection.delete(document.uri)
    return
  }

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  if (!output) {
    diagnosticCollection.delete(document.uri)
    return
  }

  const diagnostics = parsePklDiagnostics(output, document.fileName)
  diagnosticCollection.set(document.uri, diagnostics)
}

let debounceTimer: NodeJS.Timeout | undefined

function queueValidation(document: vscode.TextDocument): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    void validateDocument(document)
  }, 250)
}

export function activate(context: vscode.ExtensionContext): void {
  const validateCommand = vscode.commands.registerCommand('pkl-validator.validateCurrentFile', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      return
    }

    await validateDocument(editor.document)
  })

  const activeEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      queueValidation(editor.document)
    }
  })

  const saveListener = vscode.workspace.onDidSaveTextDocument((document) => {
    if (supportsDocument(document)) {
      void validateDocument(document)
    }
  })

  const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
    if (supportsDocument(event.document)) {
      queueValidation(event.document)
    }
  })

  context.subscriptions.push(validateCommand, activeEditorListener, saveListener, changeListener, diagnosticCollection)

  const editor = vscode.window.activeTextEditor
  if (editor) {
    queueValidation(editor.document)
  }
}

export function deactivate(): void {
  diagnosticCollection.clear()
}
