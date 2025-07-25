# 🎯 Hook Usage Strategy

## Start of Each Work Session

### 1. Task Progress Tracker

- **When:** Beginning of each coding session
- **Purpose:** Get oriented, see what to work on next
- **Frequency:** Once per session (daily/weekly)

## During Active Development

### 2. Test Automation (Auto-trigger on file save)

- **When:** Automatically when you save files in src/
- **Purpose:** Catch issues early, run relevant tests
- **Frequency:** Automatic

## Before Marking Task Complete

### 3. Implementation Validator

- **When:** Just before checking off a task as complete
- **Purpose:** Ensure all acceptance criteria are met
- **Frequency:** Once per completed task
## Periodic Quality Checks

### 4. Code Quality Checker

- **When:** After completing 2-3 tasks or before major commits
- **Purpose:** Maintain code standards and best practices
- **Frequency:** Every 2-3 tasks or weekly

## When Working on Integration

### 5. Integration Helper

- **When:** Working on tasks that connect components (like task 9 in README Parser)
- **Purpose:** Validate interfaces between components
- **Frequency:** Only when working on integration points

## Staying Aligned with Specs

### 6. Spec Sync Helper

- **When:** If you feel disconnected from original requirements
- **Purpose:** Realign implementation with specs
- **Frequency:** As needed, maybe once per component

## Documentation Maintenance

### 7. Documentation Sync

- **When:** After completing a full component or major milestone
- **Purpose:** Keep docs current with implementation
- **Frequency:** Once per completed component

# 📋 Practical Workflow Example

## Daily Coding Session

1. Start session → Run "Task Progress Tracker"
2. Code/implement → "Test Automation" runs automatically
3. Complete task → Run "Implementation Validator"
4. Every 2-3 tasks → Run "Code Quality Checker"

## Weekly/Component Completion

1. Finish component → Run "Documentation Sync"
2. Before next component → Run "Integration Helper"
3. If feeling lost → Run "Spec Sync Helper"
# 🎯 For Your Current Situation

Since you just completed Task 3 of README Parser:

## Right Now

- ✅ Implementation Validator - Validate task 3 completion
- ✅ Task Progress Tracker - See what's next (Task 4: Language Detection)

## Next Few Tasks

- Continue with Task 4, 5, 6...
- Run Code Quality Checker after Task 6 (mid-component check)
- Run Implementation Validator after each task completion

## When README Parser is Complete

- Documentation Sync - Update docs for completed component
- Integration Helper - Prepare for Framework Detection integration
- Task Progress Tracker - Plan Framework Detection start
# 💡 Key Principle

Don't run all hooks after every task - that's overkill. Use them strategically:

- **Task Progress Tracker:** Session planning
- **Implementation Validator:** Task completion verification
- **Code Quality Checker:** Periodic quality maintenance
- **Integration Helper:** Only for integration work
- **Spec Sync Helper:** Only when feeling disconnected
- **Documentation Sync:** Major milestone completion

Think of them as specialized tools rather than a checklist to run through every time. Use the right tool for the right moment! 🛠️