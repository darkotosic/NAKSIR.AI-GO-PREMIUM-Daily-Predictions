import { useEffect, useState } from 'react';
import { getJson, setJson } from '@lib/storage';

const FAVORITES_KEY = 'favorite-fixtures';

type FavoriteId = number | string;

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteId[]>([]);

  useEffect(() => {
    getJson<FavoriteId[]>(FAVORITES_KEY, []).then(setFavorites);
  }, []);

  const toggleFavorite = async (fixtureId: FavoriteId) => {
    const exists = favorites.includes(fixtureId);
    const nextFavorites = exists
      ? favorites.filter((id) => id !== fixtureId)
      : [...favorites, fixtureId];
    setFavorites(nextFavorites);
    await setJson(FAVORITES_KEY, nextFavorites);
  };

  const isFavorite = (fixtureId?: FavoriteId) =>
    fixtureId != null && favorites.includes(fixtureId);

  return { favorites, toggleFavorite, isFavorite };
};
