import sys

# Read the file
with open('final_backend.py', 'r') as f:
    lines = f.readlines()

# Find the line with @app.post('/api/documents/upload')
insert_index = -1
for i, line in enumerate(lines):
    if "@app.post('/api/documents/upload')" in line:
        insert_index = i
        break

if insert_index == -1:
    print("Could not find upload endpoint")
    sys.exit(1)

# Insert the new endpoint before the upload endpoint
new_endpoint = '''
@app.get('/api/documents/{document_id}')
async def get_document(document_id: int, current_user: dict = Depends(get_current_user)):
    document = next((doc for doc in MOCK_DOCUMENTS if doc['id'] == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail='Document not found')
    return document

'''

lines.insert(insert_index, new_endpoint)

# Write back to file
with open('final_backend.py', 'w') as f:
    f.writelines(lines)

print("Added document endpoint successfully")
