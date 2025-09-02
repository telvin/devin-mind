import { WorkflowParser } from '../src/workflow-parser.js';
import { describe, it, expect } from '@jest/globals';

describe('WorkflowParser.parseStep', () => {
  let parser;
  beforeEach(() => {
    parser = new WorkflowParser();
  });

  it('parses a step with all fields', () => {
    const stepContent = `## Step 2: Implementation\n- Playbook: code-review\n- Prompt: Review the code\n- Handoff: Provide feedback\n- RelyPreviousStep: yes`;
    const step = parser.parseStep(stepContent, 2);
    expect(step.step_number).toBe(2);
    expect(step.title).toBe('Implementation');
    expect(step.playbook).toBe('playbook-code-review');
    expect(step.prompt).toMatch(/^Review the code/);
    expect(step.handoff).toMatch(/^Provide feedback/);
    expect(step.rely_previous_step).toBe(true);
  });

  it('parses a step with minimal fields', () => {
    const stepContent = `## Step 1: Planning\n- Prompt: Plan the project`;
    const step = parser.parseStep(stepContent, 1);
    expect(step.step_number).toBe(1);
    expect(step.title).toBe('Planning');
    expect(step.playbook).toBeNull();
    expect(step.prompt).toMatch(/^Plan the project/);
    expect(step.handoff).toBeNull();
    expect(step.rely_previous_step).toBe(false);
  });

  it('throws if prompt is missing', () => {
    const stepContent = `## Step 1: Planning\n- Playbook: code-review`;
    expect(() => parser.parseStep(stepContent, 1)).toThrow(/Prompt is required/);
  });

  it('normalizes playbook id', () => {
    const stepContent = `## Step 1: Planning\n- Playbook: playbook-custom\n- Prompt: Do something`;
    const step = parser.parseStep(stepContent, 1);
    expect(step.playbook).toBe('playbook-custom');
  });

  it('parses rely_previous_step as false', () => {
    const stepContent = `## Step 2: QA\n- Prompt: Test\n- RelyPreviousStep: no`;
    const step = parser.parseStep(stepContent, 2);
    expect(step.rely_previous_step).toBe(false);
  });

  it('parses handoff as null if empty', () => {
    const stepContent = `## Step 2: QA\n- Prompt: Test\n- Handoff: `;
    const step = parser.parseStep(stepContent, 2);
    expect(step.handoff).toBeNull();
  });

  it('parses handoff with a long summary', () => {
    const stepContent = `## Step 1: Read ADO Ticket Data\n- Playbook: 2bad2151af5f4380af0acab90f1cd328\n- Prompt: ...\n- Handoff: Provide ticket ID, work item type, and confirm successful data extraction with attachment count and linked items summary`;
    const step = parser.parseStep(stepContent, 1);
    expect(step.handoff).toBe('Provide ticket ID, work item type, and confirm successful data extraction with attachment count and linked items summary');
  });

  it('parses handoff with structured content summary', () => {
    const stepContent = `## Step 2: Analyze Core Content\n- Playbook: <none>\n- RelyPreviousStep: yes\n- Prompt: ...\n- Handoff: Deliver structured content analysis with categorized requirements and attachment summaries`;
    const step = parser.parseStep(stepContent, 2);
    expect(step.handoff).toBe('Deliver structured content analysis with categorized requirements and attachment summaries');
  });

  it('parses handoff as null if <none>', () => {
    const stepContent = `## Step 3: Something\n- Prompt: ...\n- Handoff: <none>`;
    const step = parser.parseStep(stepContent, 3);
    expect(step.handoff).toBeNull();
  });

  it('parses handoff as null if only spaces', () => {
    const stepContent = `## Step 4: Something\n- Prompt: ...\n- Handoff:    `;
    const step = parser.parseStep(stepContent, 4);
    expect(step.handoff).toBeNull();
  });

  it('parses handoff as null if value is null', () => {
    const stepContent = `## Step 5: Something\n- Prompt: ...\n- Handoff: null`;
    const step = parser.parseStep(stepContent, 5);
    expect(step.handoff).toBeNull();
  });

  it('parses handoff as string if value is 0', () => {
    const stepContent = `## Step 6: Something\n- Prompt: ...\n- Handoff: 0`;
    const step = parser.parseStep(stepContent, 6);
    expect(step.handoff).toBe('0');
  });

  it('parses a step with repo field', () => {
    const stepContent = `## Step 1: Setup\n- Repo: dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp\n- Prompt: Clone and setup the repository`;
    const step = parser.parseStep(stepContent, 1);
    expect(step.step_number).toBe(1);
    expect(step.title).toBe('Setup');
    expect(step.repo).toBe('dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp');
    expect(step.prompt).toBe('Clone and setup the repository');
    expect(step.playbook).toBeNull();
    expect(step.handoff).toBeNull();
  });

  it('parses a step with all fields including repo', () => {
    const stepContent = `## Step 2: Implementation\n- Playbook: code-review\n- Repo: github.com/example/project\n- Prompt: Review the code\n- Handoff: Provide feedback\n- RelyPreviousStep: yes`;
    const step = parser.parseStep(stepContent, 2);
    expect(step.step_number).toBe(2);
    expect(step.title).toBe('Implementation');
    expect(step.playbook).toBe('playbook-code-review');
    expect(step.repo).toBe('github.com/example/project');
    expect(step.prompt).toMatch(/^Review the code/);
    expect(step.handoff).toMatch(/^Provide feedback/);
    expect(step.rely_previous_step).toBe(true);
  });

  it('parses repo as null if empty', () => {
    const stepContent = `## Step 3: Test\n- Prompt: Run tests\n- Repo: `;
    const step = parser.parseStep(stepContent, 3);
    expect(step.repo).toBeNull();
  });

  it('parses repo as null if empty string', () => {
    const stepContent = `## Step 1: Planning\n- Prompt: Plan the project\n- Repo: `;
    const step = parser.parseStep(stepContent, 1);
    expect(step.repo).toBeNull();
  });

  it('parses repo as null for various empty values', () => {
    const testCases = [
      '- Prompt: Test the functionality\n- Repo: ',
      '- Prompt: Test the functionality\n- Repo:  ',
      '- Prompt: Test the functionality\n- Repo:\n',
      '- Prompt: Test the functionality\n- Repo: \n',
      '- Prompt: Test the functionality\n- Repo:   \n'
    ];

    testCases.forEach(content => {
      const stepContent = `## Step 1: Testing\n${content}`;
      const step = parser.parseStep(stepContent, 1);
      expect(step.repo).toBeNull();
    });
  });

  it('parses repo as "none" if value is none (for inheritance logic)', () => {
    const stepContent = `## Step 4: Deploy\n- Repo: none\n- Prompt: Deploy to production`;
    const step = parser.parseStep(stepContent, 4);
    expect(step.repo).toBe('none');
  });

  it('parses repo as "none" if value is None (case insensitive)', () => {
    const stepContent = `## Step 4: Deploy\n- Repo: None\n- Prompt: Deploy to production`;
    const step = parser.parseStep(stepContent, 4);
    expect(step.repo).toBe('none');
  });
});


describe('WorkflowParser validateWorkflow + format', () => {
  let parser;

  beforeEach(() => {
    parser = new WorkflowParser();
  });

  describe('validateWorkflow', () => {
    it('should validate a correct workflow with no errors', () => {
      const steps = [
        {
          step_number: 1,
          prompt: 'Analyze requirements',
          playbook: 'playbook-analysis',
          handoff: 'Requirements document',
          rely_previous_step: false
        },
        {
          step_number: 2,
          prompt: 'Design solution',
          playbook: 'playbook-design',
          handoff: 'Design document',
          rely_previous_step: true
        }
      ];

      const result = parser.validateWorkflow(steps);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return error for missing prompt', () => {
      const steps = [
        {
          step_number: 1,
          prompt: null,
          playbook: 'playbook-analysis',
          handoff: 'Requirements document',
          rely_previous_step: false
        }
      ];

      const result = parser.validateWorkflow(steps);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Step 1: Missing required prompt');
    });

    it('should return error for first step relying on previous', () => {
      const steps = [
        {
          step_number: 1,
          prompt: 'Analyze requirements',
          playbook: 'playbook-analysis',
          handoff: 'Requirements document',
          rely_previous_step: true
        }
      ];

      const result = parser.validateWorkflow(steps);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Step 1: Cannot rely on previous step as it\'s the first step');
    });

    it('should return error for invalid playbook format', () => {
      const steps = [
        {
          step_number: 1,
          prompt: 'Analyze requirements',
          playbook: 'invalid-format',
          handoff: 'Requirements document',
          rely_previous_step: false
        }
      ];

      const result = parser.validateWorkflow(steps);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Step 1: Playbook ID should start with \'playbook-\'');
    });

    it('should return warning for empty handoff instruction', () => {
      const steps = [
        {
          step_number: 1,
          prompt: 'Analyze requirements',
          playbook: 'playbook-analysis',
          handoff: '   ',
          rely_previous_step: false
        }
      ];

      const result = parser.validateWorkflow(steps);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Step 1: Empty handoff instruction');
    });

    it('should return warning for step relying on previous without handoff', () => {
      const steps = [
        {
          step_number: 1,
          prompt: 'Analyze requirements',
          playbook: 'playbook-analysis',
          handoff: 'Requirements document',
          rely_previous_step: false
        },
        {
          step_number: 2,
          prompt: 'Design solution',
          playbook: 'playbook-design',
          handoff: null,
          rely_previous_step: true
        }
      ];

      const result = parser.validateWorkflow(steps);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Step 2: Relies on previous step but has no handoff instruction');
    });

    it('should handle multiple errors and warnings', () => {
      const steps = [
        {
          step_number: 1,
          prompt: null,
          playbook: 'invalid-format',
          handoff: '   ',
          rely_previous_step: true
        },
        {
          step_number: 2,
          prompt: 'Design solution',
          playbook: 'playbook-design',
          handoff: null,
          rely_previous_step: true
        }
      ];

      const result = parser.validateWorkflow(steps);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Step 1: Missing required prompt');
      expect(result.errors).toContain('Step 1: Cannot rely on previous step as it\'s the first step');
      expect(result.errors).toContain('Step 1: Playbook ID should start with \'playbook-\'');
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings).toContain('Step 1: Empty handoff instruction');
      expect(result.warnings).toContain('Step 2: Relies on previous step but has no handoff instruction');
    });

    it('should accept valid playbook with correct prefix', () => {
      const steps = [
        {
          step_number: 1,
          prompt: 'Analyze requirements',
          playbook: 'playbook-analysis',
          handoff: 'Requirements document',
          rely_previous_step: false
        }
      ];

      const result = parser.validateWorkflow(steps);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle steps without playbook', () => {
      const steps = [
        {
          step_number: 1,
          prompt: 'Analyze requirements',
          playbook: null,
          handoff: 'Requirements document',
          rely_previous_step: false
        }
      ];

      const result = parser.validateWorkflow(steps);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty steps array', () => {
      const steps = [];

      const result = parser.validateWorkflow(steps);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('splitIntoSteps', () => {
    it('should split markdown into correct step sections with all fields', () => {
      const markdown = `## Overview
This is a test workflow.

## Step 1: Requirements Analysis
- Playbook: playbook-analysis
- Prompt: Analyze the requirements
- Handoff: Requirements document

## Step 2: Design Phase
- Playbook: playbook-design
- Prompt: Create the design
- Handoff: Design document`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toContain('## Step 1: Requirements Analysis');
      expect(sections[0]).toContain('- Playbook: playbook-analysis');
      expect(sections[0]).toContain('- Prompt: Analyze the requirements');
      expect(sections[0]).toContain('- Handoff: Requirements document');
      
      expect(sections[1]).toContain('## Step 2: Design Phase');
      expect(sections[1]).toContain('- Playbook: playbook-design');
      expect(sections[1]).toContain('- Prompt: Create the design');
      expect(sections[1]).toContain('- Handoff: Design document');
    });

    it('should handle steps with missing playbook', () => {
      const markdown = `## Step 1: Requirements Analysis
- Prompt: Analyze the requirements
- Handoff: Requirements document

## Step 2: Design Phase
- Prompt: Create the design
- Handoff: Design document`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toContain('## Step 1: Requirements Analysis');
      expect(sections[0]).not.toContain('- Playbook:');
      expect(sections[0]).toContain('- Prompt: Analyze the requirements');
      expect(sections[0]).toContain('- Handoff: Requirements document');
    });

    it('should handle steps with missing handoff', () => {
      const markdown = `## Step 1: Requirements Analysis
- Playbook: playbook-analysis
- Prompt: Analyze the requirements

## Step 2: Design Phase
- Playbook: playbook-design
- Prompt: Create the design`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toContain('## Step 1: Requirements Analysis');
      expect(sections[0]).toContain('- Playbook: playbook-analysis');
      expect(sections[0]).toContain('- Prompt: Analyze the requirements');
      expect(sections[0]).not.toContain('- Handoff:');
    });

    it('should handle steps with only prompt (minimal structure)', () => {
      const markdown = `## Step 1: Requirements Analysis
- Prompt: Analyze the requirements

## Step 2: Design Phase
- Prompt: Create the design`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toContain('## Step 1: Requirements Analysis');
      expect(sections[0]).toContain('- Prompt: Analyze the requirements');
      expect(sections[0]).not.toContain('- Playbook:');
      expect(sections[0]).not.toContain('- Handoff:');
      
      expect(sections[1]).toContain('## Step 2: Design Phase');
      expect(sections[1]).toContain('- Prompt: Create the design');
    });

    it('should handle mixed scenarios (some steps with playbook/handoff, others without)', () => {
      const markdown = `## Step 1: Requirements Analysis
- Prompt: Analyze the requirements
- Handoff: Requirements document

## Step 2: Design Phase
- Playbook: playbook-design
- Prompt: Create the design

## Step 3: Implementation
- Prompt: Implement the solution`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(3);
      
      // Step 1: has handoff but no playbook
      expect(sections[0]).toContain('## Step 1: Requirements Analysis');
      expect(sections[0]).not.toContain('- Playbook:');
      expect(sections[0]).toContain('- Handoff: Requirements document');
      
      // Step 2: has playbook but no handoff
      expect(sections[1]).toContain('## Step 2: Design Phase');
      expect(sections[1]).toContain('- Playbook: playbook-design');
      expect(sections[1]).not.toContain('- Handoff:');
      
      // Step 3: minimal (only prompt)
      expect(sections[2]).toContain('## Step 3: Implementation');
      expect(sections[2]).not.toContain('- Playbook:');
      expect(sections[2]).not.toContain('- Handoff:');
    });

    it('should handle legacy format (## Step N ##)', () => {
      const markdown = `## Step 1 ##
- Playbook: playbook-analysis
- Prompt: Analyze the requirements

## Step 2 ##
- Prompt: Create the design`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toContain('## Step 1 ##');
      expect(sections[0]).toContain('- Playbook: playbook-analysis');
      expect(sections[1]).toContain('## Step 2 ##');
      expect(sections[1]).not.toContain('- Playbook:');
    });

    it('should handle step titles with and without space after colon', () => {
      const markdown = `## Step 1: Requirements Analysis
- Prompt: Analyze the requirements

## Step 2:Design Phase
- Prompt: Create the design`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toContain('## Step 1: Requirements Analysis');
      expect(sections[1]).toContain('## Step 2:Design Phase');
    });

    it('should return empty array for markdown without step sections', () => {
      const markdown = `## Overview
This is just an overview without any steps.

## Conclusion
This is the end.`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(0);
    });

    it('should handle single step correctly', () => {
      const markdown = `## Step 1: Single Step
- Prompt: Do everything
- Handoff: Complete solution`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(1);
      expect(sections[0]).toContain('## Step 1: Single Step');
      expect(sections[0]).toContain('- Prompt: Do everything');
      expect(sections[0]).toContain('- Handoff: Complete solution');
    });

    it('should handle steps with repo field in splitIntoSteps', () => {
      const markdown = `## Step 1: Setup Repository
- Repo: github.com/example/project
- Prompt: Clone and setup the repository
- Handoff: Repository ready for development

## Step 2: Code Review
- Playbook: playbook-review
- Repo: dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp
- Prompt: Review the code changes
- Handoff: Review completed`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toContain('## Step 1: Setup Repository');
      expect(sections[0]).toContain('- Repo: github.com/example/project');
      expect(sections[0]).toContain('- Prompt: Clone and setup the repository');
      expect(sections[0]).toContain('- Handoff: Repository ready for development');
      
      expect(sections[1]).toContain('## Step 2: Code Review');
      expect(sections[1]).toContain('- Playbook: playbook-review');
      expect(sections[1]).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp');
      expect(sections[1]).toContain('- Prompt: Review the code changes');
      expect(sections[1]).toContain('- Handoff: Review completed');
    });

    it('should handle mixed scenarios with some steps having repo field', () => {
      const markdown = `## Step 1: Requirements Analysis
- Prompt: Analyze the requirements
- Handoff: Requirements document

## Step 2: Code Setup
- Repo: github.com/example/project
- Playbook: playbook-setup
- Prompt: Setup the codebase

## Step 3: Implementation
- Prompt: Implement the solution`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(3);
      
      // Step 1: no repo field
      expect(sections[0]).toContain('## Step 1: Requirements Analysis');
      expect(sections[0]).not.toContain('- Repo:');
      expect(sections[0]).toContain('- Handoff: Requirements document');
      
      // Step 2: has repo field
      expect(sections[1]).toContain('## Step 2: Code Setup');
      expect(sections[1]).toContain('- Repo: github.com/example/project');
      expect(sections[1]).toContain('- Playbook: playbook-setup');
      
      // Step 3: no repo field
      expect(sections[2]).toContain('## Step 3: Implementation');
      expect(sections[2]).not.toContain('- Repo:');
    });

    it('should handle repo inheritance scenarios in splitIntoSteps', () => {
      const markdown = `## Step 1: Setup Repository
- Repo: my-project
- Prompt: Setup the main repository

## Step 2: Process Code
- Prompt: Process the code (should inherit repo)

## Step 3: Deploy Without Repo
- Repo: none
- Prompt: Deploy without repository context

## Step 4: Continue Processing
- Prompt: Continue processing (no inheritance after none)`;

      const sections = parser.splitIntoSteps(markdown);

      expect(sections).toHaveLength(4);
      
      // Step 1: defines repo
      expect(sections[0]).toContain('## Step 1: Setup Repository');
      expect(sections[0]).toContain('- Repo: my-project');
      
      // Step 2: no repo defined (will inherit)
      expect(sections[1]).toContain('## Step 2: Process Code');
      expect(sections[1]).not.toContain('- Repo:');
      
      // Step 3: explicitly sets repo to none
      expect(sections[2]).toContain('## Step 3: Deploy Without Repo');
      expect(sections[2]).toContain('- Repo: none');
      
      // Step 4: no repo defined (won't inherit due to step 3)
      expect(sections[3]).toContain('## Step 4: Continue Processing');
      expect(sections[3]).not.toContain('- Repo:');
    });
  });
});