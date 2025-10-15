from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title='ARIA Backend', version='1.0.0')

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/')
async def root():
    return {'message': 'ARIA Backend is running!', 'status': 'healthy'}

@app.get('/health')
async def health():
    return {'status': 'healthy', 'service': 'ARIA Backend'}

@app.get('/api/health')
async def api_health():
    return {'status': 'healthy', 'service': 'ARIA API'}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
