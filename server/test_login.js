const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('https://windowworld.bridgebox.ai/api/v1/auth/login', { email: 'admin@windowworldla.com', password: 'Demo@1234' });
    const token = res.data.data.tokens.accessToken;
    try {
      await axios.get('https://windowworld.bridgebox.ai/api/v1/notifications', { headers: { Authorization: `Bearer ${token}` }, params: { limit: 30 } });
      console.log('notifications: OK');
    } catch (e) {
      console.log('notifications: ERROR ' + e.response?.status);
    }
  } catch (e) {
    console.error('Login Error:', e.response?.status);
  }
}
test();
