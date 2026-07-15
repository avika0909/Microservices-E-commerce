package com.example.userservice.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "wishlists", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "product_id"}))
public class Wishlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    private LocalDateTime addedAt;

    @PrePersist
    public void prePersist() { this.addedAt = LocalDateTime.now(); }

    public Wishlist() {}
    public Wishlist(Long userId, Long productId) { this.userId = userId; this.productId = productId; }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getProductId() { return productId; }
    public LocalDateTime getAddedAt() { return addedAt; }
}
