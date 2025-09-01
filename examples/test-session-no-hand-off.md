## Overview
This workflow demonstrates a sequential development process where each step depends on the handoff data from the previous step. Each step builds upon the work completed in the prior step, creating a dependency chain.

## Workflow Steps

## Step 1: Create Initial Branch and Setup
- Repo: staffingboss-reactapp
- Playbook: <none>
- Prompt: Create a new Git branch called "devin-<unique-timetamp>/feature-workflow-test" from the main branch. Initialize a simple project structure with a README.md file containing "Initial project setup". Commit this 
  change 
  and provide 
  the branch name and initial commit hash as handoff data.
- Handoff: Provide the exact branch name created and the commit hash of the initial setup commit.

## Step 2: Add Configuration File
- Playbook: <none>
- Prompt: Using the branch from the previous step, create a new file called "config.txt" with the content "Configuration created in step 2". Add and commit this file. Also update the README.md to mention that configuration has been added. Provide the new commit hash and file details as handoff data.
- Handoff: Provide the commit hash after adding config.txt and confirm the branch is ready for the next step.

## Step 3: Create Feature Branch and Add New Functionality
- Playbook: <none>
- Prompt: Based on the branch and commit from step 2, create a new branch called "feature-advanced" from the current branch. Update the config.txt file to include "Updated in step 3 - advanced features enabled". Create a new file called "features.txt" with content "Feature list: authentication, logging". Commit these changes and provide the new branch name and commit details.
- Handoff: Provide the new branch name "feature-advanced" and the commit hash after adding the new functionality.

## Step 4: Finalize and Add Documentation
- Repo: <none>
- Playbook: <none>
- Prompt: Switch to the "feature-advanced" branch from step 3. Create a new file called "documentation.txt" with content "Project documentation: Setup complete, configuration ready, features implemented". Update the README.md to include a summary of all work completed across the 4 steps. Commit these final changes and provide the final commit hash and project status.
- Handoff: Provide the final commit hash and confirm all files are properly committed in the feature-advanced branch.

## Dependency Chain Analysis

**Sequential Flow:**
- Step 1 → Step 2: Branch name and initial commit required
- Step 2 → Step 3: Updated branch state and commit hash required  
- Step 3 → Step 4: Feature branch name and commit details required
- Step 4: Final integration of all previous work
ng critical information between workflow steps