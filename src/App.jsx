import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [mediaType, setMediaType] = useState('movie');
  const [darkMode, setDarkMode] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const iframeRef = useRef(null);
  const [totalSeasons, setTotalSeasons] = useState(1);
  const [episodesPerSeason, setEpisodesPerSeason] = useState({ 1: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentSection, setCurrentSection] = useState('popular');
  const [currentVideoSource, setCurrentVideoSource] = useState(0);
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  
  // Enhanced states
  const [favorites, setFavorites] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [autoplayNext, setAutoplayNext] = useState(false);
  const [showMediaInfo, setShowMediaInfo] = useState(true);
  const [relatedContent, setRelatedContent] = useState([]);
  const [seasonsData, setSeasonsData] = useState({});
  const [showFavoritesPage, setShowFavoritesPage] = useState(false);
  const [showWatchlistPage, setShowWatchlistPage] = useState(false);
  const [showHistoryPage, setShowHistoryPage] = useState(false);
  const [showWatchlistInPlayer, setShowWatchlistInPlayer] = useState(false);
  
  // NEW: Genre states
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showGenreSection, setShowGenreSection] = useState(false);

  const API_KEY = 'af1402e7fece77024ef7feb43b1f8470';
  
  const VIDEO_SOURCES = useMemo(() => [
    {
      name: 'Vidfast Pro',
      movie: 'https://vidfast.pro/movie/',
      tv: 'https://vidfast.pro/tv/',
      anime: 'https://9anime.org.lv/'
    },
    {
      name: 'VidLink Pro',
      movie: 'https://vidlink.pro/movie/',
      tv: 'https://vidlink.pro/tv/',
      anime: 'https://all-wish.me/'
    },
    {
      name: 'videasy',
      movie: 'https://player.videasy.net/movie/',
      tv: 'https://player.videasy.net/tv/',
      anime: 'https://player.videasy.net/anime/'
    },
    {
      name: 'VidSrc V2',
      movie: 'https://vidsrc.cc/v2/embed/movie/',
      tv: 'https://vidsrc.cc/v2/embed/tv/',
      anime: 'https://vidsrc.cc/v2/embed/tv/'
    },
    {
      name: 'VidSrc V3',
      movie: 'https://vidsrc.cc/v3/embed/movie/',
      tv: 'https://vidsrc.cc/v3/embed/tv/',
      anime: 'https://vidsrc.cc/v3/embed/anime/'
    },
    {
      name: 'VidSrc icu',
      movie: 'https://vidsrc.icu/embed/movie/',
      tv: 'https://vidsrc.icu/embed/tv/',
      anime: 'https://vidsrc.icu/embed/anime/'
    },
    {
      name: '111movies.com',
      movie: 'https://111movies.com/movie/',
      tv: 'https://111movies.com/tv/',
      anime: 'https://111movies.com/anime/',
    },
  ], []);

  const API_SOURCES = useMemo(() => ({
    tmdb: {
      baseUrl: 'https://api.themoviedb.org/3',
      apiKey: API_KEY,
    },
    anime: {
      baseUrl: 'https://api.jikan.moe/v4',
      consumetUrl: 'https://api.consumet.org/anime/gogoanime',
      anilistUrl: 'https://api.consumet.org/anime/anilist'
    },
  }), [API_KEY]);

  // OPTIMIZED: Memoized filtered data
  const filteredFavorites = useMemo(() => 
    favorites.filter(item => item.mediaType === mediaType), 
    [favorites, mediaType]
  );

  const filteredWatchlist = useMemo(() => 
    watchlist.filter(item => item.mediaType === mediaType), 
    [watchlist, mediaType]
  );

  const filteredHistory = useMemo(() => 
    watchHistory.filter(item => item.mediaType === mediaType), 
    [watchHistory, mediaType]
  );

  // ENHANCED: Load all state from localStorage on initial render
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        const savedState = localStorage.getItem('manasHub_completeState');
        const savedDarkMode = localStorage.getItem('manasHub_darkMode');
        
        if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
        
        if (savedState) {
          const state = JSON.parse(savedState);
          
          // Restore main app state
          setMediaType(state.mediaType || 'movie');
          setCurrentSection(state.currentSection || 'popular');
          setCurrentPage(state.currentPage || 1);
          setSearchTerm(state.searchTerm || '');
          setShowFavoritesPage(state.showFavoritesPage || false);
          setShowWatchlistPage(state.showWatchlistPage || false);
          setShowHistoryPage(state.showHistoryPage || false);
          setShowGenreSection(state.showGenreSection || false);
          setSelectedGenre(state.selectedGenre || null);
          
          // Restore user data
          setFavorites(state.favorites || []);
          setWatchlist(state.watchlist || []);
          setWatchHistory(state.watchHistory || []);
          setAutoplayNext(state.autoplayNext || false);
          
          // Restore player state if watching something
          if (state.selectedItem) {
            setSelectedItem(state.selectedItem);
            setSelectedSeason(state.selectedSeason || 1);
            setSelectedEpisode(state.selectedEpisode || 1);
            setCurrentVideoSource(state.currentVideoSource || 0);
            setTotalSeasons(state.totalSeasons || 1);
            setEpisodesPerSeason(state.episodesPerSeason || { 1: 1 });
            setSeasonsData(state.seasonsData || {});
            setShowMediaInfo(state.showMediaInfo !== undefined ? state.showMediaInfo : true);
          }
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    };

    loadPersistedState();
  }, []);

  // OPTIMIZED: Debounced save function
  const saveCompleteState = useCallback(() => {
    try {
      const completeState = {
        mediaType,
        currentSection,
        currentPage,
        searchTerm,
        showFavoritesPage,
        showWatchlistPage,
        showHistoryPage,
        showGenreSection,
        selectedGenre,
        favorites,
        watchlist,
        watchHistory,
        autoplayNext,
        selectedItem,
        selectedSeason,
        selectedEpisode,
        currentVideoSource,
        totalSeasons,
        episodesPerSeason,
        seasonsData,
        showMediaInfo
      };
      localStorage.setItem('manasHub_completeState', JSON.stringify(completeState));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [
    mediaType, currentSection, currentPage, searchTerm, showFavoritesPage, showWatchlistPage, 
    showHistoryPage, showGenreSection, selectedGenre, favorites, watchlist, watchHistory, 
    autoplayNext, selectedItem, selectedSeason, selectedEpisode, currentVideoSource, 
    totalSeasons, episodesPerSeason, seasonsData, showMediaInfo
  ]);

  // OPTIMIZED: Longer debounce for better performance
  useEffect(() => {
    const timer = setTimeout(saveCompleteState, 1000);
    return () => clearTimeout(timer);
  }, [saveCompleteState]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('manasHub_darkMode', JSON.stringify(darkMode)), 500);
    return () => clearTimeout(timer);
  }, [darkMode]);

  // OPTIMIZED: Memoized fetch functions
  const fetchGenres = useCallback(async (type = mediaType) => {
    try {
      if (type === 'anime') {
        const animeGenres = [
          { id: 1, name: 'Action' },
          { id: 2, name: 'Adventure' },
          { id: 4, name: 'Comedy' },
          { id: 8, name: 'Drama' },
          { id: 10, name: 'Fantasy' },
          { id: 14, name: 'Horror' },
          { id: 22, name: 'Romance' },
          { id: 24, name: 'Sci-Fi' },
          { id: 36, name: 'Slice of Life' },
          { id: 37, name: 'Supernatural' },
          { id: 41, name: 'Thriller' }
        ];
        setGenres(animeGenres);
      } else {
        const endpoint = type === 'movie' ? 'genre/movie/list' : 'genre/tv/list';
        const res = await axios.get(`${API_SOURCES.tmdb.baseUrl}/${endpoint}`, {
          params: { api_key: API_KEY },
          timeout: 8000
        });
        setGenres(res.data.genres || []);
      }
    } catch (e) {
      console.error('Genre fetch error:', e);
      setGenres([]);
    }
  }, [API_SOURCES.tmdb.baseUrl, API_KEY]);

  // OPTIMIZED: Cached fetch functions
  const fetchByGenre = useCallback(async (genreId, type = mediaType, page = 1) => {
    try {
      if (type === 'anime') {
        const res = await axios.get(`${API_SOURCES.anime.baseUrl}/anime`, {
          params: { 
            genres: genreId, 
            limit: 20, 
            page,
            order_by: 'popularity',
            sort: 'desc'
          },
          timeout: 10000
        });
        return { results: res.data.data || [], totalPages: res.data.pagination?.last_visible_page || 1 };
      } else {
        const endpoint = type === 'movie' ? 'discover/movie' : 'discover/tv';
        const res = await axios.get(`${API_SOURCES.tmdb.baseUrl}/${endpoint}`, {
          params: { 
            api_key: API_KEY, 
            with_genres: genreId,
            page,
            sort_by: 'popularity.desc'
          },
          timeout: 10000
        });
        return { results: res.data.results || [], totalPages: res.data.total_pages || 1 };
      }
    } catch (e) {
      console.error('Genre content fetch error:', e);
      return { results: [], totalPages: 1 };
    }
  }, [API_SOURCES, API_KEY]);

  // OPTIMIZED: Memoized utility functions
  const getItemId = useCallback((item) => {
    return mediaType === 'anime' ? (item.mal_id || item.id) : item.id;
  }, [mediaType]);

  const isInFavorites = useCallback((item) => {
    if (!item) return false;
    const itemId = getItemId(item);
    return favorites.some(fav => {
      const favId = mediaType === 'anime' ? (fav.mal_id || fav.id) : fav.id;
      return favId === itemId && fav.mediaType === mediaType;
    });
  }, [favorites, getItemId, mediaType]);

  const isInWatchlist = useCallback((item) => {
    if (!item) return false;
    const itemId = getItemId(item);
    return watchlist.some(watch => {
      const watchId = mediaType === 'anime' ? (watch.mal_id || watch.id) : watch.id;
      return watchId === itemId && watch.mediaType === mediaType;
    });
  }, [watchlist, getItemId, mediaType]);

  // FIXED: Optimized toggle functions with proper event handling
  const toggleFavorite = useCallback((item, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (!item) return;
    
    const itemId = getItemId(item);
    const exists = favorites.find(fav => {
      const favId = mediaType === 'anime' ? (fav.mal_id || fav.id) : fav.id;
      return favId === itemId && fav.mediaType === mediaType;
    });

    if (exists) {
      setFavorites(prev => prev.filter(fav => {
        const favId = mediaType === 'anime' ? (fav.mal_id || fav.id) : fav.id;
        return !(favId === itemId && fav.mediaType === mediaType);
      }));
    } else {
      const favoriteItem = {
        ...item,
        mediaType,
        addedAt: new Date().toISOString()
      };
      setFavorites(prev => [favoriteItem, ...prev]);
    }
  }, [favorites, getItemId, mediaType]);

  const toggleWatchlist = useCallback((item, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (!item) return;
    
    const itemId = getItemId(item);
    const exists = watchlist.find(watch => {
      const watchId = mediaType === 'anime' ? (watch.mal_id || watch.id) : watch.id;
      return watchId === itemId && watch.mediaType === mediaType;
    });

    if (exists) {
      setWatchlist(prev => prev.filter(watch => {
        const watchId = mediaType === 'anime' ? (watch.mal_id || watch.id) : watch.id;
        return !(watchId === itemId && watch.mediaType === mediaType);
      }));
    } else {
      const watchlistItem = {
        ...item,
        mediaType,
        addedAt: new Date().toISOString(),
        progress: { season: selectedSeason, episode: selectedEpisode }
      };
      setWatchlist(prev => [watchlistItem, ...prev]);
    }
  }, [watchlist, getItemId, mediaType, selectedSeason, selectedEpisode]);

  const addToHistory = useCallback((item) => {
    if (!item) return;
    
    const itemId = getItemId(item);
    const historyItem = {
      ...item,
      mediaType,
      lastWatched: new Date().toISOString(),
      season: selectedSeason,
      episode: selectedEpisode
    };

    setWatchHistory(prev => {
      const existingIndex = prev.findIndex(hist => {
        const histId = hist.mediaType === 'anime' ? (hist.mal_id || hist.id) : hist.id;
        return histId === itemId && hist.mediaType === mediaType;
      });

      if (existingIndex >= 0) {
        const newHistory = [...prev];
        newHistory[existingIndex] = historyItem;
        return newHistory;
      }
      return [historyItem, ...prev.slice(0, 49)];
    });
  }, [getItemId, mediaType, selectedSeason, selectedEpisode]);

  // OPTIMIZED: Cached API functions
  const fetchTrending = useCallback(async (type = mediaType, page = 1) => {
    try {
      if (type === 'anime') {
        const res = await axios.get(`${API_SOURCES.anime.baseUrl}/top/anime`, {
          params: { filter: 'airing', limit: 20, page },
          timeout: 10000
        });
        return { results: res.data.data || [], totalPages: res.data.pagination?.last_visible_page || 1 };
      } else {
        const endpoint = type === 'movie' ? 'trending/movie/week' : 'trending/tv/week';
        const res = await axios.get(`${API_SOURCES.tmdb.baseUrl}/${endpoint}`, {
          params: { api_key: API_KEY, page },
          timeout: 10000
        });
        return { results: res.data.results || [], totalPages: res.data.total_pages || 1 };
      }
    } catch (e) {
      console.error('Trending fetch error:', e);
      return { results: [], totalPages: 1 };
    }
  }, [API_SOURCES, API_KEY]);

  const fetchPopular = useCallback(async (type = mediaType, page = 1) => {
    try {
      if (type === 'anime') {
        try {
          const res = await axios.get(`${API_SOURCES.anime.baseUrl}/top/anime`, {
            params: { limit: 20, page },
            timeout: 10000
          });
          return { results: res.data.data || [], totalPages: res.data.pagination?.last_visible_page || 1 };
        } catch {
          const res = await axios.get(`${API_SOURCES.anime.baseUrl}/anime`, {
            params: { limit: 20, page, order_by: 'popularity', sort: 'desc' },
            timeout: 10000
          });
          return { results: res.data.data || [], totalPages: res.data.pagination?.last_visible_page || 1 };
        }
      } else {
        const endpoint = type === 'movie' ? 'movie/popular' : 'tv/popular';
        const res = await axios.get(`${API_SOURCES.tmdb.baseUrl}/${endpoint}`, {
          params: { api_key: API_KEY, language: 'en-US', page },
          timeout: 10000
        });
        return { results: res.data.results || [], totalPages: res.data.total_pages || 1 };
      }
    } catch (e) {
      console.error('Popular fetch error:', e);
      return { results: [], totalPages: 1 };
    }
  }, [API_SOURCES, API_KEY]);

  const fetchTopRated = useCallback(async (type = mediaType, page = 1) => {
    try {
      if (type === 'anime') {
        const res = await axios.get(`${API_SOURCES.anime.baseUrl}/top/anime`, {
          params: { filter: 'bypopularity', limit: 20, page },
          timeout: 10000
        });
        return { results: res.data.data || [], totalPages: res.data.pagination?.last_visible_page || 1 };
      } else {
        const endpoint = type === 'movie' ? 'movie/top_rated' : 'tv/top_rated';
        const res = await axios.get(`${API_SOURCES.tmdb.baseUrl}/${endpoint}`, {
          params: { api_key: API_KEY, page },
          timeout: 10000
        });
        return { results: res.data.results || [], totalPages: res.data.total_pages || 1 };
      }
    } catch (e) {
      console.error('Top rated fetch error:', e);
      return { results: [], totalPages: 1 };
    }
  }, [API_SOURCES, API_KEY]);

  // OPTIMIZED: Enhanced loadMedia with better caching
  const loadMedia = useCallback(async (type = mediaType, section = currentSection, page = 1) => {
    setLoading(true);
    try {
      let data;
      
      // Handle special sections with cached data
      if (section === 'favorites') {
        setMedia(filteredFavorites);
        setTotalPages(1);
        setLoading(false);
        return;
      }
      
      if (section === 'watchlist') {
        setMedia(filteredWatchlist);
        setTotalPages(1);
        setLoading(false);
        return;
      }
      
      if (section === 'history') {
        setMedia(filteredHistory);
        setTotalPages(1);
        setLoading(false);
        return;
      }

      // Handle genre browsing
      if (section === 'genres' && selectedGenre) {
        data = await fetchByGenre(selectedGenre.id, type, page);
        setMedia(data.results);
        setTotalPages(data.totalPages);
        setLoading(false);
        return;
      }
      
      switch (section) {
        case 'trending':
          data = await fetchTrending(type, page);
          break;
        case 'toprated':
          data = await fetchTopRated(type, page);
          break;
        default:
          data = await fetchPopular(type, page);
          break;
      }
      
      setMedia(data.results);
      setTotalPages(data.totalPages);
      
    } catch (e) {
      console.error('Load media error:', e);
      setMedia([]);
      setTotalPages(1);
    }
    setLoading(false);
  }, [
    mediaType, currentSection, selectedGenre, filteredFavorites, filteredWatchlist, 
    filteredHistory, fetchByGenre, fetchTrending, fetchTopRated, fetchPopular
  ]);

  const fetchRelatedContent = useCallback(async (item) => {
    try {
      if (mediaType === 'anime') {
        const res = await axios.get(`${API_SOURCES.anime.baseUrl}/anime/${item.mal_id}/recommendations`, {
          timeout: 8000
        });
        setRelatedContent((res.data.data || []).slice(0, 6));
      } else {
        const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
        const res = await axios.get(
          `${API_SOURCES.tmdb.baseUrl}/${endpoint}/${item.id}/recommendations`,
          { params: { api_key: API_KEY }, timeout: 8000 }
        );
        setRelatedContent((res.data.results || []).slice(0, 6));
      }
    } catch (e) {
      console.error('Related content fetch error:', e);
      setRelatedContent([]);
    }
  }, [API_SOURCES, API_KEY, mediaType]);

  const fetchDetailedSeasonData = useCallback(async (id) => {
    try {
      const res = await axios.get(`${API_SOURCES.tmdb.baseUrl}/tv/${id}`, {
        params: { api_key: API_KEY },
        timeout: 8000
      });
      const seasons = res.data.seasons || [];
      const seasonsInfo = {};
      
      const batchSize = 3;
      for (let i = 0; i < seasons.length; i += batchSize) {
        const batch = seasons.slice(i, i + batchSize);
        const promises = batch
          .filter(season => season.season_number > 0)
          .map(async (season) => {
            try {
              const seasonRes = await axios.get(
                `${API_SOURCES.tmdb.baseUrl}/tv/${id}/season/${season.season_number}`,
                { params: { api_key: API_KEY }, timeout: 8000 }
              );
              return { seasonNumber: season.season_number, data: seasonRes.data };
            } catch (e) {
              console.error(`Season ${season.season_number} fetch error:`, e);
              return null;
            }
          });
        
        const results = await Promise.all(promises);
        results.forEach(result => {
          if (result) {
            seasonsInfo[result.seasonNumber] = result.data;
          }
        });
      }
      
      setSeasonsData(seasonsInfo);
      return res.data.number_of_seasons || 1;
    } catch {
      return 1;
    }
  }, [API_SOURCES.tmdb.baseUrl, API_KEY]);

  const fetchEpisodesData = useCallback(async (id, seasonNum) => {
    try {
      const res = await axios.get(
        `${API_SOURCES.tmdb.baseUrl}/tv/${id}/season/${seasonNum}`,
        { params: { api_key: API_KEY }, timeout: 8000 }
      );
      return res.data.episodes.length || 1;
    } catch {
      return 1;
    }
  }, [API_SOURCES.tmdb.baseUrl, API_KEY]);

  const fetchAnimeEpisodesCount = useCallback(async (animeId) => {
    try {
      if (selectedItem?.episodes) return selectedItem.episodes;
      if (selectedItem?.totalEpisodes) return selectedItem.totalEpisodes;
      
      const res = await axios.get(`${API_SOURCES.anime.baseUrl}/anime/${animeId}`, {
        timeout: 8000
      });
      return res.data.data?.episodes || 12;
    } catch (err) {
      console.error('Anime episodes fetch failed:', err);
      return 12;
    }
  }, [API_SOURCES.anime.baseUrl, selectedItem]);

  // OPTIMIZED: Debounced search
  const searchMedia = useCallback(async (query, type = mediaType, page = 1) => {
    if (!query.trim()) {
      loadMedia(type, currentSection, page);
      return;
    }
    
    setLoading(true);
    try {
      if (type === 'anime') {
        const res = await axios.get(`${API_SOURCES.anime.baseUrl}/anime`, {
          params: { q: query, limit: 20, page },
          timeout: 10000
        });
        setMedia(res.data.data || []);
        setTotalPages(res.data.pagination?.last_visible_page || 1);
      } else {
        const ep = type === 'movie' ? 'movie' : 'tv';
        const res = await axios.get(
          `${API_SOURCES.tmdb.baseUrl}/search/${ep}`,
          { params: { api_key: API_KEY, query, page }, timeout: 10000 }
        );
        setMedia(res.data.results || []);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (e) {
      console.error('Search error:', e);
      setMedia([]);
    }
    setLoading(false);
  }, [API_SOURCES, API_KEY, loadMedia, currentSection]);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      iframeRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // OPTIMIZED: Handle section change with memoization
  const handleSectionChange = useCallback((section) => {
    setCurrentSection(section);
    setCurrentPage(1);
    setSearchTerm('');
    setShowFavoritesPage(section === 'favorites');
    setShowWatchlistPage(section === 'watchlist');
    setShowHistoryPage(section === 'history');
    setShowGenreSection(section === 'genres');
    
    if (section === 'genres') {
      fetchGenres(mediaType);
    }
    
    loadMedia(mediaType, section, 1);
  }, [fetchGenres, loadMedia, mediaType]);

  // OPTIMIZED: Handle media type change
  const handleMediaTypeChange = useCallback((type) => {
    setMediaType(type);
    setSearchTerm('');
    setSelectedItem(null);
    setCurrentPage(1);
    setCurrentSection('popular');
    setShowFavoritesPage(false);
    setShowWatchlistPage(false);
    setShowHistoryPage(false);
    setShowGenreSection(false);
    setSelectedGenre(null);
    fetchGenres(type);
  }, [fetchGenres]);

  const handleItemSelect = useCallback((item) => {
    const historyItem = watchHistory.find(hist => {
      const histId = hist.mediaType === 'anime' ? (hist.mal_id || hist.id) : hist.id;
      const itemId = mediaType === 'anime' ? (item.mal_id || item.id) : item.id;
      return histId === itemId && hist.mediaType === mediaType;
    });
    
    setSelectedItem(item);
    
    if (historyItem && (mediaType === 'tv' || mediaType === 'anime')) {
      setSelectedSeason(historyItem.season || 1);
      setSelectedEpisode(historyItem.episode || 1);
    } else {
      setSelectedSeason(1);
      setSelectedEpisode(1);
    }
    
    addToHistory(item);
    fetchRelatedContent(item);
    setShowWatchlistInPlayer(false);
  }, [watchHistory, mediaType, addToHistory, fetchRelatedContent]);

  const playNext = useCallback(() => {
    if (mediaType === 'tv' || mediaType === 'anime') {
      const maxEpisodes = episodesPerSeason[selectedSeason] || 1;
      if (selectedEpisode < maxEpisodes) {
        setSelectedEpisode(selectedEpisode + 1);
      } else if (selectedSeason < totalSeasons) {
        setSelectedSeason(selectedSeason + 1);
        setSelectedEpisode(1);
      }
    }
  }, [mediaType, episodesPerSeason, selectedSeason, selectedEpisode, totalSeasons]);

  const playPrevious = useCallback(() => {
    if (mediaType === 'tv' || mediaType === 'anime') {
      if (selectedEpisode > 1) {
        setSelectedEpisode(selectedEpisode - 1);
      } else if (selectedSeason > 1) {
        const prevSeasonEpisodes = episodesPerSeason[selectedSeason - 1] || 1;
        setSelectedSeason(selectedSeason - 1);
        setSelectedEpisode(prevSeasonEpisodes);
      }
    }
  }, [mediaType, selectedEpisode, selectedSeason, episodesPerSeason]);

  // OPTIMIZED: Reduced effect dependencies
  useEffect(() => {
    if (!selectedItem) {
      setCurrentPage(1);
      loadMedia(mediaType, currentSection, 1);
      fetchGenres(mediaType);
    }
    
    const onFs = () => setIsFullScreen(Boolean(document.fullscreenElement));
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedItem(null);
      if (e.key.toLowerCase() === 'f' && selectedItem) toggleFullScreen();
      if (e.key === 'ArrowRight' && selectedItem) playNext();
      if (e.key === 'ArrowLeft' && selectedItem) playPrevious();
    };
    
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('keydown', onKey);
    };
  }, [mediaType]); // Reduced dependencies

  // OPTIMIZED: Debounced search effect
  useEffect(() => {
    if (!selectedItem) {
      setCurrentPage(1);
      if (searchTerm.trim()) {
        const debounceTimer = setTimeout(() => searchMedia(searchTerm, mediaType, 1), 800);
        return () => clearTimeout(debounceTimer);
      } else {
        loadMedia(mediaType, currentSection, 1);
      }
    }
  }, [searchTerm, mediaType, currentSection, selectedItem, selectedGenre, searchMedia, loadMedia]);

  useEffect(() => {
    if (!selectedItem) return;
    setIsPlayerLoading(true);
    const loadTimer = setTimeout(() => setIsPlayerLoading(false), 2000);
    return () => clearTimeout(loadTimer);
  }, [selectedItem, selectedSeason, selectedEpisode, currentVideoSource]);

  useEffect(() => {
    if (!selectedItem) return;
    
    const setupData = async () => {
      if (mediaType === 'tv') {
        const totalS = await fetchDetailedSeasonData(selectedItem.id);
        setTotalSeasons(totalS);
        const episodesObj = {};
        for (let i = 1; i <= totalS; i++) {
          episodesObj[i] = await fetchEpisodesData(selectedItem.id, i);
        }
        setEpisodesPerSeason(episodesObj);
      }
      
      if (mediaType === 'anime') {
        const animeId = selectedItem.mal_id || selectedItem.id;
        const episodeCount = await fetchAnimeEpisodesCount(animeId);
        setTotalSeasons(1);
        setEpisodesPerSeason({ 1: episodeCount });
      }
    };
    
    setupData();
  }, [selectedItem, mediaType, fetchDetailedSeasonData, fetchEpisodesData, fetchAnimeEpisodesCount]);

  useEffect(() => {
    if (selectedItem) {
      addToHistory(selectedItem);
    }
  }, [selectedSeason, selectedEpisode, addToHistory, selectedItem]);

  useEffect(() => {
    if (!autoplayNext || !selectedItem) return;
    
    const handleAutoplay = () => {
      if (mediaType === 'tv' || mediaType === 'anime') {
        const maxEpisodes = episodesPerSeason[selectedSeason] || 1;
        if (selectedEpisode < maxEpisodes) {
          setTimeout(() => setSelectedEpisode(selectedEpisode + 1), 3000);
        } else if (selectedSeason < totalSeasons) {
          setTimeout(() => {
            setSelectedSeason(selectedSeason + 1);
            setSelectedEpisode(1);
          }, 3000);
        }
      }
    };
    
    const autoplayTimer = setTimeout(handleAutoplay, 30000);
    return () => clearTimeout(autoplayTimer);
  }, [selectedEpisode, selectedSeason, autoplayNext, selectedItem, mediaType, episodesPerSeason, totalSeasons]);

  // OPTIMIZED: Memoized helper functions
  const getMediaPoster = useCallback((item) => {
    if (!item) return null;
    if (mediaType === 'anime') {
      return item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.image;
    }
    return item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;
  }, [mediaType]);

  const getMediaTitle = useCallback((item) => {
    if (!item) return 'Unknown Title';
    if (mediaType === 'anime') {
      return item.title_english || item.title || item.name;
    }
    return mediaType === 'movie' ? item.title : item.name;
  }, [mediaType]);

  const getMediaYear = useCallback((item) => {
    if (!item) return 'N/A';
    if (mediaType === 'anime') {
      return item.year || (item.aired?.from ? item.aired.from.substring(0, 4) : 'N/A');
    }
    const dateStr = mediaType === 'movie' ? item.release_date : item.first_air_date;
    return dateStr ? dateStr.substring(0, 4) : 'N/A';
  }, [mediaType]);

  const getVidlinkSrc = useCallback(() => {
    if (!selectedItem) return '';
    
    const source = VIDEO_SOURCES[currentVideoSource];
    
    if (mediaType === 'anime') {
      const animeId = selectedItem.mal_id || selectedItem.id;
      const animeTitle = getMediaTitle(selectedItem).toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      if (source.name === 'VidLink Pro') {
        return `${source.anime}${animeTitle}-${animeId}/episode-${selectedEpisode}`;
      } else if (source.name === 'VidSrc.cc') {
        return `${source.anime}${animeId}/${selectedEpisode}`;
      } else {
        return `${source.anime}${animeTitle}-episode-${selectedEpisode}`;
      }
    }
    
    if (mediaType === 'tv') {
      return `${source.tv}${selectedItem.id}/${selectedSeason}/${selectedEpisode}`;
    }
    
    return `${source.movie}${selectedItem.id}`;
  }, [selectedItem, VIDEO_SOURCES, currentVideoSource, mediaType, selectedEpisode, selectedSeason, getMediaTitle]);

  const switchVideoSource = useCallback(() => {
    const nextSource = (currentVideoSource + 1) % VIDEO_SOURCES.length;
    setCurrentVideoSource(nextSource);
    setIsPlayerLoading(true);
    setTimeout(() => setIsPlayerLoading(false), 1500);
  }, [currentVideoSource, VIDEO_SOURCES.length]);

  // NEW: Genre Browser Component
  const GenreBrowser = useCallback(() => {
    if (!showGenreSection) return null;

    return (
      <div className="genre-browser">
        <h3 className="genre-title">
          <i className="fas fa-tags"></i>
          Browse by Genre
        </h3>
        <div className="genre-grid">
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={`genre-card ${selectedGenre?.id === genre.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedGenre(genre);
                setCurrentPage(1);
                loadMedia(mediaType, 'genres', 1);
              }}
            >
              <div className="genre-card-content">
                <span className="genre-name">{genre.name}</span>
                <i className="fas fa-arrow-right"></i>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }, [showGenreSection, genres, selectedGenre, mediaType, loadMedia]);

  // Enhanced Components
  const WatchlistSidebar = useCallback(() => {
    if (!showWatchlistInPlayer) return null;

    const filteredWatchlistItems = watchlist.filter(item => item.mediaType === mediaType);

    return (
      <div className="player-watchlist-sidebar">
        <div className="watchlist-header">
          <h3>
            <i className="fas fa-bookmark"></i>
            My Watchlist ({filteredWatchlistItems.length})
          </h3>
          <button onClick={() => setShowWatchlistInPlayer(false)} className="close-watchlist">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="watchlist-content">
          {filteredWatchlistItems.map((item, index) => (
            <div
              key={index}
              className="watchlist-item"
              onClick={() => handleItemSelect(item)}
            >
              {getMediaPoster(item) ? (
                <img src={getMediaPoster(item)} alt={getMediaTitle(item)} />
              ) : (
                <div className="watchlist-no-poster">
                  <i className="fas fa-film"></i>
                </div>
              )}
              <div className="watchlist-info">
                <h4>{getMediaTitle(item)}</h4>
                <span>{getMediaYear(item)}</span>
                {item.progress && (
                  <div className="watchlist-progress">
                    <small>S{item.progress.season}E{item.progress.episode}</small>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWatchlist(item, e);
                }}
                className="remove-from-watchlist"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          ))}
          {filteredWatchlistItems.length === 0 && (
            <div className="empty-watchlist">
              <i className="fas fa-bookmark"></i>
              <p>Your watchlist is empty</p>
              <small>Add items to watch later</small>
            </div>
          )}
        </div>
      </div>
    );
  }, [showWatchlistInPlayer, watchlist, mediaType, handleItemSelect, getMediaPoster, getMediaTitle, getMediaYear, toggleWatchlist]);

  const EpisodeSelector = useCallback(() => {
    if (mediaType === 'tv' || mediaType === 'anime') {
      const max = episodesPerSeason[selectedSeason] || 1;
      return (
        <div className="episode-selector-container">
          <div className="selector-wrapper">
            {mediaType === 'tv' && (
              <div className="selector-group">
                <label htmlFor="season-select">
                  <i className="fas fa-layer-group"></i>
                  Season
                </label>
                <select
                  id="season-select"
                  value={selectedSeason}
                  onChange={(e) => {
                    setSelectedSeason(Number(e.target.value));
                    setSelectedEpisode(1);
                  }}
                  className="beautiful-select"
                >
                  {[...Array(totalSeasons)].map((_, i) => (
                    <option key={i} value={i + 1}>
                      Season {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="selector-group">
              <label htmlFor="episode-select">
                <i className="fas fa-play-circle"></i>
                Episode
              </label>
              <select
                id="episode-select"
                value={selectedEpisode}
                onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                className="beautiful-select"
              >
                {[...Array(max)].map((_, i) => (
                  <option key={i} value={i + 1}>
                    Episode {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div className="selector-group">
              <button 
                onClick={playPrevious} 
                className="episode-nav-btn" 
                disabled={selectedSeason === 1 && selectedEpisode === 1}
              >
                <i className="fas fa-step-backward"></i>
                Previous
              </button>
              <button 
                onClick={playNext} 
                className="episode-nav-btn next-episode-btn" 
                disabled={selectedSeason === totalSeasons && selectedEpisode === max}
              >
                <i className="fas fa-step-forward"></i>
                Next
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }, [mediaType, episodesPerSeason, selectedSeason, selectedEpisode, totalSeasons, playPrevious, playNext]);

  const EpisodeGrid = useCallback(() => {
    if ((mediaType === 'tv' || mediaType === 'anime') && seasonsData[selectedSeason]) {
      const episodes = seasonsData[selectedSeason].episodes || [];
      return (
        <div className="episode-grid-container">
          <h3>
            <i className="fas fa-list"></i>
            Episodes - Season {selectedSeason}
          </h3>
          <div className="episode-grid">
            {episodes.map((episode, index) => (
              <div
                key={episode.id || index}
                className={`episode-card ${selectedEpisode === episode.episode_number ? 'active' : ''}`}
                onClick={() => setSelectedEpisode(episode.episode_number)}
              >
                <h4>
                  {episode.episode_number}. {episode.name || `Episode ${episode.episode_number}`}
                </h4>
                <p>{episode.overview || 'No description available.'}</p>
                <div className="episode-meta">
                  {episode.air_date && (
                    <span><i className="fas fa-calendar"></i> {episode.air_date}</span>
                  )}
                  {episode.runtime && (
                    <span><i className="fas fa-clock"></i> {episode.runtime}min</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  }, [mediaType, seasonsData, selectedSeason, selectedEpisode]);

  const MediaInfoPanel = useCallback(() => {
    if (!selectedItem || !showMediaInfo) return null;

    return (
      <div className="player-media-info">
        <div className="info-header">
          <h2>
            <i className="fas fa-info-circle"></i>
            {getMediaTitle(selectedItem)}
          </h2>
          <button onClick={() => setShowMediaInfo(false)} className="close-info-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="info-grid">
          <div className="info-item">
            <i className="fas fa-calendar"></i>
            <span>Year: <strong>{getMediaYear(selectedItem)}</strong></span>
          </div>
          
          {selectedItem.vote_average && (
            <div className="info-item">
              <i className="fas fa-star"></i>
              <span>Rating: <strong>{selectedItem.vote_average.toFixed(1)}/10</strong></span>
            </div>
          )}
          
          {selectedItem.score && (
            <div className="info-item">
              <i className="fas fa-star"></i>
              <span>Score: <strong>{selectedItem.score}/10</strong></span>
            </div>
          )}
          
          {(selectedItem.runtime || selectedItem.duration) && (
            <div className="info-item">
              <i className="fas fa-clock"></i>
              <span>Duration: <strong>{selectedItem.runtime || selectedItem.duration} min</strong></span>
            </div>
          )}
          
          {selectedItem.genres && (
            <div className="info-item">
              <i className="fas fa-tags"></i>
              <span>Genres: <strong>{selectedItem.genres.map(g => g.name || g).join(', ')}</strong></span>
            </div>
          )}
          
          {selectedItem.status && (
            <div className="info-item">
              <i className="fas fa-signal"></i>
              <span>Status: <strong>{selectedItem.status}</strong></span>
            </div>
          )}
        </div>

        {selectedItem.overview && (
          <div className="info-description">
            <h4><i className="fas fa-align-left"></i> Overview</h4>
            <p>{selectedItem.overview}</p>
          </div>
        )}

        {selectedItem.synopsis && (
          <div className="info-description">
            <h4><i className="fas fa-align-left"></i> Synopsis</h4>
            <p>{selectedItem.synopsis}</p>
          </div>
        )}
      </div>
    );
  }, [selectedItem, showMediaInfo, getMediaTitle, getMediaYear]);

  const PlayerActions = useCallback(() => {
    return (
      <div className="player-actions">
        <button 
          className={`action-btn ${isInFavorites(selectedItem) ? 'active' : ''}`}
          onClick={() => toggleFavorite(selectedItem)}
        >
          <i className={`${isInFavorites(selectedItem) ? 'fas' : 'far'} fa-heart`}></i>
          {isInFavorites(selectedItem) ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>
        
        <button 
          className={`action-btn ${isInWatchlist(selectedItem) ? 'active' : ''}`}
          onClick={() => toggleWatchlist(selectedItem)}
        >
          <i className={`${isInWatchlist(selectedItem) ? 'fas' : 'far'} fa-bookmark`}></i>
          {isInWatchlist(selectedItem) ? 'Remove from Watchlist' : 'Add to Watchlist'}
        </button>
        
        <button 
          className="action-btn" 
          onClick={() => setShowWatchlistInPlayer(!showWatchlistInPlayer)}
        >
          <i className="fas fa-list"></i>
          {showWatchlistInPlayer ? 'Hide Watchlist' : 'Show Watchlist'}
        </button>
        
        <button className="action-btn" onClick={() => setShowMediaInfo(!showMediaInfo)}>
          <i className="fas fa-info-circle"></i>
          {showMediaInfo ? 'Hide Info' : 'Show Info'}
        </button>
        
        {(mediaType === 'tv' || mediaType === 'anime') && (
          <button 
            className={`action-btn ${autoplayNext ? 'active' : ''}`}
            onClick={() => setAutoplayNext(!autoplayNext)}
          >
            <i className="fas fa-play"></i>
            Autoplay: {autoplayNext ? 'ON' : 'OFF'}
          </button>
        )}
        
        <button 
          className="action-btn" 
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: getMediaTitle(selectedItem),
                text: `Watch ${getMediaTitle(selectedItem)} on ManasHub`,
                url: window.location.href
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
        >
          <i className="fas fa-share-alt"></i>
          Share
        </button>
        
        <button className="action-btn">
          <i className="fas fa-download"></i>
          Download
        </button>
      </div>
    );
  }, [
    selectedItem, isInFavorites, isInWatchlist, toggleFavorite, toggleWatchlist, 
    showWatchlistInPlayer, showMediaInfo, mediaType, autoplayNext, getMediaTitle
  ]);

  const RelatedContent = useCallback(() => {
    if (relatedContent.length === 0) return null;

    return (
      <div className="related-content">
        <h3><i className="fas fa-film"></i> Related Content</h3>
        <div className="related-grid">
          {relatedContent.map((item, index) => (
            <div
              key={index}
              className="related-item"
              onClick={() => handleItemSelect(item)}
            >
              {getMediaPoster(item) ? (
                <img src={getMediaPoster(item)} alt={getMediaTitle(item)} />
              ) : (
                <div className="related-no-poster">
                  <i className="fas fa-film"></i>
                </div>
              )}
              <div className="related-info">
                <h4>{getMediaTitle(item)}</h4>
                <span>{getMediaYear(item)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [relatedContent, handleItemSelect, getMediaPoster, getMediaTitle, getMediaYear]);

  const Pagination = useCallback(() => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    };

    const handlePageChange = async (page) => {
      if (page === currentPage || page < 1 || page > totalPages) return;
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      if (searchTerm.trim()) {
        await searchMedia(searchTerm, mediaType, page);
      } else {
        await loadMedia(mediaType, currentSection, page);
      }
    };

    return (
      <div className="pagination-container">
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="pagination-btn first-last"
            title="First Page"
          >
            <i className="fas fa-angle-double-left"></i>
          </button>
          
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn prev-next"
            title="Previous Page"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          
          {getPageNumbers().map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`pagination-btn page-number ${currentPage === page ? 'active' : ''}`}
            >
              {page}
            </button>
          ))}
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn prev-next"
            title="Next Page"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
          
          <button 
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-btn first-last"
            title="Last Page"
          >
            <i className="fas fa-angle-double-right"></i>
          </button>
        </div>
        
        <div className="pagination-info">
          <span>Page {currentPage} of {totalPages}</span>
          <span className="total-results">
            {selectedGenre ? `${selectedGenre.name} • ` : ''}
            {media.length} of {totalPages * 20} total {mediaType === 'anime' ? 'anime' : mediaType === 'movie' ? 'movies' : 'shows'}
          </span>
        </div>
      </div>
    );
  }, [totalPages, currentPage, selectedGenre, media.length, mediaType, searchTerm, searchMedia, loadMedia, currentSection]);

  return (
    <div className={`app-container ${selectedItem ? 'player-open' : ''} ${darkMode ? 'dark' : 'light'}`}>
      {/* OPTIMIZED: Simplified Background */}
      <div className="animated-bg">
        <div className="bg-bubble"></div>
        <div className="bg-bubble"></div>
        <div className="bg-bubble"></div>
        <div className="bg-particle"></div>
        <div className="bg-particle"></div>
      </div>

      {!selectedItem && (
        <header className="header premium-header">
          <div className="header-content">
            <div className="logo-section">
              <h1 className="logo premium-logo" onClick={() => {
                setSelectedItem(null);
                setSearchTerm('');
                setCurrentPage(1);
                setCurrentSection('popular');
                setShowFavoritesPage(false);
                setShowWatchlistPage(false);
                setShowHistoryPage(false);
                setShowGenreSection(false);
                setSelectedGenre(null);
                loadMedia(mediaType, 'popular', 1);
              }}>
                <span className="logo-text">
                  Manas<span className="logo-highlight">Hub</span>
                </span>
                <div className="logo-subtitle">Premium Streaming Experience</div>
                <div className="logo-glow"></div>
              </h1>
            </div>
            
            <div className="media-toggle premium-toggle">
              {['movie', 'tv', 'anime'].map((t) => (
                <button
                  key={t}
                  className={`media-toggle-btn ${mediaType === t ? 'active' : ''}`}
                  onClick={() => handleMediaTypeChange(t)}
                >
                  <i className={`fas ${t === 'movie' ? 'fa-film' : t === 'tv' ? 'fa-tv' : 'fa-dragon'}`}></i>
                  <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  <div className="btn-glow"></div>
                </button>
              ))}
            </div>

            <div className="search-container premium-search">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                className="search-input"
                placeholder={`Search ${mediaType}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>
                  <i className="fas fa-times"></i>
                </button>
              )}
              <div className="search-glow"></div>
            </div>

            <div className="header-actions">
              <button className="toggle-theme premium-btn" onClick={() => setDarkMode((d) => !d)}>
                <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
                <div className="btn-glow"></div>
              </button>
            </div>
          </div>
        </header>
      )}

      {!selectedItem && (
        <main className="main-content">
          {!searchTerm && (
            <div className="section-toggle premium-section">
              {[
                { key: 'trending', label: 'Trending', icon: 'fa-fire' },
                { key: 'popular', label: 'Popular', icon: 'fa-star' },
                { key: 'toprated', label: 'Top Rated', icon: 'fa-crown' },
                { key: 'genres', label: 'Browse Genres', icon: 'fa-tags' },
                { key: 'favorites', label: `Favorites (${filteredFavorites.length})`, icon: 'fa-heart' },
                { key: 'watchlist', label: `Watchlist (${filteredWatchlist.length})`, icon: 'fa-bookmark' },
                { key: 'history', label: `History (${filteredHistory.length})`, icon: 'fa-history' }
              ].map((section) => (
                <button
                  key={section.key}
                  className={`section-btn ${currentSection === section.key ? 'active' : ''}`}
                  onClick={() => handleSectionChange(section.key)}
                >
                  <i className={`fas ${section.icon}`}></i>
                  <span>{section.label}</span>
                  <div className="btn-ripple"></div>
                </button>
              ))}
            </div>
          )}

          <GenreBrowser />

          {loading ? (
            <div className="player-loading premium-loading">
              <div className="loading-spinner-new">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
              </div>
              <p className="player-tip">Loading amazing content...</p>
              <div className="loading-particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
              </div>
            </div>
          ) : (
            <>
              {media.length > 0 ? (
                <>
                  <div className="media-container">
                    {selectedGenre && (
                      <div className="genre-header">
                        <h2>
                          <i className="fas fa-tags"></i>
                          {selectedGenre.name} {mediaType === 'anime' ? 'Anime' : mediaType === 'movie' ? 'Movies' : 'TV Shows'}
                        </h2>
                        <button onClick={() => setSelectedGenre(null)} className="clear-genre">
                          <i className="fas fa-times"></i>
                          Clear Filter
                        </button>
                      </div>
                    )}
                    <div className="media-grid premium-grid">
                      {media.map((item, index) => (
                        <div
                          key={mediaType === 'anime' ? (item.mal_id || item.id || index) : (item.id || index)}
                          className="media-card premium-card visible"
                          onClick={() => handleItemSelect(item)}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          {getMediaPoster(item) ? (
                            <img 
                              src={getMediaPoster(item)} 
                              alt={getMediaTitle(item)} 
                              className="media-poster" 
                              loading="lazy" 
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="no-poster" style={{ display: getMediaPoster(item) ? 'none' : 'flex' }}>
                            <i className="fas fa-film"></i>
                          </div>
                          
                          {/* FIXED: Enhanced overlay with proper z-index and pointer events */}
                          <div className="media-overlay premium-overlay">
                            <div className="play-button premium-play">
                              <i className="fas fa-play"></i>
                              <div className="play-ripple"></div>
                            </div>
                            
                            {/* FIXED: Enhanced action buttons with better event handling */}
                            <div className="media-actions" style={{ zIndex: 1000, position: 'relative' }}>
                              <button
                                className={`overlay-btn ${isInFavorites(item) ? 'active' : ''}`}
                                onClick={(e) => toggleFavorite(item, e)}
                                title={isInFavorites(item) ? "Remove from Favorites" : "Add to Favorites"}
                                style={{ 
                                  pointerEvents: 'auto',
                                  cursor: 'pointer',
                                  zIndex: 1001
                                }}
                              >
                                <i className={`${isInFavorites(item) ? 'fas' : 'far'} fa-heart`}></i>
                              </button>
                              
                              <button
                                className={`overlay-btn ${isInWatchlist(item) ? 'active' : ''}`}
                                onClick={(e) => toggleWatchlist(item, e)}
                                title={isInWatchlist(item) ? "Remove from Watchlist" : "Add to Watchlist"}
                                style={{ 
                                  pointerEvents: 'auto',
                                  cursor: 'pointer',
                                  zIndex: 1001
                                }}
                              >
                                <i className={`${isInWatchlist(item) ? 'fas' : 'far'} fa-bookmark`}></i>
                              </button>
                            </div>
                            <div className="card-glow"></div>
                          </div>
                          
                          <div className="media-info premium-info">
                            <h3>{getMediaTitle(item)}</h3>
                            <div className="media-meta">
                              <span className="rating premium-rating">
                                <i className="fas fa-star"></i>
                                {mediaType === 'anime' ? (item.score || 'N/A') : (item.vote_average?.toFixed(1) || 'N/A')}
                              </span>
                              <span className="year premium-year">{getMediaYear(item)}</span>
                              {(isInFavorites(item) || isInWatchlist(item)) && (
                                <div className="media-badges">
                                  {isInFavorites(item) && <span className="badge favorite"><i className="fas fa-heart"></i></span>}
                                  {isInWatchlist(item) && <span className="badge watchlist"><i className="fas fa-bookmark"></i></span>}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="card-border"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {!showFavoritesPage && !showWatchlistPage && !showHistoryPage && <Pagination />}
                </>
              ) : (
                <div className="no-results premium-no-results">
                  <i className="fas fa-search"></i>
                  <h3>
                    {currentSection === 'favorites' ? 'No favorites yet' : 
                     currentSection === 'watchlist' ? 'Your watchlist is empty' :
                     currentSection === 'history' ? 'No watch history' :
                     selectedGenre ? `No ${selectedGenre.name.toLowerCase()} content found` :
                     `No ${mediaType === 'anime' ? 'anime' : mediaType === 'movie' ? 'movies' : 'shows'} found`}
                  </h3>
                  <p>
                    {currentSection === 'favorites' ? 'Start adding your favorite items!' : 
                     currentSection === 'watchlist' ? 'Add items you want to watch later.' :
                     currentSection === 'history' ? 'Start watching to build your history.' :
                     selectedGenre ? 'Try searching for something else or explore other genres.' :
                     'Try searching for something else or check back later.'}
                  </p>
                  <div className="no-results-glow"></div>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {selectedItem && (
        <div className="media-player premium-player">
          <div className="player-header premium-player-header">
            <button className="back-button" onClick={() => setSelectedItem(null)}>
              <i className="fas fa-arrow-left"></i> <span>Back</span>
            </button>
            <h2 className="player-title">{getMediaTitle(selectedItem)}</h2>
            <div className="player-controls">
              <div className="source-selector">
                <button 
                  className="source-btn"
                  onClick={() => setShowSourceSelector(!showSourceSelector)}
                >
                  <i className="fas fa-server"></i>
                  <span>{VIDEO_SOURCES[currentVideoSource].name}</span>
                  <i className={`fas fa-chevron-${showSourceSelector ? 'up' : 'down'}`}></i>
                </button>
                {showSourceSelector && (
                  <div className="source-dropdown premium-dropdown">
                    {VIDEO_SOURCES.map((source, index) => (
                      <button
                        key={index}
                        className={`source-option ${index === currentVideoSource ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentVideoSource(index);
                          setShowSourceSelector(false);
                          setIsPlayerLoading(true);
                          setTimeout(() => setIsPlayerLoading(false), 1500);
                        }}
                      >
                        <span>
                          <i className="fas fa-server"></i>
                          {source.name}
                        </span>
                        {index === currentVideoSource && <i className="fas fa-check"></i>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="switch-source-btn" onClick={switchVideoSource}>
                <i className="fas fa-sync-alt"></i> <span>Switch Source</span>
              </button>
              <button className="fullscreen-button" onClick={toggleFullScreen}>
                <i className={`fas ${isFullScreen ? 'fa-compress' : 'fa-expand'}`}></i>
              </button>
            </div>
          </div>

          <div className="player-main-content">
            <div className="player-content">
              {isPlayerLoading ? (
                <div className="player-loading premium-loading">
                  <div className="loading-spinner-new">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                  </div>
                  <p className="player-tip">Loading player... Trying {VIDEO_SOURCES[currentVideoSource].name}</p>
                  <div className="loading-particles">
                    <div className="particle"></div>
                    <div className="particle"></div>
                    <div className="particle"></div>
                  </div>
                </div>
              ) : (
                <div className="video-wrapper premium-video">
                  <iframe
                    key={`${selectedSeason}-${selectedEpisode}-${currentVideoSource}`}
                    ref={iframeRef}
                    src={getVidlinkSrc()}
                    className="media-iframe"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    onLoad={() => setIsPlayerLoading(false)}
                    onError={() => {
                      if (currentVideoSource < VIDEO_SOURCES.length - 1) {
                        switchVideoSource();
                      }
                    }}
                  />
                  <div className="video-glow"></div>
                </div>
              )}

              <EpisodeSelector />
              <PlayerActions />
              <MediaInfoPanel />
              <EpisodeGrid />
              <RelatedContent />
            </div>

            <WatchlistSidebar />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

