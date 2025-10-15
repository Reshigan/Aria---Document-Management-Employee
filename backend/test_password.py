import bcrypt

# Hash from database
stored_hash = 'b2.6Rq'
password = 'admin'

# Test verification
result = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
print(f'Password verification result: {result}')

# Also test with different passwords
test_passwords = ['admin', 'Admin', 'admin123', 'password']
for pwd in test_passwords:
    result = bcrypt.checkpw(pwd.encode('utf-8'), stored_hash.encode('utf-8'))
    print(f'Password "{pwd}": {result}')
