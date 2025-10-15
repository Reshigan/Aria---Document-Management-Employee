import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Forward the request to the backend with the Authorization header
    const response = await axios.get('/api/auth/me', {
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Auth me error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { message: 'Authentication failed' }
    );
  }
}
