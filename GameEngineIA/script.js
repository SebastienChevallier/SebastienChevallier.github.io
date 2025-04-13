const apiUrl = "https://iagameengine.onrender.com/generate";

async function sendPrompt() {
    const prompt = document.getElementById('prompt').value;
    const responseDiv = document.getElementById('response');
    const loader = document.getElementById('loader');

    responseDiv.innerText = "";
    loader.classList.remove('hidden');

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            throw new Error('Erreur API : ' + response.status);
        }

        const data = await response.json();
        responseDiv.innerText = data.response;

    } catch (error) {
        console.error('Erreur lors de la requête :', error);
        responseDiv.innerText = "Erreur : " + error;
    } finally {
        loader.classList.add('hidden');
    }
}