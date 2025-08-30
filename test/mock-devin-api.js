import express from 'express';
import cors from 'cors';

class MockDevinAPI {
  constructor() {
    this.app = express();
    this.sessions = new Map();
    this.messageCounter = 0;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Mock authentication middleware
    this.app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }
      next();
    });
  }

  setupRoutes() {
    // CREATE_SESSION endpoint
    this.app.post('/v1/sessions', (req, res) => {
      const { prompt, playbook_id, title, idempotent, knowledge_ids } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const sessionId = `devin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const session = {
        session_id: sessionId,
        status: 'running',
        status_enum: 'IN_PROGRESS',
        title: title || `Session for: ${prompt.substring(0, 50)}...`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        snapshot_id: null,
        playbook_id: playbook_id || null,
        tags: ['api', 'test'],
        messages: [
          {
            id: `msg-${++this.messageCounter}`,
            type: 'user_message',
            message: prompt,
            timestamp: new Date().toISOString()
          }
        ],
        _mock_data: {
          start_time: Date.now(),
          completion_delay: 8000 + Math.random() * 12000 // 8-20 seconds
        }
      };

      this.sessions.set(sessionId, session);
      
      // Simulate async processing
      setTimeout(() => {
        this.completeSession(sessionId, 'Main task completed successfully');
      }, session._mock_data.completion_delay);

      res.json({
        session_id: sessionId,
        status: session.status,
        title: session.title,
        created_at: session.created_at,
        playbook_id: session.playbook_id
      });
    });

    // CHAT_SESSION endpoint
    this.app.post('/v1/sessions/:sessionId/messages', (req, res) => {
      const { sessionId } = req.params;
      const messageData = req.body;

      const session = this.sessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const message = typeof messageData === 'string' ? messageData : messageData.message || JSON.stringify(messageData);
      
      // Add user message
      session.messages.push({
        id: `msg-${++this.messageCounter}`,
        type: 'user_message',
        message: message,
        timestamp: new Date().toISOString()
      });

      session.updated_at = new Date().toISOString();
      session.status = 'running';
      session.status_enum = 'IN_PROGRESS';

      // Simulate processing handoff instruction
      setTimeout(() => {
        this.completeSession(sessionId, `Handoff completed: ${message}`);
      }, 5000 + Math.random() * 10000); // 5-15 seconds

      res.json({
        success: true,
        message_id: `msg-${this.messageCounter}`,
        session_id: sessionId
      });
    });

    // GET_SESSION endpoint
    this.app.get('/v1/session/:sessionId', (req, res) => {
      const { sessionId } = req.params;
      
      const session = this.sessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(session);
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        active_sessions: this.sessions.size,
        timestamp: new Date().toISOString()
      });
    });
  }

  completeSession(sessionId, responseMessage) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Add Devin's response
    session.messages.push({
      id: `msg-${++this.messageCounter}`,
      type: 'devin_message',
      message: responseMessage,
      timestamp: new Date().toISOString()
    });

    session.status = 'completed';
    session.status_enum = 'COMPLETED';
    session.updated_at = new Date().toISOString();
  }

  start(port = 3001) {
    this.app.listen(port, () => {
      console.log(`Mock Devin API running on http://localhost:${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
      console.log('Available endpoints:');
      console.log('  POST /v1/sessions - Create session');
      console.log('  POST /v1/sessions/:id/messages - Send message');
      console.log('  GET /v1/session/:id - Get session status');
    });
  }

  // Utility method to list all sessions
  listSessions() {
    return Array.from(this.sessions.values()).map(session => ({
      session_id: session.session_id,
      status: session.status,
      title: session.title,
      message_count: session.messages.length,
      created_at: session.created_at
    }));
  }
}

// Start the mock server
const mockAPI = new MockDevinAPI();
mockAPI.start();

export default MockDevinAPI;