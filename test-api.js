async function testAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/categories');
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Data:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

testAPI();