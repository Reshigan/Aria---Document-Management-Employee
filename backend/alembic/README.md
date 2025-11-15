# Alembic Database Migrations

This directory contains database migration scripts managed by Alembic.

## Usage

### Create a new migration

```bash
cd backend
alembic revision -m "description of changes"
```

### Run migrations

```bash
# Upgrade to latest version
alembic upgrade head

# Upgrade by one version
alembic upgrade +1

# Downgrade by one version
alembic downgrade -1

# Show current version
alembic current

# Show migration history
alembic history
```

### Auto-generate migrations (requires SQLAlchemy models)

```bash
alembic revision --autogenerate -m "description"
```

## Migration File Structure

Each migration file in `versions/` contains:
- `upgrade()`: SQL commands to apply the migration
- `downgrade()`: SQL commands to revert the migration

## Best Practices

1. Always review auto-generated migrations before applying
2. Test migrations on a development database first
3. Keep migrations small and focused
4. Never edit applied migrations - create new ones instead
5. Always provide a downgrade path
6. Backup database before running migrations in production

## Example Migration

```python
def upgrade() -> None:
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=True))
    op.create_index('idx_users_email', 'users', ['email'])

def downgrade() -> None:
    op.drop_index('idx_users_email', 'users')
    op.drop_column('users', 'email_verified')
```
