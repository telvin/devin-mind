export class WorkflowParser {
  constructor() {
    // Match headings like '## Step 1: Requirements Analysis'
    this.stepPattern = /^## Step (\d+): (.+)$/gm;
    this.paramPattern = /^- (\w+):\s*(.*)$/gm;
    this.overviewPattern = /^## Overview\n([\s\S]*?)(?=^##|\n##|$)/m;
  }

  parse(markdown) {
    const steps = [];
    const overview = this.extractOverview(markdown);
    const stepSections = this.splitIntoSteps(markdown);
    console.log('[WorkflowParser] stepSections found:', stepSections.length);
    for (let i = 0; i < stepSections.length; i++) {
      const stepData = this.parseStep(stepSections[i], i + 1);
      if (stepData) {
        steps.push(stepData);
      }
    }
    console.log('[WorkflowParser] steps parsed:', steps.length);
    return { overview, steps };
  }

  extractOverview(markdown) {
    const match = this.overviewPattern.exec(markdown);
    return match ? match[1].trim() : '';
  }

  splitIntoSteps(markdown) {
    const sections = [];
    // Accept both '## Step N: Title', '## Step N:Title', and '## Step N ##' (legacy)
    const stepPattern = /^## Step (\d+): ?(.+)$/gm;
    const stepMatches = [...markdown.matchAll(stepPattern)];
    if (stepMatches.length === 0) {
      // Fallback: match headings like '## Step N ##' (legacy format)
      const legacyPattern = /^## Step (\d+) ##/gm;
      const legacyMatches = [...markdown.matchAll(legacyPattern)];
      if (legacyMatches.length > 0) {
        for (let i = 0; i < legacyMatches.length; i++) {
          const currentMatch = legacyMatches[i];
          const nextMatch = legacyMatches[i + 1];
          const startIndex = currentMatch.index + currentMatch[0].length;
          const endIndex = nextMatch ? nextMatch.index : markdown.length;
          const sectionContent = currentMatch[0] + '\n' + markdown.slice(startIndex, endIndex).trim();
          sections.push(sectionContent);
        }
        return sections;
      }
      return [];
    }
    for (let i = 0; i < stepMatches.length; i++) {
      const currentMatch = stepMatches[i];
      const nextMatch = stepMatches[i + 1];
      const startIndex = currentMatch.index + currentMatch[0].length;
      const endIndex = nextMatch ? nextMatch.index : markdown.length;
      // Include the heading as the first line
      const sectionContent = currentMatch[0] + '\n' + markdown.slice(startIndex, endIndex).trim();
      sections.push(sectionContent);
    }
    return sections;
  }

  parseStep(stepContent, stepNumber) {
    // Extract title from the heading (e.g., '## Step 1: Requirements Analysis')
    // Accept both '## Step N: Title' and '## Step N:Title' (with or without space after colon)
    const headingMatch = /^## Step (\d+): ?(.+)$/m.exec(stepContent);
    let title = headingMatch ? headingMatch[2].trim() : null;
    // Remove heading from content
    stepContent = stepContent.replace(/^## Step (\d+): ?(.+)$/m, '').trim();

    const step = {
      step_number: stepNumber,
      playbook: null,
      prompt: null,
      handoff: null,
      repo: null,
      rely_previous_step: stepNumber > 1, // First step cannot rely on previous, others default to true
      raw_content: stepContent,
      title: title
    };

    this.paramPattern.lastIndex = 0;
    let match;
    while ((match = this.paramPattern.exec(stepContent)) !== null) {
      const [, key, value] = match;
      const cleanKey = key.toLowerCase().trim();
      const cleanValue = value.trim();
      switch (cleanKey) {
        case 'playbook':
          if (cleanValue === '' || cleanValue.toLowerCase() === '<none>') {
            step.playbook = null;
          } else {
            step.playbook = this.normalizePlaybookId(cleanValue);
          }
          break;
        case 'prompt':
          step.prompt = cleanValue;
          break;
        case 'handoff':
          if (!cleanValue || ['<none>', 'null'].includes(cleanValue.toLowerCase()) || /^\s*$/.test(cleanValue)) {
            step.handoff = null;
          } else {
            step.handoff = cleanValue;
          }
          break;
        case 'repo':
          if (!cleanValue || cleanValue === '' || ['null'].includes(cleanValue.toLowerCase()) || /^\s*$/.test(cleanValue)) {
            step.repo = null;
          } else if (cleanValue.toLowerCase() === 'none') {
            step.repo = 'none';  // Keep "none" as-is for inheritance logic
          } else {
            step.repo = cleanValue;
          }
          break;
        case 'relypreviousstep':
        case 'rely_previous_step':
          step.rely_previous_step = this.parseBoolean(cleanValue);
          break;
      }
    }
    if (!step.prompt) {
      throw new Error(`Step ${stepNumber}: Prompt is required`);
    }

    return step;
  }

  normalizePlaybookId(playbookId) {
    if (!playbookId || playbookId === '') {
      return null;
    }

    // Auto-prefix with "playbook-" if missing
    if (!playbookId.startsWith('playbook-')) {
      return `playbook-${playbookId}`;
    }

    return playbookId;
  }

  parseBoolean(value) {
    if (!value) return true; // Default to yes
    
    const lowerValue = value.toLowerCase();
    return lowerValue === 'yes' || lowerValue === 'true' || lowerValue === '1';
  }

  validateWorkflow(steps) {
    const errors = [];
    const warnings = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Check for required prompt
      if (!step.prompt) {
        errors.push(`Step ${step.step_number}: Missing required prompt`);
      }

      // Check if step relies on previous but is first step
      if (i === 0 && step.rely_previous_step) {
        errors.push(`Step ${step.step_number}: Cannot rely on previous step as it's the first step`);
      }

      // Validate playbook format if provided
      if (step.playbook && !step.playbook.startsWith('playbook-')) {
        errors.push(`Step ${step.step_number}: Playbook ID should start with 'playbook-'`);
      }

      // Add warnings for potential issues
      if (step.handoff && step.handoff.trim() === '') {
        warnings.push(`Step ${step.step_number}: Empty handoff instruction`);
      }
      
      if (!step.handoff && step.rely_previous_step) {
        warnings.push(`Step ${step.step_number}: Relies on previous step but has no handoff instruction`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  }

  formatWorkflowSummary(steps) {
    return {
      total_steps: steps.length,
      steps_with_playbooks: steps.filter(s => s.playbook).length,
      steps_with_handoffs: steps.filter(s => s.handoff).length,
      steps_with_repos: steps.filter(s => s.repo).length,
      steps_relying_on_previous: steps.filter(s => s.rely_previous_step).length,
      steps: steps.map(step => ({
        step_number: step.step_number,
        has_playbook: !!step.playbook,
        has_handoff: !!step.handoff,
        has_repo: !!step.repo,
        relies_on_previous: step.rely_previous_step,
        prompt_length: step.prompt ? step.prompt.length : 0
      }))
    };
  }

  /*static createSampleWorkflow() {
    return `## Step 1 ##
- Playbook: code-review
- Prompt: Review the pull request and identify any security vulnerabilities
- Handoff: Provide a detailed security assessment report

## Step 2 ##
- Playbook: documentation
- RelyPreviousStep: yes
- Prompt: Create documentation for the security fixes needed
- Handoff: Generate a security remediation guide

## Step 3 ##
- RelyPreviousStep: no
- Prompt: Run automated tests on the codebase
- Handoff: Provide test results summary`;
  }*/
}