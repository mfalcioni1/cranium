import * as vscode from 'vscode';

const CODE_SUMMARY_COMMAND_ID = 'cranium.codeSummary';
const GENERATE_README_COMMAND_ID = 'cranium.generateReadme';

interface IcraniumChatResult extends vscode.ChatResult {
    metadata: {
        command: string;
    }
}

const LANGUAGE_MODEL_ID = 'copilot-gpt-3.5-turbo'; // Use faster model. You might choose 'copilot-gpt-4' for more complex tasks

export function activate(context: vscode.ExtensionContext) {

    const handler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<IcraniumChatResult> => {
        if (request.command == 'summarizeCode') {
            stream.progress('Analyzing the code and preparing a summary...');
            const activeEditor = vscode.window.activeTextEditor;
            const codeToSummarize = activeEditor?.document.getText() || 'No active code window found.';
            const messages = [
                new vscode.LanguageModelChatSystemMessage('Please provide a brief summary of the following code, highlighting its main functionality.'),
                new vscode.LanguageModelChatUserMessage(codeToSummarize)
            ];
            const chatResponse = await vscode.lm.sendChatRequest(LANGUAGE_MODEL_ID, messages, {}, token);
            for await (const fragment of chatResponse.stream) {
                stream.markdown(fragment);
            }
            return { metadata: { command: 'summarizeCode' } };
        } else if (request.command == 'generateReadme') {
            stream.progress('Generating README based on the current project structure...');
            const projectOverview = "Describe the current project structure and any notable files.";
            const messages = [
                new vscode.LanguageModelChatSystemMessage('Based on the following project overview, generate a README document that includes sections for Installation, Usage, and Contributing.'),
                new vscode.LanguageModelChatUserMessage(projectOverview)
            ];
            const chatResponse = await vscode.lm.sendChatRequest(LANGUAGE_MODEL_ID, messages, {}, token);
            for await (const fragment of chatResponse.stream) {
                stream.markdown(fragment);
            }
            return { metadata: { command: 'generateReadme' } };
        } else {
            const messages = [
                new vscode.LanguageModelChatSystemMessage('Please provide assistance with the following request related to code development.'),
                new vscode.LanguageModelChatUserMessage(request.prompt)
            ];
            const chatResponse = await vscode.lm.sendChatRequest(LANGUAGE_MODEL_ID, messages, {}, token);
            for await (const fragment of chatResponse.stream) {
                stream.markdown(fragment);
            }
            return { metadata: { command: '' } };
        }
    };

    const cranium = vscode.chat.createChatParticipant('cranium.assistant', handler);
    cranium.iconPath = vscode.Uri.joinPath(context.extensionUri, 'cranium.svg');
    cranium.followupProvider = {
        provideFollowups(result: IcraniumChatResult, context: vscode.ChatContext, token: vscode.CancellationToken) {
            return [
                {
                    prompt: 'Summarize the current code window',
                    label: 'Summarize Code',
                    command: 'summarizeCode'
                },
                {
                    prompt: 'Generate a README for the project',
                    label: 'Generate README',
                    command: 'generateReadme'
                }
            ];
        }
    };

    context.subscriptions.push(
        cranium,
        vscode.commands.registerTextEditorCommand(CODE_SUMMARY_COMMAND_ID, async (textEditor: vscode.TextEditor) => {
            // Implementation for summarizing code can go here
        }),
        vscode.commands.registerTextEditorCommand(GENERATE_README_COMMAND_ID, async (textEditor: vscode.TextEditor) => {
            // Implementation for generating README can go here
        }),
    );
}

export function deactivate() { }
