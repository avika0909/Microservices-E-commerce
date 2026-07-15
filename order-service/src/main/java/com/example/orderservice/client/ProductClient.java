package com.example.orderservice.client;

import com.example.orderservice.dto.ProductResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;

@FeignClient(name = "product-service")
public interface ProductClient {

    @GetMapping("/products/{id}")
    ProductResponse getProductById(@PathVariable Long id);

    @PutMapping("/products/{id}/reduce-stock")
    void reduceStock(@PathVariable Long id);
}
