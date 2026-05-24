const apiKey = "AIzaSyDZdKwpXwMJdSaArfXY1kDNRC7xm9lUhG8";
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
