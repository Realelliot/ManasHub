
import { useState, useEffect, useRef } from 'react';
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
  
  // Enhanced states for better favorites and watchlist
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

  const API_KEY = 'af1402e7fece77024ef7feb43b1f8470';
  
  const VIDEO_SOURCES = [
    {
      name: 'Vidfast.pro',
      movie: 'https://vidfast.pro/movie/',
      tv: 'https://vidfast.pro/tv/',
      anime: 'https://9anime.org.lv/'
    },
    {
      name: 'VidLink Pro',
      movie: 'https://vidlink.pro/movie/',
      tv: 'https://vidlink.pro/tv/',
      anime: 'https://vidjoy.pro/anime/'
    },
    {
      name: 'autoembed.cc',
      movie: 'https://player.videasy.net/movie/',
      tv: 'https://player.videasy.net/tv/',
      anime: 'https://megaplay.buzz/stream/s-2/136197/sub'
    },
    {
      name: 'VidSrc1',
      movie: 'https://vidsrc.cc/v2/embed/movie/',
      tv: 'https://vidsrc.xyz/embed/tv/',
      anime: 'https://2anime.xyz/embed/{title}-episode-{number}'
    },
    {
      name: 'VidSrc2',
      movie: 'https://vidsrc.cc/v3/embed/movie/',
      tv: 'https://vidsrc.cc/v3/embed/tv/',
      anime: 'https://vidsrc.cc/v3/embed/anime/'
    },
  ];

  const API_SOURCES = {
    tmdb: {
      baseUrl: 'https://api.themoviedb.org/3',
      apiKey: API_KEY,
    },
    anime: {
      baseUrl: 'https://api.jikan.moe/v4',
      consumetUrl: 'https://api.consumet.org/anime/gogoanime',
      anilistUrl: 'https://api.consumet.org/anime/anilist'
    },
  };

  // Enhanced localStorage management with error handling
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('manasHub_favorites');
      const savedWatchlist = localStorage.getItem('manasHub_watchlist');
      const savedHistory = localStorage.getItem('manasHub_history');
      const savedDarkMode = localStorage.getItem('manasHub_darkMode');
      const savedAutoplay = localStorage.getItem('manasHub_autoplay');
      
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
      if (savedHistory) setWatchHistory(JSON.parse(savedHistory));
      if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
      if (savedAutoplay) setAutoplayNext(JSON.parse(savedAutoplay));
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);

  // Auto-save to localStorage with debouncing
  const saveToLocalStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => saveToLocalStorage('manasHub_favorites', favorites), 300);
    return () => clearTimeout(timer);
  }, [favorites]);

  useEffect(() => {
    const timer = setTimeout(() => saveToLocalStorage('manasHub_watchlist', watchlist), 300);
    return () => clearTimeout(timer);
  }, [watchlist]);

  useEffect(() => {
    const timer = setTimeout(() => saveToLocalStorage('manasHub_history', watchHistory), 300);
    return () => clearTimeout(timer);
  }, [watchHistory]);

  useEffect(() => {
    saveToLocalStorage('manasHub_darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    saveToLocalStorage('manasHub_autoplay', autoplayNext);
  }, [autoplayNext]);

  // Enhanced utility functions
  const getItemId = (item) => {
    return mediaType === 'anime' ? (item.mal_id || item.id) : item.id;
  };

  const isInFavorites = (item) => {
    if (!item) return false;
    const itemId = getItemId(item);
    return favorites.some(fav => {
      const favId = mediaType === 'anime' ? (fav.mal_id || fav.id) : fav.id;
      return favId === itemId && fav.mediaType === mediaType;
    });
  };

  const isInWatchlist = (item) => {
    if (!item) return false;
    const itemId = getItemId(item);
    return watchlist.some(watch => {
      const watchId = mediaType === 'anime' ? (watch.mal_id || watch.id) : watch.id;
      return watchId === itemId && watch.mediaType === mediaType;
    });
  };

  const toggleFavorite = (item) => {
    if (!item) return;
    
    const itemId = getItemId(item);
    const exists = favorites.find(fav => {
      const favId = mediaType === 'anime' ? (fav.mal_id || fav.id) : fav.id;
      return favId === itemId && fav.mediaType === mediaType;
    });

    if (exists) {
      setFavorites(favorites.filter(fav => {
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
  };

  const toggleWatchlist = (item) => {
    if (!item) return;
    
    const itemId = getItemId(item);
    const exists = watchlist.find(watch => {
      const watchId = mediaType === 'anime' ? (watch.mal_id || watch.id) : watch.id;
      return watchId === itemId && watch.mediaType === mediaType;
    });

    if (exists) {
      setWatchlist(watchlist.filter(watch => {
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
  };

  const addToHistory = (item) => {
    if (!item) return;
    
    const itemId = getItemId(item);
    const existingIndex = watchHistory.findIndex(hist => {
      const histId = hist.mediaType === 'anime' ? (hist.mal_id || hist.id) : hist.id;
      return histId === itemId && hist.mediaType === mediaType;
    });

    const historyItem = {
      ...item,
      mediaType,
      lastWatched: new Date().toISOString(),
      season: selectedSeason,
      episode: selectedEpisode
    };

    if (existingIndex >= 0) {
      const newHistory = [...watchHistory];
      newHistory[existingIndex] = historyItem;
      setWatchHistory(newHistory);
    } else {
      setWatchHistory(prev => [historyItem, ...prev.slice(0, 49)]); // Keep last 50
    }
  };

  // Enhanced API functions with better error handling
  const fetchTrending = async (type = mediaType, page = 1) => {
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
  };

  const fetchPopular = async (type = mediaType, page = 1) => {
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
  };

  const fetchTopRated = async (type = mediaType, page = 1) => {
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
  };

  const loadMedia = async (type = mediaType, section = currentSection, page = 1) => {
    setLoading(true);
    try {
      let data;
      
      // Handle special sections for favorites, watchlist, and history
      if (section === 'favorites') {
        const filteredFavorites = favorites.filter(item => item.mediaType === type);
        setMedia(filteredFavorites);
        setTotalPages(1);
        setLoading(false);
        return;
      }
      
      if (section === 'watchlist') {
        const filteredWatchlist = watchlist.filter(item => item.mediaType === type);
        setMedia(filteredWatchlist);
        setTotalPages(1);
        setLoading(false);
        return;
      }
      
      if (section === 'history') {
        const filteredHistory = watchHistory.filter(item => item.mediaType === type);
        setMedia(filteredHistory);
        setTotalPages(1);
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
  };

  const fetchRelatedContent = async (item) => {
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
  };

  const fetchDetailedSeasonData = async (id) => {
    try {
      const res = await axios.get(`${API_SOURCES.tmdb.baseUrl}/tv/${id}`, {
        params: { api_key: API_KEY },
        timeout: 8000
      });
      const seasons = res.data.seasons || [];
      const seasonsInfo = {};
      
      // Limit concurrent requests to prevent API throttling
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
  };

  const fetchSeasonData = async (id) => {
    try {
      const res = await axios.get(`${API_SOURCES.tmdb.baseUrl}/tv/${id}`, {
        params: { api_key: API_KEY },
        timeout: 8000
      });
      return res.data.number_of_seasons || 1;
    } catch {
      return 1;
    }
  };

  const fetchEpisodesData = async (id, seasonNum) => {
    try {
      const res = await axios.get(
        `${API_SOURCES.tmdb.baseUrl}/tv/${id}/season/${seasonNum}`,
        { params: { api_key: API_KEY }, timeout: 8000 }
      );
      return res.data.episodes.length || 1;
    } catch {
      return 1;
    }
  };

  const fetchAnimeEpisodesCount = async (animeId) => {
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
  };

  const searchMedia = async (query, type = mediaType, page = 1) => {
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
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      iframeRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSectionChange = (section) => {
    setCurrentSection(section);
    setCurrentPage(1);
    setSearchTerm('');
    setShowFavoritesPage(section === 'favorites');
    setShowWatchlistPage(section === 'watchlist');
    setShowHistoryPage(section === 'history');
    loadMedia(mediaType, section, 1);
  };

  const handleMediaTypeChange = (type) => {
    setMediaType(type);
    setSearchTerm('');
    setSelectedItem(null);
    setCurrentPage(1);
    setCurrentSection('popular');
    setShowFavoritesPage(false);
    setShowWatchlistPage(false);
    setShowHistoryPage(false);
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    addToHistory(item);
    fetchRelatedContent(item);
    setShowWatchlistInPlayer(false);
  };

  const playNext = () => {
    if (mediaType === 'tv' || mediaType === 'anime') {
      const maxEpisodes = episodesPerSeason[selectedSeason] || 1;
      if (selectedEpisode < maxEpisodes) {
        setSelectedEpisode(selectedEpisode + 1);
      } else if (selectedSeason < totalSeasons) {
        setSelectedSeason(selectedSeason + 1);
        setSelectedEpisode(1);
      }
    }
  };

  const playPrevious = () => {
    if (mediaType === 'tv' || mediaType === 'anime') {
      if (selectedEpisode > 1) {
        setSelectedEpisode(selectedEpisode - 1);
      } else if (selectedSeason > 1) {
        const prevSeasonEpisodes = episodesPerSeason[selectedSeason - 1] || 1;
        setSelectedSeason(selectedSeason - 1);
        setSelectedEpisode(prevSeasonEpisodes);
      }
    }
  };

  // Auto-load media when component mounts or media type changes
  useEffect(() => {
    setCurrentPage(1);
    loadMedia(mediaType, currentSection, 1);
    
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
  }, [mediaType]);

  // Debounced search
  useEffect(() => {
    setCurrentPage(1);
    if (searchTerm.trim()) {
      const debounceTimer = setTimeout(() => searchMedia(searchTerm, mediaType, 1), 500);
      return () => clearTimeout(debounceTimer);
    } else {
      loadMedia(mediaType, currentSection, 1);
    }
  }, [searchTerm, mediaType]);

  // Handle player loading
  useEffect(() => {
    if (!selectedItem) return;
    setIsPlayerLoading(true);
    setCurrentVideoSource(0);
    const loadTimer = setTimeout(() => setIsPlayerLoading(false), 2000);
    return () => clearTimeout(loadTimer);
  }, [selectedItem]);

  // Setup seasons and episodes data
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
        setSelectedSeason(1);
        setSelectedEpisode(1);
      }
      
      if (mediaType === 'anime') {
        const animeId = selectedItem.mal_id || selectedItem.id;
        const episodeCount = await fetchAnimeEpisodesCount(animeId);
        setTotalSeasons(1);
        setEpisodesPerSeason({ 1: episodeCount });
        setSelectedSeason(1);
        setSelectedEpisode(1);
      }
    };
    
    setupData();
  }, [selectedItem, mediaType]);

  // Auto-play next episode
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
    
    // Listen for video end event (simplified)
    const autoplayTimer = setTimeout(handleAutoplay, 30000); // Auto-advance after 30 seconds for demo
    return () => clearTimeout(autoplayTimer);
  }, [selectedEpisode, selectedSeason, autoplayNext, selectedItem]);

  // Helper functions
  const getMediaPoster = (item) => {
    if (!item) return null;
    if (mediaType === 'anime') {
      return item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.image;
    }
    return item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;
  };

  const getMediaTitle = (item) => {
    if (!item) return 'Unknown Title';
    if (mediaType === 'anime') {
      return item.title_english || item.title || item.name;
    }
    return mediaType === 'movie' ? item.title : item.name;
  };

  const getMediaYear = (item) => {
    if (!item) return 'N/A';
    if (mediaType === 'anime') {
      return item.year || (item.aired?.from ? item.aired.from.substring(0, 4) : 'N/A');
    }
    const dateStr = mediaType === 'movie' ? item.release_date : item.first_air_date;
    return dateStr ? dateStr.substring(0, 4) : 'N/A';
  };

  const getVidlinkSrc = () => {
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
  };

  const switchVideoSource = () => {
    const nextSource = (currentVideoSource + 1) % VIDEO_SOURCES.length;
    setCurrentVideoSource(nextSource);
    setIsPlayerLoading(true);
    setTimeout(() => setIsPlayerLoading(false), 1500);
  };

  // Enhanced Components
  const WatchlistSidebar = () => {
    if (!showWatchlistInPlayer) return null;

    return (
      <div className="player-watchlist-sidebar">
        <div className="watchlist-header">
          <h3>
            <i className="fas fa-bookmark"></i>
            My Watchlist ({watchlist.filter(item => item.mediaType === mediaType).length})
          </h3>
          <button onClick={() => setShowWatchlistInPlayer(false)} className="close-watchlist">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="watchlist-content">
          {watchlist.filter(item => item.mediaType === mediaType).map((item, index) => (
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
                  toggleWatchlist(item);
                }}
                className="remove-from-watchlist"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          ))}
          {watchlist.filter(item => item.mediaType === mediaType).length === 0 && (
            <div className="empty-watchlist">
              <i className="fas fa-bookmark"></i>
              <p>Your watchlist is empty</p>
              <small>Add items to watch later</small>
            </div>
          )}
        </div>
      </div>
    );
  };

  const EpisodeSelector = () => {
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
                className="episode-nav-btn" 
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
  };

  const EpisodeGrid = () => {
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
  };

  const MediaInfoPanel = () => {
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
  };

  const PlayerActions = () => {
    return (
      <div className="player-actions">
        <button 
          className={`action-btn ${isInFavorites(selectedItem) ? 'active' : ''}`}
          onClick={() => toggleFavorite(selectedItem)}
        >
          <i className={`fas ${isInFavorites(selectedItem) ? 'fa-heart' : 'fa-heart-o'}`}></i>
          {isInFavorites(selectedItem) ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>
        
        <button 
          className={`action-btn ${isInWatchlist(selectedItem) ? 'active' : ''}`}
          onClick={() => toggleWatchlist(selectedItem)}
        >
          <i className={`fas ${isInWatchlist(selectedItem) ? 'fa-bookmark' : 'fa-bookmark-o'}`}></i>
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
  };

  const RelatedContent = () => {
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
  };

  const Pagination = () => {
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
            {media.length} of {totalPages * 20} total {mediaType === 'anime' ? 'anime' : mediaType === 'movie' ? 'movies' : 'shows'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`app-container ${selectedItem ? 'player-open' : ''} ${darkMode ? 'dark' : 'light'}`}>
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="bg-bubble"></div>
        <div className="bg-bubble"></div>
        <div className="bg-bubble"></div>
        <div className="bg-bubble"></div>
        <div className="bg-bubble"></div>
      </div>

      {!selectedItem && (
        <header className="header">
          <div className="header-content">
            <div className="logo-section">
              <h1 className="logo" onClick={() => {
                setSelectedItem(null);
                setSearchTerm('');
                setCurrentPage(1);
                setCurrentSection('popular');
                setShowFavoritesPage(false);
                setShowWatchlistPage(false);
                setShowHistoryPage(false);
                loadMedia(mediaType, 'popular', 1);
              }}>
                Manas<span className="logo-highlight">Hub</span>
                <div className="logo-subtitle">Stream Everything</div>
              </h1>
            </div>
            
            <div className="media-toggle">
              {['movie', 'tv', 'anime'].map((t) => (
                <button
                  key={t}
                  className={`media-toggle-btn ${mediaType === t ? 'active' : ''}`}
                  onClick={() => handleMediaTypeChange(t)}
                >
                  <i className={`fas ${t === 'movie' ? 'fa-film' : t === 'tv' ? 'fa-tv' : 'fa-dragon'}`}></i>
                  <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                </button>
              ))}
            </div>

            <div className="search-container">
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
            </div>

            <div className="header-actions">
              <button className="toggle-theme" onClick={() => setDarkMode((d) => !d)}>
                <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
            </div>
          </div>
        </header>
      )}

      {!selectedItem && (
        <main className="main-content">
          {!searchTerm && (
            <div className="section-toggle">
              {[
                { key: 'trending', label: 'Trending', icon: 'fa-fire' },
                { key: 'popular', label: 'Popular', icon: 'fa-star' },
                { key: 'toprated', label: 'Top Rated', icon: 'fa-crown' },
                { key: 'favorites', label: `My Favorites (${favorites.filter(item => item.mediaType === mediaType).length})`, icon: 'fa-heart' },
                { key: 'watchlist', label: `My Watchlist (${watchlist.filter(item => item.mediaType === mediaType).length})`, icon: 'fa-bookmark' },
                { key: 'history', label: `Watch History (${watchHistory.filter(item => item.mediaType === mediaType).length})`, icon: 'fa-history' }
              ].map((section) => (
                <button
                  key={section.key}
                  className={`section-btn ${currentSection === section.key ? 'active' : ''}`}
                  onClick={() => handleSectionChange(section.key)}
                >
                  <i className={`fas ${section.icon}`}></i>
                  <span>{section.label}</span>
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="player-loading">
              <div className="loading-spinner-new">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
              </div>
              <p className="player-tip">Loading amazing content...</p>
            </div>
          ) : (
            <>
              {media.length > 0 ? (
                <>
                  <div className="media-container">
                    <div className="media-grid">
                      {media.map((item, index) => (
                        <div
                          key={mediaType === 'anime' ? (item.mal_id || item.id || index) : (item.id || index)}
                          className="media-card visible"
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
                          <div className="media-overlay">
                            <div className="play-button">
                              <i className="fas fa-play"></i>
                            </div>
                            <div className="media-actions">
                              <button
                                className={`overlay-btn ${isInFavorites(item) ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(item);
                                }}
                                title="Add to Favorites"
                              >
                                <i className={`fas ${isInFavorites(item) ? 'fa-heart' : 'fa-heart-o'}`}></i>
                              </button>
                              <button
                                className={`overlay-btn ${isInWatchlist(item) ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWatchlist(item);
                                }}
                                title="Add to Watchlist"
                              >
                                <i className={`fas ${isInWatchlist(item) ? 'fa-bookmark' : 'fa-bookmark-o'}`}></i>
                              </button>
                            </div>
                          </div>
                          <div className="media-info">
                            <h3>{getMediaTitle(item)}</h3>
                            <div className="media-meta">
                              <span className="rating">
                                <i className="fas fa-star"></i>
                                {mediaType === 'anime' ? (item.score || 'N/A') : (item.vote_average?.toFixed(1) || 'N/A')}
                              </span>
                              <span className="year">{getMediaYear(item)}</span>
                              {(isInFavorites(item) || isInWatchlist(item)) && (
                                <div className="media-badges">
                                  {isInFavorites(item) && <span className="badge favorite"><i className="fas fa-heart"></i></span>}
                                  {isInWatchlist(item) && <span className="badge watchlist"><i className="fas fa-bookmark"></i></span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {!showFavoritesPage && !showWatchlistPage && !showHistoryPage && <Pagination />}
                </>
              ) : (
                <div className="no-results">
                  <i className="fas fa-search"></i>
                  <h3>
                    {currentSection === 'favorites' ? 'No favorites yet' : 
                     currentSection === 'watchlist' ? 'Your watchlist is empty' :
                     currentSection === 'history' ? 'No watch history' :
                     `No ${mediaType === 'anime' ? 'anime' : mediaType === 'movie' ? 'movies' : 'shows'} found`}
                  </h3>
                  <p>
                    {currentSection === 'favorites' ? 'Start adding your favorite items!' : 
                     currentSection === 'watchlist' ? 'Add items you want to watch later.' :
                     currentSection === 'history' ? 'Start watching to build your history.' :
                     'Try searching for something else or check back later.'}
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {selectedItem && (
        <div className="media-player">
          <div className="player-header">
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
                  <div className="source-dropdown">
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
                <div className="player-loading">
                  <div className="loading-spinner-new">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                  </div>
                  <p className="player-tip">Loading player... Trying {VIDEO_SOURCES[currentVideoSource].name}</p>
                </div>
              ) : (
                <div className="video-wrapper">
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

