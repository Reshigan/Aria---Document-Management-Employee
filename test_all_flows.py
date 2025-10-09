#!/usr/bin/env python3
"""
Complete flow testing for ARIA
Tests all major functionality end-to-end
"""
import asyncio
import sys
import os
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set test environment variables
os.environ['SECRET_KEY'] = 'test_secret_key_for_testing_only_minimum_32_characters_required_here'
os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///./test_aria.db'
os.environ['FRONTEND_URL'] = 'http://localhost:3000'
os.environ['ENVIRONMENT'] = 'testing'

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, text
from backend.core.database import Base
from backend.models.user import User, PasswordResetToken
from backend.core.security import get_password_hash, verify_password, create_access_token, decode_token, validate_password_strength

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")

def error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.RESET}")

def info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.RESET}")

def warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.RESET}")

def test_header(name):
    print(f"\n{'='*70}")
    print(f"{Colors.BLUE}Testing: {name}{Colors.RESET}")
    print(f"{'='*70}\n")


async def setup_test_database():
    """Create test database and tables"""
    engine = create_async_engine(
        'sqlite+aiosqlite:///./test_aria.db',
        echo=False
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    return engine, async_session


async def test_database_setup():
    """Test 1: Database Setup"""
    test_header("Database Setup")
    
    try:
        engine, session_maker = await setup_test_database()
        
        # Check tables exist
        async with engine.connect() as conn:
            result = await conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ))
            tables = [row[0] for row in result.fetchall()]
            
            required_tables = ['users', 'password_reset_tokens']
            for table in required_tables:
                if table in tables:
                    success(f"Table '{table}' created")
                else:
                    error(f"Table '{table}' missing")
                    return False
        
        success("Database setup complete")
        return True, engine, session_maker
        
    except Exception as e:
        error(f"Database setup failed: {e}")
        return False, None, None


async def test_password_security():
    """Test 2: Password Security Functions"""
    test_header("Password Security")
    
    try:
        # Test password hashing
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        
        if len(hashed) >= 60:  # bcrypt produces 60 char hashes
            success(f"Password hashed correctly (length: {len(hashed)})")
        else:
            error(f"Password hash too short: {len(hashed)}")
            return False
        
        # Test password verification
        if verify_password(password, hashed):
            success("Password verification works")
        else:
            error("Password verification failed")
            return False
        
        # Test wrong password
        if not verify_password("WrongPassword", hashed):
            success("Wrong password correctly rejected")
        else:
            error("Wrong password accepted!")
            return False
        
        # Test password strength validation
        try:
            validate_password_strength("weak")
            error("Weak password accepted!")
            return False
        except (ValueError, Exception) as e:
            success("Weak password rejected")
        
        try:
            validate_password_strength("StrongPass123!")
            success("Strong password accepted")
        except (ValueError, Exception) as e:
            error(f"Strong password rejected: {e}")
            return False
        
        return True
        
    except Exception as e:
        error(f"Password security tests failed: {e}")
        return False


async def test_jwt_tokens():
    """Test 3: JWT Token Generation and Validation"""
    test_header("JWT Tokens")
    
    try:
        # Create token
        user_id = 1
        token = create_access_token({"sub": str(user_id)})
        
        if token and len(token) > 20:
            success(f"Access token created (length: {len(token)})")
        else:
            error("Token creation failed")
            return False
        
        # Decode token
        payload = decode_token(token)
        
        if payload and payload.get("sub") == str(user_id):
            success("Token decoded correctly")
        else:
            error(f"Token decode failed: {payload}")
            return False
        
        # Test invalid token
        try:
            decode_token("invalid.token.here")
            error("Invalid token accepted!")
            return False
        except:
            success("Invalid token rejected")
        
        return True
        
    except Exception as e:
        error(f"JWT token tests failed: {e}")
        return False


async def test_user_registration(session_maker):
    """Test 4: User Registration"""
    test_header("User Registration")
    
    try:
        async with session_maker() as session:
            # Create new user
            user = User(
                username="testuser",
                email="test@example.com",
                full_name="Test User",
                hashed_password=get_password_hash("TestPass123!"),
                is_active=True
            )
            
            session.add(user)
            await session.commit()
            await session.refresh(user)
            
            if user.id:
                success(f"User created with ID: {user.id}")
            else:
                error("User ID not set")
                return False, None
            
            # Verify user in database
            result = await session.execute(
                select(User).where(User.username == "testuser")
            )
            db_user = result.scalar_one_or_none()
            
            if db_user:
                success(f"User found in database: {db_user.email}")
            else:
                error("User not found in database")
                return False, None
            
            # Save user ID before testing duplicates
            user_id_result = user.id
            
            # Test duplicate prevention
            duplicate_user = User(
                username="testuser",  # Duplicate
                email="another@example.com",
                full_name="Another User",
                hashed_password=get_password_hash("Pass123!")
            )
            
            session.add(duplicate_user)
            try:
                await session.commit()
                error("Duplicate username accepted!")
                return False, None
            except:
                success("Duplicate username rejected")
                await session.rollback()
            
            return True, user_id_result
            
    except Exception as e:
        error(f"User registration test failed: {e}")
        return False, None


async def test_user_login(session_maker, user_id):
    """Test 5: User Login"""
    test_header("User Login")
    
    try:
        async with session_maker() as session:
            # Find user
            result = await session.execute(
                select(User).where(User.id == user_id)
            )
            db_user = result.scalar_one_or_none()
            
            if not db_user:
                error("User not found")
                return False
            
            success(f"User found: {db_user.username}")
            
            # Test correct password
            if verify_password("TestPass123!", db_user.hashed_password):
                success("Login with correct password successful")
            else:
                error("Login with correct password failed")
                return False
            
            # Test wrong password
            if verify_password("WrongPass123!", db_user.hashed_password):
                error("Login with wrong password succeeded!")
                return False
            else:
                success("Login with wrong password rejected")
            
            # Generate access token
            token = create_access_token({"sub": str(db_user.id)})
            success(f"Access token generated")
            
            return True
            
    except Exception as e:
        error(f"User login test failed: {e}")
        return False


async def test_password_reset_flow(session_maker, user_id):
    """Test 6: Password Reset Flow"""
    test_header("Password Reset Flow")
    
    try:
        async with session_maker() as session:
            # Step 1: Request password reset
            info("Step 1: Request password reset token")
            
            reset_token = PasswordResetToken.create_for_user(
                user_id=user_id,
                expires_in_hours=1
            )
            session.add(reset_token)
            await session.commit()
            await session.refresh(reset_token)
            
            # tokens from secrets.token_urlsafe(32) are 43 chars long
            if reset_token.token and len(reset_token.token) > 20:
                success(f"Reset token created: {reset_token.token[:20]}... (length: {len(reset_token.token)})")
            else:
                error(f"Reset token creation failed - token: {reset_token.token if reset_token.token else 'None'}")
                return False
            
            # Step 2: Verify token is valid
            info("Step 2: Verify token is valid")
            
            if reset_token.is_valid():
                success("Token is valid")
            else:
                error("Token is not valid")
                return False
            
            # Step 3: Find user by token
            info("Step 3: Find token in database")
            
            result = await session.execute(
                select(PasswordResetToken).where(
                    PasswordResetToken.token == reset_token.token
                )
            )
            db_token = result.scalar_one_or_none()
            
            if db_token:
                success("Token found in database")
            else:
                error("Token not found in database")
                return False
            
            # Step 4: Reset password
            info("Step 4: Reset password")
            
            new_password = "NewPassword123!"
            result = await session.execute(
                select(User).where(User.id == reset_token.user_id)
            )
            user_to_update = result.scalar_one_or_none()
            
            if not user_to_update:
                error("User not found")
                return False
            
            old_hash = user_to_update.hashed_password
            user_to_update.hashed_password = get_password_hash(new_password)
            reset_token.mark_as_used()
            
            await session.commit()
            success("Password updated in database")
            
            # Step 5: Verify old password doesn't work
            info("Step 5: Verify old password doesn't work")
            
            if not verify_password("TestPass123!", user_to_update.hashed_password):
                success("Old password no longer works")
            else:
                error("Old password still works!")
                return False
            
            # Step 6: Verify new password works
            info("Step 6: Verify new password works")
            
            if verify_password(new_password, user_to_update.hashed_password):
                success("New password works")
            else:
                error("New password doesn't work")
                return False
            
            # Step 7: Verify token is used
            info("Step 7: Verify token is marked as used")
            
            if not reset_token.is_valid():
                success("Token is no longer valid (marked as used)")
            else:
                error("Token is still valid after use!")
                return False
            
            # Step 8: Try to use token again
            info("Step 8: Try to use token again (should fail)")
            
            if not reset_token.is_valid():
                success("Used token correctly rejected")
            else:
                error("Used token accepted!")
                return False
            
            return True
            
    except Exception as e:
        error(f"Password reset flow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_admin_user_creation(session_maker):
    """Test 7: Admin User Creation"""
    test_header("Admin User Creation")
    
    try:
        async with session_maker() as session:
            admin = User(
                username="admin",
                email="admin@example.com",
                full_name="Admin User",
                hashed_password=get_password_hash("AdminPass123!"),
                is_superuser=True,
                is_active=True
            )
            
            session.add(admin)
            await session.commit()
            await session.refresh(admin)
            
            if admin.id and admin.is_superuser:
                success(f"Admin user created with ID: {admin.id}")
            else:
                error("Admin user creation failed")
                return False
            
            # Verify admin role
            if admin.is_superuser:
                success("Superuser flag correctly set")
            else:
                error(f"Superuser flag incorrect: {admin.is_superuser}")
                return False
            
            return True
            
    except Exception as e:
        error(f"Admin user creation test failed: {e}")
        return False


async def test_database_relationships(session_maker):
    """Test 8: Database Relationships"""
    test_header("Database Relationships")
    
    try:
        async with session_maker() as session:
            # Get user with reset tokens
            result = await session.execute(
                select(User).where(User.username == "testuser")
            )
            user = result.scalar_one_or_none()
            
            if not user:
                error("User not found")
                return False
            
            # Get user's password reset tokens
            result = await session.execute(
                select(PasswordResetToken).where(
                    PasswordResetToken.user_id == user.id
                )
            )
            tokens = result.scalars().all()
            
            if tokens:
                success(f"Found {len(tokens)} password reset token(s) for user")
            else:
                warning("No password reset tokens found (expected after test 6)")
            
            return True
            
    except Exception as e:
        error(f"Database relationships test failed: {e}")
        return False


async def main():
    """Run all tests"""
    print("\n" + "="*70)
    print(f"{Colors.BLUE}🧪 ARIA Complete Flow Testing{Colors.RESET}")
    print(f"{Colors.BLUE}Testing Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.RESET}")
    print("="*70 + "\n")
    
    results = {}
    
    # Test 1: Database Setup
    success_db, engine, session_maker = await test_database_setup()
    results['Database Setup'] = success_db
    
    if not success_db:
        error("Cannot continue without database")
        return False
    
    # Test 2: Password Security
    results['Password Security'] = await test_password_security()
    
    # Test 3: JWT Tokens
    results['JWT Tokens'] = await test_jwt_tokens()
    
    # Test 4: User Registration
    success_reg, user_id = await test_user_registration(session_maker)
    results['User Registration'] = success_reg
    
    if not success_reg:
        error("Cannot continue without user")
        return False
    
    # Test 5: User Login
    results['User Login'] = await test_user_login(session_maker, user_id)
    
    # Test 6: Password Reset Flow
    results['Password Reset Flow'] = await test_password_reset_flow(session_maker, user_id)
    
    # Test 7: Admin User Creation
    results['Admin User'] = await test_admin_user_creation(session_maker)
    
    # Test 8: Database Relationships
    results['Database Relationships'] = await test_database_relationships(session_maker)
    
    # Cleanup
    await engine.dispose()
    
    # Summary
    print("\n" + "="*70)
    print(f"{Colors.BLUE}📊 Test Results Summary{Colors.RESET}")
    print("="*70 + "\n")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}PASSED{Colors.RESET}" if result else f"{Colors.RED}FAILED{Colors.RESET}"
        print(f"  {test_name:.<50} {status}")
    
    print("\n" + "="*70)
    print(f"Total Tests: {total}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.RESET}")
    if failed > 0:
        print(f"{Colors.RED}Failed: {failed}{Colors.RESET}")
    print("="*70 + "\n")
    
    if failed == 0:
        success("🎉 All tests passed!")
        return True
    else:
        error(f"❌ {failed} test(s) failed")
        return False


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
