# Contributing to Murphis

Thank you for your interest in contributing to Murphis! We're excited to have you join our community of developers building the future of Web3 on Solana.

Please take a moment to review this document before submitting your first pull request. We also recommend checking for open issues and pull requests to see if someone else is already working on something similar.

If you need help, feel free to open an issue or reach out to the maintainers.

## About this repository

- We use [pnpm](https://pnpm.io) as our package manager
- We use [Next.js](https://nextjs.org/) for our documentation and examples
- We follow a component-based architecture with shadcn UI components

## Structure

| Path             | Description                                  |
| ---------------- | -------------------------------------------- |
| `/app`           | Next.js application structure                |
| `/components`    | Reusable React components                    |
| `/lib`           | Utility functions and shared code            |
| `/types`         | TypeScript type definitions                  |
| `/content`       | Documentation content                        |
| `/config`        | Configuration files                          |

## Development

### Fork this repo

You can fork this repo by clicking the fork button in the top right corner of the repository page.

### Clone on your local machine

```bash
git clone https://github.com/murphis/murphis
```

### Navigate to the project directory

```bash
cd murphis
```

### Create a new branch

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

This will start the development server at http://localhost:3000.

## Components

We use shadcn UI for our component library. If you're adding or modifying components, please:

1. Make sure to maintain consistent styling with the existing components
2. Update type definitions as needed
3. Write clear documentation for any new components
4. Test your changes thoroughly before submitting a PR

## Commit Convention

We follow conventional commits in this repository. When creating a commit, please use the convention `category(scope): message` with one of the following categories:

- `feat`: New features or additions
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates, etc.

Example: `feat(sdk): add new token utility function`

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

By contributing to Murphis, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).