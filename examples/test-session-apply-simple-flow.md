## Overview
This workflow demonstrates a simple sequential Git workflow where each step builds upon the previous step's handoff data. The workflow focuses on basic Git operations including branch creation, file operations, and content management across multiple branches.

## Workflow Steps

## Step 1: Create New Development Branch
- Repo: staffingboss-reactapp
- Playbook: <none>
- Prompt: Create a new Git branch called `devin/<timestamp>/demo-todo-workflow` where timestamp is in format MMDDYY-HHMM (e.g., feature/todo-workflow-010625-1430). Ensure you're starting from the main/master branch or 
  current working branch. Verify the branch creation is successful and confirm you're now on the new branch.
- Handoff: Provide the exact branch name created (including the timestamp) and confirmation that the branch checkout was successful.

## Step 2: Checkout Branch and Create Todo File
- Repo: staffingboss-reactapp
- Playbook: <none>
- RelyPreviousStep: yes
- Prompt: Using the exact branch name provided from Step 1, checkout to that branch and create a new file called `toDo2.txt`. Fill this file with lorem ipsum content (approximately 5-10 lines of standard lorem ipsum text). Add the file to Git staging area, commit the changes with a meaningful commit message like "Add initial toDo2.txt with lorem ipsum content", and verify the commit was successful.
- Handoff: Provide the branch name used, the exact content added to toDo2.txt, the commit hash of the new commit, and confirmation that the file is properly committed to the branch.

## Step 3: Create New Branch and Update File Content
- Repo: staffingboss-reactapp
- Playbook: <none>
- RelyPreviousStep: yes
- Prompt: Based on the branch from Step 2, create a new branch called `feature/todo-workflow-<timestamp>-updated` (using the same timestamp from Step 1 but adding "-updated" suffix). Checkout to this new branch and update the content of `toDo2.txt` by appending the text "step 3 checkin" at the end of the existing lorem ipsum content. Commit this change with a message like "Update toDo2.txt - step 3 checkin". Verify the commit was successful.
- Handoff: Provide the exact new branch name created, the updated content of toDo2.txt (including both lorem ipsum and the new text), the commit hash of the update, and confirmation that you're currently on the new branch.

## Step 4: Checkout Updated Branch and Display File Content
- Repo: staffingboss-reactapp
- Playbook: <none>
- RelyPreviousStep: yes
- Prompt: Using the branch name provided from Step 3, checkout to that branch and display the complete content of `toDo2.txt`. Show the Git log for the last 2 commits to verify the workflow history. Also run `git status` to confirm the working directory is clean and display the current branch information.
- Handoff: Provide the current branch name, the complete content of toDo2.txt as displayed, the Git log output showing the commit history, and confirmation that the workflow has been completed successfully.

## Dependency Chain Analysis

**Sequential Flow:**
- Step 1 → Step 2: Branch name required for checkout
- Step 2 → Step 3: Branch state and file content needed for new branch creation
- Step 3 → Step 4: Updated branch name needed for final checkout and verification
- Step 4: Final verification of the complete workflow

## Expected Outcomes

- ✅ Initial feature branch created with unique timestamp
- ✅ toDo2.txt file created with lorem ipsum content and committed
- ✅ New updated branch created with modified file content
- ✅ Complete workflow verification showing all changes and Git history

## Development Patterns Demonstrated

- **Git Branching**: Creating and managing multiple branches
- **File Operations**: Creating, editing, and tracking file changes
- **Commit Management**: Making meaningful commits with proper messages
- **Workflow Verification**: Checking Git status and history for workflow validation