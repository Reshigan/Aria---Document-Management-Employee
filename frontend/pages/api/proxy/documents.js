export default async function handler(req, res) {
  if (!['GET', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    let backendUrl = 'http://localhost:8000/api/documents';
    
    // Handle DELETE requests with document ID
    if (req.method === 'DELETE') {
      const { query } = req;
      if (query.id) {
        backendUrl = `http://localhost:8000/api/documents/${query.id}`;
      } else {
        return res.status(400).json({ message: 'Document ID required for delete' });
      }
    }

    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Documents proxy error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}