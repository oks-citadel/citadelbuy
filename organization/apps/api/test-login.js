const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login with admin@citadelbuy.com...');

    const response = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'admin@citadelbuy.com',
      password: 'password123'
    });

    console.log('✅ Login successful!');
    console.log('User:', response.data.user);
    console.log('Token received:', response.data.access_token ? 'Yes' : 'No');

  } catch (error) {
    console.log('❌ Login failed!');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
  }
}

testLogin();
