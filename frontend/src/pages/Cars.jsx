import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import CarCard from '../components/CarCard.jsx';
import EmptyState, { SkeletonGrid } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { CAR_TYPES, daysBetween, todayISO } from '../utils.js';

const initialState = {
  q: '',
  location: '',
  type: '',
  start: '',
  end: '',
  maxPrice: '',
  sort: '',
};

export default function Cars() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    ...initialState,
    ...Object.fromEntries(searchParams),
  }));
  const [cars, setCars] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    api('/cars/locations')
      .then((data) => setLocations(data.locations))
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/cars?${searchParams.toString()}`)
      .then((data) => {
        if (active) setCars(data.cars);
      })
      .catch((error) => {
        if (active) toast(error.message, 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [searchParams, toast]);

  useEffect(() => {
    setFilters({ ...initialState, ...Object.fromEntries(searchParams) });
  }, [searchParams]);

  const update = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  const applyFilters = (event) => {
    event?.preventDefault();
    if (filters.start && filters.end && filters.end <= filters.start) {
      toast('Return date must be after the pickup date', 'error');
      return;
    }
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    setSearchParams(params);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters(initialState);
    setSearchParams({});
    setShowFilters(false);
  };

  const removeFilter = (key) => {
    const next = { ...filters, [key]: '' };
    setFilters(next);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([entryKey, value]) => {
      if (value) params.set(entryKey, value);
    });
    setSearchParams(params);
  };

  const activeChips = Object.entries(filters).filter(
    ([key, value]) => key !== 'sort' && value,
  );
  const tripDays =
    filters.start && filters.end && filters.end > filters.start
      ? daysBetween(filters.start, filters.end)
      : 0;

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Explore cars</span>
          <h1>Find the right car for your trip</h1>
          <p>
            {loading
              ? 'Fetching cars from verified providers…'
              : `${cars.length} car${cars.length === 1 ? '' : 's'} available${
                  filters.location ? ` in ${filters.location}` : ' across India'
                }${tripDays ? ` for ${tripDays} day${tripDays === 1 ? '' : 's'}` : ''}.`}
          </p>
        </div>
      </section>

      <div className="container cars-layout">
        <aside className={`filters-panel ${showFilters ? 'is-open' : ''}`}>
          <div className="filters-head">
            <h2>Filters</h2>
            <button className="btn btn-ghost btn-sm filters-close" onClick={() => setShowFilters(false)} type="button">
              <Icon name="close" size={16} />
            </button>
          </div>
          <form onSubmit={applyFilters} className="filters-form">
            <label className="field">
              <span className="field-label">Search</span>
              <input
                value={filters.q}
                onChange={update('q')}
                placeholder="e.g. Creta, SUV, Mumbai"
              />
            </label>

            <label className="field">
              <span className="field-label">Pick-up city</span>
              <select value={filters.location} onChange={update('location')}>
                <option value="">Any city</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Car type</span>
              <select value={filters.type} onChange={update('type')}>
                <option value="">All types</option>
                {CAR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Pick-up date</span>
                <input
                  type="date"
                  min={todayISO()}
                  value={filters.start}
                  onChange={update('start')}
                />
              </label>
              <label className="field">
                <span className="field-label">Return date</span>
                <input
                  type="date"
                  min={filters.start || todayISO()}
                  value={filters.end}
                  onChange={update('end')}
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Max price per day</span>
              <select value={filters.maxPrice} onChange={update('maxPrice')}>
                <option value="">Any price</option>
                <option value="3000">Up to ₹3,000</option>
                <option value="5000">Up to ₹5,000</option>
                <option value="8000">Up to ₹8,000</option>
                <option value="12000">Up to ₹12,000</option>
              </select>
            </label>

            <div className="filter-actions">
              <button className="btn btn-primary" type="submit">
                Apply filters
              </button>
              <button className="btn btn-ghost" type="button" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </form>
        </aside>

        <div className="cars-results">
          <div className="results-toolbar">
            <div className="results-left">
              <button
                type="button"
                className="btn btn-outline btn-sm filters-toggle"
                onClick={() => setShowFilters(true)}
              >
                <Icon name="settings" size={15} /> Filters
              </button>
              <span className="results-count">
                {loading ? 'Loading cars…' : `${cars.length} result${cars.length === 1 ? '' : 's'}`}
              </span>
            </div>
            <label className="sort-control">
              Sort by
              <select value={filters.sort} onChange={(event) => {
                const value = event.target.value;
                setFilters((current) => ({ ...current, sort: value }));
                const params = new URLSearchParams(searchParams);
                if (value) params.set('sort', value);
                else params.delete('sort');
                setSearchParams(params);
              }}>
                <option value="">Recommended</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="newest">Newest listings</option>
              </select>
            </label>
          </div>

          {activeChips.length > 0 && (
            <div className="active-chips">
              {activeChips.map(([key, value]) => (
                <button key={key} type="button" className="chip" onClick={() => removeFilter(key)}>
                  {key === 'maxPrice' ? `Under ₹${Number(value).toLocaleString('en-IN')}` : value}
                  <Icon name="close" size={13} />
                </button>
              ))}
              <button type="button" className="chip chip-clear" onClick={clearFilters}>
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <SkeletonGrid count={6} />
          ) : cars.length === 0 ? (
            <EmptyState
              icon="search"
              title="No cars match these filters"
              message="Try another city, a different car type or a wider price range. New cars are added as providers list them."
              action={
                <button className="btn btn-primary" onClick={clearFilters}>
                  Reset filters
                </button>
              }
            />
          ) : (
            <div className="car-grid">
              {cars.map((car, index) => (
                <CarCard key={car._id} car={car} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
