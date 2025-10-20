🔧 CLI Commands
Create new project
cnzr new <project-name> [options]
  --template basic|advanced    # Project template
  --typescript                 # TypeScript project
  --git                        # Initialize git repository
Development server
cnzr dev [options]
  --port <port>               # Server port (default: 3000)
  --host <host>               # Server host (default: localhost)
  --file-routing              # Enable file-based routing
Build project
cnzr build [options]
  --output <dir>              # Output directory (default: dist)
  --esm                       # Build as ESM modules
  --cjs                       # Build as CommonJS modules
