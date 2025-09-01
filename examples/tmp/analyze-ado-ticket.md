## Overview
This workflow demonstrates automated Azure DevOps (ADO) ticket analysis including reading ticket data, analyzing content and dependencies, and generating comprehensive summaries. Ideal for learning ticket processing automation and data analysis patterns.

## Workflow Steps

## Step 1: Read ADO Ticket Data
- Playbook: 2bad2151af5f4380af0acab90f1cd328
- Prompt: Read the ADO ticket using playbook ID 1234. Extract all ticket metadata including title, description, status, assigned user, priority, and work item type. Retrieve all attachments and linked ticket references for comprehensive analysis.
- Handoff: Provide ticket ID, work item type, and confirm successful data extraction with attachment count and linked items summary

## Step 2: Analyze Core Content
- Playbook: <none>
- RelyPreviousStep: yes
- Prompt: Using the ticket data from Step 1, perform detailed analysis of the description content and all attachments. Extract key technical requirements, business context, and any embedded screenshots or documentation. Parse and categorize all information for structured analysis.
- Handoff: Deliver structured content analysis with categorized requirements and attachment summaries

## Step 3: Analyze Criteria and Context
- Playbook: <none>
- RelyPreviousStep: yes
- Prompt: Based on the work item type identified in Step 1, analyze acceptance criteria if it's a User Story, or analyze retrospective steps and root cause if it's a CS Bug. Extract all defined criteria, validation steps, and success metrics for comprehensive understanding.
- Handoff: Provide formatted criteria analysis specific to work item type with validation checkpoints

## Step 4: Process Comments and Generate Summary
- Playbook: <none>
- RelyPreviousStep: yes
- Prompt: Analyze all ticket comments for additional context, decisions, and updates. Compile a comprehensive summary including ticket overview, key requirements, criteria analysis, stakeholder discussions, and recommended next actions.
- Handoff: Deliver complete ticket analysis report with executive summary and actionable insights

## Dependency Chain Analysis

**Sequential Flow:**
- Step 1: Ticket Data Extraction (foundation)
- Step 2 → Step 1 (content analysis requires ticket data)
- Step 3 → Step 2 (criteria analysis requires content understanding)
- Step 4 → Step 3 (summary generation requires all previous analysis)

## Expected Outcomes

- ✅ Complete ADO ticket data extraction with metadata
- ✅ Structured analysis of descriptions and attachments
- ✅ Work item type-specific criteria evaluation
- ✅ Comprehensive comment thread analysis
- ✅ Executive summary with actionable recommendations

## Analysis Patterns Demonstrated

- **Data Integration**: ADO API integration and data extraction
- **Content Processing**: Automated text and attachment analysis
- **Conditional Logic**: Work item type-specific analysis paths
- **Information Synthesis**: Multi-source data compilation
- **Report Generation**: Structured summary and insights delivery