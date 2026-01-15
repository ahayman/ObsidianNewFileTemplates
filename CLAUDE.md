# Overview

This is a Typescript plugin for Obsidian designed to allow users to easily create new notes with a title determined by templates created by the user. It will combine this with Obsidian's native Template feature to produce a templated file with a templated title.

# Instructions

- Use Typescript
- Obsidian's Plugin docs can be found here: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin 
- Use React for the plugin.
- Always use Yarn. Never use NPM.
- Always create a commit message for changes made. NEVER commit. Just create the message.

## Research
- If a request is made to research a topic, put the results of the research in the `/Claude/Research` using the template `{current datetime}-{research topic}.md`. The current datetime should be in the format `YYYYMMddHHmmss`
- Output research results as markdown.
- Include working code examples if possible.

## Plans
- Put created plans in the `/Claude/Plans` folder using the template `{current datetime}-{plan name}.md`. The current datetime should be in the format `YYYYMMddHHmmss` 
- Never implement a feature directly. Always create a plan first and write it to the `/Claude/Plans` folder.
- When creating plans, break them into multiple phases and use ToDo checklists.
- When implementing a plan, use the phases and mark the ToDos completed as work is completed.  

