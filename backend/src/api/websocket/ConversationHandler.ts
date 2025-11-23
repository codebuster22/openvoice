import WebSocket from 'ws';
import { SessionManager } from '@services/SessionManager';
import { ConversationController } from '@services/ConversationController';
import { Configuration, validateConfiguration } from '@models/Configuration';
import { AudioChunk } from '@types/AudioChunk';

/**
 * WebSocket message types (see contracts/websocket-protocol.md)
 */
interface StartMessage {
  type: 'START';
  config: Configuration;
}

interface StopMessage {
  type: 'STOP';
}

type ClientMessage = StartMessage | StopMessage;

/**
 * ConversationHandler - WebSocket handler for voice conversations
 *
 * Protocol:
 * - Client sends START with config → Server responds STATUS(listening)
 * - Client sends binary audio frames → Server streams TRANSCRIPT + AUDIO_OUTPUT
 * - Client sends STOP → Server responds STATUS(idle)
 *
 * Presentation layer
 */
export class ConversationHandler {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: WebSocket): void {
    let sessionId: string | null = null;
    let controller: ConversationController | null = null;

    console.log('WebSocket connection established');

    // Handle incoming messages
    ws.on('message', async (data: WebSocket.Data) => {
      try {
        // Check if binary (audio data) or JSON (control message)
        if (Buffer.isBuffer(data)) {
          // Binary audio input
          await this.handleAudioInput(ws, sessionId, controller, data);
        } else {
          // JSON control message
          const message: ClientMessage = JSON.parse(data.toString());
          await this.handleControlMessage(ws, message, (sid, ctrl) => {
            sessionId = sid;
            controller = ctrl;
          });
        }
      } catch (error: any) {
        console.error('WebSocket message error:', error);
        this.sendError(ws, 'PROVIDER_ERROR', error.message);

        if (sessionId) {
          this.sessionManager.transitionState(sessionId, 'error', error.message);
        }
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      if (sessionId) {
        this.sessionManager.destroySession(sessionId);
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Handle control messages (START, STOP)
   */
  private async handleControlMessage(
    ws: WebSocket,
    message: ClientMessage,
    setSession: (sessionId: string | null, controller: ConversationController | null) => void
  ): Promise<void> {
    if (message.type === 'START') {
      // Validate configuration
      const errors = validateConfiguration(message.config);
      if (errors.length > 0) {
        this.sendError(ws, 'AUTH_FAILED', errors.join(', '));
        return;
      }

      // Create session
      const session = this.sessionManager.createSession(message.config);
      const controller = new ConversationController();

      try {
        // Initialize pipeline
        controller.initializePipeline(message.config);

        // Transition to listening state
        this.sessionManager.transitionState(session.id, 'listening');

        // Send STATUS update
        this.sendStatus(ws, 'listening');

        // Store session and controller
        setSession(session.id, controller);

        console.log(`Session started: ${session.id}`);
      } catch (error: any) {
        this.sendError(ws, 'AUTH_FAILED', error.message);
        this.sessionManager.destroySession(session.id);
      }
    } else if (message.type === 'STOP') {
      // Stop conversation
      this.sendStatus(ws, 'idle');
      setSession(null, null);

      console.log('Conversation stopped');
    }
  }

  /**
   * Handle binary audio input
   */
  private async handleAudioInput(
    ws: WebSocket,
    sessionId: string | null,
    controller: ConversationController | null,
    audioData: Buffer
  ): Promise<void> {
    if (!sessionId || !controller) {
      this.sendError(ws, 'NETWORK_ERROR', 'No active session');
      return;
    }

    // Transition to processing
    this.sessionManager.transitionState(sessionId, 'processing');
    this.sendStatus(ws, 'processing');

    // Process through pipeline
    const pipeline = controller.getPipeline();
    if (!pipeline) {
      this.sendError(ws, 'PROVIDER_ERROR', 'Pipeline not initialized');
      return;
    }

    try {
      // Process audio through STT → LLM → TTS
      let audioChunkCount = 0;

      for await (const audioChunk of pipeline.process(audioData)) {
        // Transition to speaking on first audio chunk
        if (audioChunkCount === 0) {
          this.sessionManager.transitionState(sessionId, 'speaking');
          this.sendStatus(ws, 'speaking');
        }

        // Send audio chunk to client (binary)
        ws.send(audioChunk.data, { binary: true });
        audioChunkCount++;
      }

      // Get transcript after processing
      const transcript = controller.getTranscript();
      const userMessage = transcript[transcript.length - 2]; // Second to last (user)
      const aiMessage = transcript[transcript.length - 1]; // Last (assistant)

      // Send transcript updates
      if (userMessage) {
        this.sendTranscript(ws, 'user', userMessage.content, true);
      }
      if (aiMessage) {
        this.sendTranscript(ws, 'assistant', aiMessage.content, true);
      }

      // Transition back to listening
      this.sessionManager.transitionState(sessionId, 'listening');
      this.sendStatus(ws, 'listening');

      console.log(`Processed audio: ${audioChunkCount} chunks sent`);
    } catch (error: any) {
      this.sendError(ws, 'PROVIDER_ERROR', error.message);
      this.sessionManager.transitionState(sessionId, 'error', error.message);
    }
  }

  /**
   * Send STATUS message to client
   */
  private sendStatus(ws: WebSocket, state: string): void {
    ws.send(
      JSON.stringify({
        type: 'STATUS',
        state,
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Send TRANSCRIPT message to client
   */
  private sendTranscript(ws: WebSocket, role: string, text: string, isFinal: boolean): void {
    ws.send(
      JSON.stringify({
        type: 'TRANSCRIPT',
        role,
        text,
        isFinal,
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Send ERROR message to client
   */
  private sendError(ws: WebSocket, code: string, message: string): void {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        code,
        message,
        timestamp: Date.now(),
      })
    );
  }
}
