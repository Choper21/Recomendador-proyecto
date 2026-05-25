import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000';

// Función auxiliar para incluir el token en headers
const authHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});
export const registerUser = async (username, password) => {
  const res = await axios.post(`${BASE_URL}/register`, {
    username,
    password
  });
  return res.data;
};

export const loginUser = async (username, password) => {
  const res = await axios.post(`${BASE_URL}/login`, {
    username,
    password
  });
  return res.data.access_token; // El backend devuelve { access_token, token_type }
};
export const obtenerRecomendaciones = async (nombreJugador, token, topN = 5) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/api/recomendar`,
      { nombre_jugador: nombreJugador, top_n: topN },
      authHeaders(token)
    );
    return res.data.data; // array de recomendaciones
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Sesión expirada. Inicia sesión de nuevo.');
    }
    throw new Error(error.response?.data?.detail || 'Error al obtener recomendaciones');
  }
};

export const obtenerTendencias = async (token, topN = 10) => {
  try {
    const res = await axios.get(`${BASE_URL}/api/trending`, {
      ...authHeaders(token),
      params: { top_n: topN }
    });
    return res.data.trending; // array de {nombre, equipo, posicion, apariciones}
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Sesión expirada.');
    }
    throw new Error('No se pudieron cargar las tendencias');
  }
};
export const obtenerParati = async (token) => {
  try {
    const res = await axios.get(`${BASE_URL}/api/parati`, {
      ...authHeaders(token)
    });
    return res.data.parati;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Sesión expirada.');
    }
    throw new Error('No se pudieron cargar las recomendaciones para ti');
  }
};

export const savePlayer = async (playerName, token) => {
  const res = await axios.post(
    `${BASE_URL}/api/save-player`,
    { player_name: playerName },
    authHeaders(token)
  );
  return res.data;
};

export const unsavePlayer = async (playerName, token) => {
  const res = await axios.delete(
    `${BASE_URL}/api/save-player`,
    {
      ...authHeaders(token),
      data: { player_name: playerName }
    }
  );
  return res.data;
};

export const getSavedPlayers = async (token) => {
  const res = await axios.get(`${BASE_URL}/api/saved-players`, authHeaders(token));
  return res.data.saved;
};

export const getSavedRecommendations = async (token) => {
  const res = await axios.get(`${BASE_URL}/api/saved-recommendations`, authHeaders(token));
  return res.data.recommendations;
};