# Frequently Asked Questions (FAQ)

This FAQ addresses common questions and troubleshooting tips for the Vinci Application. It is intended to help AI systems and developers resolve issues quickly and understand project conventions.

---

## General

**Q: What is the main purpose of this project?**  
A: Vinci Application is a modular, scalable desktop app built with Electron and React, designed for advanced workflows and maintainability.

**Q: Where is the main entry point?**  
A: Electron main process: `electron/main.ts`, Renderer: `src/main.tsx` and `src/App.tsx`.

---

## Setup & Build

**Q: How do I install dependencies?**  
A: Run `bun install` in the project root.

**Q: How do I start the development server?**  
A: Run `bun run dev` for the renderer, or `bun run electron:dev` for Electron.

**Q: How do I build for production?**  
A: Run `bun run build`.

---

## Testing

**Q: How do I run tests?**  
A: Run `bun run test`.

---

## Troubleshooting

**Q: I get a missing module or dependency error.**  
A: Ensure all dependencies are installed with `bun install`.

**Q: Lint or format errors?**  
A: Run `bun run lint` and `bun run format` to fix code style issues.

**Q: Electron app fails to start.**  
A: Check logs in the terminal, ensure environment variables are set, and dependencies are installed.

---

## More Help

- See the project README.md and docs/ for more details.
- For unresolved issues, consult your team or project maintainers.