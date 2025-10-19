import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Forward the login request to the backend
    const response = await axios.post('http://localhost:12000/api/auth/login', req.body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { message: 'Login failed' }
    );
  }
}
