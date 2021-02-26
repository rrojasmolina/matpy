'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAll = document.querySelector('.btn__remove-all');
const warning = document.querySelector('.warning');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    // prettier-ignore
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //minutes per km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];
  constructor() {
    //gets user position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    //attach event handlers

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    deleteAll.addEventListener('click', this._deleteAll.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }
  _loadMap(position) {
    //console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    //console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //This creates an event listener on the object map, not with standard javascript but with Leaflet. The callback function is triggered when the user clicks on the map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    //Empty inputs
    inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _getDataFromForm() {
    let data;
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      data = {
        type: type,
        distance: distance,
        duration: duration,
        cadence: cadence,
      };
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      data = {
        type: type,
        distance: distance,
        duration: duration,
        elevation: elevation,
      };
    }
    return data;
  }

  _newWorkout(e) {
    if (!this.#mapEvent) return;
    e.preventDefault();
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    //get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //check if data is valid

    // if workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        warning.style.opacity = 1;
        //warning.classList.add('animate__fadeOut');
        return;
      } else {
        workout = new Running([lat, lng], distance, duration, cadence);
        //warning.classList.add('animate__fadeOut');
        warning.style.opacity = 0;
      }
    }

    //if workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        warning.style.opacity = 1;
        //warning.classList.add('animate__fadeOut');
        return;
      } else {
        workout = new Cycling([lat, lng], distance, duration, elevation);
        warning.style.opacity = 0;

        //warning.classList.remove('animate__fadeOut');
      }
    }

    //add new object to workout array
    this.#workouts.push(workout);
    //console.log(this.#workouts);

    //render workout on map as marker
    this._renderWorkoutMarker(workout);

    //render workout on list
    this._renderWorkout(workout);

    //Hide form + Clear input fields
    this._hideForm();

    //set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords);
    marker.id = workout.id;
    this.#map.addLayer(marker);
    marker
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚵‍♀️'}${workout.description}`
      )
      .openPopup();
    this.#markers.push(marker);
  }

  _renderWorkout(workout) {
    let html = `
  <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? `🏃‍♂️` : `🚵‍♀️`
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
    <div class="buttons">
      <a href="#" class="btn btn-edit"><ion-icon name="create-outline"></ion-icon></a>
      <a href="#" class="btn btn-delete"><ion-icon name="close-circle-outline"></ion-icon></a>
      <p class='warning form__row--hidden'>Cuidado</p>
    </div>
  </li>`;
    }
    if (workout.type === 'cycling') {
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
    <div class="buttons">
      <a href="#" class="btn btn-edit"><ion-icon name="create-outline"></ion-icon></a>
      <a href="#" class="btn btn-delete"><ion-icon name="close-circle-outline"></ion-icon></a>
      <p class='warning form__row--hidden'>Cuidado</p>
    </div>
  </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
    //use public interface
    //workout.click();
    if (e.target.name === 'close-circle-outline') {
      //console.log(e.target.name);
      //console.log('deleting');
      const deleteWork = window.confirm(
        'Are you sure you want to delete this workout?'
      );
      if (!deleteWork) return;
      else {
        workoutEl.classList.add('form__row--hidden');
        this.#map.removeLayer(this.#markers[this.#workouts.indexOf(workout)]);
        this.#workouts.splice(this.#workouts.indexOf(workout), 1);
        this._setLocalStorage();
      }
    } else if (e.target.name === 'create-outline') {
      form.classList.remove('hidden');
      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;
      if (workout.type === 'running') inputCadence.value = workout.cadence;
      else inputElevation.value = workout.elevationGain;

      workoutEl.insertAdjacentElement('beforebegin', form);
      //form.removeEventListener('submit', this._newWorkout.bind(this));
      form.addEventListener('submit', this._editWorkout.bind(this));
    }
  }

  _editWorkout(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const workoutEl = e.target.nextElementSibling;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    const data = this._getDataFromForm();
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    if (data.type === 'running') {
      if (
        !validInputs(data.distance, data.duration, data.cadence) ||
        !allPositive(data.distance, data.duration, data.cadence)
      ) {
        form.insertAdjacentElement('beforebegin', warning);
        warning.classList.remove('form__row--hidden');
        warning.style.opacity = 1;
        return;
      } else warning.classList.add('form__row--hidden');
    }

    if (data.type === 'cycling') {
      if (
        !validInputs(data.distance, data.duration, data.elevation) ||
        !allPositive(data.distance, data.duration)
      ) {
        form.insertAdjacentElement('beforebegin', warning);
        warning.classList.remove('form__row--hidden');
        warning.style.opacity = 1;
        return;
      } else warning.classList.add('form__row--hidden');
    }

    if (data.type === 'running') {
      workout.distance = data.distance;
      workout.duration = data.duration;
      workout.cadence = data.cadence;
      workout.pace = data.duration / data.distance;
    }

    if (data.type === 'cycling') {
      workout.distance = data.distance;
      workout.duration = data.duration;
      workout.elevationGain = data.elevation;
      workout.speed = data.distance / data.duration;
    }
    workoutEl.style.display = 'none';
    workoutEl.classList.add('hidden');

    //console.log(workout);
    this._renderWorkout(workout);
    this._setLocalStorage();
    this._hideForm();
  }

  _deleteAll(e) {
    e.preventDefault();
    const deleteAll = window.confirm(
      'Are you sure you want to delete all workouts?'
    );
    console.log(deleteAll);
    if (!deleteAll) return;
    else {
      const workouts = document.querySelectorAll('.workouts');
      workouts.forEach(work => work.classList.add('form__row--hidden'));
      this.#markers.forEach(marker => this.#map.removeLayer(marker));
      this.reset();
    }
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
