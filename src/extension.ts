import { sync as commandExists } from 'command-exists'
import * as os from 'os'
import * as vscode from 'vscode'
import {
  ServerOptions,
  TransportKind,
  WorkDoneProgressCancelNotification,
} from 'vscode-languageclient/node'
import { BuildStatus, ForwardSearchStatus, TexLanguageClient } from './client'
import {
  BIBTEX_FILE,
  BIBTEX_UNTITLED,
  CONTEXT_FILE,
  CONTEXT_UNTITLED,
  LATEX_FILE,
  LATEX_UNTITLED,
} from './selectors'
import { Messages, StatusIcon } from './view'

export async function activate(context: vscode.ExtensionContext) {
  const serverCommand = await findServer(context)

  const serverOptions = getServerOptions(serverCommand)
  const client = new TexLanguageClient('digestif', serverOptions, {
    documentSelector: [
      LATEX_FILE,
      LATEX_UNTITLED,
      CONTEXT_FILE,
      CONTEXT_UNTITLED,
      BIBTEX_FILE,
      BIBTEX_UNTITLED,
    ],
    outputChannelName: 'TeX',
    uriConverters: {
      code2Protocol: uri => uri.toString(true),
      protocol2Code: value => vscode.Uri.parse(value),
    },
  })

  const icon = new StatusIcon()

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand('tex.build', editor =>
      build(editor, client),
    ),
    vscode.commands.registerCommand('tex.build.cancel', () =>
      client.sendNotification(WorkDoneProgressCancelNotification.type, {
        token: 'digestif-build-*',
      }),
    ),
    vscode.commands.registerTextEditorCommand('tex.forwardSearch', editor =>
      forwardSearch(editor, client),
    ),
    client.onDidChangeState(({ newState }) => {
      icon.update(newState)
    }),
    client.start(),
    icon,
  )
}

function getServerOptions(command: string): ServerOptions {
  const { ELECTRON_RUN_AS_NODE, ...env } = process.env
  return {
    run: {
      command,
      options: {
        env,
      },
    },
    debug: {
      command,
      args: ['-v'],
      options: {
        env: {
          ...env,
          RUST_BACKTRACE: '1',
        },
      },
    },
  }
}

async function findServer(context: vscode.ExtensionContext): Promise<string> {
  const serverName = os.platform() === 'win32' ? 'digestif.exe' : 'digestif'

  if (commandExists(serverName)) {
    return serverName
  }

  throw new Error('digestif server not found')
}

async function build(
  { document }: vscode.TextEditor,
  client: TexLanguageClient,
): Promise<void> {
  if (
    vscode.languages.match([LATEX_FILE, CONTEXT_FILE, BIBTEX_FILE], document) <=
      0 ||
    (document.isDirty && !(await document.save()))
  ) {
    return
  }

  const result = await client.build(document)
  switch (result.status) {
    case BuildStatus.Success:
    case BuildStatus.Cancelled:
      break
    case BuildStatus.Error:
      vscode.window.showErrorMessage(Messages.BUILD_ERROR)
      break
    case BuildStatus.Failure:
      vscode.window.showErrorMessage(Messages.BUILD_FAILURE)
      break
  }
}

async function forwardSearch(
  { document, selection }: vscode.TextEditor,
  client: TexLanguageClient,
): Promise<void> {
  if (vscode.languages.match([LATEX_FILE, CONTEXT_FILE], document) <= 0) {
    return
  }

  const result = await client.forwardSearch(document, selection.start)
  switch (result.status) {
    case ForwardSearchStatus.Success:
      break
    case ForwardSearchStatus.Error:
    case ForwardSearchStatus.Failure:
      vscode.window.showErrorMessage(Messages.SEARCH_FAILURE)
      break
    case ForwardSearchStatus.Unconfigured:
      vscode.window.showInformationMessage(Messages.SEARCH_UNCONFIGURED)
      break
  }
}
