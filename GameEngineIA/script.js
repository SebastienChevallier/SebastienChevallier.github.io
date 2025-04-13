async function sendPrompt() {
  const prompt = document.getElementById('prompt').value;
    const response = await fetch('https://iagameengine.onrender.com/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt })
  });
  const data = await response.json();
  document.getElementById('response').innerText = data.response;
}