# Contributing to ARIA

First off, thank you for considering contributing to ARIA! It's people like you that make ARIA such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Workflow](#development-workflow)
- [Coding Guidelines](#coding-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

Before you begin, ensure you have:
- Python 3.11+
- Node.js 18+
- Docker and Docker Compose
- Git

### Development Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Aria---Document-Management-Employee.git
   cd Aria---Document-Management-Employee
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/Reshigan/Aria---Document-Management-Employee.git
   ```

4. **Set up development environment**
   ```bash
   # Backend
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements/dev.txt
   
   # Frontend
   cd ../frontend
   npm install
   ```

5. **Start development services**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Ubuntu 22.04]
 - Python version: [e.g. 3.11.6]
 - ARIA version: [e.g. 2.0.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Create an issue and provide:

- **Clear title and description**
- **Use case**: Why is this enhancement useful?
- **Expected behavior**: What should happen?
- **Alternatives**: What alternatives have you considered?

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:
- `good first issue` - Simple issues for beginners
- `help wanted` - Issues where we need community help
- `documentation` - Documentation improvements

### Pull Requests

1. Fork the repo and create your branch from `main`
2. Make your changes
3. Add tests for your changes
4. Ensure all tests pass
5. Update documentation
6. Submit a pull request

## Development Workflow

### Branch Naming Convention

```
feature/short-description      # New features
bugfix/issue-number-description # Bug fixes
hotfix/critical-issue          # Critical production fixes
docs/what-is-updated           # Documentation updates
refactor/what-is-refactored    # Code refactoring
test/what-is-tested            # Adding tests
```

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, maintainable code
   - Follow the coding guidelines
   - Add comments where necessary
   - Update documentation

3. **Test your changes**
   ```bash
   # Backend tests
   cd backend
   pytest
   
   # Frontend tests
   cd frontend
   npm test
   
   # Integration tests
   npm run test:e2e
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

5. **Keep your branch updated**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Guidelines

### Python (Backend)

#### Style Guide
- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- Use type hints
- Maximum line length: 100 characters
- Use docstrings for all public functions/classes

#### Code Formatting
```bash
# Install formatters
pip install black isort flake8

# Format code
black backend/
isort backend/
flake8 backend/
```

#### Example
```python
from typing import List, Optional
from pydantic import BaseModel


class Document(BaseModel):
    """
    Document model representing uploaded documents.
    
    Attributes:
        id: Unique document identifier
        filename: Original filename
        document_type: Type of document (invoice, PO, etc.)
    """
    
    id: str
    filename: str
    document_type: Optional[str] = None
    
    def process(self) -> dict:
        """
        Process the document and extract data.
        
        Returns:
            dict: Extracted document data
            
        Raises:
            ProcessingError: If document processing fails
        """
        # Implementation
        pass
```

### TypeScript/React (Frontend)

#### Style Guide
- Use TypeScript for all new code
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use functional components with hooks
- Maximum line length: 100 characters

#### Code Formatting
```bash
# Install formatters
npm install -g prettier eslint

# Format code
npm run format
npm run lint
```

#### Example
```typescript
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDocuments } from '@/store/slices/documentSlice';

interface DocumentListProps {
  filter?: string;
  onSelect?: (id: string) => void;
}

/**
 * DocumentList component displays a list of documents
 * 
 * @param filter - Optional filter string
 * @param onSelect - Callback when document is selected
 */
export const DocumentList: React.FC<DocumentListProps> = ({ 
  filter, 
  onSelect 
}) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const documents = useSelector((state) => state.documents.items);

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  return (
    <div className="document-list">
      {/* Implementation */}
    </div>
  );
};
```

### Testing Guidelines

#### Unit Tests
- Write tests for all new features
- Maintain >80% code coverage
- Use descriptive test names

```python
# Python test example
def test_document_processing_success():
    """Test successful document processing"""
    document = Document(filename="test.pdf")
    result = document.process()
    
    assert result["status"] == "success"
    assert "data" in result
```

```typescript
// TypeScript test example
describe('DocumentList', () => {
  it('should render document list', () => {
    const { getByText } = render(<DocumentList />);
    expect(getByText('Documents')).toBeInTheDocument();
  });
});
```

#### Integration Tests
- Test API endpoints
- Test component interactions
- Test external service integrations

### Documentation Guidelines

- Update README.md for user-facing changes
- Update API documentation for API changes
- Add inline comments for complex logic
- Update CHANGELOG.md

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples
```bash
feat(api): add document batch upload endpoint

Implements batch upload functionality allowing multiple documents
to be uploaded in a single request.

Closes #123

---

fix(ui): correct date format in document list

The date was displaying in incorrect format for non-US locales.

Fixes #456

---

docs(readme): update installation instructions

Added missing step for SAP RFC SDK installation.
```

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No merge conflicts with main

### PR Template

When you create a PR, fill out this template:

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
- [ ] Comments added to complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added for new features

## Screenshots (if applicable)

## Related Issues
Closes #123
```

### Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: Maintainers review your code
3. **Feedback**: Address review comments
4. **Approval**: Once approved, maintainer will merge

### After Merge

- Delete your branch
- Update your fork
- Celebrate! 🎉

## Code Review Guidelines

### For Contributors

- Be open to feedback
- Respond to comments promptly
- Don't take criticism personally
- Learn from the review

### For Reviewers

- Be respectful and constructive
- Explain the "why" behind suggestions
- Recognize good work
- Focus on the code, not the person

## Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation

## Questions?

- **Documentation**: Check [docs/](./docs/)
- **Discussions**: Use [GitHub Discussions](https://github.com/Reshigan/Aria---Document-Management-Employee/discussions)
- **Issues**: Open an [issue](https://github.com/Reshigan/Aria---Document-Management-Employee/issues)
- **Email**: dev@aria.example.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ARIA! 🚀
