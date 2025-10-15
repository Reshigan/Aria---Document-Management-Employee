import sqlite3
import bcrypt

# Connect to database
conn = sqlite3.connect('aria.db')
cursor = conn.cursor()

# Hash the password 'admin'
password = 'admin'
salt = bcrypt.gensalt()
hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)

# Update the admin user
cursor.execute(
    "UPDATE users SET hashed_password = ? WHERE email = ?",
    (hashed_password.decode('utf-8'), 'admin@aria.com')
)

conn.commit()
conn.close()

print('Admin password reset to "admin"')
print(f'New hash: {hashed_password.decode("utf-8")}')

# Test the new hash
result = bcrypt.checkpw(password.encode('utf-8'), hashed_password)
print(f'Verification test: {result}')
