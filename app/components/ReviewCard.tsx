"use client";

import { StarIcon } from "@heroicons/react/24/solid";

export interface Review {
  id: string;
  product_id?: string;
  product_name?: string;
  rating: number;
  comment?: string;
  customer_email?: string;
  customer_name?: string;
  created_at: string;
  order_id?: string;
  status?: "approved" | "pending" | "rejected";
}

interface ReviewCardProps {
  review: Review;
  showProductName?: boolean;
  showApprovalControls?: boolean;
  onApprove?: (reviewId: string) => void;
  onReject?: (reviewId: string) => void;
}

const getRatingLabel = (rating: number): string => {
  const labels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
  };
  return labels[rating] || "No Rating";
};

const getRatingColor = (rating: number): string => {
  switch (rating) {
    case 1:
      return "text-red-500";
    case 2:
      return "text-yellow-400";
    case 3:
      return "text-yellow-500";
    case 4:
      return "text-lime-500";
    case 5:
      return "text-green-500";
    default:
      return "text-gray-300";
  }
};

const getStatusBadge = (
  status?: string
): { bg: string; text: string; label: string } => {
  const statusMap: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    approved: {
      bg: "bg-green-100",
      text: "text-green-800",
      label: "Approved",
    },
    rejected: {
      bg: "bg-red-100",
      text: "text-red-800",
      label: "Rejected",
    },
    pending: {
      bg: "bg-yellow-100",
      text: "text-yellow-900",
      label: "Pending Review",
    },
  };

  return (
    statusMap[status?.toLowerCase() || "pending"] || statusMap["pending"]
  );
};

export default function ReviewCard({
  review,
  showProductName = true,
  showApprovalControls = false,
  onApprove,
  onReject,
}: ReviewCardProps) {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const statusBadge = getStatusBadge(review.status);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header with Product Name, Date, and Status */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex-1">
          {showProductName && review.product_name && (
            <h3 className="text-sm font-semibold text-gray-700 mb-1">
              {review.product_name}
            </h3>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-500">
            <span>{formatDate(review.created_at)}</span>
            {review.customer_name && <span>•</span>}
            {review.customer_name && (
              <span className="text-gray-600">{review.customer_name}</span>
            )}
          </div>
        </div>
        {showApprovalControls && review.status && (
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge.bg} ${statusBadge.text}`}
          >
            {statusBadge.label}
          </span>
        )}
      </div>

      {/* Star Rating */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              className={`w-4 h-4 ${
                star <= review.rating ? getRatingColor(review.rating) : "text-gray-300"
              } fill-current`}
            />
          ))}
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {review.rating}
          <span className="text-gray-500 font-normal">/5</span>
        </span>
        <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
          {getRatingLabel(review.rating)}
        </span>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap break-words">
          {review.comment}
        </p>
      )}

      {/* Approval Controls for Admin */}
      {showApprovalControls && (
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={() => onApprove?.(review.id)}
            disabled={review.status === "approved"}
            className="flex-1 px-3 py-2 bg-green-100 hover:bg-green-200 disabled:bg-gray-100 text-green-700 disabled:text-gray-400 text-sm font-medium rounded transition"
          >
            Approve
          </button>
          <button
            onClick={() => onReject?.(review.id)}
            disabled={review.status === "rejected"}
            className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 disabled:bg-gray-100 text-red-700 disabled:text-gray-400 text-sm font-medium rounded transition"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
