import * as vscode from 'vscode'
import {
  LanguageClient,
  LanguageClientOptions,
  RequestType,
  ServerOptions,
  TextDocumentIdentifier,
  TextDocumentPositionParams,
} from 'vscode-languageclient'

export enum BuildStatus {
  /**
   * The build process terminated without any errors.
   */
  Success = 0,

  /**
   * The build process terminated with errors.
   */
  Error = 1,

  /**
   * The build process failed to start or crashed.
   */
  Failure = 2,

  /**
   * The build process was cancelled.
   */
  Cancelled = 3,
}

export interface BuildResult {
  /**
   * The status of the build process.
   */
  status: BuildStatus
}

export enum ForwardSearchStatus {
  /**
   * The previewer process executed the command without any errors.
   */
  Success = 0,

  /**
   * The previewer process executed the command with errors.
   */
  Error = 1,

  /**
   * The previewer process failed to start or crashed.
   */
  Failure = 2,

  /**
   * The previewer command is not configured.
   */
  Unconfigured = 3,
}

export interface ForwardSearchResult {
  /**
   * The status of the previewer process.
   */
  status: ForwardSearchStatus
}

interface BuildTextDocumentParams {
  /**
   * The text document to build.
   */
  textDocument: TextDocumentIdentifier
}

abstract class BuildTextDocumentRequest {
  public static type = new RequestType<
    BuildTextDocumentParams,
    BuildResult,
    void,
    void
  >('textDocument/build')
}

abstract class ForwardSearchRequest {
  public static type = new RequestType<
    TextDocumentPositionParams,
    ForwardSearchResult,
    void,
    void
  >('textDocument/forwardSearch')
}

export class TexLanguageClient extends LanguageClient {
  public async build(document: vscode.TextDocument): Promise<BuildResult> {
    const params: BuildTextDocumentParams = {
      textDocument: this.code2ProtocolConverter.asTextDocumentIdentifier(
        document,
      ),
    }

    return this.sendRequest(BuildTextDocumentRequest.type, params)
  }

  public async forwardSearch(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<ForwardSearchResult> {
    const params = this.code2ProtocolConverter.asTextDocumentPositionParams(
      document,
      position,
    )

    return this.sendRequest(ForwardSearchRequest.type, params)
  }
}
