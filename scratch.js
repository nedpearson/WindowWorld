

async function test() {
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@windowworld.com', password: 'demo123' })
  });
  const { token, user } = await loginRes.json();
  console.log('Login returned user:', user);
  
  const meRes = await fetch('http://localhost:3001/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Me returned user:', await meRes.json());
  const apptRes = await fetch('http://localhost:3001/api/appointments', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      customerId: 'invalid-cust',
      userId: 'invalid-user',
      jobAddress: '',
      appointmentDate: new Date().toISOString(),
      projectType: 'replacement'
    })
  });
  console.log('Appointment response:', apptRes.status, await apptRes.json());
}
test();
