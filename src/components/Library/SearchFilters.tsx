import { Search, X, Filter, Globe } from 'lucide-react';
import { SearchFacets } from '../../services/api';
import { LibraryFilters } from '../../store/useStore';
import { getBucketInfo } from '../../constants/buckets';

interface SearchFiltersProps {
  facets: SearchFacets | null;
  filters: LibraryFilters;
  onChange: (filters: Partial<LibraryFilters>) => void;
  onReset: () => void;
  addToAgentMode?: boolean;
  totalResults?: number;
  isLoading?: boolean;
  showBucketFilters?: boolean;
}

// Type restrictions for add-to-agent mode
const COMPATIBLE_TYPES_FOR_AGENT = ['SKILL', 'COMMAND', 'TOOL'];

export const SearchFilters = ({
  facets,
  filters,
  onChange,
  onReset,
  addToAgentMode = false,
  totalResults,
  isLoading,
  showBucketFilters = false,
}: SearchFiltersProps) => {
  const hasActiveFilters =
    filters.search ||
    filters.types.length > 0 ||
    filters.repos.length > 0 ||
    filters.categories.length > 0 ||
    filters.buckets.length > 0;

  const toggleType = (type: string) => {
    const current = filters.types;
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onChange({ types: updated });
  };

  const toggleRepo = (repo: string) => {
    const current = filters.repos;
    const updated = current.includes(repo)
      ? current.filter((r) => r !== repo)
      : [...current, repo];
    onChange({ repos: updated });
  };

  const toggleBucket = (bucketId: string) => {
    const current = filters.buckets;
    const updated = current.includes(bucketId)
      ? current.filter((b) => b !== bucketId)
      : [...current, bucketId];
    onChange({ buckets: updated });
  };

  // Get available types (restricted in add-to-agent mode)
  const availableTypes = facets?.types || [];
  const displayTypes = addToAgentMode
    ? availableTypes.filter((t) => COMPATIBLE_TYPES_FOR_AGENT.includes(t))
    : availableTypes;

  // Get available buckets
  const availableBuckets = facets?.buckets || [];

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={addToAgentMode ? 'Search skills, commands...' : 'Search components...'}
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ search: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Global Search Toggle */}
      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.globalSearch}
          onChange={(e) => onChange({ globalSearch: e.target.checked })}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <Globe className="w-3.5 h-3.5" />
        Search all categories
      </label>

      {/* Filter Pills */}
      {facets && (displayTypes.length > 0 || facets.repos.length > 0) && (
        <div className="space-y-2">
          {/* Type Filters */}
          {displayTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displayTypes.map((type) => {
                const isActive = filters.types.includes(type);
                const isDisabled =
                  addToAgentMode && !COMPATIBLE_TYPES_FOR_AGENT.includes(type);

                return (
                  <button
                    key={type}
                    onClick={() => !isDisabled && toggleType(type)}
                    disabled={isDisabled}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : isDisabled
                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          )}

          {/* Repo Filters */}
          {facets.repos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {facets.repos.slice(0, 6).map((repo) => {
                const isActive = filters.repos.includes(repo);
                return (
                  <button
                    key={repo}
                    onClick={() => toggleRepo(repo)}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {repo.replace(/-main$/, '').replace(/-master$/, '')}
                  </button>
                );
              })}
              {facets.repos.length > 6 && (
                <span className="px-2 py-0.5 text-xs text-slate-400">
                  +{facets.repos.length - 6} more
                </span>
              )}
            </div>
          )}

          {/* Bucket Filters (shown in bucket view mode) */}
          {showBucketFilters && availableBuckets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {availableBuckets.slice(0, 6).map((bucketId) => {
                const bucket = getBucketInfo(bucketId);
                const isActive = filters.buckets.includes(bucketId);
                return (
                  <button
                    key={bucketId}
                    onClick={() => toggleBucket(bucketId)}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                      isActive
                        ? `${bucket.bgColor} ${bucket.color} border ${bucket.borderColor}`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {bucket.name}
                  </button>
                );
              })}
              {availableBuckets.length > 6 && (
                <span className="px-2 py-0.5 text-xs text-slate-400">
                  +{availableBuckets.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Count & Clear */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span>Searching...</span>
          ) : totalResults !== undefined ? (
            <span>
              {totalResults} {totalResults === 1 ? 'result' : 'results'}
            </span>
          ) : null}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-700"
          >
            <Filter className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};
