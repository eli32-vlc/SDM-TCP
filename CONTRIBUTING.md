# Contributing to SDM-TCP

Thank you for your interest in contributing to SDM-TCP! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/SDM-TCP.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit: `git commit -m "Description of changes"`
7. Push: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Setup

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Git

### Initial Setup

```bash
# Install core dependencies
cd core
npm install

# Build core library
npm run build

# Install desktop app dependencies
cd ../macos
npm install
```

### Running Tests

```bash
cd core
npm test
```

### Running in Development

```bash
cd macos
npm run dev
```

## Code Style

### TypeScript
- Use TypeScript for all new code
- Enable strict mode
- Provide proper type annotations
- Avoid `any` when possible

### Formatting
- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Run ESLint before committing

### Naming Conventions
- **Classes**: PascalCase (e.g., `FSKModulator`)
- **Functions**: camelCase (e.g., `modulateData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Files**: kebab-case (e.g., `audio-processor.ts`)

## Project Structure

```
SDM-TCP/
├── core/           # Core library (protocol, crypto, audio)
├── macos/          # Desktop application (Electron)
├── android/        # Android application (future)
├── docs/           # Documentation
└── .github/        # CI/CD workflows
```

## Testing Guidelines

### Unit Tests
- Write tests for all new functions
- Aim for >80% code coverage
- Use Jest for testing
- Mock external dependencies

### Integration Tests
- Test end-to-end workflows
- Test TX → RX communication
- Test error handling and retries

### Manual Testing
- Test on actual hardware
- Test with different audio devices
- Test in noisy environments
- Test long-running connections

## Areas for Contribution

### High Priority
- Android native implementation
- Comprehensive test suite
- Performance optimization
- Documentation improvements

### Medium Priority
- Adaptive bit rate
- Forward Error Correction
- Multi-carrier modulation (OFDM)
- Better audio processing (AGC, filters)

### Low Priority
- Additional UI themes
- Internationalization (i18n)
- Plugin system
- Alternative encryption algorithms

## Pull Request Process

1. **Update documentation** if you change functionality
2. **Add tests** for new features
3. **Follow code style** guidelines
4. **Keep commits atomic** and well-described
5. **Rebase on main** before submitting
6. **Link related issues** in PR description

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added where necessary
- [ ] Documentation updated
- [ ] No new warnings
```

## Reporting Bugs

### Before Reporting
- Check existing issues
- Try latest version
- Verify it's reproducible

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**To Reproduce**
1. Step 1
2. Step 2
3. ...

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., macOS 14.0]
- Node.js version: [e.g., 20.10.0]
- App version: [e.g., 1.0.0]

**Logs**
```
Relevant log output
```

**Screenshots**
If applicable
```

## Feature Requests

### Template

```markdown
**Problem**
What problem does this solve?

**Proposed Solution**
How should this work?

**Alternatives**
Other approaches considered

**Additional Context**
Any other relevant information
```

## Code Review Process

1. Automated checks must pass (CI/CD)
2. At least one maintainer approval required
3. Address all review comments
4. Maintainer will merge when ready

## Security

- **Do not commit secrets** or API keys
- **Report security issues privately** to maintainers
- Use secure coding practices
- Follow OWASP guidelines

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

- Open an issue with tag `question`
- Join discussions in Issues
- Contact maintainers

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing! 🎉
