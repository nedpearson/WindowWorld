const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/v1/auth/login', { email: 'admin@windowworldla.com', password: 'Demo@1234' });
    const token = res.data.data.tokens.accessToken;
    const dash = await axios.get('http://localhost:3001/api/v1/analytics/dashboard', { headers: { Authorization: `Bearer ${token}` } });
    console.log(JSON.stringify(dash.data, null, 2));
  } catch (e) {
    console.error('Dash Error:', e.response?.status, e.response?.data);
  }
}
test();
