import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Code,
  TestTube,
  Server,
  Shield,
  Brain,
  FileText,
  GitBranch,
  Workflow,
  Plug,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';
import { fetchBucketCounts, searchInventory } from '../../services/api';
import { getAllBuckets } from '../../constants/buckets';
import { getSubcategoriesForBucket } from '../../constants/subcategories';

// Map icon names to actual Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Code,
  TestTube,
  Server,
  Shield,
  Brain,
  FileText,
  GitBranch,
  Workflow,
  Plug,
  HelpCircle,
};

interface BucketViewProps {
  onSelectBucket: (bucketId: string) => void;
  onSelectSubcategory: (bucketId: string, subcategoryId: string) => void;
  selectedBuckets?: string[];
  selectedSubcategories?: string[];
}

export const BucketView = ({
  onSelectBucket,
  onSelectSubcategory,
  selectedBuckets = [],
  selectedSubcategories = [],
}: BucketViewProps) => {
  // Track which bucket is expanded to show subcategories
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  // Track which bucket is being hovered for tooltip
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);

  // Fetch bucket counts
  const { data: countsData, isLoading } = useQuery({
    queryKey: ['bucket-counts'],
    queryFn: fetchBucketCounts,
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch subcategory facets when a bucket is expanded
  // Uses search API with bucket filter to get subcategory counts from facets
  const { data: subcatFacetsData } = useQuery({
    queryKey: ['subcategory-facets', expandedBucket],
    queryFn: () => searchInventory({ buckets: [expandedBucket!], limit: 0 }),
    enabled: !!expandedBucket,
    staleTime: 60000,
  });

  const bucketCounts = countsData?.counts || {};
  const buckets = getAllBuckets();

  // Derive subcategory facets from search results
  const subcatFacets = subcatFacetsData?.facets?.subcategories || [];

  const handleBucketClick = (bucketId: string, hasSubcategories: boolean) => {
    if (!hasSubcategories) {
      // No subcategories (or only one), select bucket directly
      onSelectBucket(bucketId);
      return;
    }

    if (expandedBucket === bucketId) {
      // Already expanded, collapse
      setExpandedBucket(null);
    } else {
      // Expand to show subcategories
      setExpandedBucket(bucketId);
    }
  };

  const handleSubcategoryClick = (bucketId: string, subcatId: string) => {
    onSelectSubcategory(bucketId, subcatId);
  };

  const handleViewAllClick = (bucketId: string) => {
    setExpandedBucket(null);
    onSelectBucket(bucketId);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <p className="text-xs text-slate-500 mb-3">
        Browse by capability. Click to expand subcategories.
      </p>
      <div className="space-y-1">
        {buckets.map((bucket) => {
          const Icon = ICON_MAP[bucket.icon] || HelpCircle;
          const count = bucketCounts[bucket.id] || 0;
          const isExpanded = expandedBucket === bucket.id;
          const isSelected = selectedBuckets.includes(bucket.id);
          const subcategories = getSubcategoriesForBucket(bucket.id);
          const hasSubcategories = subcategories.length > 1; // More than just default

          return (
            <div key={bucket.id}>
              {/* Bucket row */}
              <div className="relative">
                <button
                  onClick={() => handleBucketClick(bucket.id, hasSubcategories)}
                  onMouseEnter={() => setHoveredBucket(bucket.id)}
                  onMouseLeave={() => setHoveredBucket(null)}
                  className={`w-full p-2.5 rounded-lg flex items-center gap-2 transition-all ${
                    isExpanded || isSelected
                      ? `${bucket.bgColor} ${bucket.borderColor} border`
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${bucket.bgColor} ${bucket.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {bucket.name}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{count}</span>
                  {hasSubcategories && (
                    isExpanded
                      ? <ChevronDown size={14} className="text-slate-400" />
                      : <ChevronRight size={14} className="text-slate-400" />
                  )}
                </button>

                {/* Tooltip on hover (only when not expanded) */}
                {hoveredBucket === bucket.id && !isExpanded && (
                  <div className="absolute z-50 left-1/2 -translate-x-1/2 -top-8 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none">
                    {bucket.name}
                  </div>
                )}
              </div>

              {/* Subcategory list (when expanded) */}
              {isExpanded && hasSubcategories && (
                <div className="ml-8 mt-1 space-y-0.5">
                  {subcategories.map((subcat) => {
                    const isInFacets = subcatFacets.includes(subcat.id);
                    const isSelected = selectedSubcategories.includes(subcat.id);

                    // Skip subcategories not in current facets (no items)
                    // unless it's the default subcategory
                    if (!isInFacets && !subcat.isDefault) return null;

                    return (
                      <button
                        key={subcat.id}
                        onClick={() => handleSubcategoryClick(bucket.id, subcat.id)}
                        className={`w-full px-3 py-1.5 rounded-md text-left text-sm flex justify-between transition-colors ${
                          isSelected
                            ? `${bucket.bgColor} ${bucket.color} font-medium`
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{subcat.name}</span>
                      </button>
                    );
                  })}
                  {/* "View All" option */}
                  <button
                    onClick={() => handleViewAllClick(bucket.id)}
                    className="w-full px-3 py-1.5 rounded-md text-left text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  >
                    View all {bucket.name} →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
