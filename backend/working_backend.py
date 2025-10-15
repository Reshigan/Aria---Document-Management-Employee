from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

class LoginRequest(BaseModel):
    email: str
    password: str

@app.get('/api/health')
async def health():
    return {'status': 'healthy', 'service': 'ARIA API', 'environment': 'production'}

@app.post('/api/auth/login')
async def login(login_data: LoginRequest):
    if (login_data.email == 'admin' and login_data.password == 'admin123') or        (login_data.email == 'admin@aria.com' and login_data.password == 'admin123'):
        return {
            'access_token': 'mock_token_admin',
            'token_type': 'bearer',
            'user': {'id': 1, 'email': 'admin@aria.com', 'name': 'Admin User', 'role': 'admin'}
        }
    elif (login_data.email == 'user@aria.com' and login_data.password == 'user123'):
        return {
            'access_token': 'mock_token_user',
            'token_type': 'bearer',
            'user': {'id': 2, 'email': 'user@aria.com', 'name': 'Regular User', 'role': 'user'}
        }
    else:
        raise HTTPException(status_code=401, detail='Invalid email or password')

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
