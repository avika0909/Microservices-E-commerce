package com.example.productservice.controller;

import com.example.productservice.entity.Review;
import com.example.productservice.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/products/{productId}/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public ResponseEntity<List<Review>> getReviews(@PathVariable Long productId) {
        return ResponseEntity.ok(reviewService.getReviews(productId));
    }

    @PostMapping
    public ResponseEntity<Review> addReview(@PathVariable Long productId, @RequestBody Map<String, Object> body) {
        Long userId   = Long.valueOf(body.get("userId").toString());
        String name   = body.get("userName").toString();
        int rating    = Integer.parseInt(body.get("rating").toString());
        String comment= body.getOrDefault("comment","").toString();
        return ResponseEntity.ok(reviewService.addReview(productId, userId, name, rating, comment));
    }

    @GetMapping("/average")
    public ResponseEntity<Map<String,Object>> getAverage(@PathVariable Long productId) {
        double avg = reviewService.getAverageRating(productId);
        int count  = reviewService.getReviews(productId).size();
        return ResponseEntity.ok(Map.of("average", avg, "count", count));
    }
}
