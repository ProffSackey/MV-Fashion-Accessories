"use client";

import { useState } from "react";
import { StarIcon, XMarkIcon } from "@heroicons/react/24/solid";

interface Product {
  id: string;
  name: string;
  image?: string;
}

interface ProductRatingModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  customerId?: string;
}

export default function ProductRatingModal({
  isOpen,
  product,
  onClose,
  onSubmit,
  customerId,
}: ProductRatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !product) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment);
      setSubmitted(true);
      setTimeout(() => {
        setRating(0);
        setComment("");
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error submitting review:", error);
      const msg = (error as any)?.message || "Failed to submit review. Please try again.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header Background */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-700 px-6 py-4 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white hover:text-yellow-100 transition"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white">Share Your Feedback</h2>
          <p className="text-yellow-100 text-xs mt-1">Help others make informed decisions</p>
        </div>

        <div className="p-6">
          {submitted ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full shadow-lg animate-pulse">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Review Submitted!</h3>
              <p className="text-gray-600 text-base mb-1">Thank you for your feedback.</p>
              <p className="text-gray-500 text-sm">Your review will help other customers make better decisions.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Product Info - Professional Display */}
              <div className="flex gap-4 pb-4 border-b border-gray-200">
                <div className="flex-shrink-0">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg bg-gray-100 shadow-md border border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500">Product ID: {product.id}</p>
                </div>
              </div>

              {/* Rating Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  How would you rate this product?
                </label>

                {/* Star Rating */}
                <div className="flex justify-center gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-all transform hover:scale-110 focus:outline-none"
                      title={`${star} star${star !== 1 ? 's' : ''}`}
                    >
                      <StarIcon
                        className={`w-10 h-10 transition-all duration-200 ${
                          star <= (hoverRating || rating)
                            ? "text-yellow-400 fill-yellow-400 drop-shadow-md"
                            : "text-gray-300 fill-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                    {rating > 0 && (
                      <p className="text-center text-xs font-medium text-yellow-700 bg-yellow-50 py-1.5 rounded">
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Fair"}
                    {rating === 3 && "Good"}
                    {rating === 4 && "Very Good"}
                    {rating === 5 && "Excellent"}
                  </p>
                )}
              </div>

              {/* Comment Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Comments <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with this product. What did you like? What could be improved?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none text-sm text-gray-900 placeholder-gray-500"
                  rows={3}
                  disabled={isSubmitting}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{comment.length}/500 characters</p>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
                className={`w-full py-2.5 rounded-lg font-semibold transition duration-200 text-base ${
                  isSubmitting || rating === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-yellow-700 hover:bg-yellow-800 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                }`}
              >
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
