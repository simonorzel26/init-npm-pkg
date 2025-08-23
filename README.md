# create-package

A modern TypeScript package generator with multiple build tools, linters, and test frameworks.

## Features

- 🚀 **Multiple Package Managers**: Bun and npm support
- 🛠️ **Build Tools**: Bun build and tsup
- 📝 **Linters & Formatters**: Biome, ESLint + Prettier
- 🧪 **Testing Frameworks**: Vitest and Bun Test
- 📦 **Versioning**: Changesets for releases
- 🔧 **CI/CD**: GitHub Actions workflows
- 🐙 **Git Integration**: Optional git repo initialization
- 👤 **GitHub Integration**: Automatic username detection and injection
- ⚡ **Parallel Testing**: Configurable concurrency for faster test execution
- 🏗️ **SOLID Architecture**: Clean, maintainable, and extensible codebase

## Quick Start

```bash
# Using npx
npx create-package

# Using bunx
bunx create-package

# Using npm
npm create package

# Using yarn
yarn create package
```

## Usage

1. **Run the generator**:
   ```bash
   bunx create-package
   ```

2. **Follow the prompts**:
   - Project name
   - Package manager & builder (Bun or npm)
   - Linter & formatter (Biome or ESLint + Prettier)
   - Testing framework (Vitest, Bun Test, or none)
   - Git repository initialization (optional)
   - GitHub username (automatically detected from git config)

3. **Start developing**:
   ```bash
   cd your-project-name
   bun install  # or npm install
   bun run build
   bun run test
   ```

## Generated Project Structure

```
your-project/
├── src/
│   ├── index.ts
│   ├── utils.ts
│   └── utils.test.ts
├── dist/
├── .github/workflows/ci.yml
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Package Manager Options

### Bun
- **Build Tool**: Bun build
- **Package Manager**: Bun
- **Test Framework**: Bun Test or Vitest
- **CI**: GitHub Actions with Bun

### npm
- **Build Tool**: tsup
- **Package Manager**: npm
- **Test Framework**: Vitest only (Bun Test requires Bun runtime)
- **CI**: GitHub Actions with Node.js

## Linter & Formatter Options

### Biome
- Fast, modern linter and formatter
- Zero configuration
- Built-in TypeScript support

### ESLint + Prettier
- Industry standard linting
- Highly configurable
- Extensive plugin ecosystem

## Testing Options

### Vitest
- Fast unit testing framework
- Vite-powered
- Compatible with Jest APIs

### Bun Test
- Built into Bun runtime
- Extremely fast execution
- Native TypeScript support

### None
- No testing framework
- Minimal dependencies

## Versioning

All projects include [Changesets](https://github.com/changesets/changesets) for:
- Semantic versioning
- Automated releases
- Changelog generation

## CI/CD

Generated projects include GitHub Actions workflows for:
- Automated testing
- Linting and formatting
- Type checking
- Build verification

## Git Integration

The generator can optionally:
- Initialize a git repository
- Create an initial commit
- Set up remote origin URLs
- Provide push instructions

Users can choose whether to initialize git or not during the setup process.

## Environment Variables

You can skip prompts using environment variables:

```bash
CREATE_PACKAGE_NAME=my-lib \
CREATE_PACKAGE_PM=bun \
CREATE_PACKAGE_FORMATTER=biome \
bunx create-package
```

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/create-package.git
cd create-package

# Install dependencies
bun install

# Run tests (with configurable concurrency)
bun run test:variants                    # Default: 3 concurrent tests
bun run test:variants --concurrency=4    # 4 concurrent tests
bun run test:variants --concurrency=1    # Sequential tests

# Build the package
bun run build

# Test the CLI locally
bun run test:cli
```

## Architecture

The project follows SOLID principles with a clean, composable architecture:

- **`GitHubService`** - Handles GitHub username detection and git operations
- **`PromptsService`** - Manages user input and CLI prompts
- **`ProjectGenerator`** - Orchestrates project creation and file generation
- **`TestGenerator`** - Runs comprehensive test suites with parallel execution
- **`TempFileManager`** - Manages temporary directory lifecycle
- **`ScriptExecutor`** - Executes build and test scripts
- **`PackageValidator`** - Validates package exports and npm functionality

Each service has a single responsibility and can be tested and extended independently.

## License

MIT
