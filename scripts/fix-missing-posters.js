const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/dataset_principal.json', 'utf8'));
const movies = data.peliculas;
let fixed = 0;
for (const m of movies) {
  if (!m.poster) {
    m.poster = 'images/posters/placeholder.svg';
    m.poster_attribution = {
      autor: 'MovieSearch',
      fuente: 'Diseño original',
      licencia: 'Original (MovieSearch)',
      archivo: 'placeholder.svg',
    };
    fixed++;
  }
}
fs.writeFileSync('data/dataset_principal.json', JSON.stringify(data, null, 2), 'utf8');
console.log('Películas corregidas:', fixed);
