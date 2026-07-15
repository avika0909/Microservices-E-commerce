package com.example.productservice.service;

import com.example.productservice.entity.Review;
import com.example.productservice.repository.ReviewRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;

    public ReviewService(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    public List<Review> getReviews(Long productId) {
        return reviewRepository.findByProductId(productId);
    }

    public Review addReview(Long productId, Long userId, String userName, int rating, String comment) {
        Review review = new Review();
        review.setProductId(productId);
        review.setUserId(userId);
        review.setUserName(userName);
        review.setRating(Math.min(5, Math.max(1, rating)));
        review.setComment(comment);
        return reviewRepository.save(review);
    }

    public double getAverageRating(Long productId) {
        List<Review> reviews = reviewRepository.findByProductId(productId);
        return reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
    }
}
