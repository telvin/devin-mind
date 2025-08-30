import fetch from 'node-fetch';

export class DevinClient {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://api.devin.ai/v1';
    this.useMockAPI = false;
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  setMockMode(useMock = true, mockUrl = 'http://localhost:3001/v1') {
    this.useMockAPI = useMock;
    if (useMock) {
      this.baseUrl = mockUrl;
    } else {
      this.baseUrl = 'https://api.devin.ai/v1';
    }
  }

  validateApiKey() {
    if (!this.apiKey) {
      throw new Error('DEVIN_API_KEY is required. Please set the API key first.');
    }
  }

  async createSession(prompt, playbookId = null, title = null) {
    this.validateApiKey();

    const url = `${this.baseUrl}/sessions`;
    const body = {
      prompt: prompt,
      idempotent: true,
      knowledge_ids: []
    };

    if (playbookId) {
      // Ensure playbookId has the correct prefix
      if (!playbookId.startsWith('playbook-')) {
        playbookId = `playbook-${playbookId}`;
      }
      body.playbook_id = playbookId;
    }
    body.idempotent = false; // Always false for new sessions
    body.knowledge_ids = ['note-dce2e237b6c149e1ba344af2343703f7']; // !deliverable hardcoded knowledge base ID

    if (title) {
      body.title = title;
    }

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    };

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`Received response from Devin API:`, data.session_id);
      return {
        success: true,
        session_id: data.session_id,
        status: data.status,
        title: data.title,
        created_at: data.created_at,
        playbook_id: data.playbook_id,
        raw_response: data
      };
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  async chatSession(sessionId, messagePayload) {
    this.validateApiKey();

    const url = `${this.baseUrl}/sessions/${sessionId}/messages`;
    
    // Handle both string messages and structured payloads
    let payload;
    if (typeof messagePayload === 'string') {
      payload = { message: messagePayload };
    } else {
      payload = messagePayload;
    }

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    };

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        message_sent: true,
        session_id: sessionId,
        raw_response: result
      };
    } catch (error) {
      throw new Error(` Failed to send message to session ${sessionId}: ${error.message}`);
    }
  }

  async getSession(sessionId) {
    this.validateApiKey();

    const url = `${this.baseUrl}/session/${sessionId}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    };

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Extract the message value from the last devin_message as specified in README.MD
      const devinMessages = data.messages ? data.messages.filter(msg => msg.type === 'devin_message') : [];
      const lastDevinMessage = devinMessages.length > 0 ? devinMessages[devinMessages.length - 1] : null;
      const capturedMessage = lastDevinMessage ? lastDevinMessage.message : null;

      return {
        success: true,
        session_id: data.session_id,
        status: data.status,
        status_enum: data.status_enum,
        title: data.title,
        created_at: data.created_at,
        updated_at: data.updated_at,
        snapshot_id: data.snapshot_id,
        playbook_id: data.playbook_id,
        tags: data.tags,
        last_devin_message: capturedMessage,
        message_count: data.messages ? data.messages.length : 0,
        devin_message_count: devinMessages.length,
        raw_response: data
      };
    } catch (error) {
      throw new Error(`Failed to get session ${sessionId}: ${error.message}`);
    }
  }

  async waitForCompletion(sessionId, pollingInterval = 10000, timeout = 300000) {
    this.validateApiKey();

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const session = await this.getSession(sessionId);
        
        // Check completion status using status or status_enum fields
        const isCompleted = this.isSessionCompleted(session.status, session.status_enum);
        session.last_devin_message = session.messages[session.messages.length - 1]?.message || '';
        
        if (isCompleted) {
          return {
            success: true,
            completed: true,
            session: session,
            wait_time_ms: Date.now() - startTime
          };
        }

        // Wait before next poll
        await this.sleep(pollingInterval);
        
      } catch (error) {
        console.error(`Polling error for session ${sessionId}:`, error.message);
        await this.sleep(pollingInterval);
      }
    }

    // Timeout reached
    const finalSession = await this.getSession(sessionId);
    return {
      success: false,
      completed: false,
      timeout: true,
      session: finalSession,
      wait_time_ms: timeout
    };
  }

  isSessionCompleted(status, statusEnum) {
    // Define completion states - adjust based on actual Devin API responses
    console.log('isSessionCompleted', status, statusEnum);
    const completedStates = [
      'completed', 'finished', 'done', 'success', 'failed', 'error', 'cancelled', 'blocked',
      'complete', 'terminated', 'stopped'
    ];

    const runningStates = [
      'running', 'in_progress', 'processing', 'active', 'pending', 'started'
    ];

    // Check status field
    if (status && typeof status === 'string') {
      const lowerStatus = status.toLowerCase();
      if (completedStates.includes(lowerStatus)) {
        return true;
      }
      if (runningStates.includes(lowerStatus)) {
        return false;
      }
    }

    // Check status_enum field
    if (statusEnum && typeof statusEnum === 'string') {
      const lowerStatusEnum = statusEnum.toLowerCase();
      if (completedStates.includes(lowerStatusEnum)) {
        return true;
      }
      if (runningStates.includes(lowerStatusEnum)) {
        return false;
      }
    }

    // Default to not completed if status is unclear
    return false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method for testing API connectivity
  async testConnection() {
    this.validateApiKey();
    
    try {
      // Create a simple test session to verify API connectivity
      const testResult = await this.createSession(
        'Test connection to Devin API',
        null,
        'API Connection Test'
      );
      
      return {
        success: true,
        connected: true,
        test_session_id: testResult.session_id
      };
    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error.message
      };
    }
  }

  // Utility method to get session summary
  async getSessionSummary(sessionId) {
    const session = await this.getSession(sessionId);
    
    return {
      session_id: session.session_id,
      status: session.status,
      title: session.title,
      has_devin_messages: session.devin_message_count > 0,
      last_message: session.last_devin_message,
      is_completed: this.isSessionCompleted(session.status, session.status_enum),
      created_at: session.created_at,
      updated_at: session.updated_at
    };
  }
}