const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('https://web-production-1e55a.up.railway.app/api/v1/auth/login', {
      email: 'nedpearson@gmail.com',
      password: '1Pearson2'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.status, err.response?.data);
  }
}

testLogin();
