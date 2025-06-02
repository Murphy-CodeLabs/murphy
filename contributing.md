# Contributing

Thanks for your interest in contributing to Murphy. We're happy to have you here.

Please take a moment to review this document before submitting your first pull request. We also strongly recommend that you check for open issues and pull requests to see if someone else is working on something similar.

If you need any help, feel free to open an issue or reach out to the maintainers.

## About this repository

- We use [pnpm](https://pnpm.io) for development
- We use [Next.js](https://nextjs.org/) for our documentation and examples
- We follow a component-based architecture with shadcn UI components

## Structure

| Path             | Description                                  |
| ---------------- | -------------------------------------------- |
| `/app`           | The Next.js application for the website      |
| `/components`    | The React components for the website         |
| `/lib`           | Utility functions and shared code            |
| `/types`         | TypeScript type definitions                  |
| `/content`       | Documentation content                        |
| `/config`        | Configuration files                          |

## Development

### Fork this repo

You can fork this repo by clicking the fork button in the top right corner of this page.

### Clone on your local machine

```bash
git clone https://github.com/murphy-codelabs/murphy
```

### Navigate to project directory

```bash
cd murphy
```

### Create a new Branch

```bash
git checkout -b my-new-branch
```

### Install dependencies

```bash
pnpm install
```

### Run the development server

```bash
pnpm dev
```

## Components

We use a registry system for developing components. You can find the source code for the components under `app/components/ui/murphy`.

```bash
app
└── components
    └── ui
        ├── murphy
            ├── connect-wallet-button.tsx
            └── index.tsx
```

When adding or modifying components, please ensure that:

1. You make the changes for every style
2. You update the documentation
3. Update `registry.json` [registry docs ](https://ui.shadcn.com/docs/registry/registry-json).
4. You run `pnpm registry:build` to update the registry

### Component Auto-Import for Documentation

All Murphy components must be exported from the `components/ui/murphy/index.tsx` file to make them automatically available in MDX documentation without requiring explicit imports.

When you create a new component:

1. Create your component file in the `components/ui/murphy` directory (e.g., `my-new-component.tsx`)
2. Export your component from the index file:

```tsx
// In components/ui/murphy/index.tsx
import { MyNewComponent } from "./my-new-component";

export { 
  // ... existing exports
  MyNewComponent 
};
```

## Commit Convention

Before you create a Pull Request, please check whether your commits comply with the commit conventions used in this repository.

When you create a commit we kindly ask you to follow the convention `category(scope or module): message` in your commit message while using one of the following categories:

- `feat / feature`: all changes that introduce completely new code or new features
- `fix`: changes that fix a bug (ideally you will additionally reference an issue if present)
- `refactor`: any code related change that is not a fix nor a feature
- `docs`: changing existing or creating new documentation
- `style`: code style changes (formatting, etc.)
- `perf`: performance improvements
- `test`: all changes regarding tests
- `chore`: all changes to the repository that do not fit into any of the above categories

e.g. `feat(components): add new prop to the avatar component`

If you are interested in the detailed specification you can visit https://www.conventionalcommits.org/ or check out the [Angular Commit Message Guidelines](https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#-commit-message-guidelines).

## Pull Request Process

1. Ensure your code follows the style and conventions of the project
2. Update documentation if necessary
3. Add tests for new functionality
4. Make sure all tests pass
5. Submit your pull request with a clear description of the changes

## Requests for New Features

If you have an idea for a new feature, please open a discussion on GitHub. We appreciate your input and will be happy to discuss how it might fit into the project roadmap.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We strive to create a welcoming and inclusive environment for everyone.

## License

By contributing to Murphy, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).