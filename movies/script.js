class SearchInputHandler {
    constructor(input, label) {
        this.input = input;
        this.label = label;
        this.init();
    }

    init() {
        this.toggleLabel();
        this.input.addEventListener('input', () => this.toggleLabel());
    }

    toggleLabel() {
        const actions = {
            true: () => this._addStyles(),
            false: () => this._removeStyles()
        };
        
        actions[Boolean(this.input.value)]();
    }

    _addStyles() {
        this.input.classList.add('border-purple-600', 'border-b-2');
        this.label.classList.add('text-xs', '-top-5', 'text-purple-600');
    }

    _removeStyles() {
        this.input.classList.remove('border-purple-600', 'border-b-2');
        this.label.classList.remove('text-xs', '-top-5', 'text-purple-600');
    }
}

class LayoutHandler {
    constructor(title, inputContainer) {
        this.title = title;
        this.inputContainer = inputContainer;
        this.adjustInputWidth();
        window.addEventListener('resize', () => this.adjustInputWidth());
    }

    adjustInputWidth() {
        const titleWidth = this.title.offsetWidth;
        this.inputContainer.style.width = titleWidth + 'px';
    }
}

class SearchFilter {
    constructor(inputId) {
      this.searchInput = document.getElementById(inputId);
      this.init();
    }

    init() {
      this.searchInput.addEventListener('input', this.handleInput.bind(this));
    }

    handleInput() {
      const filter = this.getFilterValue();
      this.applyFilter('#data-desktop tr', '.name');
      this.applyFilter('.movie-mobile', '.movie-title');
    }

    getFilterValue() {
      return this.searchInput.value.toLowerCase();
    }
  
    applyFilter(itemSelector, textSelector) {
      const items = document.querySelectorAll(itemSelector);
      items.forEach(item => {
        const text = this.getTextContent(item, textSelector);
        this.toggleDisplay(item, text.includes(this.getFilterValue()));
      });
    }

    getTextContent(item, selector) {
      return item.querySelector(selector).textContent.toLowerCase();
    }

    toggleDisplay(item, shouldDisplay) {
      item.style.display = shouldDisplay ? '' : 'none';
    }
}

class MovieFetcher {
    constructor(url, intervalTime = 5000) {
        this.url = url;
        this.intervalTime = intervalTime;
        this.dataFetched = [];
        this.dataRemaining = [];
        this.intervalId = null;
        this.deletedMovies = [];
        this.restoreIntervalId = null;
        this.chartInstance = null;
    }

    async fetchData() {
        try {
            let response = await fetch(this.url);
            let data = await response.json();
            this.dataRemaining = [...data];
            this.intervalId = setInterval(() => this.fetchRandomData(), this.intervalTime);
        } catch (error) {
            console.error("Error al consultar la API:", error);
        }
    }

    async fetchRandomData() {
        this.dataRemaining.length > 0 && (() => {
            let randomIndex = Math.floor(Math.random() * this.dataRemaining.length);
            let movie = this.dataRemaining.splice(randomIndex, 1)[0];
        
            fetch(`${this.url}/${movie.id}`)
                .then(response => response.json())
                .then(movieData => {
                    this.dataFetched.push(movieData);
                    this.mostrarData();
                    this.dataRemaining.length === 0 && clearInterval(this.intervalId);
                })
                .catch(error => console.error("Error al consultar los detalles de la película:", error));
        })();
    }

    mostrarData() {
        let sortedData = this.sortByTitle(this.dataFetched);
        const body = sortedData.map(this.createCardHTML.bind(this)).join('');
        const body_d = sortedData.map(this.createTableRowHTML.bind(this)).join('');
        document.getElementById('data-mobile').innerHTML = body;
        document.getElementById('data-desktop').innerHTML = body_d;
        this.updateOrCreateChart();
    }

    sortByTitle(data) {
        return [...data].sort((a, b) => a.title.localeCompare(b.title));
    }

    updateOrCreateChart() {
        let totalNominations = 0;
        let totalWins = 0;
    
        this.dataFetched.forEach(movie => {
            const awardText = movie.awards;
            totalNominations += awardText.includes('Nominated') ? parseInt(awardText.match(/\d+/)[0]) : 0;
            totalWins += awardText.includes('Won') ? parseInt(awardText.match(/\d+/)[0]) : 0;
        });
    
        this.chartInstance
            ? (this.chartInstance.data.datasets[0].data = [totalNominations, totalWins], this.chartInstance.update())
            : (() => {
                const ctx = document.getElementById('myChart').getContext('2d');
                this.chartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Nominaciones', 'Premios Ganados'],
                        datasets: [{
                            label: 'Premios',
                            data: [totalNominations, totalWins],
                            backgroundColor: ['rgba(126, 0, 183, 0.5)', 'rgba(169, 0, 169, 0.5)'],
                            borderColor: ['rgba(74, 0, 187, 1)', 'rgba(187, 0, 187, 1)'],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            })();
    }
    
    deleteMovie(id) {
        const movie = this.dataFetched.find(movie => movie.id === id);
    
        movie && (
            this.dataFetched = this.dataFetched.filter(movie => movie.id !== id),
            this.deletedMovies.push(movie),
            this.mostrarData(),
            !this.restoreIntervalId && this.addMoviesBackRandomly()
        );
    }
    
    addMoviesBackRandomly() {
        this.restoreIntervalId = setInterval(() => {
            this.deletedMovies.length > 0
                ? (this.dataFetched.push(this.deletedMovies.shift()), this.mostrarData())
                : (clearInterval(this.restoreIntervalId), this.restoreIntervalId = null);
        }, 5000);
    }
    
    showMovieDetails(id) {
        const movie = this.dataFetched.find(movie => movie.id === id);
    
        movie && (() => {
            const genre = movie.genre ? movie.genre.join(', ') : 'No genres available';
            const actors = movie.actors ? movie.actors.join(', ') : 'No actors available';
    
            document.getElementById('content-movie').innerHTML = `
                <h1 class="font-bold py-3 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl text-center text-transparent bg-gradient-to-b bg-clip-text from-purple-500 to-purple-950">${movie.title}</h1>
                <p class="text-sm md:text-lg"><strong>Id:</strong> ${movie.id}</p>
                <p class="text-sm md:text-lg"><strong>Año:</strong> ${movie.year}</p>
                <p class="text-sm md:text-lg"><strong>Calificación:</strong> ${movie.rating}</p>
                <p class="text-sm md:text-lg"><strong>Director:</strong> ${movie.director}</p>
                <p class="text-sm md:text-lg"><strong>Actores:</strong> ${actors}</p>
                <p class="text-sm md:text-lg"><strong>Premios:</strong> ${movie.awards}</p>
                <p class="text-sm md:text-lg"><strong>Descripción:</strong> ${movie.plot}</p>
                <p class="text-sm md:text-lg"><strong>Trailer:</strong> ${movie.trailer}</p>
                <p class="text-sm md:text-lg"><strong>Duración:</strong> ${movie.runtime} mins</p>
                <p class="text-sm md:text-lg"><strong>Géneros:</strong> ${genre}</p>
                <p class="text-sm md:text-lg"><strong>País:</strong> ${movie.country}</p>
                <p class="text-sm md:text-lg"><strong>Idioma:</strong> ${movie.language}</p>
                <p class="text-sm md:text-lg"><strong>Recaudación en taquilla:</strong> ${movie.boxOffice}</p>
                <p class="text-sm md:text-lg"><strong>Productor:</strong> ${movie.production}</p>
                <p class="text-sm md:text-lg"><strong>Página:</strong> <a href="${movie.website}">Visitar</a></p>
                <p class="text-sm md:text-lg"><strong>Poster:</strong></p>
                <div class="flex justify-start items-center flex-col">
                    <img src="${movie.poster}" alt="poster">
                </div>`;
    
            const modal = document.getElementById('my_modal_3');
            const backdrop = document.getElementById('backdrop');
    
            modal.classList.remove('opacity-0', 'pointer-events-none', 'scale-90');
            modal.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');
    
            backdrop.classList.remove('opacity-0', 'pointer-events-none');
            backdrop.classList.add('opacity-50', 'pointer-events-auto');
        })();
    }

    closeMovieDetails() {
        const modal = document.getElementById('my_modal_3');
        const backdrop = document.getElementById('backdrop');
    
        modal.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
        modal.classList.add('opacity-0', 'pointer-events-none', 'scale-90');
    
        backdrop.classList.remove('opacity-50', 'pointer-events-auto');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
    }

    createCardHTML(item) {
        return `<div class="bg-white space-y-3 p-4 rounded-lg shadow movie-mobile">
                    <div><a href="#" class="text-purple-600 font-bold hover:underline text-sm">${item.id}</a></div>
                    <div class="text-sm text-gray-700 movie-title">${item.title}</div>
                    <div class="text-sm font-medium text-black">${item.awards}</div>
                    <div class="inline-flex space-x-3">
                        <div class="group">
                            <button id="data-id-${item.id}" onclick="movieFetcher.showMovieDetails(${item.id})" class="btn p-2 bg-slate-300 rounded-full inline-block group-hover:bg-purple-600 transition duration-200">
                                <svg class="text-black size-5 group-hover:text-white transition duration-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                            </button>
                        </div>
                        <div class="group">
                            <button id="delete-id-${item.id}" onclick="movieFetcher.deleteMovie(${item.id})" class="p-2 bg-slate-300 rounded-full inline-block group-hover:bg-purple-600 transition duration-200">
                                <svg class="text-black size-5 group-hover:text-white transition duration-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>`;
    }

    createTableRowHTML(item) {
        return `<tr class="bg-white">
                    <td class="p-3 text-lg text-black whitespace-nowrap">
                        <a href="#" class="font-bold text-purple-600 hover:underline">${item.id}</a>
                    </td>
                    <td class="p-3 text-lg text-black whitespace-nowrap name">${item.title}</td>
                    <td class="p-3 text-lg text-black whitespace-nowrap">${item.awards}</td>
                    <td class="p-3 whitespace-nowrap">
                        <div class="inline-flex space-x-3">
                            <div class="group">
                                <button id="data-id-${item.id}" onclick="movieFetcher.showMovieDetails(${item.id})" class="btn p-3 bg-slate-300 rounded-full inline-block group-hover:bg-purple-600 transition duration-200">
                                    <svg class="text-black size-6 group-hover:text-white transition duration-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    </svg>
                                </button>
                            </div>
                            <div class="group">
                                <button id="delete-id-${item.id}" onclick="movieFetcher.deleteMovie(${item.id})" class="p-3 bg-slate-300 rounded-full inline-block group-hover:bg-purple-600 transition duration-200">
                                    <svg class="text-black size-6 group-hover:text-white transition duration-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>`;
            }
}

function initialize() {
    const input = document.getElementById('search');
    const label = document.getElementById('search-label');
    const title = document.getElementById('title');
    const inputContainer = document.getElementById('input-container');
    const inputHandler = new SearchInputHandler(input, label);
    const layoutHandler = new LayoutHandler(title, inputContainer);
}

window.addEventListener('DOMContentLoaded', initialize);
const searchFilter = new SearchFilter('search');
const movieFetcher = new MovieFetcher('https://freetestapi.com/api/v1/movies');
movieFetcher.fetchData();
document.getElementById('close_modal').addEventListener('click', () => {
    movieFetcher.closeMovieDetails();
});